const { app, BrowserWindow, Menu, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { localFile } = require('./local-content.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'daram', privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true,
} }]);
function createWindow() {
  const win = new BrowserWindow({
    title: '다람이의 모험 2', width: 1440, height: 900,
    minWidth: 800, minHeight: 600, backgroundColor: '#102019', show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!localFile(url, path.join(app.getAppPath(), 'dist'))) event.preventDefault();
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('daram://game/');
}
app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist');
  protocol.handle('daram', (request) => {
    const file = localFile(request.url, root);
    if (!file || !['GET', 'HEAD'].includes(request.method)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString(), { method: request.method, headers: request.headers });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: '다람이의 모험 2', submenu: [{ role: 'about' }, { role: 'quit' }] }] : []),
    { label: '화면', submenu: [{ role: 'togglefullscreen' }, { role: 'reload' }, { role: 'close' }] },
  ]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
