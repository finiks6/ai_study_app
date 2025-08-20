'use client';
import { downloadMarkdown } from '@/utils/exportMarkdown';

export default function SummaryPanel({ summary }: { summary: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Özet</h3>
      <textarea className="w-full h-60 border p-2 text-sm" value={summary} readOnly placeholder="Özet burada görünecek" />
      <div className="flex items-center gap-2">
        <button
          onClick={() => downloadMarkdown('# Özet\n\n' + (summary || ''))}
          disabled={!summary}
          className="px-3 py-2 rounded border disabled:opacity-50"
        >
          Markdown indir
        </button>
      </div>
    </div>
  );
}
