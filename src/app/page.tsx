'use client';
import { useState } from 'react';
import PdfUploader from '@/components/PdfUploader';
import SummaryPanel from '@/components/SummaryPanel';
import KeywordsPanel from '@/components/KeywordsPanel';
import { summarizeClient } from '@/lib/summarize-client';
import { extractKeywords } from '@/lib/keywords';

export default function Page() {
  const [srcText, setSrcText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  async function handleSummarize() {
    if (!srcText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const s = await summarizeClient(srcText);
      setSummary(s);
      setKeywords(extractKeywords(s));
    } catch (e: any) {
      setError(e?.message || 'Özetleme sırasında hata oluştu.');
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Ücretsiz Ders Özeti (Beta)</h1>
        <p className="text-sm text-gray-600">PDF yükle → kısa özet & kavramlar → Markdown dışa aktar.</p>
      </header>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">1) PDF Yükle</h2>
        <PdfUploader onText={(t) => setSrcText(t)} />
        <textarea className="w-full h-40 border p-2 text-sm" placeholder="PDF metni burada gözükecek" value={srcText} readOnly />
      </section>

      <section className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">2) Kısa Özetle (Tarayıcı-İçi)</h2>
        <button
          disabled={loading || !srcText}
          onClick={handleSummarize}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Özetleniyor…' : 'Kısa Özetle'}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <SummaryPanel summary={summary} />
        <KeywordsPanel keywords={keywords} />
      </section>

      <footer className="pt-8 text-xs text-gray-500">
        <p>İlk özetlemede model dosyaları indirilir; bağlantınıza bağlı olarak birkaç saniye sürebilir.</p>
      </footer>
    </main>
  );
}
