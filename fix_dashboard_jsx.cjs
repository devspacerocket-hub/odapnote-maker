const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// Find '{isAdShowing' and remove everything up to and including ')}'
const adShowingStart = content.indexOf('{isAdShowing && (');
if (adShowingStart !== -1) {
    let bracketsCount = 0;
    let endIdx = -1;
    for (let i = adShowingStart; i < content.length; i++) {
        if (content[i] === '{') bracketsCount++;
        if (content[i] === '}') bracketsCount--;
        
        if (bracketsCount === 0 && content.substring(i - 1, i + 1) === ')}') {
             endIdx = i + 1;
             break;
        }
    }
    if (endIdx !== -1) {
        content = content.slice(0, adShowingStart) + content.slice(endIdx);
    }
}

const processingStart = content.indexOf('{isProcessing && (');
if (processingStart !== -1) {
    let bracketsCount = 0;
    let endIdx = -1;
    for (let i = processingStart; i < content.length; i++) {
        if (content[i] === '{') bracketsCount++;
        if (content[i] === '}') bracketsCount--;
        
        if (bracketsCount === 0 && content.substring(i - 1, i + 1) === ')}') {
             endIdx = i + 1;
             break;
        }
    }
    if (endIdx !== -1) {
        const newJSX = `{uploadPopupState.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center scale-up flex flex-col items-center">
             <div className="mb-6 w-full min-h-[100px] flex justify-center">
                 <AdSenseUnit slotId="loading-ad" format="rectangle" label="학원 광고 영역" />
             </div>
             
             {uploadPopupState.status === 'processing' ? (
                <>
                  <p className="text-gray-900 text-lg font-bold mb-1">사진을 처리하고 있습니다.</p>
                  <p className="text-gray-600 text-sm mb-6">잠시만 기다려 주세요.</p>
                  
                  <p className="text-gray-900 font-black tracking-widest text-lg mb-4">
                     {Math.max(1, uploadPopupState.currentProcessed)} / {uploadPopupState.totalImages}
                  </p>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                      <div className="h-full bg-gray-900 animate-loading-bar"></div>
                  </div>
                </>
             ) : (
                <>
                  <div className="w-16 h-16 border-2 border-gray-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
                    <ShieldCheck size={32} className="text-gray-900" />
                  </div>
                  <p className="text-gray-900 text-lg font-bold">사진 처리가 완료되었습니다.</p>
                </>
             )}
          </div>
        </div>
      )}
      
      {uploadErrorState.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center scale-up">
            <div className="w-16 h-16 border-2 border-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 bg-red-50">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            
            {uploadErrorState.message.split('\\n').map((line, i) => (
                <p key={i} className={i === 0 ? "text-xl font-black text-gray-900 mb-2" : "text-gray-600 text-sm mb-4"}>
                  {line}
                </p>
            ))}
            
            <div className="mt-8 flex gap-3 justify-center">
               <button 
                  onClick={() => setUploadErrorState({isOpen: false, message: ''})}
                  className="px-6 py-3 border-2 border-gray-900 text-gray-900 font-bold rounded-full hover:bg-gray-50 transition"
               >
                 닫기
               </button>
               {uploadErrorState.filesToRetry && (
                 <button 
                    onClick={() => {
                        const files = uploadErrorState.filesToRetry;
                        setUploadErrorState({isOpen: false, message: ''});
                        if (files) runImageProcessing(files);
                    }}
                    className="px-6 py-3 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition"
                 >
                   다시 시도
                 </button>
               )}
            </div>
          </div>
        </div>
      )}`;
        content = content.slice(0, processingStart) + newJSX + content.slice(endIdx);
    }
}

fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Fixed Dashboard JSX');
