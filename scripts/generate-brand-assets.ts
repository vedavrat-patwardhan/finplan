// Regenerates every raster/derived brand asset from the vector source of
// truth (public/brand/finplan-mark.svg) and the static font files in
// src/assets/fonts/. Run with: npm run brand:assets
//
// Requires Node >= 22.6 for --experimental-strip-types (see package.json).
// Uses `sharp` (librsvg + libvips) for rasterizing SVG -> PNG, and
// `opentype.js` for converting text to path outlines so that the wordmark
// SVG and the static OG image need no installed/embedded fonts to render
// correctly anywhere (sharp/librsvg cannot use @font-face for <text>).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
// opentype.js ships a UMD bundle that cjs-module-lexer can't statically
// analyze, so named ESM imports resolve to `undefined` — import the default
// (the full CommonJS module.exports object) instead.
import opentype from "opentype.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FONTS_DIR = join(ROOT, "src/assets/fonts");
const BRAND_DIR = join(ROOT, "public/brand");
const ICONS_DIR = join(ROOT, "public/icons");

const COLORS = {
  black: "#0d0d0d",
  white: "#ffffff",
  lime: "#E5FE40",
  lime600: "#A0B22D",
  lime700: "#727F20",
} as const;

// ---------------------------------------------------------------------------
// Font loading + text-to-path helpers
// ---------------------------------------------------------------------------

type Font = opentype.Font;

async function loadFont(fileName: string): Promise<Font> {
  const buf = await readFile(join(FONTS_DIR, fileName));
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return opentype.parse(arrayBuffer as ArrayBuffer);
}

interface GlyphBlock {
  /** `d` attribute, pre-shifted so its own bounding box starts at (0,0). */
  d: string;
  width: number;
  height: number;
}

/**
 * Serializes an opentype.js Path's own `commands` array to an SVG `d`
 * string ourselves, rounding with plain `round()` (below).
 *
 * We deliberately do NOT call `Path.prototype.toPathData()`: its internal
 * `roundDecimal()` rounds via a string round-trip
 * (`+(Math.round(decimalPart + "e+2") + "e-2")`), which silently produces
 * `NaN` whenever a coordinate's fractional part is a tiny floating-point
 * artifact (e.g. `1.24e-14`) — JS stringifies that in exponential notation,
 * yielding a malformed double-exponent string ("1.24e-14e+2") that
 * `Math.round` coerces to `NaN`. That `NaN` lands verbatim in the `d`
 * attribute, which SVG parsers (librsvg included) reject — silently
 * truncating the whole path at that command, so only the glyphs before the
 * first bad coordinate ever render. This hits real, unremarkable glyphs
 * (e.g. Instrument Serif's "a", "m", "y"), so it can't be avoided by
 * changing which characters we draw — only by not calling the buggy
 * serializer.
 */
function serializePathCommands(commands: opentype.PathCommand[]): string {
  let d = "";
  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        d += `M${round(cmd.x)} ${round(cmd.y)}`;
        break;
      case "L":
        d += `L${round(cmd.x)} ${round(cmd.y)}`;
        break;
      case "Q":
        d += `Q${round(cmd.x1)} ${round(cmd.y1)} ${round(cmd.x)} ${round(cmd.y)}`;
        break;
      case "C":
        d += `C${round(cmd.x1)} ${round(cmd.y1)} ${round(cmd.x2)} ${round(cmd.y2)} ${round(cmd.x)} ${round(cmd.y)}`;
        break;
      case "Z":
        d += "Z";
        break;
    }
  }
  return d;
}

/**
 * Lays out `text` glyph-by-glyph using raw advance widths, bypassing
 * opentype.js's Bidi/GSUB text-shaping pipeline (`Font.prototype.getPath`).
 * Manrope's `ccmp` GSUB feature uses a chained-context substitution format
 * opentype.js 2.x doesn't implement and throws on unconditionally (it's not
 * gated by the `kerning`/`features` options); these are short brand strings
 * with no combining marks, so plain per-glyph placement + manual tracking
 * is both sufficient and immune to that crash.
 */
function textToGlyphBlock(
  font: Font,
  text: string,
  fontSize: number,
  letterSpacing = 0,
  fallbackFont?: Font,
): GlyphBlock {
  // Pass 1: lay out glyphs at their natural position to find the overall
  // (unshifted) bounding box. `Path.getBoundingBox()` is plain arithmetic
  // over the already-scaled command values, which are never NaN — only
  // `toPathData()`'s string-based rounding is buggy (see above).
  let x = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const glyphs: { glyph: opentype.Glyph; x: number }[] = [];
  for (const char of text) {
    // Google Fonts splits some codepoints (e.g. the ₹ rupee sign, U+20B9)
    // out of the "latin" subset into "latin-ext"; fall back to a secondary
    // font file — same family/weight, different unicode range — for any
    // character the primary subset doesn't carry, rather than silently
    // drawing a missing-glyph box.
    const useFallback = !font.hasChar(char) && fallbackFont?.hasChar(char);
    const activeFont = useFallback ? fallbackFont! : font;
    const activeScale = fontSize / activeFont.unitsPerEm;
    const glyph = activeFont.charToGlyph(char);
    glyphs.push({ glyph, x });
    if (glyph.path.commands.length > 0) {
      const bbox = glyph.getPath(x, 0, fontSize).getBoundingBox();
      minX = Math.min(minX, bbox.x1);
      minY = Math.min(minY, bbox.y1);
      maxX = Math.max(maxX, bbox.x2);
      maxY = Math.max(maxY, bbox.y2);
    }
    x += (glyph.advanceWidth ?? 0) * activeScale + letterSpacing * fontSize;
  }
  if (!Number.isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }
  const width = maxX - minX;
  const height = maxY - minY;

  // Pass 2: re-fetch each glyph's path shifted so the ink starts at (0,0),
  // and hand-serialize it (per glyph, to keep each `d` short and simple).
  let d = "";
  for (const { glyph, x: gx } of glyphs) {
    const path = glyph.getPath(gx - minX, -minY, fontSize);
    d += serializePathCommands(path.commands as opentype.PathCommand[]);
  }
  return { d, width, height };
}

function glyphGroup(block: GlyphBlock, x: number, y: number, fill: string): string {
  return `<g transform="translate(${round(x)},${round(y)})"><path d="${block.d}" fill="${fill}" /></g>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Mark geometry (kept in sync with public/brand/finplan-mark.svg)
// ---------------------------------------------------------------------------

/** Raw shapes of the mark, viewBox 0 0 512 512, used to inline the mark at
 * arbitrary sizes inside composite SVGs (lockups, OG image, icons). */
const MARK_INNER = `
  <polygon points="432,0 512,80 512,512 432,432" fill="${COLORS.lime600}" />
  <polygon points="0,432 432,432 512,512 80,512" fill="${COLORS.lime}" />
  <rect x="0" y="0" width="432" height="432" fill="${COLORS.black}" />
  <rect x="72" y="256" width="80" height="96" fill="${COLORS.white}" />
  <rect x="176" y="176" width="80" height="176" fill="${COLORS.white}" />
  <rect x="280" y="96" width="80" height="256" fill="${COLORS.white}" />
`;

/** The mark's outer silhouette (face + both plunk edges, unioned), used for
 * the single-colour mono variants with the steps cut out as negative space. */
const MARK_SILHOUETTE_POINTS = "0,0 432,0 512,80 512,512 80,512 0,432";

function markGroup(size: number, x = 0, y = 0): string {
  const scale = size / 512;
  return `<g transform="translate(${round(x)},${round(y)}) scale(${round(scale)})">${MARK_INNER}</g>`;
}

// ---------------------------------------------------------------------------
// SVG document helpers
// ---------------------------------------------------------------------------

function svgDoc(width: number, height: number, body: string, extra = ""): string {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" ${extra}>${body}</svg>`;
}

async function renderSvgToPng(svg: string, size: { width: number; height: number }) {
  return sharp(Buffer.from(svg)).resize(size.width, size.height).png().toBuffer();
}

// ---------------------------------------------------------------------------
// ICO container (PNG-in-ICO, hand-written header)
// ---------------------------------------------------------------------------

function buildIco(images: { size: number; data: Buffer }[]): Buffer {
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let offset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(images.length, 4); // image count

  const dirEntries: Buffer[] = [];
  const dataBuffers: Buffer[] = [];

  for (const { size, data } of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color count (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // size of PNG data
    entry.writeUInt32LE(offset, 12); // offset from start of file
    dirEntries.push(entry);
    dataBuffers.push(data);
    offset += data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers]);
}

// ---------------------------------------------------------------------------
// Wordmark + lockups
// ---------------------------------------------------------------------------

async function generateWordmarkAndLockups(manropeExtraBold: Font) {
  const PADDING = 8;

  // Standalone wordmark, outlines only, currentColor so callers can tint it.
  const wordmark = textToGlyphBlock(manropeExtraBold, "FinPlan", 100, -0.02);
  const wordmarkSvg = svgDoc(
    round(wordmark.width + PADDING * 2),
    round(wordmark.height + PADDING * 2),
    glyphGroup(wordmark, PADDING, PADDING, "currentColor"),
  );
  await writeFile(join(BRAND_DIR, "finplan-wordmark.svg"), wordmarkSvg);

  // Lockups: mark on the left (its own black tile), wordmark to the right,
  // vertically centred against the mark's face (the 0-432 square, not the
  // plunk overhang).
  const markSize = 160; // visual face size
  const gap = 28;
  const wordFontSize = 132; // tuned so wordmark cap-height ~ 60% of markSize
  const word = textToGlyphBlock(manropeExtraBold, "FinPlan", wordFontSize, -0.02);

  const wordX = markSize + gap;
  const wordY = markSize / 2 - word.height / 2;

  const totalWidth = wordX + word.width;
  const totalHeight = Math.max(markSize + (markSize * 80) / 432, word.height);

  const buildLockup = (wordFill: string) =>
    svgDoc(
      round(totalWidth),
      round(totalHeight),
      `${markGroup(markSize)}${glyphGroup(word, wordX, wordY, wordFill)}`,
    );

  await writeFile(join(BRAND_DIR, "finplan-lockup-dark.svg"), buildLockup(COLORS.white));
  await writeFile(join(BRAND_DIR, "finplan-lockup-light.svg"), buildLockup(COLORS.black));
}

// ---------------------------------------------------------------------------
// Mono mark variants
// ---------------------------------------------------------------------------

async function generateMonoMarks() {
  const cutout = `
    <mask id="finplan-steps-cutout">
      <rect x="0" y="0" width="512" height="512" fill="#ffffff" />
      <rect x="72" y="256" width="80" height="96" fill="#000000" />
      <rect x="176" y="176" width="80" height="176" fill="#000000" />
      <rect x="280" y="96" width="80" height="256" fill="#000000" />
    </mask>
    <polygon points="${MARK_SILHOUETTE_POINTS}" fill="FILL" mask="url(#finplan-steps-cutout)" />
  `;
  const dark = svgDoc(512, 512, cutout.replace("FILL", COLORS.black));
  const light = svgDoc(512, 512, cutout.replace("FILL", COLORS.white));
  await writeFile(join(BRAND_DIR, "finplan-mark-mono-dark.svg"), dark);
  await writeFile(join(BRAND_DIR, "finplan-mark-mono-light.svg"), light);
}

// ---------------------------------------------------------------------------
// OG image (static PNG copy)
// ---------------------------------------------------------------------------

async function generateOgImage(
  manropeExtraBold: Font,
  manropeMedium: Font,
  instrumentSerif: Font,
  manropeExtraBoldLatinExt: Font,
) {
  const WIDTH = 1200;
  const HEIGHT = 630;
  const MARGIN = 64;

  // --- Lockup, top-left --------------------------------------------------
  const markSize = 56;
  const gap = 16;
  const wordmark = textToGlyphBlock(manropeExtraBold, "FinPlan", 44, -0.02);
  const lockupY = MARGIN;
  const lockup = `${markGroup(markSize, MARGIN, lockupY)}${glyphGroup(
    wordmark,
    MARGIN + markSize + gap,
    lockupY + markSize / 2 - wordmark.height / 2,
    COLORS.white,
  )}`;

  // --- Headline, serif, wrapped across lines ------------------------------
  const headlineWords = "plan marriage, a home, and every milestone.".split(" ");
  const headlineFontSize = 72;
  const headlineMaxWidth = 660;
  const headlineLineHeight = 82;
  const headlineLines: GlyphBlock[] = [];
  {
    let current = "";
    for (const word of headlineWords) {
      const candidate = current ? `${current} ${word}` : word;
      const block = textToGlyphBlock(instrumentSerif, candidate, headlineFontSize);
      if (block.width > headlineMaxWidth && current) {
        headlineLines.push(textToGlyphBlock(instrumentSerif, current, headlineFontSize));
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) headlineLines.push(textToGlyphBlock(instrumentSerif, current, headlineFontSize));
  }

  const headlineStartY = 232;
  const headlineSvg = headlineLines
    .map((line, i) => glyphGroup(line, MARGIN, headlineStartY + i * headlineLineHeight, COLORS.white))
    .join("");
  const headlineBottom = headlineStartY + (headlineLines.length - 1) * headlineLineHeight + headlineLines.at(-1)!.height;

  // --- Subline, Manrope medium, 50% white -----------------------------
  const subline = textToGlyphBlock(
    manropeMedium,
    "income · expenses · SIPs · insurance · goals — in INR.",
    22,
  );
  const sublineY = headlineBottom + 34;
  const sublineSvg = glyphGroup(subline, MARGIN, sublineY, "rgba(255,255,255,0.5)");

  // --- Lime plunk card, right side ---------------------------------------
  const cardW = 300;
  const cardH = 260;
  const cardX = WIDTH - MARGIN - cardW;
  const cardY = (HEIGHT - cardH) / 2;
  const edge = 14;
  const cardPlunk = `
    <polygon points="${cardX + cardW},${cardY} ${cardX + cardW + edge},${cardY + edge} ${cardX + cardW + edge},${cardY + cardH + edge} ${cardX + cardW},${cardY + cardH}" fill="${COLORS.lime700}" />
    <polygon points="${cardX},${cardY + cardH} ${cardX + cardW},${cardY + cardH} ${cardX + cardW + edge},${cardY + cardH + edge} ${cardX + edge},${cardY + cardH + edge}" fill="${COLORS.lime600}" />
    <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" fill="${COLORS.lime}" />
  `;

  const cardLabel = textToGlyphBlock(manropeMedium, "MONTHLY SURPLUS", 15, 0.14);
  const cardFigure = textToGlyphBlock(
    manropeExtraBold,
    "₹1,20,000",
    52,
    -0.01,
    manropeExtraBoldLatinExt,
  );
  const cardSub = textToGlyphBlock(manropeMedium, "/mo, still growing", 16);

  const cardInnerX = cardX + 28;
  let cy = cardY + 56;
  const cardLabelSvg = glyphGroup(cardLabel, cardInnerX, cy, COLORS.lime700);
  cy += cardLabel.height + 26;
  const cardFigureSvg = glyphGroup(cardFigure, cardInnerX, cy, COLORS.black);
  cy += cardFigure.height + 18;
  const cardSubSvg = glyphGroup(cardSub, cardInnerX, cy, "rgba(13,13,13,0.6)");

  const svg = svgDoc(
    WIDTH,
    HEIGHT,
    `
      <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.black}" />
      ${lockup}
      ${headlineSvg}
      ${sublineSvg}
      ${cardPlunk}
      ${cardLabelSvg}
      ${cardFigureSvg}
      ${cardSubSvg}
    `,
  );

  const png = await renderSvgToPng(svg, { width: WIDTH, height: HEIGHT });
  await writeFile(join(BRAND_DIR, "finplan-og.png"), png);
}

// ---------------------------------------------------------------------------
// App icons + favicon
// ---------------------------------------------------------------------------

async function generateIcons() {
  const markSvg = svgDoc(512, 512, MARK_INNER);

  // Plain icons (purpose "any") — the mark already fills its own tile.
  const icon192 = await renderSvgToPng(markSvg, { width: 192, height: 192 });
  const icon512 = await renderSvgToPng(markSvg, { width: 512, height: 512 });
  await writeFile(join(ICONS_DIR, "icon-192.png"), icon192);
  await writeFile(join(ICONS_DIR, "icon-512.png"), icon512);

  // Maskable icons — mark scaled to 60%, centred, on a solid black backdrop
  // so the shape survives the OS maskable safe-zone crop.
  const maskableScale = 0.6;
  const maskableInset = (512 * (1 - maskableScale)) / 2;
  const maskableSvg = svgDoc(
    512,
    512,
    `<rect x="0" y="0" width="512" height="512" fill="${COLORS.black}" />${markGroup(
      512 * maskableScale,
      maskableInset,
      maskableInset,
    )}`,
  );
  const maskable192 = await renderSvgToPng(maskableSvg, { width: 192, height: 192 });
  const maskable512 = await renderSvgToPng(maskableSvg, { width: 512, height: 512 });
  await writeFile(join(ICONS_DIR, "icon-maskable-192.png"), maskable192);
  await writeFile(join(ICONS_DIR, "icon-maskable-512.png"), maskable512);

  // Apple touch icon — mark at 80%, centred, on solid black, 180x180.
  const appleScale = 0.8;
  const appleInset = (512 * (1 - appleScale)) / 2;
  const appleSvg = svgDoc(
    512,
    512,
    `<rect x="0" y="0" width="512" height="512" fill="${COLORS.black}" />${markGroup(
      512 * appleScale,
      appleInset,
      appleInset,
    )}`,
  );
  const appleTouchIcon = await renderSvgToPng(appleSvg, { width: 180, height: 180 });
  await writeFile(join(ROOT, "public/apple-touch-icon.png"), appleTouchIcon);

  // Favicon — multi-size PNG-in-ICO, reuse the apple-icon style backdrop at
  // a slightly larger mark scale since 16px needs to read at a glance.
  const faviconScale = 0.86;
  const faviconInset = (512 * (1 - faviconScale)) / 2;
  const faviconSvg = svgDoc(
    512,
    512,
    `<rect x="0" y="0" width="512" height="512" fill="${COLORS.black}" />${markGroup(
      512 * faviconScale,
      faviconInset,
      faviconInset,
    )}`,
  );
  const sizes = [16, 32, 48];
  const images = await Promise.all(
    sizes.map(async (size) => ({ size, data: await renderSvgToPng(faviconSvg, { width: size, height: size }) })),
  );
  const ico = buildIco(images);
  await writeFile(join(ROOT, "src/app/favicon.ico"), ico);
  await writeFile(join(ROOT, "public/favicon.ico"), ico);
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

async function verify() {
  const files = [
    "public/brand/finplan-mark.svg",
    "public/brand/finplan-mark-mono-dark.svg",
    "public/brand/finplan-mark-mono-light.svg",
    "public/brand/finplan-wordmark.svg",
    "public/brand/finplan-lockup-dark.svg",
    "public/brand/finplan-lockup-light.svg",
    "public/brand/finplan-og.png",
    "public/icons/icon-192.png",
    "public/icons/icon-512.png",
    "public/icons/icon-maskable-192.png",
    "public/icons/icon-maskable-512.png",
    "public/apple-touch-icon.png",
    "public/favicon.ico",
    "src/app/favicon.ico",
  ];
  console.log("\nGenerated brand assets:");
  for (const file of files) {
    const full = join(ROOT, file);
    if (file.endsWith(".png")) {
      const meta = await sharp(full).metadata();
      console.log(`  ${file} — ${meta.width}x${meta.height} ${meta.format}`);
    } else {
      const buf = await readFile(full);
      console.log(`  ${file} — ${buf.length} bytes`);
    }
  }
}

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });
  await mkdir(ICONS_DIR, { recursive: true });

  const [manropeExtraBold, manropeMedium, instrumentSerif, manropeExtraBoldLatinExt] =
    await Promise.all([
      loadFont("Manrope-ExtraBold.woff"),
      loadFont("Manrope-Medium.woff"),
      loadFont("InstrumentSerif-Regular.woff"),
      loadFont("Manrope-ExtraBold-LatinExt.woff"),
    ]);

  await generateMonoMarks();
  await generateWordmarkAndLockups(manropeExtraBold);
  await generateIcons();
  await generateOgImage(manropeExtraBold, manropeMedium, instrumentSerif, manropeExtraBoldLatinExt);
  await verify();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
