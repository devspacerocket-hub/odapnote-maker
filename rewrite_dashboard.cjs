const fs = require('fs');

let content = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// 1. Add constants after imports
const constants = `
const MIN_LOADING_VISIBLE_MS = 1200;
const COMPLETE_MESSAGE_VISIBLE_MS = 500;
const IMAGE_UPLOAD_LIMITS = {
  maxFileCount: 20,
  maxFileSizeBytes: 15 * 1024 * 1024,
  maxProcessingLongEdgePx: 3000,
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function calculateResizedDimensions(width, height, maxLongEdge) {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

interface UploadPopupState {
  isOpen: boolean;
  status: 'processing' | 'complete';
  currentProcessed: number;
  totalImages: number;
}

interface UploadErrorState {
  isOpen: boolean;
  message: string;
  filesToRetry?: File[];
}
`;

content = content.replace("interface DashboardProps {", constants + "\ninterface DashboardProps {");

// 2. State replacements
const oldState = `  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });`;

const newState = `  const [uploadPopupState, setUploadPopupState] = useState<UploadPopupState>({
    isOpen: false,
    status: 'processing',
    currentProcessed: 0,
    totalImages: 0
  });
  const [uploadErrorState, setUploadErrorState] = useState<UploadErrorState>({
    isOpen: false,
    message: ''
  });
  const currentJobIdRef = useRef(0);
  
  const [isDragging, setIsDragging] = useState(false);`;

content = content.replace(oldState, newState);

// 3. Replace processing functions
const oldFunctions = /const startActualProcessing = async .*?const handleFileUpload/s;

const newFunctions = `
  const processImages = async (files: File[], jobId: number) => {
    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    };
    
    // image dimension check and resize
    const resizeImageIfNeed = (dataUrl: string): Promise<string> => {
       return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
             const dims = calculateResizedDimensions(img.width, img.height, IMAGE_UPLOAD_LIMITS.maxProcessingLongEdgePx);
             if (dims.width === img.width && dims.height === img.height) {
                 resolve(dataUrl);
                 return;
             }
             const canvas = document.createElement('canvas');
             canvas.width = dims.width;
             canvas.height = dims.height;
             const ctx = canvas.getContext('2d');
             if(!ctx) { resolve(dataUrl); return; }
             ctx.drawImage(img, 0, 0, dims.width, dims.height);
             resolve(canvas.toDataURL('image/jpeg', 0.9));
          };
          img.onerror = () => reject(new Error('Image load failed'));
       });
    };

    const newProblems: ProcessedProblem[] = [];
    for (let i = 0; i < files.length; i++) {
      if (jobId !== currentJobIdRef.current) return;
      try {
          const file = files[i];
          const rawBase64 = await readFile(file);
          if (!rawBase64) continue;
          
          const resizedBase64 = await resizeImageIfNeed(rawBase64);
          
          const analysisResult = await detectProblemArea(resizedBase64);
          let processedUrl = resizedBase64;
          let initialCrop: CropArea | undefined = undefined;
          
          if (analysisResult) {
              processedUrl = await autoCropAndStraighten(resizedBase64, analysisResult);
              
              const img = new Image();
              img.src = resizedBase64;
              await new Promise(r => img.onload = r);
              
              const [ymin, xmin, ymax, xmax] = analysisResult.box_2d;
              initialCrop = {
                x: (xmin / 1000) * img.width,
                y: (ymin / 1000) * img.height,
                width: ((xmax - xmin) / 1000) * img.width,
                height: ((ymax - ymin) / 1000) * img.height
              };
          }
          newProblems.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            originalImageUrl: resizedBase64,
            processedImageUrl: processedUrl,
            detectedRotation: 0,
            lastRotation: 0,
            lastCrop: initialCrop,
            timestamp: Date.now(),
            userNotes: ''
          });
      } catch (error) {
          console.error(\`File processing error:\`, error);
          throw error;
      } finally {
          if (jobId === currentJobIdRef.current) {
              setUploadPopupState(prev => ({ ...prev, currentProcessed: i + 1 }));
          }
      }
    }
    
    if (jobId === currentJobIdRef.current) {
        setProblems(prev => [...prev, ...newProblems]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const runImageProcessing = async (files: File[]) => {
    const jobId = ++currentJobIdRef.current;
    
    // validation
    if (files.length > IMAGE_UPLOAD_LIMITS.maxFileCount) {
       setUploadErrorState({
          isOpen: true,
          message: \`한 번에 업로드할 수 있는 사진 수를 초과했습니다.\\n최대 \${IMAGE_UPLOAD_LIMITS.maxFileCount}장까지 업로드할 수 있습니다.\\n사진 수를 줄인 뒤 다시 시도해 주세요.\`
       });
       return;
    }
    
    for (const file of files) {
       if (file.size > IMAGE_UPLOAD_LIMITS.maxFileSizeBytes) {
           setUploadErrorState({
              isOpen: true,
              message: \`파일 용량이 너무 큽니다 (최대 \${IMAGE_UPLOAD_LIMITS.maxFileSizeBytes / 1024 / 1024}MB).\\n사진 용량을 줄인 뒤 다시 시도해 주세요.\`
           });
           return;
       }
    }

    setUploadPopupState({
       isOpen: true,
       status: 'processing',
       currentProcessed: Math.min(1, files.length), // show 1 if started
       totalImages: files.length
    });

    try {
      await Promise.all([
        processImages(files, jobId),
        delay(MIN_LOADING_VISIBLE_MS)
      ]);
      
      if (jobId !== currentJobIdRef.current) return;
      
      setUploadPopupState(prev => ({ ...prev, status: 'complete' }));
      
      await delay(COMPLETE_MESSAGE_VISIBLE_MS);
      
      if (jobId !== currentJobIdRef.current) return;
      
      setUploadPopupState(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      if (jobId !== currentJobIdRef.current) return;
      setUploadErrorState({
         isOpen: true,
         message: '사진을 처리하지 못했습니다.\\n지원하지 않는 파일이거나 파일이 손상되었을 수 있습니다.',
         filesToRetry: files
      });
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    runImageProcessing(files);
  };

  const handleFileUpload`;

content = content.replace(oldFunctions, newFunctions);

// 4. Replace popup JSX in render
const oldJSX = `{isAdShowing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center scale-up">
            <div className="w-16 h-16 border-2 border-gray-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6">
              <ShieldCheck size={32} className="text-gray-900" />
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-2">로컬 엔진 가동 중</h2>
            <p className="text-gray-500 text-sm mb-6">서버 전송 없이 기기 내부에서 사진을 분석합니다.</p>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6 border border-gray-200">
                <div className="h-full bg-gray-900 animate-loading-bar"></div>
            </div>
            <AdSenseUnit slotId="loading-ad" format="rectangle" label="Preparing Engine" />
          </div>
        </div>
      )}
      {isProcessing && (
        <div className="fixed inset-0 z-[110] bg-[#fcfaf5]/95 flex flex-col items-center justify-center text-center p-6">
            <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
            <h2 className="text-xl font-black text-gray-900 font-mono tracking-tighter uppercase">Analyzing... {progress.current}/{progress.total}</h2>
            <p className="text-gray-500 text-sm mt-1">서버 전송 없이 로컬에서 안전하게 처리합니다.</p>
        </div>
      )}`;

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

content = content.replace(oldJSX, newJSX);

fs.writeFileSync('components/Dashboard.tsx', content);
console.log('Dashboard rewritten step 3');
