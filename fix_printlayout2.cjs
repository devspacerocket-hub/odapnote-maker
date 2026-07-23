const fs = require('fs');
let content = fs.readFileSync('components/PrintLayout.tsx', 'utf8');

// Find the broken part
content = content.replace(/\)\}\` \}\}>/g, `)}
      <div className="bg-[#fcfaf5] p-3 border-b-2 border-gray-900 z-30 shrink-0">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
          <button onClick={() => setViewMode(ViewMode.DASHBOARD)} className="p-2 border-2 border-transparent hover:border-gray-900 text-gray-900 rounded-full transition-all"><ArrowLeft size={20} strokeWidth={2.5} /></button>
          <div className="flex bg-transparent border-2 border-gray-900 p-1 rounded-full space-x-1">
            {[LayoutGrid.ONE, LayoutGrid.TWO, LayoutGrid.FOUR].map(l => (
              <button key={l} onClick={() => setLayout(l)} className={\`p-2 rounded-full transition-all \${layout === l ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-black/5'}\`}>
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
            style={{ transform: \`scale(\${scale})\` }}
         >`);

fs.writeFileSync('components/PrintLayout.tsx', content);
console.log('Fixed PrintLayout JSX');
