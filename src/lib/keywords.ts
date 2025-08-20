const STOP_WORDS = new Set([
  'the','and','for','that','are','with','this','from','have','not','you','your','has','but','was','the','can','all','any','our','out','use','too','its','then','than','they','them','their','there','here','also','very','into','onto','such','may','will','what','when','where','who','why','how','which','while','shall','over','under','again','more','most','some','being','been','were','is','am','about','each','other','could','should','would','might','must','shall','do','does','did','doing','done','ve','bir','ve','bu','da','de','için','ile','veya','ama','en','gibi','çok','daha','ise','kadar','mı','mi','mu','mü','şu','o','onlar','olarak','yani','hem'
]);

export function extractKeywords(text: string, topN = 5): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}
