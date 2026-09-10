import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildPreparationArgs, createPreparationPlan, MediaProbe, MediaStream, PreparationPlan } from "./preparation-plan";

export type PreparationEvent = { type: "status"; message: string } | { type: "progress"; percent: number };
export interface PreparationOptions {
  ffmpegPath: string;
  ffprobePath: string;
  cacheDirectory: string;
  onEvent?: (event: PreparationEvent, sourcePath: string) => void;
  timeoutMs?: number;
}

export async function runProcess(binary: string, args: string[], signal: AbortSignal, timeoutMs: number, onOutput?: (chunk: string) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    let failure: Error | undefined;
    const abort = () => { failure = new Error("Media preparation cancelled."); child.kill(); };
    const timer = setTimeout(() => { failure = new Error("Media preparation timed out."); child.kill(); }, timeoutMs);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (onOutput) onOutput(chunk);
      else if (output.length + chunk.length <= 8 * 1024 * 1024) output += chunk;
      else { failure = new Error("Media probe output exceeded its size limit."); child.kill(); }
    });
    child.stderr.on("data", (chunk: string) => { errors = (errors + chunk).slice(-16384); });
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener("abort", abort); };
    child.on("error", error => { cleanup(); reject(error); });
    child.on("close", code => {
      cleanup();
      if (failure) reject(failure);
      else if (code !== 0) reject(new Error(`${path.basename(binary)} failed (${code}): ${errors.trim()}`));
      else resolve(output);
    });
  });
}

function parseProbe(text: string): MediaProbe {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || !("streams" in value) || !Array.isArray(value.streams)) throw new Error("Invalid FFprobe response.");
  for (const stream of value.streams as unknown[]) {
    if (!stream || typeof stream !== "object" || !("index" in stream) || !Number.isInteger(stream.index) || !("codec_type" in stream) || typeof stream.codec_type !== "string") throw new Error("Invalid FFprobe stream.");
  }
  return value as MediaProbe;
}

export function outputMatchesPlan(probe: MediaProbe, plan: PreparationPlan): boolean {
  const video = probe.streams.filter(s => s.codec_type === "video" && !s.disposition?.attached_pic);
  const audio = probe.streams.filter(s => s.codec_type === "audio");
  const matches = (actual: MediaStream | undefined, expected: MediaStream, codec: string) => actual?.codec_name === (codec === "copy" ? expected.codec_name : codec === "libx264" ? "h264" : codec);
  return video.length === plan.video.length && audio.length === plan.audio.length &&
    plan.video.every((s, i) => matches(video[i], s.stream, s.codec) && (s.codec !== "copy" || (video[i]?.width === s.stream.width && video[i]?.height === s.stream.height))) &&
    plan.audio.every((s, i) => matches(audio[i], s.stream, s.codec) && (!s.stream.channels || audio[i]?.channels === s.stream.channels));
}

export class MediaPreparationService {
  private readonly jobs = new Map<string, Promise<string>>();
  private readonly controller = new AbortController();
  constructor(private readonly options: PreparationOptions) {}

  dispose(): void { this.controller.abort(); }

  prepare(input: string): Promise<string> {
    if (typeof input !== "string" || !input.trim()) return Promise.reject(new Error("A media file path is required."));
    if (this.controller.signal.aborted) return Promise.reject(new Error("Media preparation is shutting down."));
    const filePath = path.resolve(input.startsWith("file:") ? fileURLToPath(input) : input);
    const existing = this.jobs.get(filePath);
    if (existing) return existing;
    const job = this.prepareFile(filePath).finally(() => this.jobs.delete(filePath));
    this.jobs.set(filePath, job);
    return job;
  }

  private async probe(filePath: string): Promise<MediaProbe> {
    return parseProbe(await runProcess(this.options.ffprobePath, ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath], this.controller.signal, 60000));
  }

  private async prepareFile(filePath: string): Promise<string> {
    this.options.onEvent?.({ type: "status", message: "Probing media file..." }, filePath);
    const source = await fs.stat(filePath);
    if (!source.isFile() || !source.size) throw new Error("The media file is empty or is not a regular file.");
    const probe = await this.probe(filePath);
    const plan = createPreparationPlan(filePath, probe);
    if (plan.kind === "direct") return pathToFileURL(filePath).href;

    // Versioned cache identity invalidates outputs when the source or policy changes.
    const key = createHash("sha256").update(JSON.stringify([1, filePath, source.size, source.mtimeMs, this.options.ffmpegPath, plan])).digest("hex");
    await fs.mkdir(this.options.cacheDirectory, { recursive: true });
    const output = path.join(this.options.cacheDirectory, `${key}.mp4`);
    const manifestPath = `${output}.json`;
    try {
      const cached = await fs.stat(output);
      const manifest: unknown = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      if (cached.size > 0 && manifest && typeof manifest === "object" && "size" in manifest && manifest.size === cached.size && "mtimeMs" in manifest && manifest.mtimeMs === cached.mtimeMs && outputMatchesPlan(await this.probe(output), plan)) return pathToFileURL(output).href;
    } catch { /* Missing, empty, changed, or unreadable cache: regenerate. */ }

    const messages = { audio: "Optimizing audio format for player...", remux: "Remuxing media for player...", convert: "Converting media format..." };
    this.options.onEvent?.({ type: "status", message: messages[plan.kind] }, filePath);
    const temp = `${output}.${randomUUID()}.tmp`;
    const manifestTemp = `${temp}.json`;
    let progressText = "";
    const duration = Number(probe.format?.duration);
    try {
      await runProcess(this.options.ffmpegPath, buildPreparationArgs(filePath, temp, plan), this.controller.signal, this.options.timeoutMs ?? 6 * 60 * 60 * 1000, chunk => {
        progressText += chunk;
        const lines = progressText.split(/\r?\n/);
        progressText = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("out_time_us=") && duration > 0) {
            const percent = Number(line.slice(12)) / (duration * 10000);
            if (Number.isFinite(percent)) this.options.onEvent?.({ type: "progress", percent: Math.max(0, Math.min(99, Math.floor(percent))) }, filePath);
          }
        }
      });
      const generated = await fs.stat(temp);
      if (!generated.size || !outputMatchesPlan(await this.probe(temp), plan)) throw new Error("Prepared media did not retain the expected streams, codecs, dimensions, or channels.");
      const latest = await fs.stat(filePath);
      if (latest.size !== source.size || latest.mtimeMs !== source.mtimeMs) throw new Error("The source file changed during preparation. Please reopen it.");
      await fs.rename(temp, output);
      const published = await fs.stat(output);
      await fs.writeFile(manifestTemp, JSON.stringify({ size: published.size, mtimeMs: published.mtimeMs }));
      await fs.rename(manifestTemp, manifestPath);
      this.options.onEvent?.({ type: "progress", percent: 100 }, filePath);
      return pathToFileURL(output).href;
    } finally {
      await fs.unlink(temp).catch(() => {});
      await fs.unlink(manifestTemp).catch(() => {});
    }
  }
}
