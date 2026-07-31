const fs = require('fs');
let content = fs.readFileSync('components/PrintLayout.tsx', 'utf8');
content = content.replace(
  'const canvas = await html2canvas(pageElement, {',
  'const canvas = await html2canvas(pageElement as HTMLElement, {'
);
fs.writeFileSync('components/PrintLayout.tsx', content);
