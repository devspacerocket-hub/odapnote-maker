/**
 * utils/imageProcessor.ts
 * 
 * [목적]
 * 업로드된 이미지에 대해 자르기, 회전, 명도 조절(스캔 필터), 그림자 제거 등의 조작을
 * 브라우저의 HTML5 Canvas API를 사용해 오프라인/로컬 환경에서 수행하는 유틸리티 함수 모음입니다.
 */
import { AutoAnalysisResult } from '../types';

/**
 * 이미지 자동 자르기 및 기울기 보정, 필터링을 한 번에 수행하는 메인 처리 함수입니다.
 * 
 * @param imageSrc 처리할 원본 이미지 (Base64)
 * @param analysis geminiService에서 반환된 텍스트 영역 바운딩 박스 정보
 * @param options 스캔 필터 적용 여부, 그림자 제거 여부 옵션
 * @returns 처리 완료된 Base64 이미지 문자열 (Promise)
 */
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
      // 1. 메모리상에 캔버스를 생성해 이미지를 그립니다.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context not available')); return; }

      const { width, height } = img;
      // 정규화된 0~1000 좌표를 실제 픽셀 스케일로 변환합니다.
      const [ymin, xmin, ymax, xmax] = analysis.box_2d;
      const angle = analysis.rotation_angle || 0;

      // 분석된 박스 주변으로 여유 여백(padding)을 약간 둡니다.
      const padding = 20; 
      const cY = Math.max(0, (ymin - padding) / 1000 * height);
      const cX = Math.max(0, (xmin - padding) / 1000 * width);
      const cH = Math.min(height - cY, ((ymax + padding) - (ymin - padding)) / 1000 * height);
      const cW = Math.min(width - cX, ((xmax + padding) - (xmin - padding)) / 1000 * width);

      // 2. 바운딩 박스 기준으로 1차 자르기(Crop) 수행
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cW;
      cropCanvas.height = cH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) { reject(new Error('Crop context error')); return; }
      cropCtx.drawImage(img, cX, cY, cW, cH, 0, 0, cW, cH);

      let finalCanvas = cropCanvas;
      
      // 3. 만약 회전이 필요하다면 회전 후 그립니다. (로컬 분석에선 기본 0도)
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
      
      // 4. 요청된 옵션에 따라 후처리(자체 그림자 제거, 대비 스캔 필터) 적용
      const destCtx = finalCanvas.getContext('2d');
      if (destCtx) {
          if (options.removeShadows) applyShadowRemoval(finalCanvas, destCtx);
          if (options.enableFilter) applyScanFilter(finalCanvas, destCtx);
      }

      // 5. 처리 후 다시 가장자리의 불필요한 공백을 추가로 트리밍하여 최적화
      const trimmedCanvas = trimWhiteBorders(finalCanvas);
      resolve(trimmedCanvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
  });
};

/**
 * AI 없이 로컬 로직으로 휴대폰 촬영 시 발생하는 불균일한 조명(그림자)을 제거하는 함수입니다.
 * 
 * [원리] 
 * 이미지를 일정 크기의 격자(Grid)로 나눈 후, 각 격자의 가장 밝은 색(종이의 배경색으로 가정)을 추정합니다.
 * 이 추정된 배경색을 기준으로 원본 픽셀을 나누어 명도를 평탄화(Background Normalization)합니다.
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
            
            // 조도가 너무 낮으면(원래 검은 글자 영역 등) 보정에서 제외하여 번짐을 방지
            const factor = bg < 40 ? 1 : 255 / bg;

            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }
    }
    ctx.putImageData(imageData, 0, 0);
};

/**
 * 문서를 스캐너로 스캔한 것처럼 대비(Contrast)를 강하게 만들고,
 * 연한 회색(노이즈)을 흰색으로 날려주는 흑백 보정 필터입니다.
 */
export const applyScanFilter = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // 컬러를 흑백(Grayscale)으로 변환
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const contrastFactor = 1.4; // 대비 배율
        const brightnessOffset = 20; // 밝기 띄우기
        
        // 중간값(128)을 기준으로 대비 증폭
        let val = ((gray - 128) * contrastFactor) + 128 + brightnessOffset;
        
        // 거의 흰색에 가까운 픽셀(>240)은 완전한 흰색(255)으로 처리하여 종이 질감 제거
        if (val > 240) val = 255;
        val = Math.max(0, Math.min(255, val));
        
        data[i] = data[i + 1] = data[i + 2] = val; // RGB 모두 동일한 흑백 값 적용
    }
    ctx.putImageData(imageData, 0, 0);
};

/**
 * 이미지 주변에 쓸모없이 붙어있는 하얀 배경(여백)을 다시 한번 깎아내는 유틸리티 함수입니다.
 */
const trimWhiteBorders = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const hProfile = new Int32Array(height);
    const vProfile = new Int32Array(width);

    // 가로/세로 축으로 향하며 하얀색(>250)이 아닌 "의미 있는 픽셀"이 있는지 카운트합니다.
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