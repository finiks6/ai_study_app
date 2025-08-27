(() => {
  function spawn(e) {
    if (Math.random() > 0.35) return;
    const btn = e.currentTarget;
    const particle = document.createElement('span');
    particle.className = 'btn-particle';
    const size = Math.random() * 3 + 2;
    particle.style.width = particle.style.height = size + 'px';
    const styles = getComputedStyle(btn);
    let color = styles.backgroundColor;
    if (!color || color === 'rgba(0, 0, 0, 0)') {
      color = styles.borderColor || styles.color;
    }
    particle.style.background = color;
    particle.style.left = e.offsetX + 'px';
    particle.style.top = e.offsetY + 'px';
    const angle = Math.random() * Math.PI * 2;
    const distance = 20;
    particle.style.setProperty('--x', Math.cos(angle) * distance + 'px');
    particle.style.setProperty('--y', Math.sin(angle) * distance + 'px');
    btn.appendChild(particle);
    particle.addEventListener('animationend', () => particle.remove());
  }

  document.querySelectorAll('button, .btn').forEach(btn => {
    btn.style.position = 'relative';
    btn.style.overflow = 'visible';
    btn.addEventListener('mousemove', spawn);
  });
})();
