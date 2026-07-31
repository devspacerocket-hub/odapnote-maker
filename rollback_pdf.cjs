const fs = require('fs');
let content = fs.readFileSync('components/PrintLayout.tsx', 'utf8');

const startPattern = `    const generatePDF = async () => {\n    try {`;
const endPattern = `      return doc;\n    } catch (e) {\n      console.error("PDF 생성 에러:", e);\n      throw e;\n    }\n  };`;

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern) + endPattern.length;

if (startIndex !== -1 && endIndex !== -1) {
  const oldGeneratePDF = `    const generatePDF = async () => {
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
  };`;

  content = content.substring(0, startIndex) + oldGeneratePDF + content.substring(endIndex);
  fs.writeFileSync('components/PrintLayout.tsx', content);
  console.log("Rolled back generatePDF successfully.");
} else {
  console.log("Could not find generatePDF patterns.");
}
