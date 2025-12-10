/**
 * Convert lasso points to a base64 PNG mask
 * @param {Array} lassoPoints - Array of {x, y} points from lasso selection
 * @param {number} width - Width of the image
 * @param {number} height - Height of the image
 * @returns {Promise<string>} Base64 encoded PNG mask (WHITE=edit area, BLACK=preserve)
 */
export const lassoPointsToMask = (lassoPoints, width, height) => {
  return new Promise((resolve, reject) => {
    try {
      // Create an offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Fill with black (preserve area)
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      // Draw the lasso selection in white (editable area)
      if (lassoPoints && lassoPoints.length > 2) {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);

        lassoPoints.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });

        ctx.closePath();
        ctx.fill();
      }

      // Convert canvas to base64 PNG (without data URI prefix)
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]; // Remove data URI prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Convert base64 image to plain base64 (remove data URI prefix if present)
 * @param {string} base64String - Base64 string with or without data URI prefix
 * @returns {string} Plain base64 string
 */
export const stripDataUriPrefix = (base64String) => {
  if (!base64String) return '';

  // Check if it has a data URI prefix
  if (base64String.startsWith('data:')) {
    // Split on comma and return the second part
    const parts = base64String.split(',');
    return parts.length > 1 ? parts[1] : base64String;
  }

  return base64String;
};
