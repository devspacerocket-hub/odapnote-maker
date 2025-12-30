import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PrintLayout from './components/PrintLayout';
import AdSenseUnit from './components/AdSenseUnit';
import { ProcessedProblem, ViewMode } from './types';

const App: React.FC = () => {
  const [problems, setProblems] = useState<ProcessedProblem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900 print:h-auto print:overflow-visible">
      
      {/* === 전체 레이아웃 === */}
      <div className="flex justify-center gap-4 px-4">

        {/* LEFT SIDEBAR */}
        <aside className="hidden xl:block w-[160px] sticky top-20 h-fit">
          <AdSenseUnit
            slotId="3514376545" // 교체 필요
            format="vertical"
            label="Side Ad"
          />
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 max-w-[1100px]">
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
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="hidden xl:block w-[160px] sticky top-20 h-fit">
          <AdSenseUnit
            slotId="2201294878" //교체 필요
            format="vertical"
          />
        </aside>

      </div>
    </div>
  );
};

export default App;
