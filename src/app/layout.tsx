import '@/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ücretsiz Ders Özeti (Beta)',
  description: 'PDF → Kısa özet, kavramlar ve Markdown dışa aktarım.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
