async function loadAd() {
  try {
    const res = await fetch('/api/ad');
    if (!res.ok) return;
    const data = await res.json();
    const banner = document.getElementById('ad-banner');
    if (banner) banner.innerHTML = data.html;
  } catch {
    // ignore ad loading errors
  }
}

window.addEventListener('load', loadAd);
