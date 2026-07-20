
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
import { ArrowLeft, Grid2X2, Columns2, Square, Download, Loader2 } from 'lucide-react';
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
  const [title, setTitle] = useState(`odapnotemaker_${new Date().toLocaleDateString()}`);

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
      default: return 'grid-cols-2';
    }
  };

  const itemsPerPage = layout === LayoutGrid.ONE ? 1 : layout === LayoutGrid.TWO ? 2 : 4;
  const pages: ProcessedProblem[][] = [];
  for (let i = 0; i < problems.length; i += itemsPerPage) {
    pages.push(problems.slice(i, i + itemsPerPage));
  }

  const generatePDF = async () => {
    setIsPreparing(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // 폰트 처리 제거 (기본 영문 폰트 사용)
      setRenderProgress(30);

      const PAGE_WIDTH = 210;
      const PAGE_HEIGHT = 297;
      const MARGIN = 15;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
      const HEADER_HEIGHT = 10; 
      const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2 - HEADER_HEIGHT;
      const GAP = 8;

      let cols = 1;
      let rows = 1;
      if (layout === LayoutGrid.TWO) {
        cols = 2;
        rows = 1;
      } else if (layout === LayoutGrid.FOUR) {
        cols = 2;
        rows = 2;
      }

      const cellWidth = (CONTENT_WIDTH - (cols - 1) * GAP) / cols;
      const cellHeight = (CONTENT_HEIGHT - (rows - 1) * GAP) / rows;
      
      const PADDING = 4;
      const Q_LABEL_HEIGHT = 6;
      const NOTE_HEIGHT = 15;

      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      };

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        setRenderProgress(Math.round(30 + ((pageIdx / pages.length) * 70)));
        if (pageIdx > 0) doc.addPage();
        
        const pageData = pages[pageIdx];
        
        // 헤더 렌더링
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(title, MARGIN, MARGIN + 4);
        
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`P. ${pageIdx + 1}`, PAGE_WIDTH - MARGIN, MARGIN + 4, { align: 'right' });
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, MARGIN + 6, PAGE_WIDTH - MARGIN, MARGIN + 6);
        
        // 문제 그리드 렌더링
        for (let pIdx = 0; pIdx < pageData.length; pIdx++) {
          const prob = pageData[pIdx];
          const col = pIdx % cols;
          const row = Math.floor(pIdx / cols);
          
          const x = MARGIN + col * (cellWidth + GAP);
          const y = MARGIN + HEADER_HEIGHT + row * (cellHeight + GAP);
          
          // 문제 테두리
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.3);
          doc.rect(x, y, cellWidth, cellHeight);
          
          // Q 라벨
          doc.setFillColor(0, 0, 0);
          doc.rect(x + PADDING, y + PADDING, 12, Q_LABEL_HEIGHT, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.text(`Q.${pageIdx * itemsPerPage + pIdx + 1}`, x + PADDING + 6, y + PADDING + 4.2, { align: 'center' });
          
          // 문제 이미지
          try {
            const img = await loadImage(prob.processedImageUrl);
            const imgAreaX = x + PADDING;
            const imgAreaY = y + PADDING + Q_LABEL_HEIGHT + 3;
            const imgAreaW = cellWidth - PADDING * 2;
            let imgAreaH = cellHeight - PADDING * 2 - Q_LABEL_HEIGHT - 3 - NOTE_HEIGHT - 2;
            
            // 1x1 레이아웃일 경우 이미지 최대 높이를 절반으로 제한
            if (layout === LayoutGrid.ONE) {
              imgAreaH = Math.min(imgAreaH, cellHeight * 0.5);
            }
            
            const imgRatio = img.width / img.height;
            const areaRatio = imgAreaW / imgAreaH;
            
            let drawW = imgAreaW;
            let drawH = imgAreaH;
            
            if (imgRatio > areaRatio) {
              drawH = drawW / imgRatio;
            } else {
              drawW = drawH * imgRatio;
            }
            
            doc.addImage(img, 'JPEG', imgAreaX, imgAreaY, drawW, drawH);
          } catch (e) {
            console.error("이미지 로드 실패", e);
          }
          
          // 노트 영역
          const noteY = y + cellHeight - NOTE_HEIGHT;
          doc.setDrawColor(240, 240, 240);
          doc.line(x + PADDING, noteY, x + cellWidth - PADDING, noteY);
          
          doc.setTextColor(150, 150, 150);
          doc.setFontSize(8);
          
          const notesText = prob.userNotes || '...';
          const splitNotes = doc.splitTextToSize(notesText, cellWidth - PADDING * 2);
          doc.text(splitNotes, x + PADDING, noteY + 4);
        }
      }
      
      setRenderProgress(100);
      doc.save(`${title}.pdf`);
    } catch (e) {
      console.error("PDF 생성 에러:", e);
      alert("PDF 생성 중 오류가 발생했습니다.");
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
            {[LayoutGrid.ONE, LayoutGrid.TWO, LayoutGrid.FOUR].map(l => (
              <button key={l} onClick={() => setLayout(l)} className={`p-2 rounded-full transition-all ${layout === l ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-black/5'}`}>
                {l === LayoutGrid.ONE && <Square size={16} strokeWidth={2.5}/>}
                {l === LayoutGrid.TWO && <Columns2 size={16} strokeWidth={2.5}/>}
                {l === LayoutGrid.FOUR && <Grid2X2 size={16} strokeWidth={2.5}/>}
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
                    <span className="font-black text-base" style={{ letterSpacing: '0px', wordBreak: 'keep-all' }}>{title}</span>
                    <span className="text-[10px] font-bold text-gray-400">P. {idx + 1}</span>
                 </div>
                 <div className={`grid ${getGridClass()} gap-8 flex-1 min-h-0`}>
                    {pageData.map((prob, pIdx) => (
                      <div key={prob.id} className="flex flex-col border border-gray-50 p-4 rounded-lg h-full overflow-hidden">
                         <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black w-fit mb-3 shrink-0">Q.{idx * itemsPerPage + pIdx + 1}</div>
                         <div 
                           className="flex-1 min-h-0 w-full flex flex-col mb-2"
                           style={{ maxHeight: layout === LayoutGrid.ONE ? '50%' : 'none' }}
                         >
                           <div 
                             className="w-full h-full" 
                             style={{
                               backgroundImage: `url(${prob.processedImageUrl})`,
                               backgroundSize: 'contain',
                               backgroundPosition: 'top left',
                               backgroundRepeat: 'no-repeat'
                             }}
                           />
                         </div>
                         <div className="mt-2 border-t border-gray-100 pt-2 text-[10px] text-gray-400 shrink-0 min-h-[3em]">{prob.userNotes || '...'}</div>
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
