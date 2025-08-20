import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

async function extractText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

const summarizeBtn = document.getElementById('summarize-btn');

summarizeBtn.addEventListener('click', async () => {
  const input = document.getElementById('pdf-input');
  if (!input.files.length) {
    alert('Please select a PDF file first.');
    return;
  }
  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = 'Loading...';
  const text = await extractText(input.files[0]);
  const summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
  const result = await summarizer(text, { max_length: 60 });
  summaryEl.textContent = result[0].summary_text;
});
