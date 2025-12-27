import { AutoAnalysisResult } from '../types';

export const autoCropAndStraighten = (
  imageSrc: string,
  analysis: AutoAnalysisResult,
  options: { enableFilter?: boolean; removeShadows?: boolean } = { enableFilter: true, removeShadows: true }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }

      const { width, height } = img;
      const [ymin, xmin, ymax, xmax] = analysis.box_2d;
      const angle = analysis.rotation_angle || 0;

      const padding = 20; 
      const cY = Math.max(0, (ymin - padding) / 1000 * height);
      const cX = Math.max(0, (xmin - padding) / 1000 * width);
      const cH = Math.min(height - cY, ((ymax + padding) - (ymin - padding)) / 1000 * height);
      const cW = Math.min(width - cX, ((xmax + padding) - (xmin - padding)) / 1000 * width);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cW;
      cropCanvas.height = cH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) { reject(new Error('Crop context error')); return; }
      cropCtx.drawImage(img, cX, cY, cW, cH, 0, 0, cW, cH);

      let finalCanvas = cropCanvas;
      if (Math.abs(angle) > 0.5) {
          const rad = (angle * Math.PI) / 180;
          const rotatedWidth = Math.abs(cW * Math.cos(rad)) + Math.abs(cH * Math.sin(rad));
          const rotatedHeight = Math.abs(cW * Math.sin(rad)) + Math.abs(cH * Math.cos(rad));
          const rotateCanvas = document.createElement('canvas');
          rotateCanvas.width = rotatedWidth;
          rotateCanvas.height = rotatedHeight;
          const rotateCtx = rotateCanvas.getContext('2d');
          if (rotateCtx) {
              rotateCtx.fillStyle = '#ffffff';
              rotateCtx.fillRect(0, 0, rotatedWidth, rotatedHeight);
              rotateCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
              rotateCtx.rotate(rad);
              rotateCtx.drawImage(cropCanvas, -cW / 2, -cH / 2);
              finalCanvas = rotateCanvas;
          }
      }
      
      const destCtx = finalCanvas.getContext('2d');
      if (destCtx) {
          if (options.removeShadows) applyShadowRemoval(finalCanvas, destCtx);
          if (options.enableFilter) applyScanFilter(finalCanvas, destCtx);
      }

      const trimmedCanvas = trimWhiteBorders(finalCanvas);
      resolve(trimmedCanvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
  });
};

/**
 * AI 없이 로컬 로직으로 음영을 제거하는 함수
 * 배경 조도 평탄화 (Background Normalization) 기법 사용
 */
export const applyShadowRemoval = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 1. 배경 조도 추정 (격자 샘플링)
    const gridSize = 32;
    const cols = Math.ceil(width / gridSize);
    const rows = Math.ceil(height / gridSize);
    const bgMap = new Float32Array(cols * rows);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let maxBright = 0;
            // 각 블록에서 가장 밝은 픽셀(종이 색)을 찾음
            for (let y = r * gridSize; y < (r + 1) * gridSize && y < height; y++) {
                for (let x = c * gridSize; x < (c + 1) * gridSize && x < width; x++) {
                    const i = (y * width + x) * 4;
                    const bright = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    if (bright > maxBright) maxBright = bright;
                }
            }
            bgMap[r * cols + c] = maxBright;
        }
    }

    // 2. 픽셀 보정 (원본 / 조도 * 255)
    for (let y = 0; y < height; y++) {
        const r = Math.floor(y / gridSize);
        for (let x = 0; x < width; x++) {
            const c = Math.floor(x / gridSize);
            const i = (y * width + x) * 4;
            const bg = bgMap[r * cols + c] || 255;
            
            // 조도가 너무 낮으면(검은 영역) 보정 제외
            const factor = bg < 40 ? 1 : 255 / bg;

            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }
    }
    ctx.putImageData(imageData, 0, 0);
};

export const applyScanFilter = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrastFactor = 1.4; 
        const brightnessOffset = 20;
        let val = ((gray - 128) * contrastFactor) + 128 + brightnessOffset;
        if (val > 240) val = 255;
        val = Math.max(0, Math.min(255, val));
        data[i] = data[i + 1] = data[i + 2] = val;
    }
    ctx.putImageData(imageData, 0, 0);
};

const trimWhiteBorders = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const hProfile = new Int32Array(height);
    const vProfile = new Int32Array(width);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i] < 250) { hProfile[y]++; vProfile[x]++; }
        }
    }

    let minY = 0; while (minY < height && hProfile[minY] < 5) minY++;
    let maxY = height - 1; while (maxY > minY && hProfile[maxY] < 5) maxY--;
    let minX = 0; while (minX < width && vProfile[minX] < 5) minX++;
    let maxX = width - 1; while (maxX > minX && vProfile[maxX] < 5) maxX--;

    if (minX >= maxX || minY >= maxY) return canvas;

    const pad = 10;
    const tx = Math.max(0, minX - pad), ty = Math.max(0, minY - pad);
    const tw = Math.min(width - tx, (maxX - minX) + pad * 2), th = Math.min(height - ty, (maxY - minY) + pad * 2);

    const trimmed = document.createElement('canvas');
    trimmed.width = tw; trimmed.height = th;
    const tCtx = trimmed.getContext('2d');
    if (!tCtx) return canvas;
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, tw, th);
    tCtx.drawImage(canvas, tx, ty, tw, th, 0, 0, tw, th);
    return trimmed;
};