async function extractText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';

    const opList = await page.getOperatorList();
    for (let j = 0; j < opList.fnArray.length; j++) {
      const fn = opList.fnArray[j];
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
        try {
          const name = opList.argsArray[j][0];
          const img = await page.objs.get(name);
          if (img) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.putImageData(img, 0, 0);
            images.push({ url: canvas.toDataURL(), caption: `Page ${i} image` });
          }
        } catch {
          // ignore image extraction errors
        }
      }
    }
  }
  return { text, pageCount: pdf.numPages, images };
}

async function fetchWikipedia(link) {
  try {
    const titlePart = link.trim().split('/').pop().split('#')[0].split('?')[0];
    const title = decodeURIComponent(titlePart);
    const textUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext&format=json&titles=${encodeURIComponent(title)}&origin=*`;
    const res = await fetch(textUrl);
    const data = await res.json();
    const pages = data?.query?.pages || {};
    const page = pages[Object.keys(pages)[0]];
    const extract = page?.extract || '';

    const imgRes = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=images&format=json&origin=*`);
    const imgData = await imgRes.json();
    const imgTitles = imgData?.parse?.images || [];

    const imgPromises = imgTitles.slice(0, 3).map(async (t) => {
      try {
        const infoRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(t)}&prop=imageinfo&iiprop=url&format=json&origin=*`);
        const infoData = await infoRes.json();
        const pages = infoData?.query?.pages || {};
        const imgPage = pages[Object.keys(pages)[0]];
        const url = imgPage?.imageinfo?.[0]?.url;
        if (url) {
          return { url, caption: t.replace(/_/g, ' ') };
        }
      } catch {
        // ignore image errors
      }
      return null;
    });

    const images = (await Promise.all(imgPromises)).filter(Boolean);

    return { text: extract, images };
  } catch {
    return { text: '', images: [] };
  }
}

function showAd() {
  return new Promise(resolve => {
    const ad = document.createElement('div');
    ad.textContent = 'Playing ad...';
    ad.style.position = 'fixed';
    ad.style.top = '0';
    ad.style.left = '0';
    ad.style.right = '0';
    ad.style.bottom = '0';
    ad.style.background = 'rgba(0,0,0,0.8)';
    ad.style.color = 'white';
    ad.style.display = 'flex';
    ad.style.alignItems = 'center';
    ad.style.justifyContent = 'center';
    document.body.appendChild(ad);
    setTimeout(() => {
      document.body.removeChild(ad);
      resolve();
    }, 3000);
  });
}

async function loadHistory() {
  const res = await fetch('/api/summaries');
  const data = await res.json();
  const list = document.getElementById('history');
  list.innerHTML = '';
  data.summaries.forEach(item => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `/summaries/${item.id}`;
    const plain = item.summary.replace(/<[^>]+>/g, '');
    link.textContent = plain;
    li.appendChild(link);
    list.appendChild(li);
  });
}

document.getElementById('summarize-btn').addEventListener('click', async () => {
  const pdfInput = document.getElementById('pdf-input');
  const wikiLink = document.getElementById('wiki-input').value.trim();
  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = 'Loading...';

  let text = '';
  let images = [];
  if (wikiLink) {
    const res = await fetchWikipedia(wikiLink);
    text = res.text;
    images = res.images;
    if (!text) {
      summaryEl.textContent = 'Unable to load article.';
      return;
    }
  } else if (pdfInput.files.length) {
    const { text: t, pageCount, images: imgs } = await extractText(pdfInput.files[0]);
    if (pageCount > 50) {
      alert('PDF too long (max 50 pages).');
      summaryEl.textContent = '';
      return;
    }
    if (pageCount > 5) {
      const accepted = confirm('This PDF is over 5 pages and requires watching an ad. Proceed?');
      if (!accepted) {
        summaryEl.textContent = 'Ad declined. Cannot summarize PDFs over 5 pages without watching it.';
        return;
      }
      await showAd();
    }
    text = t;
    images = imgs;
  } else {
    alert('Please select a PDF file or enter a Wikipedia link.');
    summaryEl.textContent = '';
    return;
  }

  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, images })
    });
    const data = await res.json();
    summaryEl.innerHTML = (data.summary || 'No summary returned').replace(/\n/g, '<br>');
  } catch (err) {
    summaryEl.textContent = 'Error';
  }
  loadHistory();
});

window.addEventListener('load', loadHistory);
