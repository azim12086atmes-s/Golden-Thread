/** Fit the whole view inside its paper frame without stretching or cropping it. */
export function photoLayout(width, height, maximum = 1440) {
  const scale = Math.min(1, maximum / Math.max(width, height));
  const imageWidth = Math.max(1, Math.round(width * scale));
  const imageHeight = Math.max(1, Math.round(height * scale));
  const border = Math.max(12, Math.round(Math.max(imageWidth, imageHeight) * .018));
  const caption = Math.max(65, border * 4);
  return { width: imageWidth + border * 2, height: imageHeight + border + caption, imageWidth, imageHeight, border, caption };
}
