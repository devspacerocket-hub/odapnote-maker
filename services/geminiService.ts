
import { AutoAnalysisResult } from "../types";

/**
 * 외부 AI 없이 브라우저에서 직접 픽셀을 분석하여 문제 영역을 감지합니다.
 * 텍스트 밀집도(어두운 픽셀 분포)를 기반으로 바운딩 박스를 계산합니다.
 */
export const detectProblemArea = async (base64Image: string): Promise<AutoAnalysisResult | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      // 성능을 위해 저해상도로 샘플링
      const scale = Math.min(1, 600 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // 1. 그레이스케일 변환 및 텍스트 밀집도 계산
      const rowIntensity = new Int32Array(h);
      const colIntensity = new Int32Array(w);
      const threshold = 130; // 텍스트로 간주할 밝기 임계값

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness < threshold) {
            rowIntensity[y]++;
            colIntensity[x]++;
          }
        }
      }

      // 2. 유효한 텍스트 범위 찾기 (노이즈 제거를 위해 최소 밀집도 이상인 구역만)
      let minY = 0; while (minY < h && rowIntensity[minY] < 3) minY++;
      let maxY = h - 1; while (maxY > minY && rowIntensity[maxY] < 3) maxY--;
      let minX = 0; while (minX < w && colIntensity[minX] < 3) minX++;
      let maxX = w - 1; while (maxX > minX && colIntensity[maxX] < 3) maxX--;

      // 3. 정규화 좌표(0-1000)로 변환하여 결과 반환
      resolve({
        box_2d: [
          (minY / h) * 1000,
          (minX / w) * 1000,
          (maxY / h) * 1000,
          (maxX / w) * 1000
        ],
        rotation_angle: 0 // 로컬 로직에서는 정밀 회전 감지 미지원 (편집기에서 수동 보정 가능)
      });
    };
    img.onerror = () => resolve(null);
  });
};
