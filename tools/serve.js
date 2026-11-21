const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const postsDir = path.join(root, 'posts');
const manifestFile = path.join(root, 'content', 'posts-manifest.js');
const port = Number(process.env.PORT) || 8080;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/rss+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const clients = new Set();
let reloadTimer = null;

if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

function postFiles() {
  return fs.readdirSync(postsDir)
    .filter(function (file) { return /\.js$/i.test(file); })
    .sort()
    .map(function (file) { return 'posts/' + file; });
}

function writeManifest() {
  const output = 'const BLOG_POST_FILES = ' + JSON.stringify(postFiles(), null, 2) + ';\n';
  const existing = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, 'utf8') : '';
  if (existing !== output) fs.writeFileSync(manifestFile, output);
}

function broadcastReload() {
  clients.forEach(function (res) {
    res.write('event: reload\ndata: {}\n\n');
  });
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(broadcastReload, 120);
}

function watch(target, onEvent) {
  if (!fs.existsSync(target)) return;
  try {
    fs.watch(target, { recursive: true }, function (eventType, filename) {
      if (onEvent && onEvent(filename)) return;
      scheduleReload();
    });
  } catch (error) {
    console.warn('Not watching ' + target + ': ' + error.message);
  }
}

writeManifest();
watch(postsDir, function () { writeManifest(); return false; });
watch(path.join(root, 'content'), function (filename) {
  return filename && String(filename).indexOf('posts-manifest.js') !== -1;
});
watch(path.join(root, 'assets'));
watch(path.join(root, 'index.html'));

http.createServer(function (req, res) {
  const urlPath = decodeURIComponent(String(req.url).split('?')[0]);

  if (urlPath === '/__live-reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', function () { clients.delete(res); });
    return;
  }

  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, function (error, data) {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
}).listen(port, function () {
  console.log('NULLBYTE // LOG running at http://localhost:' + port);
  console.log('Add/edit files in posts/ or content/ — open pages reload automatically.');
});
