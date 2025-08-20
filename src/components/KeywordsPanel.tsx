'use client';

export default function KeywordsPanel({ keywords }: { keywords: string[] }) {
  if (!keywords.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Kavramlar</h3>
      <ul className="list-disc pl-6 text-sm">
        {keywords.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
    </div>
  );
}
