
import React, { useState } from 'react';
import { X, Upload, Monitor, MousePointer2, Sparkles, ImageIcon } from 'lucide-react';

interface TutorialPopupProps {
  onClose: (hideForever: boolean) => void;
}

const TutorialPopup: React.FC<TutorialPopupProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onClose(dontShowAgain)}
      ></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button 
          onClick={() => onClose(dontShowAgain)}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X size={24} />
        </button>

        <div className="p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="mb-6 relative">
              <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full"></div>
              <div className="relative w-20 h-20 bg-indigo-600 rounded-2xl shadow-xl flex items-center justify-center text-white">
                <Sparkles size={40} />
              </div>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-4 leading-tight">
              문제 사진을 업로드하면<br/><span className="text-indigo-600">오답노트가 완성됩니다</span>
            </h2>
            <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
              이미지 파일에서 문제 영역을 자동으로 감지하고, 인쇄하기 좋은 깔끔한 PDF로 만들어 드립니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 text-left">
            <div className="space-y-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center"><Upload size={20}/></div>
              <h4 className="font-bold text-gray-900 text-sm">이미지 업로드</h4>
              <p className="text-xs text-gray-500 leading-relaxed">기기 내의 문제 이미지 파일을 선택하거나 여러 장을 한 번에 업로드하세요.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><Monitor size={20}/></div>
              <h4 className="font-bold text-gray-900 text-sm">자동 영역 보정</h4>
              <p className="text-xs text-gray-500 leading-relaxed">기울어진 각도를 보정하고 여백을 제거합니다. 사진 상태에 따라 직접 편집 기능도 제공됩니다.</p>
            </div>
            <div className="space-y-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center"><MousePointer2 size={20}/></div>
              <h4 className="font-bold text-gray-900 text-sm">레이아웃 구성</h4>
              <p className="text-xs text-gray-500 leading-relaxed">제공되는 PDF 템플릿을 선택하여 깔끔한 오답 노트를 만들어 보세요.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-gray-100 gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer"
                />
                <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
              </div>
              <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">다시 표시하지 않기</span>
            </label>

            <button
              onClick={() => onClose(dontShowAgain)}
              className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white rounded-xl font-bold text-base shadow-lg hover:bg-gray-800 transition-all active:scale-95"
            >
              지금 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Check = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default TutorialPopup;
