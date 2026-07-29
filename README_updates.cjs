const fs = require('fs');
let readme = fs.readFileSync('README.md', 'utf8');

readme = readme.replace(
    '- **`components/Dashboard.tsx`**: 메인 대시보드 화면입니다. 파일 업로드 로직(드래그 앤 드롭 포함), 분석 중 로딩 UI 대기열, 오답노트 리스트 렌더링 및 개별 문제 메모 기능, 그리고 부가적인 알림 UI(튜토리얼, 약관 팝업 등)를 관리합니다.',
    '- **`components/Dashboard.tsx`**: 메인 대시보드 화면입니다. 파일 업로드 로직(드래그 앤 드롭 포함), 업로드 사진 수에 따른 동적 로딩 UI(1~2장 인라인 즉시 처리, 3장 이상 전체 모달 노출) 및 대기열 관리, 오답노트 리스트 렌더링 및 개별 문제 메모 기능, 그리고 부가적인 알림 UI를 관리합니다.'
);

fs.writeFileSync('README.md', readme);
