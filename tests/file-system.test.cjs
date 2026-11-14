const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../out/modules/fileSystem.js'), 'utf8');
const joker = 'Joker.Folie.a.Deux.2024.1080p.AMZN.WEBRip.DDP5.1.x265.10bit-GalaxyRG265.mkv';

function loadFileSystem({ existing = [], currentIndex = -1, selection = [joker], metadata = Promise.resolve() } = {}) {
  const playback = [];
  const saved = [];
  const alerts = [];
  const module = { exports: {} };
  const state = {
    module, exports: module.exports, console,
    playlist: existing.map(filePath => ({ path: filePath })),
    currentIndex,
    supportedFormats: ['.mp4', '.mkv'],
    alert: message => alerts.push(message),
    require(name) {
      if (name === 'electron-store') return class { set(key, value) { saved.push({ key, value: structuredClone(value) }); } };
      if (name === 'electron') return { ipcRenderer: { invoke: async channel => channel === 'open-folder' ? { filePaths: ['/media'] } : selection } };
      if (name === 'fs') return { promises: {
        readdir: async () => selection,
        stat: async () => ({ isDirectory: () => false }),
      } };
      if (name === 'path') return path;
      throw new Error(`Unexpected dependency: ${name}`);
    },
    async addToPlaylist(filePath) {
      state.playlist.push({ path: filePath });
      await metadata;
    },
    async playFile(filePath) { playback.push({ filePath, index: state.currentIndex }); },
  };
  vm.runInNewContext(source, state, { filename: 'fileSystem.js' });
  return { api: module.exports, state, playback, saved, alerts };
}

test('Open Files starts the selected movie when another item is already active', async () => {
  const { api, state, playback } = loadFileSystem({ existing: ['previous.mp4'], currentIndex: 0 });
  await api.openFiles();
  assert.deepEqual(playback, [{ filePath: joker, index: 1 }]);
  assert.equal(state.playlist[0].path, 'previous.mp4');
  assert.equal(state.playlist[1].path, joker);
});

test('Open Files selects the new entry after restoring a saved playlist', async () => {
  const { api, playback } = loadFileSystem({ existing: ['saved.mp4'], currentIndex: -1 });
  await api.openFiles();
  assert.deepEqual(playback, [{ filePath: joker, index: 1 }]);
});

test('Open Files begins playback before background metadata finishes', async () => {
  let finishMetadata;
  const metadata = new Promise(resolve => { finishMetadata = resolve; });
  const { api, playback, state } = loadFileSystem({ existing: ['previous.mp4'], currentIndex: 0, selection: [joker, 'next.mp4'], metadata });
  const opening = api.openFiles();
  await new Promise(setImmediate);
  assert.deepEqual(playback, [{ filePath: joker, index: 1 }]);
  assert.equal(state.playlist.length, 3);
  finishMetadata();
  await opening;
});

test('cancelling Open Files preserves the current playlist and playback', async () => {
  const { api, state, playback, saved } = loadFileSystem({ existing: ['previous.mp4'], currentIndex: 0, selection: [] });
  await api.openFiles();
  assert.deepEqual(playback, []);
  assert.equal(state.currentIndex, 0);
  assert.equal(state.playlist.length, 1);
  assert.deepEqual(saved, []);
});

test('Open Folder starts its first media file after the existing playlist', async () => {
  const { api, playback, state } = loadFileSystem({ existing: ['previous.mp4'], currentIndex: 0, selection: ['notes.txt', joker, 'next.mp4'] });
  await api.openFolder();
  assert.deepEqual(playback, [{ filePath: path.join('/media', joker), index: 1 }]);
  assert.equal(state.playlist.length, 3);
});
