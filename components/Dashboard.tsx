
/**
 * components/Dashboard.tsx
 * 
 * [목적]
 * 사용자가 처음으로 마주하는 메인 화면(대시보드)입니다.
 * 
 * [주요 기능]
 * 1. 파일 업로드(드래그 앤 드롭 및 클릭) 핸들링
 * 2. 업로드된 이미지를 로컬 모듈(geminiService.ts 등)에 넘겨 분석하고 결과를 상태(problems 배열)에 저장
 * 3. 분석 중일 때 시각적인 로딩 UI(광고 포함) 표시
 * 4. 분석이 완료된 문제 리스트를 카드 형태로 나열 (수동 크롭 에디터 진입, 삭제, 메모 작성 기능 제공)
 * 5. 약관, 개인정보처리방침, SNS 링크 등 하단 정보 노출
 * 6. "PDF 생성" 버튼을 통해 화면 모드 전환
 */
import React, { useState, useRef, useEffect } from 'react';
import { ProcessedProblem, ViewMode, CropArea } from '../types';
import { detectProblemArea } from '../services/geminiService';
import { autoCropAndStraighten } from '../utils/imageProcessor';
import { 
  Upload, Loader2, X, FileText, Crop, Plus, 
  ShieldCheck, Zap, Info, Instagram, Github, 
  Globe, Wand2, Smartphone, Scale, Lock, 
  AlertTriangle, ChevronDown 
} from 'lucide-react';
import ImageEditor from './ImageEditor';
import TutorialPopup from './TutorialPopup';
import AdSenseUnit from './AdSenseUnit';


const MIN_LOADING_VISIBLE_MS = 1200;
const MIN_AD_MODAL_VISIBLE_MS = 5000;
const COMPLETE_MESSAGE_VISIBLE_MS = 500;
const AD_MODAL_FILE_COUNT_THRESHOLD = 3;
const IMAGE_UPLOAD_LIMITS = {
  maxFileCount: 20,
  maxFileSizeBytes: 15 * 1024 * 1024,
  maxProcessingLongEdgePx: 3000,
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function calculateResizedDimensions(width: number, height: number, maxLongEdge: number) {
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
  isInline: boolean;
}

interface UploadErrorState {
  isOpen: boolean;
  message: string;
  filesToRetry?: File[];
}

interface DashboardProps {
  problems: ProcessedProblem[];
  setProblems: React.Dispatch<React.SetStateAction<ProcessedProblem[]>>;
  setViewMode: (mode: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ problems, setProblems, setViewMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPopupState, setUploadPopupState] = useState<UploadPopupState>({
    isOpen: false,
    status: 'processing',
    currentProcessed: 0,
    totalImages: 0,
    isInline: false
  });
  const [uploadErrorState, setUploadErrorState] = useState<UploadErrorState>({
    isOpen: false,
    message: ''
  });
  const currentJobIdRef = useRef(0);
  
  const [isDragging, setIsDragging] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ProcessedProblem | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeLegalTab, setActiveLegalTab] = useState<'terms' | 'privacy' | 'disclaimer' | null>(null);

  useEffect(() => {
    const hideTutorial = localStorage.getItem('hideTutorial');
    if (!hideTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  
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
          console.error(`File processing error:`, error);
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
          message: `한 번에 업로드할 수 있는 사진 수를 초과했습니다.\n최대 ${IMAGE_UPLOAD_LIMITS.maxFileCount}장까지 업로드할 수 있습니다.\n사진 수를 줄인 뒤 다시 시도해 주세요.`
       });
       return;
    }
    
    for (const file of files) {
       if (file.size > IMAGE_UPLOAD_LIMITS.maxFileSizeBytes) {
           setUploadErrorState({
              isOpen: true,
              message: `파일 용량이 너무 큽니다 (최대 ${IMAGE_UPLOAD_LIMITS.maxFileSizeBytes / 1024 / 1024}MB).\n사진 용량을 줄인 뒤 다시 시도해 주세요.`
           });
           return;
       }
    }

    const isInline = files.length < AD_MODAL_FILE_COUNT_THRESHOLD;
    const waitTime = isInline ? 0 : MIN_AD_MODAL_VISIBLE_MS;

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
      ]);
      
      if (jobId !== currentJobIdRef.current) return;
      
      if (isInline) {
         setUploadPopupState(prev => ({ ...prev, isOpen: false }));
      } else {
         setUploadPopupState(prev => ({ ...prev, status: 'complete' }));
         await delay(COMPLETE_MESSAGE_VISIBLE_MS);
         if (jobId !== currentJobIdRef.current) return;
         setUploadPopupState(prev => ({ ...prev, isOpen: false }));
      }
    } catch (error) {
      if (jobId !== currentJobIdRef.current) return;
      setUploadErrorState({
         isOpen: true,
         message: '사진을 처리하지 못했습니다.\n지원하지 않는 파일이거나 파일이 손상되었을 수 있습니다.',
         filesToRetry: files
      });
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    runImageProcessing(files);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const handleSaveEditedImage = (newImageUrl: string, newCrop: CropArea, newRotation: number) => {
    if (!editingProblem) return;
    setProblems(prev => prev.map(p => 
      p.id === editingProblem.id 
        ? { ...p, processedImageUrl: newImageUrl, lastCrop: newCrop, lastRotation: newRotation } 
        : p
    ));
    setEditingProblem(null);
  };

  return (
    <div 
      className={`flex flex-col h-full relative min-h-screen transition-colors duration-200 ${isDragging ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {showTutorial && <TutorialPopup onClose={(hide) => { if(hide) localStorage.setItem('hideTutorial', 'true'); setShowTutorial(false); }} />}

      

      {uploadPopupState.isOpen && (
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
      )}
      
      {uploadErrorState.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center scale-up">
            <div className="w-16 h-16 border-2 border-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 bg-red-50">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            
            {uploadErrorState.message.split('\n').map((line, i) => (
                <p key={i} className={i === 0 ? "text-xl font-black text-gray-900 mb-2" : "text-gray-600 text-sm mb-4"}>
                  {line}
                </p>
            ))}
            
            <div className="mt-8 flex gap-3 justify-center">
               <button 
                  onClick={() => { setUploadErrorState({isOpen: false, message: ''}); setUploadPopupState(prev => ({...prev, isOpen: false})); setUploadPopupState(prev => ({...prev, isOpen: false})); }}
                  className="px-6 py-3 border-2 border-gray-900 text-gray-900 font-bold rounded-full hover:bg-gray-50 transition"
               >
                 닫기
               </button>
               {uploadErrorState.filesToRetry && (
                 <button 
                    onClick={() => {
                        const files = uploadErrorState.filesToRetry;
                        setUploadErrorState({isOpen: false, message: ''}); setUploadPopupState(prev => ({...prev, isOpen: false}));
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
      )}

      <nav className="bg-[#fcfaf5] p-4 border-b-2 border-gray-900 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 border-2 border-gray-900 rounded-full bg-white text-gray-900"><Lock size={18} strokeWidth={2.5} /></div>
            <h1 className="text-base font-black text-gray-900 tracking-tight">오답노트메이커 <span className="text-[10px] border border-gray-900 text-gray-900 px-2 py-0.5 rounded-full ml-1 font-black">LOCAL v1.0</span></h1>
          </div>
          <div className="flex gap-2">
             <button onClick={handleUploadClick} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full hover:bg-black transition font-bold text-xs uppercase tracking-wide">
                <Upload size={16} /> 업로드
              </button>
              <button onClick={() => setViewMode(ViewMode.PRINT_PREVIEW)} disabled={problems.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-transparent border-2 border-gray-900 text-gray-900 rounded-full hover:bg-gray-100 transition disabled:opacity-30 disabled:hover:bg-transparent font-bold text-xs uppercase tracking-wide">
                <FileText size={16} /> PDF 미리보기
              </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#fcfaf5]">
          {problems.length === 0 ? (
            <div className="max-w-4xl mx-auto py-10">
              <div 
                onClick={handleUploadClick} 
                className="w-full aspect-[16/7] border-2 border-dashed border-gray-900 rounded-[2.5rem] bg-transparent hover:bg-black/5 transition-all flex flex-col items-center justify-center cursor-pointer group mb-12"
              >
                <div className="w-16 h-16 border-2 border-gray-900 bg-white text-gray-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-gray-900 group-hover:text-white transition-all">
                  <Plus size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">문제 사진을 여기로 드래그하세요</h3>
                <p className="text-gray-400 text-xs mt-2">여러 장을 동시에 올릴 수 있습니다 (JPG, PNG)</p>
              </div>

              {/* SNS & Links Section (RESTORED) */}
              <div className="flex flex-col items-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Privacy First Service</span>
                <div className="flex flex-wrap items-center justify-center gap-3 px-4">
                  <a href="https://www.instagram.com/dev_in_thecave/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-transparent rounded-full border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all group">
                    <Instagram size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">인스타그램</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 px-5 py-2.5 bg-transparent rounded-full border border-gray-300 shadow-none text-gray-400 cursor-default">
                    <Github size={18} />
                    <span className="text-sm font-bold text-gray-400">GitHub (준비 중)</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 px-5 py-2.5 bg-transparent rounded-full border border-gray-300 shadow-none text-gray-400 cursor-default">
                    <Globe size={18} />
                    <span className="text-sm font-bold text-gray-400">블로그 (준비 중)</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                 <div className="bg-transparent p-6 rounded-[2rem] border-2 border-gray-900 flex gap-4 transition-all">
                    <div className="w-12 h-12 border-2 border-gray-900 bg-white text-gray-900 rounded-[1rem] flex items-center justify-center shrink-0"><Zap size={24}/></div>
                    <div>
                       <h4 className="font-bold text-gray-900 text-base mb-1">실시간 로컬 분석</h4>
                       <p className="text-xs text-gray-600 leading-relaxed font-medium">인터넷 연결 없이도 작동하며, 사진 데이터는 기기를 떠나지 않습니다.</p>
                    </div>
                 </div>
                 <div className="bg-transparent p-6 rounded-[2rem] border-2 border-gray-900 flex gap-4 transition-all">
                    <div className="w-12 h-12 border-2 border-gray-900 bg-white text-gray-900 rounded-[1rem] flex items-center justify-center shrink-0"><Lock size={24}/></div>
                    <div>
                       <h4 className="font-bold text-gray-900 text-base mb-1">프라이버시 중심</h4>
                       <p className="text-xs text-gray-600 leading-relaxed font-medium">서버가 없으므로 사진 유출 걱정 없이 안심하고 공부에만 집중하세요.</p>
                    </div>
                 </div>
              </div>

              {/* Legal Tabs */}
              <div className="bg-transparent border-2 border-gray-900 rounded-[2.5rem] p-8 mb-10 overflow-hidden">
                <div className="flex items-center gap-2 mb-8 border-b-2 border-gray-900 pb-4">
                  <Scale className="text-gray-900" size={18} />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Legal Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  {(['terms', 'privacy', 'disclaimer'] as const).map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveLegalTab(activeLegalTab === tab ? null : tab)}
                      className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-wider border-2 transition-all ${activeLegalTab === tab ? 'bg-gray-900 border-gray-900 text-white' : 'bg-transparent border-gray-900 text-gray-900 hover:bg-black/5'}`}
                    >
                      {tab === 'terms' ? '이용약관' : tab === 'privacy' ? '개인정보 처리방침' : '책임 제한'}
                    </button>
                  ))}
                </div>

                <div className="min-h-[120px]">
                   {activeLegalTab === 'terms' && (
                     <div className="text-[10px] text-gray-500 leading-relaxed space-y-2 animate-in fade-in">
                        <p className="font-bold text-gray-800">제1조 (목적)</p>
                        <p>본 서비스는 수험생을 위한 도구로, 사용자의 이미지를 가공하여 학습 자료를 생성하는 것을 목적으로 합니다.</p>
                        <p className="font-bold text-gray-800">제2조 (저작권 보장)</p>
                        <p>생성된 결과물의 저작권과 그로 인해 발생하는 모든 책임은 사용자에게 귀속됩니다.</p>
                     </div>
                   )}
                   {activeLegalTab === 'privacy' && (
                     <div className="text-[10px] text-gray-500 leading-relaxed space-y-2 animate-in fade-in">
                        <p className="font-bold text-gray-800">1. NO SERVER 전송</p>
                        <p>본 서비스는 사용자의 이미지를 서버로 전송하거나 저장하지 않습니다. 모든 기술적 처리는 웹 브라우저 내부에서만 이루어집니다.</p>
                        <p className="font-bold text-gray-800">2. 분석 데이터</p>
                        <p>사용자가 설정한 편집 데이터는 브라우저 종료 시 영구히 삭제됩니다.</p>
                     </div>
                   )}
                   {activeLegalTab === 'disclaimer' && (
                     <div className="text-[10px] text-gray-500 leading-relaxed space-y-2 animate-in fade-in">
                        <div className="flex gap-1.5 items-center text-amber-600 mb-2">
                          <AlertTriangle size={14} />
                          <span className="font-bold">주의사항</span>
                        </div>
                        <p>로컬 엔진의 자동 감지 기능은 사진의 화질이나 조명에 따라 오차가 발생할 수 있으며, 이로 인한 결과의 정확성을 100% 보장하지 않습니다.</p>
                     </div>
                   )}
                   {!activeLegalTab && (
                     <div className="flex flex-col items-center justify-center py-6 text-gray-300">
                        <Info size={24} className="mb-2 opacity-20" />
                        <p className="text-[10px] font-medium italic">항목을 클릭하여 법적 고지사항을 확인하세요.</p>
                     </div>
                   )}
                </div>
              </div>

              <div className="text-center opacity-30 pointer-events-none">
                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                   Secure Local Computing • No Data Trace
                 </p>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {problems.map(p => (
                  <div key={p.id} className="bg-white rounded-[2rem] border-2 border-gray-900 overflow-hidden group hover:-translate-y-1 transition-transform flex flex-col shadow-[4px_4px_0_0_rgba(17,24,39,1)]">
                    <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden border-b-2 border-gray-900 flex items-center justify-center group/img">
                      <img src={p.processedImageUrl} className="max-w-full max-h-full p-4 object-contain transition-transform duration-500 group-hover/img:scale-105" />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                        <button onClick={() => setEditingProblem(p)} className="p-3 bg-white text-gray-900 border-2 border-gray-900 rounded-full hover:bg-gray-900 hover:text-white transition transform hover:scale-110"><Crop size={18} strokeWidth={2.5} /></button>
                        <button onClick={() => setProblems(prev => prev.filter(x => x.id !== p.id))} className="p-3 bg-white text-gray-900 border-2 border-gray-900 rounded-full hover:bg-red-500 hover:border-red-500 hover:text-white transition transform hover:scale-110"><X size={18} strokeWidth={2.5} /></button>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-1 bg-white">
                      <textarea 
                        className="w-full text-sm font-medium p-4 bg-transparent rounded-xl focus:outline-none h-24 resize-none border-2 border-dashed border-gray-300 focus:border-gray-900 focus:border-solid transition" 
                        placeholder="이 문제에 대한 오답 이유나 팁을 적어보세요..." 
                        value={p.userNotes}
                        onChange={(e) => setProblems(prev => prev.map(x => x.id === p.id ? {...x, userNotes: e.target.value} : x))}
                      />
                    </div>
                  </div>
                ))}
                
                <div onClick={handleUploadClick} className="border-2 border-dashed border-gray-900 rounded-[2rem] bg-transparent hover:bg-black/5 transition-all flex flex-col items-center justify-center cursor-pointer min-h-[300px] text-gray-900">
                   <Plus size={32} className="mb-2" />
                   <span className="text-[12px] font-black uppercase tracking-widest">Add More</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
      
      {editingProblem && (
        <ImageEditor 
          imageSrc={editingProblem.originalImageUrl} 
          initialRotation={editingProblem.lastRotation}
          initialCrop={editingProblem.lastCrop}
          onSave={handleSaveEditedImage} 
          onCancel={() => setEditingProblem(null)} 
        />
      )}
    </div>
  );
};

export default Dashboard;
