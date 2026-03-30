// OLD — dot was being created dynamically somewhere in code
const dot = document.createElement('div');
dot.id = 'laserDot';
document.body.appendChild(dot); // ← second dot!

// NEW — laser.js grabs the existing DOM element, full stop
const Laser = (() => {
  const dot = document.getElementById('laserDot'); // ← grab once, never create

  function moveTo(x, y) {
    dot.style.left = (x * window.innerWidth)  + 'px';
    dot.style.top  = (y * window.innerHeight) + 'px';
    dot.classList.add('visible');
  }

  // Only Laser.moveTo() ever moves the dot — nothing else touches it
  return { moveTo, hide, start, stop };
})();