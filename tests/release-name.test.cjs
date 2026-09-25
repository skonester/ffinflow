const { test } = require('node:test');
const assert = require('node:assert/strict');
const { describeRelease, isSameRelease } = require('../out/media/release-name');

for (const [file, title] of [
  ['C:\\Videos\\The.Boys.S05E02.REPACK.1080p.WEB.H264-TyHD.mkv', 'The Boys - S05E02'],
  ['[SubsPlease] Frieren - 28 (1080p) [ABCD1234].mkv', 'Frieren - Episode 28'],
  ['Superman.2025.MULTi.2160p.UHD.BluRay.REMUX.DV.HDR10.HEVC.TrueHD.Atmos.7.1-FRATERNiTY.mkv', 'Superman (2025)'],
  ['family holiday video.mp4', 'family holiday video'],
  ['Yellowstone National Park in 8K 60P (FUHD).mkv', 'Yellowstone National Park in 8K 60P (FUHD)'],
  ['Star Trek - Angry Video Game Nerd (AVGN) [1CNddEz9dak].mp4', 'Star Trek - Angry Video Game Nerd (AVGN)'],
]) {
  test(`display title: ${title}`, () => assert.equal(describeRelease(file)?.displayTitle, title));
}

test('release details list resolution, source and group', () => {
  assert.deepEqual(describeRelease('The.Boys.S05E02.REPACK.1080p.WEB.H264-TyHD.mkv')?.details, ['1080p', 'WEB-DL', 'TyHD']);
});

test('audio files keep their raw name', () => {
  assert.equal(describeRelease('01 - Pink Floyd - Time.mp3'), null);
});

for (const [video, subtitle, expected] of [
  ['The.Boys.S05E02.REPACK.1080p.WEB.H264-TyHD.mkv', 'The Boys S05E02.en.srt', true],
  ['[SubsPlease] Frieren - 28 (1080p) [ABCD1234].mkv', 'Frieren - 28.ass', true],
  ['Superman.2025.2160p.UHD.BluRay.x265-GROUP.mkv', 'Superman (2025).srt', true],
  ['The.Boys.S05E02.1080p.WEB.H264-TyHD.mkv', 'The Boys S05E03.en.srt', false],
  ['The.Boys.S05E02.1080p.WEB.H264-TyHD.mkv', 'The Boys S04E02.en.srt', false],
  ['The.Boys.S05E02.1080p.WEB.H264-TyHD.mkv', 'The Boys.srt', false],
  ['Superman.2025.2160p.UHD.BluRay.x265-GROUP.mkv', 'Superman (1978).srt', false],
]) {
  test(`subtitle match ${subtitle} -> ${expected}`, () => assert.equal(isSameRelease(video, subtitle), expected));
}
