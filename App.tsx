import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PrintLayout from './components/PrintLayout';
import { ProcessedProblem, ViewMode } from './types';

const App: React.FC = () => {
  const [problems, setProblems] = useState<ProcessedProblem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.DASHBOARD);

  return (
    <div className="h-screen w-full bg-gray-50 text-gray-900 print:h-auto print:overflow-visible">
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