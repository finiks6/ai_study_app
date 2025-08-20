'use client';
// Tarayıcı-içi özetleme (Transformers.js). İlk çalıştırmada model dosyaları indirilir.
import { pipeline, env } from '@xenova/transformers';
import { chunkByChars } from './chunk';

// Opsiyonel: wasm/WebGPU için cache ve sessiz mod
env.allowLocalModels = false; // CDN'den indirsin
env.backends.onnx.wasm.numThreads = 1; // cihazınıza göre artırabilirsiniz

let summarizer: any | null = null;

export async function summarizeClient(text: string): Promise<string> {
  if (!summarizer) {
    // DistilBART CNN-6-6, hızlı ve hafif bir özetleme modeli (İngilizce odaklı). Türkçe performansı temel düzeydir.
    summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
  }
  // V1: basit parça-özet → birleştirme
  const chunks = chunkByChars(text, 1800);
  const parts: string[] = [];
  for (const c of chunks) {
    const res = await summarizer(c, { max_new_tokens: 180 });
    const s = Array.isArray(res) ? res[0]?.summary_text : res?.summary_text;
    if (s) parts.push(s);
  }
  return parts.join(' ');
}
