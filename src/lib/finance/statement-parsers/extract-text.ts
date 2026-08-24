/**
 * Server-side PDF text extraction with optional password decryption.
 *
 * Returns positioned text items (x, y, right-edge) per page so layout-aware
 * parsers can reconstruct table rows and columns. pdfjs-dist is loaded
 * dynamically and traced with its worker file for serverless deployments.
 */

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  /** Right edge (x + width) — useful for right-aligned numeric columns. */
  right: number;
}

export interface PdfPage {
  pageNumber: number;
  items: PdfTextItem[];
}

export class PdfPasswordError extends Error {
  /** "missing" when no/empty password given, "incorrect" when the password was wrong. */
  readonly kind: "missing" | "incorrect";
  constructor(kind: "missing" | "incorrect") {
    super(kind === "missing" ? "Password required" : "Incorrect password");
    this.name = "PdfPasswordError";
    this.kind = kind;
  }
}

export async function extractPdfPages(
  buffer: Buffer,
  password?: string
): Promise<PdfPage[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs mutates the passed array; give it its own copy.
  const data = new Uint8Array(buffer);

  let doc;
  try {
    doc = await getDocument({
      data,
      password: password || undefined,
      // Statement PDFs are text-based; skip font/eval machinery we don't need.
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
  } catch (err) {
    const e = err as { name?: string; code?: number };
    if (e?.name === "PasswordException") {
      // pdfjs code 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD
      throw new PdfPasswordError(e.code === 1 ? "missing" : "incorrect");
    }
    throw err;
  }

  const pages: PdfPage[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = [];
    for (const raw of content.items) {
      // TextItem has `str`, `transform`, `width`; TextMarkedContent does not.
      if (!("str" in raw)) continue;
      const item = raw as { str: string; transform: number[]; width: number };
      const x = item.transform[4];
      const y = item.transform[5];
      items.push({ str: item.str, x, y, right: x + item.width });
    }
    pages.push({ pageNumber: p, items });
  }

  return pages;
}

/** Group a page's items into visual rows keyed by rounded y, sorted top→bottom, each row left→right. */
export function groupIntoRows(page: PdfPage): PdfTextItem[][] {
  const byY = new Map<number, PdfTextItem[]>();
  for (const it of page.items) {
    const key = Math.round(it.y);
    const bucket = byY.get(key);
    if (bucket) bucket.push(it);
    else byY.set(key, [it]);
  }
  return [...byY.keys()]
    .sort((a, b) => b - a)
    .map((y) => byY.get(y)!.sort((a, b) => a.x - b.x));
}
