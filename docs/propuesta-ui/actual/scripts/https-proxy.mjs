// Proxy HTTPS local (certificado autofirmado) -> relay http://127.0.0.1:8787. Solo para capturas.
import https from 'node:https'; import http from 'node:http'; import net from 'node:net'; import fs from 'node:fs';
const dir = (process.env.CERT_DIR || '.') + '/'; // cert.pem/key.pem autofirmados, fuera del repo (*.pem está en .gitignore)
const T = { host: '127.0.0.1', port: Number(process.env.TARGET_PORT || 8787) };
const srv = https.createServer({ key: fs.readFileSync(dir + 'key.pem'), cert: fs.readFileSync(dir + 'cert.pem') }, (req, res) => {
  const p = http.request({ ...T, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(p);
});
srv.on('upgrade', (req, sock, head) => {
  const up = net.connect(T.port, T.host, () => {
    let h = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) h += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    up.write(h + '\r\n'); if (head?.length) up.write(head); up.pipe(sock); sock.pipe(up);
  });
  up.on('error', () => sock.destroy()); sock.on('error', () => up.destroy());
});
srv.listen(8443, '127.0.0.1', () => console.log('proxy https://localhost:8443 -> 8787'));
