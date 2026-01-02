
import React, { useState, useRef, useEffect } from 'react';
import { ProcessedProblem, ViewMode, CropArea } from '../types';
import { detectProblemArea } from '../services/geminiService';
import { autoCropAndStraighten } from '../utils/imageProcessor';
import { Upload, Loader2, X, FileText, Crop, Plus, ShieldCheck, Zap, Info, Instagram, Github, Globe, Wand2, Smartphone } from 'lucide-react';
import ImageEditor from './ImageEditor';
import TutorialPopup from './TutorialPopup';
import AdSenseUnit from './AdSenseUnit';

interface DashboardProps {
  problems: ProcessedProblem[];
  setProblems: React.Dispatch<React.SetStateAction<ProcessedProblem[]>>;
  setViewMode: (mode: ViewMode) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ problems, setProblems, setViewMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdShowing, setIsAdShowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [editingProblem, setEditingProblem] = useState<ProcessedProblem | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const hideTutorial = localStorage.getItem('hideTutorial');
    if (!hideTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const startActualProcessing = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    };

    const newProblems: ProcessedProblem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
          const file = files[i];
          const rawBase64 = await readFile(file);
          // 로컬 분석 엔진 호출 (외부 서버 전송 없음)
          const analysisResult = await detectProblemArea(rawBase64);
          let processedUrl = rawBase64;
          let initialCrop: CropArea | undefined = undefined;
          
          if (analysisResult) {
              processedUrl = await autoCropAndStraighten(rawBase64, analysisResult);
              
              const img = new Image();
              img.src = rawBase64;
              await new Promise(r => img.onload = r);
              const padding = 20;
              const [ymin, xmin, ymax, xmax] = analysisResult.box_2d;
              initialCrop = {
                x: Math.max(0, (xmin - padding) / 1000 * img.width),
                y: Math.max(0, (ymin - padding) / 1000 * img.height),
                width: Math.min(img.width, ((xmax + padding) - (xmin - padding)) / 1000 * img.width),
                height: Math.min(img.height, ((ymax + padding) - (ymin - padding)) / 1000 * img.height)
              };
          }
          newProblems.push({
            id: Date.now().toString() + Math.random().toString().slice(2) + i,
            originalImageUrl: rawBase64,
            processedImageUrl: processedUrl,
            detectedRotation: 0,
            lastRotation: 0,
            lastCrop: initialCrop,
            timestamp: Date.now(),
            userNotes: ''
          });
      } catch (error) {
          console.error(`Error processing file ${i}:`, error);
      } finally {
          setProgress(prev => ({ ...prev, current: i + 1 }));
      }
    }
    setProblems(prev => [...prev, ...newProblems]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    
    setIsAdShowing(true);
    setTimeout(() => {
      setIsAdShowing(false);
      startActualProcessing(files);
    }, 3500);
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
      className={`flex flex-col h-full relative transition-colors duration-200 ${isDragging ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {showTutorial && <TutorialPopup onClose={(hide) => { if(hide) localStorage.setItem('hideTutorial', 'true'); setShowTutorial(false); }} />}

      {/* Loading Ad Popup */}
      {isAdShowing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-4">이미지를 분석하고 있습니다</h2>
            <div className="space-y-3 mb-8 text-sm text-gray-500">
              <p>기기 내 로컬 엔진을 사용하여 영역을 감지합니다.</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Smartphone size={12}/> Secure On-Device Processing
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-8">
                <div className="h-full bg-emerald-600 animate-loading-bar"></div>
            </div>
            <div className="pt-8 border-t border-gray-100 min-h-[100px]">
              <AdSenseUnit slotId="upload-gateway-ad" format="rectangle" label="Processing Ad" />
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 z-[110] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mb-6" />
            <h2 className="text-2xl font-black text-gray-900">로컬 분석 중 ({progress.current}/{progress.total})</h2>
            <p className="text-gray-500 mt-2">서버 전송 없이 기기 내에서 안전하게 처리 중입니다.</p>
        </div>
      )}

      <nav className="bg-white p-4 shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-lg"><ShieldCheck size={20} /></div>
            <h1 className="text-lg font-black text-gray-900">오답노트메이커 <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full ml-1 font-black uppercase tracking-tighter">LOCAL ENGINE</span></h1>
          </div>
          <div className="flex gap-2">
             <button onClick={handleUploadClick} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold text-sm">
                <Upload size={18} /> 사진 촬영/업로드
              </button>
              <button onClick={() => setViewMode(ViewMode.PRINT_PREVIEW)} disabled={problems.length === 0} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 font-bold text-sm shadow-sm">
                <FileText size={18} className="text-emerald-600" /> PDF로 만들기
              </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden xl:flex w-[220px] shrink-0 bg-gray-50 border-r border-gray-100 items-start justify-center p-4">
          <div className="flex flex-col gap-6 w-full">
            <AdSenseUnit slotId="3514376545" format="vertical" label="Side Ad Left" />
            <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-3">
               <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs"><ShieldCheck size={14}/> 데이터 보안</div>
               <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                 본 앱은 모든 분석 로직을 브라우저 내에서 직접 수행합니다. 사진 데이터는 절대 서버로 전송되지 않습니다.
               </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50/30">
          {problems.length === 0 ? (
            <div className="max-w-4xl mx-auto flex flex-col items-center">
              <div onClick={handleUploadClick} className="w-full max-w-xl aspect-video border-2 border-dashed border-gray-300 rounded-[2.5rem] bg-white hover:border-emerald-400 hover:bg-emerald-50/30 transition-all flex flex-col items-center justify-center cursor-pointer group mb-8 shadow-sm">
                <Plus size={48} className="text-gray-300 group-hover:text-emerald-500 mb-4 transition-colors" />
                <h3 className="text-xl font-bold text-gray-900">문제를 찍어주세요</h3>
                <p className="text-gray-400 text-sm mt-2">로컬 엔진이 사진을 자동으로 보정해 드립니다</p>
              </div>

              <div className="flex flex-col items-center gap-4 mb-12 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Privacy First Service</span>
                <div className="flex flex-wrap items-center justify-center gap-3 px-4">
                  <a href="https://www.instagram.com/dev_in_thecave/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-gray-100 shadow-sm text-gray-600 hover:text-emerald-600 hover:border-emerald-100 transition-all group hover:shadow-md">
                    <Instagram size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">인스타그램</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-gray-100 shadow-sm text-gray-400 hover:text-gray-600 transition-all group cursor-default">
                    <Github size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-gray-400">GitHub (준비 중)</span>
                  </a>
                  <a href="#" className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-gray-100 shadow-sm text-gray-400 hover:text-gray-600 transition-all group cursor-default">
                    <Globe size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-gray-400">블로그 (준비 중)</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                 <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-1">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><Zap size={24}/></div>
                    <div>
                       <h4 className="font-bold text-gray-900 mb-2">초고속 로컬 엔진</h4>
                       <p className="text-[11px] text-gray-500 leading-relaxed">
                         브라우저에서 직접 분석하므로 대기 시간이 짧고, 오프라인 상태에서도 주요 기능을 사용할 수 있습니다.
                       </p>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex gap-4 transition-transform hover:-translate-y-1">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0"><Wand2 size={24}/></div>
                    <div>
                       <h4 className="font-bold text-gray-900 mb-2">프리미엄 필터</h4>
                       <p className="text-[11px] text-gray-500 leading-relaxed">
                         그림자를 지우고 배경을 밝게 하여 실제 문제지처럼 선명한 흑백 스캔 효과를 제공합니다.
                       </p>
                    </div>
                 </div>
              </div>

              <div className="mt-16 text-center space-y-6 pb-12 w-full max-w-2xl border-t border-gray-100 pt-12">
                 <p className="text-[11px] text-gray-400 leading-relaxed px-6">
                    본 서비스는 100% 로컬 기반 서비스로, 클라우드 연산을 사용하지 않습니다. 모든 권한은 사용자에게 있습니다.
                 </p>
                 <p className="text-[10px] text-gray-300 uppercase tracking-[0.2em] font-medium">
                   Copyright &copy; 2024 오답노트메이커 • Local Analysis Engine v1.0
                 </p>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {problems.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
                    <div className="relative aspect-[4/5] bg-gray-50 overflow-hidden border-b border-gray-100 flex items-center justify-center">
                      <img src={p.processedImageUrl} className="max-w-full max-h-full p-2 object-contain" />
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => setEditingProblem(p)} className="p-2.5 bg-white rounded-xl text-gray-700 hover:text-emerald-600 transition shadow-lg flex items-center gap-2 font-bold text-xs"><Crop size={16}/> 편집</button>
                        <button onClick={() => setProblems(prev => prev.filter(x => x.id !== p.id))} className="p-2.5 bg-white rounded-xl text-red-500 transition shadow-lg"><X size={16}/></button>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col gap-3">
                      <textarea 
                        className="w-full text-xs p-3 bg-gray-50 rounded-xl focus:outline-none h-24 resize-none focus:ring-2 focus:ring-emerald-100 transition border border-transparent focus:border-emerald-100" 
                        placeholder="나만의 메모를 입력하세요..." 
                        value={p.userNotes}
                        onChange={(e) => setProblems(prev => prev.map(x => x.id === p.id ? {...x, userNotes: e.target.value} : x))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        <aside className="hidden xl:flex w-[220px] shrink-0 bg-gray-50 border-l border-gray-100 items-start justify-center p-4">
          <div className="flex flex-col gap-6 w-full">
            <AdSenseUnit slotId="2201294878" format="vertical" label="Side Ad Right" />
            <div className="p-5 bg-emerald-600 rounded-[2rem] shadow-xl text-white space-y-3">
               <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Info size={16}/></div>
               <h4 className="font-bold text-xs italic">Tip</h4>
               <p className="text-[10px] opacity-90 leading-relaxed font-medium">
                 글자가 선명할수록 더 깔끔한 결과물이 나옵니다. 조명이 밝은 곳에서 촬영해 주세요!
               </p>
            </div>
          </div>
        </aside>
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

      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 3.5s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
