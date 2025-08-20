// PDF → metin çıkarımı (tarayıcı)
// Not: Worker'ı CDN'den alıyoruz; isterseniz public/ içine kopyalayıp self-host edebilirsiniz.
import * as pdfjsLib from 'pdfjs-dist';

// Güvenilir bir sürüm pinliyoruz (gerektiğinde güncelleyin)
const WORKER_CDN = 'https://unpkg.com/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';
// @ts-ignore
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = WORKER_CDN;

export async function extractPdfText(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const doc = await (pdfjsLib as any).getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const line = tc.items.map((it: any) => (it.str ?? '')).join(' ');
    pages.push(line);
  }
  return pages.join('\n\n');
}
