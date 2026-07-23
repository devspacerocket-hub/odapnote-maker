const fs = require('fs');
let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// Just replace the whole button
const oldBtn = `<button 
                  onClick={() => setUploadErrorState({isOpen: false, message: ''})}
                  className="px-6 py-3 border-2 border-gray-900 text-gray-900 font-bold rounded-full hover:bg-gray-50 transition"
               >
                 닫기
               </button>`;
const newBtn = `<button 
                  onClick={() => { setUploadErrorState({isOpen: false, message: ''}); setUploadPopupState(prev => ({...prev, isOpen: false})); }}
                  className="px-6 py-3 border-2 border-gray-900 text-gray-900 font-bold rounded-full hover:bg-gray-50 transition"
               >
                 닫기
               </button>`;
content = content.replace(oldBtn, newBtn);
fs.writeFileSync('components/Dashboard.tsx', content);
