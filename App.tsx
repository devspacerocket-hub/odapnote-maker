/**
 * App.tsx
 * 
 * 애플리케이션의 최상위(Root) 컴포넌트입니다.
 * 
 * [목적]
 * 1. 애플리케이션의 전역 상태인 오답노트 문제 목록(problems)을 관리합니다.
 * 2. 현재 사용자 화면(ViewMode)이 메인 대시보드(DASHBOARD)인지, PDF 인쇄 미리보기(PRINT_PREVIEW)인지 상태를 관리하고 화면을 전환합니다.
 */
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PrintLayout from './components/PrintLayout';
import { ProcessedProblem, ViewMode } from './types';

const App: React.FC = () => {
  // 사용자가 업로드하고 처리한 문제 사진들의 배열 상태 (전역 상태 역할)
  const [problems, setProblems] = useState<ProcessedProblem[]>([]);
  // 현재 화면 모드 상태 (대시보드 또는 인쇄 모드)
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);

  return (
    // print:* 클래스를 통해 인쇄 시 적용될 스타일 오버라이드를 제어합니다.
    <div className="h-screen w-full bg-[#fcfaf5] text-gray-900 print:h-auto print:overflow-visible">
      {viewMode === ViewMode.DASHBOARD ? (
        <Dashboard 
          problems={problems} 
          setProblems={setProblems} 
          setViewMode={setViewMode} 
        />
      ) : (
        <PrintLayout 
          problems={problems} 
          setViewMode={setViewMode} 
        />
      )}
    </div>
  );
};

export default App;