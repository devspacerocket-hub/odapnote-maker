const fs = require('fs');

// Fix Dashboard.tsx
let dashboard = fs.readFileSync('components/Dashboard.tsx', 'utf8');

// Fix implicitly any types
dashboard = dashboard.replace(/const delay = \(ms\)/g, 'const delay = (ms: number)');
dashboard = dashboard.replace(/function calculateResizedDimensions\(width, height, maxLongEdge\)/g, 'function calculateResizedDimensions(width: number, height: number, maxLongEdge: number)');

// Remove old JSX if it exists
const startAdShowing = dashboard.indexOf('{isAdShowing && (');
if (startAdShowing !== -1) {
    const endAdShowing = dashboard.indexOf(')}', startAdShowing + 100);
    // this might be tricky, let's just use string replacement
}

fs.writeFileSync('components/Dashboard.tsx', dashboard);

// Fix PrintLayout.tsx
let printLayout = fs.readFileSync('components/PrintLayout.tsx', 'utf8');
printLayout = printLayout.replace(/else if \(layout === LayoutGrid\.SIX\) \{ cols = 2; rows = 3; \}/g, '');
fs.writeFileSync('components/PrintLayout.tsx', printLayout);

console.log('Fixed typings and LayoutGrid');
