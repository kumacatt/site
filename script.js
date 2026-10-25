// Intro Animation
window.addEventListener('load', () => {
  const introOverlay = document.getElementById('intro-overlay');
  setTimeout(() => {
    introOverlay.classList.add('hidden');
    // Remove the overlay from the DOM after the animation
    introOverlay.addEventListener('transitionend', () => {
      introOverlay.remove();
    });
  }, 2000); // Overlay visible for 2 seconds
});

