/**
 * Utility functions for image cropping, rotation, validation, and compression (512x512)
 */

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => {
      reject(new Error('Unable to process this image. The file may be invalid or corrupted.'));
    });
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle
 */
export function rotateSize(width, height, rotation) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Validates a selected image file before opening cropper
 */
export async function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'Please select an image file.' };
  }

  // 1. Validate file extension and MIME type
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

  const fileName = (file.name || '').toLowerCase();
  const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = allowedMimes.includes(file.type.toLowerCase());

  if (!hasValidExt || !hasValidMime) {
    return {
      valid: false,
      error: 'Please select a valid image. Only JPG, JPEG, PNG, and WEBP formats are supported.'
    };
  }

  // 2. Validate file size (5MB max)
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'Image size is too large. Maximum allowed file size is 5MB.'
    };
  }

  // 3. Test if image is corrupted or invalid
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await createImage(objectUrl);
    if (!img.naturalWidth || !img.naturalHeight) {
      URL.revokeObjectURL(objectUrl);
      return {
        valid: false,
        error: 'Unable to process this image. Image dimensions could not be read.'
      };
    }
    URL.revokeObjectURL(objectUrl);
    return { valid: true };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    return {
      valid: false,
      error: 'Unable to process this image. The file appears to be corrupted or invalid.'
    };
  }
}

/**
 * Takes an image source, cropped area coordinates, and rotation angle,
 * then generates a high-quality 512x512 JPEG image file and preview URL.
 */
export async function getCroppedImg(imageSrc, pixelCrop, rotation = 0, targetSize = 512) {
  const image = await createImage(imageSrc);
  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  // Set initial canvas size to match the rotated bounding box
  const canvas = document.createElement('canvas');
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to process this image: 2D context unavailable.');
  }

  // Translate canvas context to center point on screen to rotate around its center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Create destination canvas for the exact 512x512 target output
  const destCanvas = document.createElement('canvas');
  destCanvas.width = targetSize;
  destCanvas.height = targetSize;
  const destCtx = destCanvas.getContext('2d');

  if (!destCtx) {
    throw new Error('Unable to process this image: destination canvas unavailable.');
  }

  // Ensure high quality downsampling
  destCtx.imageSmoothingEnabled = true;
  destCtx.imageSmoothingQuality = 'high';

  // Crop the requested pixel area from the rotated canvas and scale to target size
  destCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  );

  // Export as compressed, optimized JPEG blob (quality 0.92 is visually indistinguishable from uncompressed)
  return new Promise((resolve, reject) => {
    destCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to process this image. Canvas export failed.'));
          return;
        }

        const file = new File([blob], `profile-avatar-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        const previewUrl = URL.createObjectURL(blob);
        resolve({ file, previewUrl, blob });
      },
      'image/jpeg',
      0.92
    );
  });
}

