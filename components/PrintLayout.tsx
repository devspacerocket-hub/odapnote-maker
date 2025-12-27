import React, { useState, useEffect, useRef } from 'react';
import { ProcessedProblem, LayoutGrid, ViewMode } from '../types';
import { ArrowLeft, Grid3X3, Grid2X2, Columns2, Square, Download, Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
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
      const availableW = window.innerWidth - 400; // Side ads and margins
      setScale(Math.min(availableW / A4_WIDTH_PX, 0.85));
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
    // 3.5초간 광고 팝업 노출 후 PDF 생성 시작
    setTimeout(() => {
      generatePDF();
    }, 3500);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-200 overflow-hidden">
      {/* Ad Gateway Popup */}
      {adShowing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl p-10 text-center animate-in zoom-in duration-300">
            {!isPreparing ? (
              <>
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Download size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4">파일 다운로드를 준비합니다</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">잠시 후 PDF 오답노트 생성이 자동으로 시작됩니다.<br/>페이지를 새로고침하지 마세요.</p>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                   <div className="h-full bg-indigo-600 animate-loading-bar"></div>
                </div>
              </>
            ) : (
              <>
                <Loader2 size={64} className="text-indigo-600 animate-spin mx-auto mb-6" />
                <h2 className="text-2xl font-black text-gray-900 mb-2">문서를 생성하는 중...</h2>
                <p className="text-indigo-600 font-bold">{renderProgress}%</p>
              </>
            )}
            
            {/* Embedded Ad in Popup */}
            <div className="mt-8 pt-8 border-t border-gray-100 min-h-[100px]">
              <AdSenseUnit slotId="popup-ad" format="rectangle" label="Popup Banner Ad" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-3 border-b shadow-sm z-30 shrink-0">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center">
          <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><ArrowLeft /></button>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {[LayoutGrid.ONE, LayoutGrid.TWO, LayoutGrid.FOUR, LayoutGrid.SIX].map(l => (
                <button key={l} onClick={() => setLayout(l)} className={`p-1.5 rounded ${layout === l ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>
                  {l === LayoutGrid.ONE && <Square size={16}/>}
                  {l === LayoutGrid.TWO && <Columns2 size={16}/>}
                  {l === LayoutGrid.FOUR && <Grid2X2 size={16}/>}
                  {l === LayoutGrid.SIX && <Grid3X3 size={16}/>}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSaveClick} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition">
            <Download size={18} /> 저장하기
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden xl:flex w-[180px] shrink-0 bg-gray-100 border-r border-gray-200 items-start justify-center p-4">
           <AdSenseUnit slotId="print-left" format="vertical" label="Side Ad Left" />
        </aside>

        <div className="flex-1 overflow-auto p-8 flex justify-center">
           <div ref={pagesContainerRef} className="zoom-container" style={{ transform: `scale(${scale})` }}>
              {pages.map((pageData, idx) => (
                <div key={idx} className="pdf-page bg-white shadow-2xl mb-12 flex flex-col p-[15mm] shrink-0" style={{ width: '210mm', height: '297mm' }}>
                   <div className="flex justify-between border-b-2 border-black pb-2 mb-6">
                      <span className="font-black text-lg">{title}</span>
                      <span className="text-xs font-bold text-gray-400">PAGE {idx + 1}</span>
                   </div>
                   <div className={`grid ${getGridClass()} gap-8 content-start`}>
                      {pageData.map((prob, pIdx) => (
                        <div key={prob.id} className="flex flex-col">
                           <div className="bg-black text-white px-2 py-0.5 text-[9px] font-black w-fit mb-2">Q.{idx * itemsPerPage + pIdx + 1}</div>
                           <img src={prob.processedImageUrl} className="max-w-full object-contain" />
                           <div className="mt-4 border-t border-gray-100 pt-2 text-[10px] text-gray-400 italic">{prob.userNotes || '...'}</div>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
           </div>
        </div>

        <aside className="hidden xl:flex w-[180px] shrink-0 bg-gray-100 border-l border-gray-200 items-start justify-center p-4">
           <AdSenseUnit slotId="print-right" format="vertical" label="Side Ad Right" />
        </aside>
      </div>

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

export default PrintLayout;