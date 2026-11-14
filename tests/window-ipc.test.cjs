const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { registerWindowIpc } = require('../out/window-ipc');

function createWindow({ destroyed = false, contentsDestroyed = false } = {}) {
  const calls = [];
  const record = (method, ...args) => {
    if (destroyed) throw new TypeError('Object has been destroyed');
    calls.push([method, ...args]);
  };
  const window = {
    isDestroyed: () => destroyed,
    webContents: { isDestroyed: () => contentsDestroyed },
    setMenuBarVisibility: value => record('menu', value),
    setAutoHideMenuBar: value => record('autoHide', value),
    setMinimumSize: (width, height) => record('minimumSize', width, height),
  };
  return { window, calls };
}

function sendWindowMessages(ipc, sender) {
  ipc.emit('toggle-menu-bar', { sender }, false);
  ipc.emit('enforce-min-size', { sender }, { width: 800, height: 600 });
}

test('window IPC updates the active window for its own renderer', () => {
  const ipc = new EventEmitter();
  const { window, calls } = createWindow();
  registerWindowIpc(ipc, () => window);
  sendWindowMessages(ipc, window.webContents);
  ipc.emit('toggle-menu-bar', { sender: window.webContents }, true);
  assert.deepEqual(calls, [['menu', false], ['autoHide', true], ['minimumSize', 800, 600], ['menu', true], ['autoHide', false]]);
});

test('queued fullscreen and resize messages ignore a destroyed window', () => {
  const ipc = new EventEmitter();
  const { window, calls } = createWindow({ destroyed: true });
  registerWindowIpc(ipc, () => window);
  assert.doesNotThrow(() => sendWindowMessages(ipc, window.webContents));
  assert.deepEqual(calls, []);
});

test('queued window messages are harmless after the window reference is cleared', () => {
  const ipc = new EventEmitter();
  registerWindowIpc(ipc, () => null);
  assert.doesNotThrow(() => sendWindowMessages(ipc, {}));
});

test('messages from a previous renderer do not change a replacement window', () => {
  const ipc = new EventEmitter();
  const previous = createWindow();
  const { window, calls } = createWindow();
  registerWindowIpc(ipc, () => window);
  sendWindowMessages(ipc, previous.window.webContents);
  assert.deepEqual(calls, []);
});

test('window IPC ignores destroyed web contents during teardown', () => {
  const ipc = new EventEmitter();
  const { window, calls } = createWindow({ contentsDestroyed: true });
  registerWindowIpc(ipc, () => window);
  sendWindowMessages(ipc, window.webContents);
  assert.deepEqual(calls, []);
});
