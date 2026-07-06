
/**
 * components/PrintLayout.tsx
 * 
 * [목적]
 * 사용자가 작성한 오답노트 내용을 실제 A4 종이 규격에 맞게(레이아웃) 렌더링하고,
 * 이를 `html2canvas`와 `jspdf` 라이브러리를 이용하여 사용자 기기에 PDF 파일로 다운로드할 수 있게 해주는 화면입니다.
 * 
 * [주요 기능]
 * 1. 1페이지당 들어갈 문제 수 조정 (1문제, 2문제, 4문제, 6문제 레이아웃 그리드 지원)
 * 2. 가상의 A4(210x297mm) 용지를 브라우저 상에 렌더링 (CSS scale을 통해 모니터 크기에 맞춤)
 * 3. PDF 제작 전 과정 로딩 상태 및 진행도 퍼센트 표시
 */
import React, { useState, useEffect, useRef } from 'react';
import { ProcessedProblem, LayoutGrid, ViewMode } from '../types';
import { ArrowLeft, Grid3X3, Grid2X2, Columns2, Square, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import AdSenseUnit from './AdSenseUnit';

interface PrintLayoutProps {
  problems: ProcessedProblem[];
  setViewMode: (mode: ViewMode) => void;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ problems, setViewMode }) => {
  const [layout, setLayout] = useState<LayoutGrid>(LayoutGrid.TWO);
  const [isPreparing, setIsPreparing] = useState(false);
  const [adShowing, setAdShowing] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [scale, setScale] = useState(0.6);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(`오답노트메이커_${new Date().toLocaleDateString()}`);

  const A4_WIDTH_PX = 794; 
  const A4_HEIGHT_PX = 1123;

  useEffect(() => {
    const calculateScale = () => {
      const availableW = window.innerWidth - 100;
      setScale(Math.min(availableW / A4_WIDTH_PX, 0.8));
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const getGridClass = () => {
    switch (layout) {
      case LayoutGrid.ONE: return 'grid-cols-1';
      case LayoutGrid.TWO: return 'grid-cols-2';
      case LayoutGrid.FOUR: return 'grid-cols-2 grid-rows-2';
      case LayoutGrid.SIX: return 'grid-cols-2 grid-rows-3';
      default: return 'grid-cols-2';
    }
  };

  const itemsPerPage = layout === LayoutGrid.ONE ? 1 : layout === LayoutGrid.TWO ? 2 : layout === LayoutGrid.FOUR ? 4 : 6;
  const pages = [];
  for (let i = 0; i < problems.length; i += itemsPerPage) {
    pages.push(problems.slice(i, i + itemsPerPage));
  }

  const generatePDF = async () => {
    if (!pagesContainerRef.current) return;
    setIsPreparing(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageElements = pagesContainerRef.current.querySelectorAll('.pdf-page');
      for (let i = 0; i < pageElements.length; i++) {
        setRenderProgress(Math.round((i / pageElements.length) * 100));
        const canvas = await html2canvas(pageElements[i] as HTMLElement, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      doc.save(`${title}.pdf`);
    } finally {
      setIsPreparing(false);
      setAdShowing(false);
    }
  };

  const handleSaveClick = () => {
    setAdShowing(true);
    setTimeout(() => {
      generatePDF();
    }, 2500);
  };

  return (
    <div className="flex flex-col h-screen bg-[#fcfaf5] overflow-hidden">
      {adShowing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#fcfaf5] border-2 border-gray-900 rounded-[2.5rem] p-10 text-center scale-up">
            {!isPreparing ? (
              <>
                <div className="w-16 h-16 border-2 border-gray-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Download size={32} className="text-gray-900"/>
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">문서를 준비하고 있습니다</h2>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed font-medium">잠시 후 PDF 생성이 자동으로 시작됩니다.</p>
                <div className="w-full h-1.5 bg-gray-200 border border-gray-300 rounded-full overflow-hidden">
                   <div className="h-full bg-gray-900 animate-loading-bar"></div>
                </div>
              </>
            ) : (
              <>
                <Loader2 size={48} className="text-gray-900 animate-spin mx-auto mb-6" />
                <h2 className="text-xl font-black text-gray-900 mb-2">PDF를 생성하는 중...</h2>
                <p className="text-gray-900 font-black tracking-widest text-lg">{renderProgress}%</p>
              </>
            )}
            <div className="mt-8 pt-8 border-t border-gray-100 min-h-[100px]">
              <AdSenseUnit slotId="popup-ad" format="rectangle" label="Popup Ad" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#fcfaf5] p-3 border-b-2 border-gray-900 z-30 shrink-0">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="p-2 border-2 border-transparent hover:border-gray-900 text-gray-900 rounded-full transition-all"><ArrowLeft size={20} strokeWidth={2.5} /></button>
          <div className="flex bg-transparent border-2 border-gray-900 p-1 rounded-full space-x-1">
            {[LayoutGrid.ONE, LayoutGrid.TWO, LayoutGrid.FOUR, LayoutGrid.SIX].map(l => (
              <button key={l} onClick={() => setLayout(l)} className={`p-2 rounded-full transition-all ${layout === l ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-black/5'}`}>
                {l === LayoutGrid.ONE && <Square size={16} strokeWidth={2.5}/>}
                {l === LayoutGrid.TWO && <Columns2 size={16} strokeWidth={2.5}/>}
                {l === LayoutGrid.FOUR && <Grid2X2 size={16} strokeWidth={2.5}/>}
                {l === LayoutGrid.SIX && <Grid3X3 size={16} strokeWidth={2.5}/>}
              </button>
            ))}
          </div>
          <button onClick={handleSaveClick} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition text-xs uppercase tracking-tight">
            <Download size={16} strokeWidth={2.5} /> PDF 저장
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10 flex justify-center bg-[#fcfaf5]">
         <div ref={pagesContainerRef} className="origin-top transition-transform duration-300 shadow-2xl" style={{ transform: `scale(${scale})` }}>
            {pages.map((pageData, idx) => (
              <div key={idx} className="pdf-page bg-white mb-12 flex flex-col p-[15mm] shrink-0" style={{ width: '210mm', height: '297mm' }}>
                 <div className="flex justify-between border-b border-black pb-2 mb-8">
                    <span className="font-black text-base">{title}</span>
                    <span className="text-[10px] font-bold text-gray-400">P. {idx + 1}</span>
                 </div>
                 <div className={`grid ${getGridClass()} gap-8 content-start`}>
                    {pageData.map((prob, pIdx) => (
                      <div key={prob.id} className="flex flex-col border border-gray-50 p-2 rounded-lg">
                         <div className="bg-black text-white px-2 py-0.5 text-[8px] font-black w-fit mb-3">Q.{idx * itemsPerPage + pIdx + 1}</div>
                         <img src={prob.processedImageUrl} className="max-w-full object-contain" />
                         <div className="mt-4 border-t border-gray-100 pt-2 text-[10px] text-gray-400 min-h-[3em]">{prob.userNotes || '...'}</div>
                      </div>
                    ))}
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default PrintLayout;
