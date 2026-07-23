const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// Replace 닫기 button logic
content = content.replace(
    /onClick=\{\(\) => setUploadErrorState\(\{isOpen: false, message: ''\}\)\}/g,
    'onClick={() => { setUploadErrorState({isOpen: false, message: \'\'}); setUploadPopupState(prev => ({...prev, isOpen: false})); }}'
);

// Replace 다시 시도 button logic
// "다시 시도 버튼 클릭 -> 오류 팝업 종료 -> 기존 로딩 팝업을 초기 처리 상태로 변경 -> 해당 작업 다시 실행"
// runImageProcessing already sets the popup state to processing.
// Let's just make sure it also clears it if it was open. But runImageProcessing overwrites the state so it's fine.

fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Fixed error close logic');
