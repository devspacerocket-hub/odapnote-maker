const fs = require('fs');
let techSpec = fs.readFileSync('TECH_SPEC.md', 'utf8');

const additionalTechInfo = `
### 3.4. 비동기 UI 흐름 제어 (Asynchronous UI Flow)
사진 처리 중에 사용자에게 보여지는 피드백 UI는 파일 개수에 따라 동적으로 분기됩니다.
* **소량 업로드 (1~2장)**: 별도의 모달 팝업 없이 대시보드 내 인라인(Inline) 스피너를 표시하여 대기 시간을 최소화하고 쾌적한 처리 경험을 제공합니다. 처리가 완료되는 즉시 UI가 전환됩니다.
* **대량 업로드 (3장 이상)**: 처리 시간이 비교적 길어질 수 있음을 안내하고 부가 수익 창출(광고 노출)을 하기 위해 전체 화면 로딩 팝업을 표시합니다. 이 경우 진행 상황(Progress) 안내와 함께 **최소 5초(5000ms)**의 유지 시간을 가지도록 구성하여 사용자에게 안정적인 로딩 피드백을 전달합니다. (완료 후 0.5초 대기 시퀀스 포함)
`;

techSpec = techSpec.replace(
  '---\n\n## 4. 앱 패키징 및 성능 관점 (Performance & App Packaging)',
  additionalTechInfo + '\n---\n\n## 4. 앱 패키징 및 성능 관점 (Performance & App Packaging)'
);

fs.writeFileSync('TECH_SPEC.md', techSpec);
