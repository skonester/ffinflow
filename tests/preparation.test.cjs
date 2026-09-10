const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { fileURLToPath } = require('node:url');
const { execFileSync } = require('node:child_process');
const { createPreparationPlan, buildPreparationArgs } = require('../out/media/preparation-plan');
const { MediaPreparationService, outputMatchesPlan, runProcess } = require('../out/media/preparation-service');

const v = (codec, index = 0) => ({ index, codec_type: 'video', codec_name: codec, width: 7680, height: 4320 });
const a = (codec, index = 1, channels = 6) => ({ index, codec_type: 'audio', codec_name: codec, channels });

for (const [name, file, streams, kind, videoCodec, audioCodec] of [
  ['8K HEVC/E-AC3 keeps video', 'movie.mkv', [v('hevc'), a('eac3')], 'audio', 'copy', 'flac'],
  ['H264/E-AC3 keeps video', 'movie.mp4', [v('h264'), a('eac3')], 'audio', 'copy', 'flac'],
  ['unsupported video and audio both convert', 'movie.avi', [v('mpeg4'), a('ac3')], 'convert', 'libx264', 'aac'],
  ['native H264/AAC bypasses conversion', 'movie.mp4', [v('h264'), a('aac')], 'direct', 'copy', 'copy'],
  ['compatible MKV remuxes', 'movie.mkv', [v('hevc'), a('aac')], 'remux', 'copy', 'copy'],
  ['native VP8/Vorbis stays WebM', 'movie.webm', [v('vp8'), a('vorbis')], 'direct', 'copy', 'copy'],
  ['VP8 cannot be copied to MP4', 'movie.mkv', [v('vp8'), a('vorbis')], 'convert', 'libx264', 'aac'],
  ['Vorbis cannot be copied to MP4', 'movie.mkv', [v('h264'), a('vorbis')], 'audio', 'copy', 'flac'],
  ['audio-only E-AC3 converts', 'sound.m4a', [a('eac3', 0, 2)], 'audio', undefined, 'flac'],
  ['PCM WAV bypasses conversion', 'sound.wav', [a('pcm_s24le', 0, 2)], 'direct', undefined, 'copy'],
]) {
  test(name, () => {
    const plan = createPreparationPlan(file, { streams });
    assert.equal(plan.kind, kind);
    assert.equal(plan.video[0]?.codec, videoCodec);
    assert.equal(plan.audio[0]?.codec, audioCodec);
  });
}

test('all tracks are inspected and explicitly mapped; subtitles/cover art stay in original', () => {
  const plan = createPreparationPlan('movie.mp4', { streams: [v('h264'), a('aac'), a('eac3', 2), { index: 3, codec_type: 'subtitle' }, { ...v('mjpeg', 4), disposition: { attached_pic: 1 } }] });
  assert.equal(plan.kind, 'audio');
  const args = buildPreparationArgs('movie.mp4', 'out.tmp', plan);
  assert.deepEqual(args.flatMap((arg, i) => arg === '-map' ? [args[i + 1]] : []), ['0:0', '0:1', '0:2']);
  assert.equal(args[args.indexOf('-c:a:0') + 1], 'copy');
  assert.equal(args[args.indexOf('-c:a:1') + 1], 'flac');
  assert.ok(!args.includes('-ac'));
  assert.ok(!args.includes('hvc1'));
});

test('secondary unsupported video is converted and HEVC alone gets its tag', () => {
  const plan = createPreparationPlan('movie.mp4', { streams: [v('hevc'), v('mpeg4', 1), a('aac', 2)] });
  assert.equal(plan.kind, 'convert');
  const args = buildPreparationArgs('input', 'output', plan);
  assert.equal(args[args.indexOf('-tag:v:0') + 1], 'hvc1');
  assert.ok(!args.includes('-tag:v:1'));
});

test('empty probe fails; output validation catches missing tracks, channels and dimensions', () => {
  assert.throws(() => createPreparationPlan('empty.mp4', { streams: [] }), /No playable/);
  const plan = createPreparationPlan('a.mkv', { streams: [v('hevc'), a('eac3')] });
  assert.ok(outputMatchesPlan({ streams: [v('hevc'), a('flac')] }, plan));
  assert.ok(!outputMatchesPlan({ streams: [v('hevc'), a('flac', 1, 2)] }, plan));
  assert.ok(!outputMatchesPlan({ streams: [{ ...v('hevc'), width: 1920 }, a('flac')] }, plan));
  assert.ok(!outputMatchesPlan({ streams: [v('hevc')] }, plan));
});

test('process runner settles spawn failure, nonzero exit, timeout, and cancellation', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(runProcess('ffinflow-nonexistent-binary', [], signal, 5000), /ENOENT/);
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.stderr.write("fixture error"); process.exit(3)'], signal, 5000), /fixture error/);
  await assert.rejects(runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], signal, 100), /timed out/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(runProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], controller.signal, 5000), /cancelled/);
});

const ffmpegPath = process.env.FFINFLOW_FFMPEG || path.resolve('ffmpeg-binaries/ffmpeg.exe');
const ffprobePath = process.env.FFINFLOW_FFPROBE || path.resolve('ffmpeg-binaries/ffprobe.exe');
const exec = (binary, args) => runProcess(binary, args, new AbortController().signal, 120000);
const probe = async file => JSON.parse(await exec(ffprobePath, ['-v', 'error', '-show_streams', '-of', 'json', file]));
const videoHash = file => exec(ffmpegPath, ['-v', 'error', '-i', file, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-']);

test('real E-AC3 conversion, channel/video preservation, caching, deduplication and recovery', async t => {
  await fs.access(ffmpegPath);
  await fs.access(ffprobePath);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ffinflow-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const cache = path.join(dir, 'cache');
  let events = [];
  const service = new MediaPreparationService({ ffmpegPath, ffprobePath, cacheDirectory: cache, onEvent: event => events.push(event) });
  t.after(() => service.dispose());
  const source = path.join(dir, 'EAC3 # 100% stereo.mkv');
  await exec(ffmpegPath, ['-v', 'error', '-f', 'lavfi', '-i', 'color=size=96x64:rate=5', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '0.4', '-c:v', 'libx264', '-threads', '2', '-c:a', 'eac3', '-ac', '2', source]);
  const pending = service.prepare(source);
  assert.equal(service.prepare(source), pending);
  const output = fileURLToPath(await pending);
  const result = await probe(output);
  assert.equal(result.streams.find(s => s.codec_type === 'audio').codec_name, 'flac');
  assert.equal(result.streams.find(s => s.codec_type === 'audio').channels, 2);
  const pcm = execFileSync(ffmpegPath, ['-v', 'error', '-i', output, '-map', '0:a:0', '-f', 's16le', '-'], { windowsHide: true });
  assert.ok(pcm.length > 0 && pcm.some(byte => byte !== 0), 'converted E-AC3 tone remains audible data');
  assert.equal(await videoHash(output), await videoHash(source));
  const firstStat = await fs.stat(output);
  events = [];
  assert.equal(fileURLToPath(await service.prepare(source)), output);
  assert.equal((await fs.stat(output)).mtimeMs, firstStat.mtimeMs);
  assert.ok(!events.some(e => e.type === 'status' && e.message.includes('Optimizing')));
  await fs.writeFile(output, '');
  await service.prepare(source);
  assert.ok((await fs.stat(output)).size > 0);
  await fs.writeFile(output, 'corrupt nonempty cache');
  await service.prepare(source);
  assert.equal(await videoHash(output), await videoHash(source));
  const original = await fs.stat(source);
  await fs.utimes(source, original.atime, new Date(original.mtimeMs + 10000));
  assert.notEqual(fileURLToPath(await service.prepare(source)), output);
  assert.ok((await fs.readdir(cache)).every(file => !file.includes('.tmp')));

  for (const [name, videoCodec, audioCodec, layout, channels] of [
    ['hevc-surround', 'libx265', 'eac3', '5.1', 6],
    ['unsupported-both', 'mpeg4', 'eac3', 'stereo', 2],
  ]) {
    const input = path.join(dir, `${name}.mkv`);
    await exec(ffmpegPath, ['-v', 'error', '-f', 'lavfi', '-i', 'color=size=96x64:rate=5', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=${layout}`, '-t', '0.4', '-c:v', videoCodec, '-threads', '2', ...(videoCodec === 'libx265' ? ['-x265-params', 'pools=1:frame-threads=1:log-level=error'] : []), '-c:a', audioCodec, input]);
    const prepared = fileURLToPath(await service.prepare(input));
    const info = await probe(prepared);
    assert.equal(info.streams.find(s => s.codec_type === 'audio').channels, channels);
    assert.equal(info.streams.find(s => s.codec_type === 'audio').codec_name, videoCodec === 'mpeg4' ? 'aac' : 'flac');
    if (videoCodec === 'libx265') {
      assert.equal(info.streams.find(s => s.codec_type === 'video').codec_tag_string, 'hvc1');
      assert.equal(await videoHash(prepared), await videoHash(input));
    } else assert.equal(info.streams.find(s => s.codec_type === 'video').codec_name, 'h264');
  }

  const multi = path.join(dir, 'multiple-audio.mkv');
  await exec(ffmpegPath, ['-v', 'error', '-i', source, '-map', '0:v', '-map', '0:a', '-map', '0:a', '-c:v', 'copy', '-c:a:0', 'aac', '-c:a:1', 'eac3', multi]);
  const tracks = (await probe(fileURLToPath(await service.prepare(multi)))).streams.filter(s => s.codec_type === 'audio');
  assert.deepEqual(tracks.map(s => s.codec_name), ['aac', 'flac']);
  assert.deepEqual(tracks.map(s => s.channels), [2, 2]);

  const empty = path.join(dir, 'empty.mp4');
  await fs.writeFile(empty, '');
  await assert.rejects(service.prepare(empty), /empty/);
  const failing = new MediaPreparationService({ ffmpegPath: 'missing-encoder', ffprobePath, cacheDirectory: path.join(dir, 'failure') });
  await assert.rejects(failing.prepare(source), /ENOENT/);
  assert.ok((await fs.readdir(path.join(dir, 'failure'))).every(file => !file.includes('.tmp')));
});

test('8K H264/E-AC3 fixture retains compressed video bytes and 7680x4320 dimensions', { skip: !process.env.FFINFLOW_TEST_8K }, async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ffinflow-8k-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const source = path.join(dir, '8k.mkv');
  await exec(ffmpegPath, ['-v', 'error', '-f', 'lavfi', '-i', 'color=size=7680x4320:rate=1', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '0.2', '-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '2', '-c:a', 'eac3', source]);
  const service = new MediaPreparationService({ ffmpegPath, ffprobePath, cacheDirectory: path.join(dir, 'cache') });
  t.after(() => service.dispose());
  const output = fileURLToPath(await service.prepare(source));
  const info = await probe(output);
  assert.equal(info.streams.find(s => s.codec_type === 'video').width, 7680);
  assert.equal(info.streams.find(s => s.codec_type === 'video').height, 4320);
  assert.equal(info.streams.find(s => s.codec_type === 'audio').codec_name, 'flac');
  assert.equal(await videoHash(output), await videoHash(source));
});
