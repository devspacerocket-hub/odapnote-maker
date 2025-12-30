import React, { useEffect } from 'react';

interface AdSenseUnitProps {
  slotId: string;
  clientId?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: boolean;
  className?: string;
  label?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdSenseUnit: React.FC<AdSenseUnitProps> = ({ 
  slotId, 
  clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID , // 실제 본인의 ID로 교체 필요
  format = "auto", 
  responsive = true,
  className = "",
  label = "Advertisement"
}) => {

  useEffect(() => {
    const timer = setTimeout(() => {
        try {
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense Error:", e);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 사이드바 광고용(vertical)일 경우 높이를 길게 설정
  const isVertical = format === 'vertical';

  return (
    <div className={`w-full flex justify-center my-4 no-print overflow-hidden relative rounded-xl bg-gray-100/50 border border-gray-100/50 ${className}`} 
         style={{ minHeight: isVertical ? '600px' : '100px' }}>
        
        {/* Placeholder for Dev/Loading */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-gray-300 font-bold uppercase tracking-widest pointer-events-none">
            <span className="mb-1 opacity-50">{label}</span>
            <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
        </div>
        
        <ins
            className="adsbygoogle"
            style={{ 
              display: 'block', 
              width: '100%', 
              height: isVertical ? '600px' : 'auto',
              minHeight: isVertical ? '600px' : '100px' 
            }}
            data-ad-client={clientId}
            data-ad-slot={slotId}
            data-ad-format={format}
            data-full-width-responsive={responsive ? "true" : "false"}
        />
    </div>
  );
};

export default AdSenseUnit;
