'use client';
import { extractPdfText } from '@/lib/pdf';
import { useRef, useState } from 'react';

export default function PdfUploader({ onText }: { onText: (t: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    setName(file.name);
    try {
      const text = await extractPdfText(file);
      onText(text);
    } catch (err: any) {
      setError(err?.message || 'PDF okunamadı.');
    } finally {
      setBusy(false);
      // aynı dosyayı tekrar seçebilmek için resetle
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="application/pdf" onChange={onChange} />
      {name && <p className="text-xs text-gray-600">Seçilen: {name}</p>}
      {busy && <p className="text-xs">Metin çıkarılıyor…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
