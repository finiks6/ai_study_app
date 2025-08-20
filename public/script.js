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

let pdfText = '';

async function loadHistory() {
  const res = await fetch('/api/summaries');
  const data = await res.json();
  const list = document.getElementById('history');
  list.innerHTML = '';
  data.summaries.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.summary;
    list.appendChild(li);
  });
}

document.getElementById('summarize-btn').addEventListener('click', async () => {
  const input = document.getElementById('pdf-input');
  if (!input.files.length) {
    alert('Please select a PDF file first.');
    return;
  }
  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = 'Loading...';
  pdfText = await extractText(input.files[0]);
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pdfText })
    });
    const data = await res.json();
    summaryEl.textContent = data.summary || 'No summary returned';
  } catch (err) {
    summaryEl.textContent = 'Error';
  }
  loadHistory();
});

window.addEventListener('load', loadHistory);
