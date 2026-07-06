
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

  const startActualProcessing = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    };

    const newProblems: ProcessedProblem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
          const file = files[i];
          const rawBase64 = await readFile(file);
          if (!rawBase64) continue;

          const analysisResult = await detectProblemArea(rawBase64);
          let processedUrl = rawBase64;
          let initialCrop: CropArea | undefined = undefined;
          
          if (analysisResult) {
              processedUrl = await autoCropAndStraighten(rawBase64, analysisResult);
              
              const img = new Image();
              img.src = rawBase64;
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
            originalImageUrl: rawBase64,
            processedImageUrl: processedUrl,
            detectedRotation: 0,
            lastRotation: 0,
            lastCrop: initialCrop,
            timestamp: Date.now(),
            userNotes: ''
          });
      } catch (error) {
          console.error(`File processing error:`, error);
      } finally {
          setProgress(prev => ({ ...prev, current: i + 1 }));
      }
    }
    
    setProblems(prev => [...prev, ...newProblems]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    
    setIsAdShowing(true);
    setTimeout(() => {
      setIsAdShowing(false);
      startActualProcessing(files);
    }, 2000);
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

      {isAdShowing && (
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
                <FileText size={16} /> PDF 생성
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
