import fs from 'node:fs/promises';

type PdfTextItem = { str?: string };

function installPdfJsNodeShims() {
  const globals = globalThis as typeof globalThis & {
    DOMMatrix?: typeof DOMMatrix;
    ImageData?: typeof ImageData;
    Path2D?: typeof Path2D;
  };

  if (!globals.DOMMatrix) {
    globals.DOMMatrix = class DOMMatrix {} as unknown as typeof DOMMatrix;
  }
  if (!globals.ImageData) {
    globals.ImageData = class ImageData {} as unknown as typeof ImageData;
  }
  if (!globals.Path2D) {
    globals.Path2D = class Path2D {} as unknown as typeof Path2D;
  }
}

export async function extractPdfText(filePath: string, options: { maxCharacters?: number } = {}): Promise<{
  text: string;
  pages: Array<{ pageNumber: number; text: string }>;
  pageCount: number;
  truncated: boolean;
}> {
  installPdfJsNodeShims();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(await fs.readFile(filePath));
  const loadingTask = pdfjs.getDocument({
    data,
    verbosity: 0,
    useWorkerFetch: false,
    disableFontFace: true,
  });
  const document = await loadingTask.promise;
  const maxCharacters = options.maxCharacters ?? 45_000;
  const pages: Array<{ pageNumber: number; text: string }> = [];
  let textLength = 0;
  let truncated = false;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (item as PdfTextItem).str ?? '')
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!pageText) continue;

    const remaining = maxCharacters - textLength;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const nextText = pageText.length > remaining ? pageText.slice(0, remaining) : pageText;
    pages.push({ pageNumber, text: nextText });
    textLength += nextText.length;
    if (nextText.length < pageText.length) {
      truncated = true;
      break;
    }
  }

  return {
    text: pages.map((page) => `Page ${page.pageNumber}\n${page.text}`).join('\n\n'),
    pages,
    pageCount: document.numPages,
    truncated,
  };
}
