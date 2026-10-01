/**
 * Genera el ícono, el ícono adaptativo de Android, el splash y el favicon:
 * tres barras ascendentes sobre verde bosque. Sin dependencias (PNG con zlib).
 * Uso: node scripts/generate-icons.js
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Mismos valores que src/theme/colors.ts (primary y onPrimary del modo claro).
const FOREST = [0x1f, 0x6f, 0x50, 255];
const WHITE = [255, 255, 255, 255];
const MINT = [0xa8, 0xdc, 0xc4, 255];
const TRANSPARENT = [0, 0, 0, 0];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function encodePng(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits
  header[9] = 6; // RGBA
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** ¿El punto (x, y) está dentro de un rectángulo con esquinas redondeadas? */
function inRoundedRect(x, y, left, top, width, height, radius) {
  if (x < left || x > left + width || y < top || y > top + height) return false;
  const cx = Math.min(Math.max(x, left + radius), left + width - radius);
  const cy = Math.min(Math.max(y, top + radius), top + height - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

/**
 * Marca: tres barras ascendentes. `scale` 1 = ocupa ~60% del lienzo de 1024;
 * la última barra lleva un acento menta arriba.
 */
function mark(x, y, size, scale, barColor, accentColor) {
  const unit = (size / 1024) * scale;
  const barWidth = 150 * unit;
  const gap = 70 * unit;
  const heights = [280, 420, 560].map((h) => h * unit);
  const total = barWidth * 3 + gap * 2;
  const left = size / 2 - total / 2;
  const bottom = size / 2 + 280 * unit;
  for (let index = 0; index < 3; index += 1) {
    const barLeft = left + index * (barWidth + gap);
    const top = bottom - heights[index];
    if (inRoundedRect(x, y, barLeft, top, barWidth, heights[index], 36 * unit)) {
      // Banda de acento en la parte alta de la barra más alta.
      if (accentColor && index === 2 && y < top + 110 * unit) return accentColor;
      return barColor;
    }
  }
  return null;
}

const out = (name) => path.join(__dirname, '..', 'assets', 'images', name);
const write = (name, size, pixel) => {
  fs.writeFileSync(out(name), encodePng(size, pixel));
  console.log('✓', name);
};

write('icon.png', 1024, (x, y) => mark(x, y, 1024, 1, WHITE, MINT) ?? FOREST);
write('android-icon-background.png', 1024, () => FOREST);
// Zona segura del ícono adaptativo: el contenido debe caber en ~66% del centro.
write('android-icon-foreground.png', 1024, (x, y) => mark(x, y, 1024, 0.72, WHITE, MINT) ?? TRANSPARENT);
write('android-icon-monochrome.png', 1024, (x, y) => mark(x, y, 1024, 0.72, WHITE, null) ?? TRANSPARENT);
write('splash-icon.png', 512, (x, y) => mark(x, y, 512, 1, WHITE, MINT) ?? TRANSPARENT);
write('favicon.png', 48, (x, y) => mark(x, y, 48, 1.1, WHITE, null) ?? FOREST);
