// Adds a subtle light glow that follows the mouse cursor
// Updates CSS custom properties used by welcome.css to position
// a radial gradient around the cursor for a cool hue effect.
//
// Using requestAnimationFrame keeps updates smooth and avoids
// excessive layout thrashing from rapid mousemove events.
const root = document.documentElement;
let cursorX = '50%';
let cursorY = '50%';

document.addEventListener('mousemove', (e) => {
  cursorX = `${e.clientX}px`;
  cursorY = `${e.clientY}px`;
});

function update() {
  root.style.setProperty('--cursorX', cursorX);
  root.style.setProperty('--cursorY', cursorY);
  requestAnimationFrame(update);
}

update();
