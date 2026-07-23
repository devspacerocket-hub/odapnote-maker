const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// 1. Change waitTime
content = content.replace(
  'const waitTime = isInline ? MIN_LOADING_VISIBLE_MS : MIN_AD_MODAL_VISIBLE_MS;',
  'const waitTime = isInline ? 0 : MIN_AD_MODAL_VISIBLE_MS;'
);

// 2. Change complete state transition
const oldCompleteLogic = `      if (jobId !== currentJobIdRef.current) return;
      
      setUploadPopupState(prev => ({ ...prev, status: 'complete' }));
      
      await delay(COMPLETE_MESSAGE_VISIBLE_MS);
      
      if (jobId !== currentJobIdRef.current) return;
      
      setUploadPopupState(prev => ({ ...prev, isOpen: false }));`;

const newCompleteLogic = `      if (jobId !== currentJobIdRef.current) return;
      
      if (isInline) {
         setUploadPopupState(prev => ({ ...prev, isOpen: false }));
      } else {
         setUploadPopupState(prev => ({ ...prev, status: 'complete' }));
         await delay(COMPLETE_MESSAGE_VISIBLE_MS);
         if (jobId !== currentJobIdRef.current) return;
         setUploadPopupState(prev => ({ ...prev, isOpen: false }));
      }`;

content = content.replace(oldCompleteLogic, newCompleteLogic);

fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Fixed inline transition');
