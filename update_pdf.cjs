const fs = require('fs');

let content = fs.readFileSync('components/PrintLayout.tsx', 'utf8');

const startPattern = `    const generatePDF = async () => {\n    try {`;
const endPattern = `      return doc;\n    } catch (e) {\n      console.error("PDF 생성 에러:", e);\n      throw e;\n    }\n  };`;

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern) + endPattern.length;

if (startIndex !== -1 && endIndex !== -1) {
  const newGeneratePDF = `    const generatePDF = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageElements = pagesContainerRef.current?.querySelectorAll('.pdf-page');
      
      if (!pageElements || pageElements.length === 0) return doc;

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) doc.addPage();
        
        const pageElement = pageElements[i];
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      return doc;
    } catch (e) {
      console.error("PDF 생성 에러:", e);
      throw e;
    }
  };`;

  content = content.substring(0, startIndex) + newGeneratePDF + content.substring(endIndex);
  fs.writeFileSync('components/PrintLayout.tsx', content);
  console.log("Updated generatePDF successfully.");
} else {
  console.log("Could not find generatePDF patterns.");
}
