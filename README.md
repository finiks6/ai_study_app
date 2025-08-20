# Ücretsiz Ders Özeti (Web MVP)

Next.js (App Router) + pdf.js + Transformers.js (tarayıcı-içi özet) iskeleti.

## 1) Kurulum
```bash
# Node 18+ önerilir
npx create-next-app@latest summarize-free --ts --app --src-dir --eslint --tailwind=false
cd summarize-free
# Bu repo ağacındaki dosyaları / içerikleri projeye kopyala (aynı yollarla)
npm i pdfjs-dist @xenova/transformers
npm run dev
