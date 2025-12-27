import { AutoAnalysisResult } from "../types";

// This service performs local image analysis without external APIs.
// It uses Canvas API to detect edges for cropping and Projection Profiles for rotation/skew detection.

export const detectProblemArea = async (base64Image: string): Promise<AutoAnalysisResult | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      // 1. Setup Canvas for Analysis (Downscale for performance)
      const canvas = document.createElement('canvas');
      const maxDim = 800; // Increase resolution slightly for better text detection
      let scale = 1;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxDim) {
          scale = maxDim / width;
          height *= scale;
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          scale = maxDim / height;
          width *= scale;
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        resolve(null);
        return;
      }

      // Draw gray & binary for analysis
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Binarize (Thresholding) to make text white(1) and background black(0) or vice versa
      // We perform edge detection first to highlight text lines
      const edgeData = applySobelAndBinarize(imageData);
      
      // 2. Detect Content Bounding Box (Text Area)
      // Uses projection profiles to find the text block and exclude margins/noise
      const bbox = detectContentBox(edgeData, width, height);

      // 3. Detect Rotation (0 vs 90 degrees) and Skew
      const angle = detectBestAngle(edgeData, width, height);

      // 4. Normalize Bounding Box to 0-1000 scale
      const normalize = (val: number, dim: number) => Math.round((val / dim) * 1000);

      const box_2d: [number, number, number, number] = [
        normalize(bbox.minY, height),
        normalize(bbox.minX, width),
        normalize(bbox.maxY, height),
        normalize(bbox.maxX, width)
      ];

      resolve({
        box_2d: box_2d,
        rotation_angle: angle 
      });
    };

    img.onerror = () => {
      resolve(null);
    };
  });
};

// --- Helper Functions ---

function applySobelAndBinarize(imageData: ImageData): Uint8Array {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const output = new Uint8Array(width * height); // 1 channel (0 or 255)
    
    // Simple edge detection
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            
            // Convert to grayscale roughly
            const gray = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            const grayRight = (data[idx+4] + data[idx+5] + data[idx+6]) / 3;
            const grayDown = (data[idx + width*4] + data[idx + width*4 + 1] + data[idx + width*4 + 2]) / 3;
            
            const diff = Math.abs(gray - grayRight) + Math.abs(gray - grayDown);
            output[y * width + x] = diff > 20 ? 1 : 0; // Binary 1 for Edge
        }
    }
    return output;
}

function detectContentBox(binaryData: Uint8Array, width: number, height: number) {
    const horizontalProfile = new Int32Array(height);
    const verticalProfile = new Int32Array(width);

    // Compute profiles: Count edge pixels per row and column
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (binaryData[y * width + x] === 1) {
                horizontalProfile[y]++;
                verticalProfile[x]++;
            }
        }
    }

    // Threshold: A line must have enough edge content to be considered part of the problem.
    // This removes specks of dust or faint lines in the margins.
    // 0.5% of width/height or at least 5 pixels.
    const hThreshold = Math.max(5, width * 0.005);
    const vThreshold = Math.max(5, height * 0.005);

    // Find Y bounds (Top/Bottom)
    let minY = 0;
    while (minY < height && horizontalProfile[minY] < hThreshold) minY++;
    
    let maxY = height - 1;
    while (maxY > minY && horizontalProfile[maxY] < hThreshold) maxY--;

    // Find X bounds (Left/Right)
    let minX = 0;
    while (minX < width && verticalProfile[minX] < vThreshold) minX++;
    
    let maxX = width - 1;
    while (maxX > minX && verticalProfile[maxX] < vThreshold) maxX--;

    if (minX >= maxX || minY >= maxY) {
        // Fallback to full image if detection fails
        return { minX: 0, minY: 0, maxX: width, maxY: height };
    }

    const padding = 15; // Comfortable padding around text
    return {
        minX: Math.max(0, minX - padding),
        minY: Math.max(0, minY - padding),
        maxX: Math.min(width, maxX + padding),
        maxY: Math.min(height, maxY + padding)
    };
}

// Calculate the variance of pixel projection at a given angle
function calculateProjectionVariance(data: Uint8Array, width: number, height: number, angleDeg: number): number {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    // We project onto the Y-axis (vertical profile). 
    // Horizontal text lines create high peaks and deep valleys in the vertical profile.
    
    // Bounds of the rotated image
    const newHeight = Math.abs(width * sin) + Math.abs(height * cos);
    const centerOldX = width / 2;
    const centerOldY = height / 2;
    const centerNewY = newHeight / 2;

    const profile = new Float32Array(Math.ceil(newHeight));
    
    // Sparse sampling for speed
    const step = 2; 

    for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
            if (data[y * width + x] === 1) {
                // Rotate coordinate
                // y_new = -x*sin + y*cos
                const yRot = -(x - centerOldX) * sin + (y - centerOldY) * cos + centerNewY;
                const bin = Math.floor(yRot);
                if (bin >= 0 && bin < profile.length) {
                    profile[bin]++;
                }
            }
        }
    }

    // Calculate Variance of the profile
    // High variance = Distinct lines = Correct rotation
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    
    for (let i = 0; i < profile.length; i++) {
        const val = profile[i];
        if (val > 0) { // Only consider non-empty bins to reduce noise
             sum += val;
             sumSq += val * val;
             count++;
        }
    }
    
    if (count === 0) return 0;
    
    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    
    return variance;
}

function detectBestAngle(data: Uint8Array, width: number, height: number): number {
    // 1. Coarse Search: 0 vs 90 degrees
    // We check which orientation yields "cleaner" lines (higher projection variance)
    const variance0 = calculateProjectionVariance(data, width, height, 0);
    const variance90 = calculateProjectionVariance(data, width, height, 90);
    
    let bestBaseAngle = 0;
    
    // Empirically, text lines (horizontal) give much higher variance on Y-axis projection than vertical chars.
    // If 90 deg projection is better, it means the text runs vertically in current frame.
    // However, if we blindly rotate +90, a "Landscape (Right-Up)" photo becomes Upside Down (180).
    // Usually, rotating -90 (CCW) is the correct fix for "Vertical" looking text from a phone camera.
    
    if (variance90 > variance0 * 1.1) { // 10% margin
        bestBaseAngle = -90;
    }

    // 2. Fine Skew Search (+/- 5 degrees)
    // Now optimization around the base angle
    let maxVariance = -1;
    let bestAngle = bestBaseAngle;

    const range = 5;
    const step = 1;

    for (let ang = bestBaseAngle - range; ang <= bestBaseAngle + range; ang += step) {
        const v = calculateProjectionVariance(data, width, height, ang);
        if (v > maxVariance) {
            maxVariance = v;
            bestAngle = ang;
        }
    }

    return bestAngle;
}