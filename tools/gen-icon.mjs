import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { serve, launchBrowser } from './serve.mjs';

const ICON_SIZES = [256, 128, 64, 48, 32, 16];
const ICO_SIZES = [16, 32, 48, 256];
const ICON_DIR = 'app/build/icons';
const ICO_PATH = 'app/build/icon.ico';

function pngFromDataUrl(dataUrl) {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Browser returned a non-PNG data URL');
  return Buffer.from(match[1], 'base64');
}

function pngSize(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('Invalid PNG signature');
  }
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') throw new Error('PNG missing IHDR chunk');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function buildIco(entries) {
  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + entries.length * entrySize;
  const totalSize = directorySize + entries.reduce((sum, entry) => sum + entry.buffer.length, 0);
  const ico = Buffer.alloc(totalSize);

  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(entries.length, 4);

  let imageOffset = directorySize;
  for (let i = 0; i < entries.length; i++) {
    const { size, buffer } = entries[i];
    const pos = headerSize + i * entrySize;
    ico.writeUInt8(size === 256 ? 0 : size, pos);
    ico.writeUInt8(size === 256 ? 0 : size, pos + 1);
    ico.writeUInt8(0, pos + 2);
    ico.writeUInt8(0, pos + 3);
    ico.writeUInt16LE(1, pos + 4);
    ico.writeUInt16LE(32, pos + 6);
    ico.writeUInt32LE(buffer.length, pos + 8);
    ico.writeUInt32LE(imageOffset, pos + 12);
    buffer.copy(ico, imageOffset);
    imageOffset += buffer.length;
  }

  return ico;
}

function verifyIco(path) {
  const ico = readFileSync(path);
  if (ico.length < 6) throw new Error('ICO file is too small');
  const reserved = ico.readUInt16LE(0);
  const type = ico.readUInt16LE(2);
  const count = ico.readUInt16LE(4);
  if (reserved !== 0 || type !== 1) throw new Error('Invalid ICONDIR header');
  if (count !== ICO_SIZES.length) throw new Error(`Expected ${ICO_SIZES.length} ICO entries, found ${count}`);

  const table = [];
  for (let i = 0; i < count; i++) {
    const pos = 6 + i * 16;
    const width = ico.readUInt8(pos) || 256;
    const height = ico.readUInt8(pos + 1) || 256;
    const bytes = ico.readUInt32LE(pos + 8);
    const offset = ico.readUInt32LE(pos + 12);
    const embedded = pngSize(ico.subarray(offset, offset + bytes));
    if (width !== height || embedded.width !== width || embedded.height !== height) {
      throw new Error(`ICO entry ${i} size mismatch: directory ${width}x${height}, PNG ${embedded.width}x${embedded.height}`);
    }
    table.push({ size: width, bytes, offset });
  }
  return { bytes: ico.length, table };
}

async function renderPngs(page) {
  return page.evaluate(async (sizes) => {
    const spriteCache = await import('/src/render2d/spriteCache.ts');
    await import('/src/render2d/painters/critters/index.ts');

    const sprite = spriteCache.getSprite('critter', 'crumb-king', 128, 0, { variant: 'boss' });
    if (!sprite) throw new Error('getSprite returned null for critter:crumb-king');

    const master = document.createElement('canvas');
    master.width = 256;
    master.height = 256;
    const ctx = master.getContext('2d');
    if (!ctx) throw new Error('Could not create master canvas context');

    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.shadowColor = 'rgba(74, 39, 22, 0.24)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(74, 39, 22, 0.16)';
    ctx.fill();
    ctx.restore();

    const bg = ctx.createRadialGradient(96, 82, 22, 128, 132, 122);
    bg.addColorStop(0, '#fff8dc');
    bg.addColorStop(0.58, '#f6d78b');
    bg.addColorStop(1, '#d99a42');
    ctx.beginPath();
    ctx.arc(128, 128, 116, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.lineWidth = 7;
    ctx.strokeStyle = '#5a321c';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 249, 217, 0.82)';
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, 46, 38, 164, 164);

    return Object.fromEntries(sizes.map((size) => {
      if (size === 256) return [size, master.toDataURL('image/png')];
      const out = document.createElement('canvas');
      out.width = size;
      out.height = size;
      const outCtx = out.getContext('2d');
      if (!outCtx) throw new Error(`Could not create ${size}px canvas context`);
      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.drawImage(master, 0, 0, size, size);
      return [size, out.toDataURL('image/png')];
    }));
  }, ICON_SIZES);
}

async function main() {
  const { url, stop } = await serve();
  let browser;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 320, height: 320 }, deviceScaleFactor: 1 });
    page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('PAGE CONSOLE:', msg.text());
    });

    await page.goto(url);
    const dataUrls = await renderPngs(page);
    const pngs = new Map();

    mkdirSync(ICON_DIR, { recursive: true });
    mkdirSync(dirname(ICO_PATH), { recursive: true });

    for (const size of ICON_SIZES) {
      const buffer = pngFromDataUrl(dataUrls[size]);
      const dims = pngSize(buffer);
      if (dims.width !== size || dims.height !== size) {
        throw new Error(`Generated icon-${size}.png is ${dims.width}x${dims.height}`);
      }
      const path = `${ICON_DIR}/icon-${size}.png`;
      writeFileSync(path, buffer);
      pngs.set(size, buffer);
      console.log(`icon: ${path} (${buffer.length} bytes)`);
    }

    const ico = buildIco(ICO_SIZES.map((size) => ({ size, buffer: pngs.get(size) })));
    writeFileSync(ICO_PATH, ico);
    const verified = verifyIco(ICO_PATH);
    console.log(`ico: ${ICO_PATH} (${verified.bytes} bytes)`);
    for (const entry of verified.table) {
      console.log(`ico-entry: ${entry.size}x${entry.size} offset=${entry.offset} bytes=${entry.bytes}`);
    }
  } finally {
    if (browser) await browser.close();
    await stop();
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});



