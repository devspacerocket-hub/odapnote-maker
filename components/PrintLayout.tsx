
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


interface PdfPopupState {
  isOpen: boolean;
  status: 'generating' | 'complete';
  pdfDoc: jsPDF | null;
}

const waitForNextFrame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));

interface PrintLayoutProps {
  problems: ProcessedProblem[];
  setViewMode: (mode: ViewMode) => void;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ problems, setViewMode }) => {
  const [layout, setLayout] = useState<LayoutGrid>(LayoutGrid.TWO);
  const [pdfPopupState, setPdfPopupState] = useState<PdfPopupState>({
    isOpen: false,
    status: 'generating',
    pdfDoc: null
  });
  
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
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
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, 'F');
      
      const PAGE_MARGIN = 15;
      const CONTENT_W = 210 - PAGE_MARGIN * 2;
      const CONTENT_H = 297 - PAGE_MARGIN * 2;
      const HEADER_H = 15;
      const BODY_H = CONTENT_H - HEADER_H;
      
      const PADDING = 4;
      const Q_LABEL_HEIGHT = 6;
      const NOTE_HEIGHT = 20;
      let cols = 1, rows = 1;
      if (layout === LayoutGrid.TWO) { cols = 2; rows = 1; }
      else if (layout === LayoutGrid.FOUR) { cols = 2; rows = 2; }
      
      const cellWidth = CONTENT_W / cols;
      const cellHeight = BODY_H / rows;
      const itemsPerPage = cols * rows;
      const totalPages = Math.ceil(problems.length / itemsPerPage);
      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        if (pIdx > 0) doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(30, 30, 30);
        doc.text(title, PAGE_MARGIN, PAGE_MARGIN + 6);
        
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${pIdx + 1} / ${totalPages}`, 210 - PAGE_MARGIN - 15, PAGE_MARGIN + 6);
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.5);
        doc.line(PAGE_MARGIN, PAGE_MARGIN + 10, 210 - PAGE_MARGIN, PAGE_MARGIN + 10);
        const startIndex = pIdx * itemsPerPage;
        const pageProblems = problems.slice(startIndex, startIndex + itemsPerPage);
        for (let i = 0; i < pageProblems.length; i++) {
          const prob = pageProblems[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = PAGE_MARGIN + col * cellWidth;
          const y = PAGE_MARGIN + HEADER_H + row * cellHeight;
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          doc.rect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
          doc.setFillColor(30, 30, 30);
          doc.rect(x + PADDING, y + PADDING, 12, Q_LABEL_HEIGHT, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.text(`Q.${startIndex + i + 1}`, x + PADDING + 6, y + PADDING + 4, { align: 'center' });
          try {
            const img = new Image();
            img.src = prob.processedImageUrl;
            await new Promise(r => img.onload = r);
            const imgAreaX = x + PADDING;
            const imgAreaY = y + PADDING + Q_LABEL_HEIGHT + 3;
            const imgAreaW = cellWidth - PADDING * 2;
            let imgAreaH = cellHeight - PADDING * 2 - Q_LABEL_HEIGHT - 3 - NOTE_HEIGHT - 2;
            
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
      
      return doc;
    } catch (e) {
      console.error("PDF 생성 에러:", e);
      throw e;
    }
  };

  const handleGeneratePDFClick = async () => {
    setPdfPopupState({
      isOpen: true,
      status: 'generating',
      pdfDoc: null
    });
    
    try {
       await waitForNextFrame();
       await waitForNextFrame();
       
       const doc = await generatePDF();
       
       setPdfPopupState({
          isOpen: true,
          status: 'complete',
          pdfDoc: doc
       });
    } catch (error) {
       alert("PDF 생성 중 오류가 발생했습니다.");
       setPdfPopupState({ isOpen: false, status: 'generating', pdfDoc: null });
    }
  };

  const handleSaveDoc = () => {
     if (pdfPopupState.pdfDoc) {
        pdfPopupState.pdfDoc.save(`${title}.pdf`);
        setPdfPopupState({ isOpen: false, status: 'generating', pdfDoc: null });
     }
  };

  const handleClosePopup = () => {
     if (pdfPopupState.status === 'complete' && pdfPopupState.pdfDoc) {
        setShowCloseConfirm(true);
     }
  };


  return (
    <div className="flex flex-col h-screen bg-[#fcfaf5] overflow-hidden">
      {pdfPopupState.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#fcfaf5] border-2 border-gray-900 rounded-[2.5rem] p-10 text-center scale-up">
            
            {pdfPopupState.status === 'complete' && (
                <button 
                  onClick={handleClosePopup}
                  className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            )}

            <div className="mb-6 w-full min-h-[100px] flex justify-center">
                 <AdSenseUnit slotId="popup-ad" format="rectangle" label="학원 광고 영역" />
            </div>

            {pdfPopupState.status === 'generating' ? (
              <>
                <p className="text-gray-900 text-lg font-bold mb-1">PDF 생성 중입니다.</p>
                <p className="text-gray-600 text-sm mb-6">잠시만 기다려 주세요.</p>
              </>
            ) : (
              <>
                <p className="text-gray-900 text-lg font-bold mb-6">PDF가 준비되었습니다.</p>
                <button 
                  onClick={handleSaveDoc}
                  className="w-full py-4 bg-gray-900 text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-black transition-colors"
                >
                  PDF 저장하기
                </button>
              </>
            )}
          </div>
        </div>
      )}
      
      {showCloseConfirm && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
           <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-8 text-center scale-up">
              <p className="text-gray-900 text-lg font-bold mb-2">PDF를 아직 저장하지 않았습니다.</p>
              <p className="text-gray-600 text-sm mb-8">팝업을 닫으시겠습니까?</p>
              <div className="flex gap-3 justify-center">
                 <button 
                    onClick={() => {
                        setShowCloseConfirm(false);
                        handleSaveDoc();
                    }}
                    className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-full hover:bg-black transition"
                 >
                   PDF 저장하기
                 </button>
                 <button 
                    onClick={() => {
                        setShowCloseConfirm(false);
                        setPdfPopupState({ isOpen: false, status: 'generating', pdfDoc: null });
                    }}
                    className="flex-1 py-3 border-2 border-gray-900 text-gray-900 font-bold rounded-full hover:bg-gray-50 transition"
                 >
                   저장하지 않고 닫기
                 </button>
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
          <button onClick={handleGeneratePDFClick} className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition text-xs uppercase tracking-tight">
             <Download size={16} /> PDF 생성
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
         <div 
            ref={pagesContainerRef} 
            className="flex flex-col items-center mx-auto transform-gpu origin-top transition-transform duration-300"
            style={{ transform: `scale(${scale})` }}
         >
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
