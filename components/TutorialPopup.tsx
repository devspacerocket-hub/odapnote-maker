/**
 * components/TutorialPopup.tsx
 * 
 * [목적]
 * 서비스에 처음 접속한 사용자에게 활용 방법 및 보안성(로컬 분석)을 안내하는 모달 팝업입니다.
 * 
 * [주요 기능]
 * 1. 서비스의 주요 3단계 기능 요약 안내 (업로드, 보정, PDF 레이아웃)
 * 2. 체크박스 클릭 상태에 따라 부모 컴포넌트에 "다시 표시하지 않기" 여부를 전달 (localStorage 사용을 위함)
 */
import React, { useState } from 'react';
import { X, Upload, Monitor, MousePointer2, Sparkles } from 'lucide-react';

interface TutorialPopupProps {
  onClose: (hideForever: boolean) => void;
}

const TutorialPopup: React.FC<TutorialPopupProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(dontShowAgain)}></div>
      
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col bg-[#fcfaf5] border-2 border-gray-900 rounded-[2rem] sm:rounded-[2.5rem] animate-in fade-in zoom-in duration-300 shadow-[4px_4px_0_0_rgba(17,24,39,1)] sm:shadow-[8px_8px_0_0_rgba(17,24,39,1)]">
        
        {/* Header - Fixed */}
        <div className="shrink-0 flex justify-end p-4 md:p-6 pb-0">
          <button onClick={() => onClose(dontShowAgain)} className="p-2 text-gray-900 border-2 border-transparent hover:border-gray-900 rounded-full transition-all bg-[#fcfaf5] z-10">
            <X size={20} className="stroke-[3]"/>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-0">
          <div className="flex flex-col items-center text-center mb-8 md:mb-10">
            <div className="mb-6 relative">
              <div className="relative w-16 h-16 border-2 border-gray-900 rounded-[1.5rem] bg-white flex items-center justify-center text-gray-900">
                <Sparkles size={32} />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-4 leading-tight uppercase tracking-tight">오답노트를 더 쉽고<br/>깔끔하게 만들어 보세요</h2>
            <p className="text-gray-600 font-medium text-sm max-w-sm mx-auto leading-relaxed">서버 전송 없이 사용자의 기기에서 즉시 문제를 분석하고 인쇄용 문서를 생성합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 border-2 border-gray-900 rounded-xl bg-white flex items-center justify-center"><Upload size={18} className="text-gray-900 stroke-[2.5]"/></div>
              <h4 className="font-bold text-gray-900 text-sm">업로드 및 분석</h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">여러 장의 사진을 올리면 로컬 엔진이 자동으로 문제 영역을 찾습니다.</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 border-2 border-gray-900 rounded-xl bg-white flex items-center justify-center"><Monitor size={18} className="text-gray-900 stroke-[2.5]"/></div>
              <h4 className="font-bold text-gray-900 text-sm">스마트 보정</h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">그림자를 제거하고 화질을 개선하여 인쇄하기 가장 좋은 상태로 만듭니다.</p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 border-2 border-gray-900 rounded-xl bg-white flex items-center justify-center"><MousePointer2 size={18} className="text-gray-900 stroke-[2.5]"/></div>
              <h4 className="font-bold text-gray-900 text-sm">PDF 레이아웃</h4>
              <p className="text-[11px] text-gray-600 font-medium leading-relaxed">원하는 개수만큼 문제를 배치하여 나만의 오답 노트를 완성하세요.</p>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="shrink-0 p-6 md:p-8 border-t-2 border-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={() => setDontShowAgain(!dontShowAgain)} className="flex items-center gap-3 group w-full sm:w-auto justify-center sm:justify-start">
            <div className={`w-5 h-5 rounded-md border-2 transition-colors flex items-center justify-center ${dontShowAgain ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-900'}`}>
              {dontShowAgain && <Check size={12} className="text-white stroke-[3]" />}
            </div>
            <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase">다시 표시하지 않기</span>
          </button>

          <button onClick={() => onClose(dontShowAgain)} className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white rounded-full font-black text-xs uppercase tracking-wide hover:bg-black transition-all active:scale-95">지금 시작하기</button>
        </div>
      </div>
    </div>
  );
};

const Check = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
);

export default TutorialPopup;
