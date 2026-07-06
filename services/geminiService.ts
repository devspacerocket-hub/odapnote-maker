
/**
 * services/geminiService.ts
 * 
 * [목적]
 * 파일 이름(gemini)과 달리, 실제로는 외부 AI나 API를 전~혀 호출하지 않고
 * 사용자의 브라우저 내에서 직접 픽셀 데이터를 분석하여 문서의 여백을 자르고 핵심 영역을 찾는 '로컬 분석 모듈'입니다.
 * 이를 통해 사용자 데이터를 서버로 전송하지 않아 개인정보 보호(보안)가 유지됩니다.
 */
import { AutoAnalysisResult } from "../types";

/**
 * 외부 AI 없이 브라우저에서 직접 픽셀을 분석하여 문제 영역을 감지합니다.
 * 텍스트 밀집도(어두운 픽셀 분포)를 기반으로 여백을 계산하여 바운딩 박스를 도출합니다.
 *
 * @param base64Image 분석할 원본 이미지의 Base64 문자열
 * @returns 텍스트 영역을 감싼 정규화된 바운딩 박스(0-1000) 및 회전각을 담은 객체 (Promise)
 */
export const detectProblemArea = async (base64Image: string): Promise<AutoAnalysisResult | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Image;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }

      // 브라우저 성능 최적화를 위해 원본의 해상도를 800px 이하로 축소하여 분석합니다.
      const maxDim = 800;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 이미지를 캔버스에 그린 후, ImageData를 뽑아와 픽셀 배열(data)을 순회합니다.
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // 각 행(row)과 열(column) 단위로 '어두운 픽셀'이 몇 개 나타났는지 카운트할 배열입니다.
      const rowIntensity = new Int32Array(h);
      const colIntensity = new Int32Array(w);
      const threshold = 140; // 텍스트(글자)로 간주할 밝기 임계값 (0=검정, 255=흰색)

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4; // R, G, B, A 순서
          // RGB 값을 인간의 시각 인지 모델에 맞춘 명도(밝기) 수치로 변환합니다(그레이스케일링).
          const brightness = (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
          
          // 밝기가 임계값보다 낮으면 어두운 영역(글자 등)으로 간주하고 강도를 누적합니다.
          if (brightness < threshold) {
            rowIntensity[y]++;
            colIntensity[x]++;
          }
        }
      }

      // 사소한 얼룩(노이즈)을 무시하기 위해 전체 너비의 약 1%를 최소 밀집도 기준으로 세팅합니다.
      const noiseTolerance = Math.max(2, w * 0.01);
      
      // 위에서 아래로(minY), 아래에서 위로(maxY) 탐색하며 텍스트 영역의 경계를 찾습니다.
      let minY = 0; while (minY < h && rowIntensity[minY] < noiseTolerance) minY++;
      let maxY = h - 1; while (maxY > minY && rowIntensity[maxY] < noiseTolerance) maxY--;
      
      // 왼쪽에서 오른쪽으로(minX), 오른쪽에서 왼쪽으로(maxX) 탐색하며 경계를 찾습니다.
      let minX = 0; while (minX < w && colIntensity[minX] < noiseTolerance) minX++;
      let maxX = w - 1; while (maxX > minX && colIntensity[maxX] < noiseTolerance) maxX--;

      // 바운딩 박스가 너무 작게 추출된 경우(예: 백지이거나 인식이 안 된 경우) 기본값을 반환합니다.
      if (maxY - minY < 20 || maxX - minX < 20) {
        resolve({
          box_2d: [50, 50, 950, 950], // 전체 화면에서 가장자리 5% 여백
          rotation_angle: 0
        });
        return;
      }

      // 찾아낸 경계를 0부터 1000까지의 상대적(정규화된) 비율로 변환하여 넘겨줍니다. 
      // (다른 모듈에서 원본 이미지의 실제 픽셀 스케일에 대응하기 위함)
      resolve({
        box_2d: [
          (minY / h) * 1000,
          (minX / w) * 1000,
          (maxY / h) * 1000,
          (maxX / w) * 1000
        ],
        rotation_angle: 0 // 현재 알고리즘에서 각도 추출은 사용하지 않음
      });
    };
    
    // 이미지 로드 실패 시 안전하게 null 반환
    img.onerror = () => {
      console.error("Local Analysis: Failed to load image");
      resolve(null);
    };
  });
};
