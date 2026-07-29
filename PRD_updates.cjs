const fs = require('fs');

let prd = fs.readFileSync('PRD.md', 'utf8');

const additionalInfo = `* **처리 UI 분기**: 한 번에 업로드하는 사진 수에 따라 UI와 대기 시간이 달라집니다.
  * **1~2장 업로드**: 화면 전환이나 모달 표시 없이, 인라인 UI로 진행 상태를 표시하여 빠른 체감 속도를 제공합니다.
  * **3장 이상 업로드**: 쾌적한 처리 진행률 안내 및 광고 노출을 위해 전체 모달 팝업을 띄우며, 사진 처리와 함께 최소 5초간 유지됩니다.`;

prd = prd.replace(
  '* **순수 로컬 픽셀 분석 (`geminiService.ts`)**:',
  additionalInfo + '\n* **순수 로컬 픽셀 분석 (`geminiService.ts`)**:'
);

fs.writeFileSync('PRD.md', prd);
