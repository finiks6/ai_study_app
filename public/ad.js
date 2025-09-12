window.showAd = function showAd(feature = 'general') {
  return new Promise((resolve) => {
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
    fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature }),
    }).catch(() => {});
    setTimeout(() => {
      document.body.removeChild(ad);
      resolve();
    }, 3000);
  });
};
