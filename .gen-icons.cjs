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
// Лінійна іконка на ПРОЗОРОМУ тлі (як іконки меню): монограм «M» + радар-свіп і бліп.
// Колір — слейт #64748b (як неактивні нав-іконки).
function build(S) {
  const INK = [100, 116, 139];                       // #64748b
  const cx = 0.5 * S, cy = 0.55 * S, R = 0.38 * S, arcW = 0.05 * S;   // радар-дуга
  const a0 = -150 * Math.PI / 180, a1 = 25 * Math.PI / 180;          // дуга над верхом → правий бік
  const bAng = -50 * Math.PI / 180, bx = cx + R * Math.cos(bAng), by = cy + R * Math.sin(bAng), bR = 0.05 * S;  // бліп
  // монограм M
  const m = 0.31 * S, top = 0.40 * S, bot = 0.72 * S, xc = 0.5 * S, yMid = 0.58 * S, t = 0.075 * S;
  const segs = [[m, top, m, bot], [S - m, top, S - m, bot], [m, top, xc, yMid], [S - m, top, xc, yMid]];
  const distSeg = (px, py, x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy; let tt = L ? ((px - x1) * dx + (py - y1) * dy) / L : 0; tt = Math.max(0, Math.min(1, tt)); return Math.hypot(px - (x1 + tt * dx), py - (y1 + tt * dy)); };
  const onArc = (px, py) => { const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy); if (Math.abs(d - R) > arcW / 2) return false; const ang = Math.atan2(dy, dx); return ang >= a0 && ang <= a1; };
  const isInk = (px, py) => {
    let d = 1e9; for (const s of segs) d = Math.min(d, distSeg(px, py, s[0], s[1], s[2], s[3])); if (d <= t / 2) return true;
    if (onArc(px, py)) return true;
    if (Math.hypot(px - bx, py - by) <= bR) return true;
    return false;
  };
  const SS = 3, buf = Buffer.alloc(S * S * 4);   // прозоро: alpha = покриття, RGB = INK
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let cov = 0;
    for (let oy = 0; oy < SS; oy++) for (let ox = 0; ox < SS; ox++) if (isInk(x + (ox + 0.5) / SS, y + (oy + 0.5) / SS)) cov++;
    cov /= SS * SS;
    const i = (y * S + x) * 4;
    buf[i] = INK[0]; buf[i + 1] = INK[1]; buf[i + 2] = INK[2]; buf[i + 3] = Math.round(cov * 255);
  }
  return png(S, S, buf);
}
const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const S of [192, 512, 180]) { fs.writeFileSync(path.join(dir, `icon-${S}.png`), build(S)); console.log('icon-' + S + '.png'); }
console.log('Готово.');
