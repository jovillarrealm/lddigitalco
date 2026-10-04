// LDDIGITALCO — Local Development Server (Zero external dependencies)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(BASE_DIR, reqPath);

  // Security check: ensure path is within BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Prohibido');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <body style="background:#070b13;color:#fff;font-family:sans-serif;padding:40px;text-align:center;">
          <h1 style="color:#00d2ff;">404 - Página no encontrada</h1>
          <p>El archivo <code>${reqPath}</code> no existe.</p>
          <a href="/index.html" style="color:#00ff87;">← Volver al inicio</a>
        </body>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🚀 Servidor LDDIGITALCO iniciado exitosamente!`);
  console.log(`🌐 Accede en tu navegador: http://localhost:${PORT}`);
  console.log(`📄 Páginas disponibles:`);
  console.log(`   - Portada Unificada: http://localhost:${PORT}/index.html`);
  console.log(`   - Portal B2B:        http://localhost:${PORT}/b2b.html`);
  console.log(`   - Programa +50:      http://localhost:${PORT}/senior.html`);
  console.log(`   - Portal Estudiante: http://localhost:${PORT}/alumnos`);
  console.log('========================================================');
});
