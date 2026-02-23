
/**
 * Compresses an image file using Canvas.
 * @param {File} file - The original image file.
 * @param {Object} options - Compression options.
 * @returns {Promise<File>} - The compressed image file.
 */
export const compressImage = async (file, { maxWidth = 1600, quality = 0.85 } = {}) => {
    // Only compress images
    if (!file.type.startsWith('image/')) return file;

    // Safety: don't double-compress if we already processed this blob
    if (file._isOptimized) return file;

    // Skip very small files
    if (file.size < 150 * 1024) return file;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if it exceeds maxWidth
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to JPEG with specified quality
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("Compression failed"));
                        return;
                    }

                    // Create a new File object from the blob
                    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    // Mark as optimized to avoid double-compression
                    compressedFile._isOptimized = true;

                    console.log(`Original size: ${(file.size / 1024).toFixed(2)}KB`);
                    console.log(`Compressed size: ${(compressedFile.size / 1024).toFixed(2)}KB`);

                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(new Error("Image identification failed: " + err));
        };
        reader.onerror = (err) => reject(new Error("File reading failed: " + err));
    });
};
