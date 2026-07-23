const fs = require('fs');

let content = fs.readFileSync('components/PrintLayout.tsx', 'utf8');

// 1. Add state types
const constants = `
interface PdfPopupState {
  isOpen: boolean;
  status: 'generating' | 'complete';
  pdfDoc: jsPDF | null;
}

const waitForNextFrame = (): Promise<void> => new Promise(resolve => requestAnimationFrame(() => resolve()));
`;

content = content.replace("interface PrintLayoutProps {", constants + "\ninterface PrintLayoutProps {");

// 2. Replace state
const oldState = `  const [isPreparing, setIsPreparing] = useState(false);
  const [adShowing, setAdShowing] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);`;

const newState = `  const [pdfPopupState, setPdfPopupState] = useState<PdfPopupState>({
    isOpen: false,
    status: 'generating',
    pdfDoc: null
  });
  
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);`;

content = content.replace(oldState, newState);

// 3. Replace generatePDF and handleSaveClick
const oldFunctions = /const generatePDF = async \(\) => \{.*?const handleSaveClick = \(\) => \{.*?\};/s;

const newFunctions = `  const generatePDF = async () => {
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
      if (layout === LayoutGrid.TWO) { cols = 1; rows = 2; }
      else if (layout === LayoutGrid.FOUR) { cols = 2; rows = 2; }
      else if (layout === LayoutGrid.SIX) { cols = 2; rows = 3; }

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
        doc.text(\`Page \${pIdx + 1} / \${totalPages}\`, 210 - PAGE_MARGIN - 15, PAGE_MARGIN + 6);

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
          doc.text(\`Q.\${startIndex + i + 1}\`, x + PADDING + 6, y + PADDING + 4, { align: 'center' });

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
        pdfPopupState.pdfDoc.save(\`\${title}.pdf\`);
        setPdfPopupState({ isOpen: false, status: 'generating', pdfDoc: null });
     }
  };

  const handleClosePopup = () => {
     if (pdfPopupState.status === 'complete' && pdfPopupState.pdfDoc) {
        setShowCloseConfirm(true);
     }
  };
`;

content = content.replace(oldFunctions, newFunctions);

// 4. Update the save button calling handleSaveClick
content = content.replace('onClick={handleSaveClick}', 'onClick={handleGeneratePDFClick}');
content = content.replace('onClick={handleSaveClick}', 'onClick={handleGeneratePDFClick}'); // in case there are multiple, but only one is expected

// 5. Replace PDF popup JSX
const oldJSX = /\{adShowing && \(.*?\}\)/s;
const newJSX = `{pdfPopupState.isOpen && (
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
      )}`;

content = content.replace(oldJSX, newJSX);

fs.writeFileSync('components/PrintLayout.tsx', content);
console.log('PrintLayout rewritten step 4');
