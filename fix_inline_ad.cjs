const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// 1. Constants
content = content.replace(
  'const MIN_LOADING_VISIBLE_MS = 1200;\nconst COMPLETE_MESSAGE_VISIBLE_MS = 500;',
  'const MIN_LOADING_VISIBLE_MS = 1200;\nconst MIN_AD_MODAL_VISIBLE_MS = 5000;\nconst COMPLETE_MESSAGE_VISIBLE_MS = 500;\nconst AD_MODAL_FILE_COUNT_THRESHOLD = 3;'
);

// 2. Interface
content = content.replace(
  'totalImages: number;\n}',
  'totalImages: number;\n  isInline: boolean;\n}'
);

// 3. State initialization
content = content.replace(
  `status: 'processing',
    currentProcessed: 0,
    totalImages: 0
  });`,
  `status: 'processing',
    currentProcessed: 0,
    totalImages: 0,
    isInline: false
  });`
);

// 4. runImageProcessing function
content = content.replace(
  `    setUploadPopupState({
       isOpen: true,
       status: 'processing',
       currentProcessed: Math.min(1, files.length), // show 1 if started
       totalImages: files.length
    });

    try {
      await Promise.all([
        processImages(files, jobId),
        delay(MIN_LOADING_VISIBLE_MS)
      ]);`,
  `    const isInline = files.length < AD_MODAL_FILE_COUNT_THRESHOLD;
    const waitTime = isInline ? MIN_LOADING_VISIBLE_MS : MIN_AD_MODAL_VISIBLE_MS;

    setUploadPopupState({
       isOpen: true,
       status: 'processing',
       currentProcessed: Math.min(1, files.length), // show 1 if started
       totalImages: files.length,
       isInline
    });

    try {
      await Promise.all([
        processImages(files, jobId),
        delay(waitTime)
      ]);`
);

// 5. JSX replacement
const oldJSX = `{uploadPopupState.isOpen && (
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
      )}`;

const newJSX = `{uploadPopupState.isOpen && (
        uploadPopupState.isInline ? (
          <div className="fixed inset-0 z-[110] bg-[#fcfaf5]/95 flex flex-col items-center justify-center text-center p-6">
              {uploadPopupState.status === 'processing' ? (
                 <>
                    <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
                    <p className="text-xl font-black text-gray-900 font-mono tracking-tighter mb-1">사진을 처리하고 있습니다.</p>
                    <p className="text-gray-900 font-black tracking-widest text-lg mt-2">{Math.max(1, uploadPopupState.currentProcessed)} / {uploadPopupState.totalImages}</p>
                 </>
              ) : (
                 <>
                    <ShieldCheck className="w-12 h-12 text-gray-900 mb-4 animate-in zoom-in duration-300" />
                    <p className="text-xl font-black text-gray-900 font-mono tracking-tighter">사진 처리가 완료되었습니다.</p>
                 </>
              )}
          </div>
        ) : (
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
        )
      )}`;

content = content.replace(oldJSX, newJSX);

fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Fixed Dashboard inline/modal ad logic');
