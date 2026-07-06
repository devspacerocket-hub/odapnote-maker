
/**
 * index.tsx
 * 
 * 애플리케이션의 진입점(Entry Point)입니다.
 * 
 * [목적]
 * React 애플리케이션을 빌드하여 웹 브라우저의 DOM(Document Object Model)에 부착(Mount)합니다.
 * 최상위 트리 렌더링을 담당합니다.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    // StrictMode는 개발 중에 발생할 수 있는 잠재적 문제를 미리 경고하기 위해 사용됩니다.
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
