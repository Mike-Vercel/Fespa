/**
 * Genera le icone del sito dal logo (public/images/brand/logo-sidebar.webp):
 *   src/app/favicon.ico    16, 32 e 48 px (scheda del browser, risultati di ricerca)
 *   src/app/icon.png       192 px (Android, segnalibri)
 *   src/app/apple-icon.png 180 px su fondo bianco (schermata Home di iPhone/iPad)
 * Il fondo bianco del logo diventa trasparente ("colore → alfa"), così i bordi restano morbidi.
 *
 * Uso: npx tsx scripts/make-favicons.ts
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/images/brand/logo-sidebar.webp";
const APP_DIR = "src/app";

/** Rimuove il bianco: alfa = distanza dal bianco, colore ricalcolato come se fosse su sfondo trasparente. */
async function transparentLogo(): Promise<ReturnType<typeof sharp>> {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const r = data[pixel * 3];
    const g = data[pixel * 3 + 1];
    const b = data[pixel * 3 + 2];
    const alpha = Math.max(255 - r, 255 - g, 255 - b) / 255;
    const unmix = (channel: number) => (alpha === 0 ? 0 : Math.round(255 - (255 - channel) / alpha));
    out[pixel * 4] = unmix(r);
    out[pixel * 4 + 1] = unmix(g);
    out[pixel * 4 + 2] = unmix(b);
    out[pixel * 4 + 3] = Math.round(alpha * 255);
  }
  // Ritaglio sulla "F" e margine uguale su tutti i lati: l'icona resta quadrata e centrata.
  const trimmed = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 8 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const side = Math.max(trimmed.info.width, trimmed.info.height);
  const padding = Math.round(side * 0.06);
  const size = side + padding * 2;
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    {
      input: trimmed.data,
      left: Math.round((size - trimmed.info.width) / 2),
      top: Math.round((size - trimmed.info.height) / 2),
    },
  ]);
}

/** File .ico con immagini PNG incorporate (formato supportato da tutti i browser moderni). */
function icoFrom(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + 16 * images.length;
  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

async function main() {
  const logo = await (await transparentLogo()).png().toBuffer();
  const resize = (size: number) => sharp(logo).resize(size, size, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer();

  const ico = icoFrom(await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await resize(size) }))));
  await writeFile(`${APP_DIR}/favicon.ico`, ico);
  await writeFile(`${APP_DIR}/icon.png`, await resize(192));

  // iOS non gestisce bene la trasparenza: fondo bianco e un po' più di margine.
  const apple = await sharp({ create: { width: 180, height: 180, channels: 4, background: "#ffffff" } })
    .composite([{ input: await resize(140), left: 20, top: 20 }])
    .png()
    .toBuffer();
  await writeFile(`${APP_DIR}/apple-icon.png`, apple);
  console.log("Icone generate in src/app: favicon.ico, icon.png, apple-icon.png");
}

void main();
