// Генерує PNG-іконки PWA без зовнішніх залежностей (Node zlib).
// Дизайн: суцільний акцентний фон (#3b82f6) + білий монограм «M».
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}
function png(W, H, rgba) {
  const stride = W * 4;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
function build(S) {
  const buf = Buffer.alloc(S * S * 4);
  const A = [59, 130, 246];                      // #3b82f6
  const set = (x, y, r, g, b, a) => { const i = (y * S + x) * 4; buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) set(x, y, A[0], A[1], A[2], 255);  // full-bleed (maskable)
  const m = 0.22 * S, top = 0.30 * S, bot = 0.70 * S, xc = S / 2, yMid = 0.56 * S, t = 0.11 * S;
  const segs = [[m, top, m, bot], [S - m, top, S - m, bot], [m, top, xc, yMid], [S - m, top, xc, yMid]];
  const distSeg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy; let tt = L ? ((px - x1) * dx + (py - y1) * dy) / L : 0; tt = Math.max(0, Math.min(1, tt)); return Math.hypot(px - (x1 + tt * dx), py - (y1 + tt * dy)); };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d = 1e9; for (const s of segs) d = Math.min(d, distSeg(x + .5, y + .5, s[0], s[1], s[2], s[3]));
    const edge = d - t / 2;
    if (edge <= 0) set(x, y, 255, 255, 255, 255);
    else if (edge < 1.2) { const a = Math.max(0, 1 - edge), i = (y * S + x) * 4; buf[i] = Math.round(255 * a + A[0] * (1 - a)); buf[i + 1] = Math.round(255 * a + A[1] * (1 - a)); buf[i + 2] = Math.round(255 * a + A[2] * (1 - a)); buf[i + 3] = 255; }
  }
  return png(S, S, buf);
}
const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const S of [192, 512, 180]) { fs.writeFileSync(path.join(dir, `icon-${S}.png`), build(S)); console.log('icon-' + S + '.png'); }
console.log('Готово.');
