// Çok basit parça bölücü; V2'de cümle sonlarına göre akıllandırılabilir.
export function chunkByChars(s: string, max = 1800): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    out.push(s.slice(i, i + max));
    i += max;
  }
  return out;
}
