const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

content = content.replace(/setUploadErrorState\(\{isOpen: false, message: ''\}\)/g, "setUploadErrorState({isOpen: false, message: ''}); setUploadPopupState(prev => ({...prev, isOpen: false}))");
fs.writeFileSync('components/Dashboard.tsx', content);
