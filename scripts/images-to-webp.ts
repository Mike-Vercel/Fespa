/**
 * Converte in WebP le immagini PNG/JPG di public/images (sottocartelle comprese).
 *
 *   npm run images:webp
 *
 * - WebP è supportato da tutti i browser attuali: Chrome/Android, Safari su iPhone, iPad e Mac
 *   (da Safari 14), Firefox, Edge.
 * - Le immagini più larghe di MAX_WIDTH vengono ridotte (mai ingrandite).
 * - Il file originale viene eliminato solo se la conversione è riuscita.
 */

import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const IMAGES_DIR = path.resolve("public", "images");
const CONVERTIBLE = new Set([".png", ".jpg", ".jpeg"]);
/** Oltre questa larghezza nessun riquadro dell'app mostra un'immagine più nitida. */
const MAX_WIDTH = 2400;
/** Qualità visivamente indistinguibile dall'originale per foto e loghi, con file molto più leggeri. */
const QUALITY = 82;
const BYTES_PER_KB = 1024;

async function findImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findImages(fullPath);
      return CONVERTIBLE.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : [];
    }),
  );
  return nested.flat();
}

function kilobytes(bytes: number): string {
  return `${Math.round(bytes / BYTES_PER_KB)} KB`;
}

async function convert(source: string): Promise<void> {
  const target = source.replace(/\.(png|jpe?g)$/i, ".webp");
  const before = (await stat(source)).size;

  await sharp(source)
    .rotate() // rispetta l'orientamento EXIF delle foto scattate col telefono
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(target);

  const after = (await stat(target)).size;
  await unlink(source);
  console.log(`  ✓ ${path.relative(IMAGES_DIR, target).padEnd(32)} ${kilobytes(before)} → ${kilobytes(after)}`);
}

async function main(): Promise<void> {
  const images = await findImages(IMAGES_DIR);
  if (images.length === 0) {
    console.log("Nessuna immagine PNG/JPG da convertire in public/images.");
    return;
  }
  console.log(`Conversione in WebP di ${images.length} immagini:\n`);
  for (const image of images) {
    await convert(image);
  }
  console.log("\nRicorda di aggiornare nel codice i percorsi che finivano in .png/.jpg.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
