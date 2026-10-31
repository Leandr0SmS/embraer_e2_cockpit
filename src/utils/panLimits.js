// Clamps pan coordinates so at least 25% of the viewport always keeps the cockpit visible
// while allowing any step badge (even at the top of the Overhead or bottom of the Pedestal)
// to be centered in the screen.
export function clampPanPosition(positionX, positionY, scale, viewportWidth, viewportHeight) {
  const keepX = Math.min(viewportWidth * 0.25, viewportWidth * scale * 0.6);
  const keepY = Math.min(viewportHeight * 0.25, viewportHeight * scale * 0.6);

  const minX = keepX - viewportWidth * scale;
  const maxX = viewportWidth - keepX;
  const minY = keepY - viewportHeight * scale;
  const maxY = viewportHeight - keepY;

  return {
    x: Math.max(minX, Math.min(maxX, positionX)),
    y: Math.max(minY, Math.min(maxY, positionY)),
  };
}

