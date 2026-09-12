const path = require('node:path');
function localFile(rawUrl, root) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'daram:' || url.hostname !== 'game' || url.port) return null;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\\') || pathname.includes('\0')) return null;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return file;
}
module.exports = { localFile };
