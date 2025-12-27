import React, { useState, useRef, useEffect } from 'react';
import { CropArea } from '../types';
import { RotateCw, Check, X, Wand2, Loader2, RefreshCw, Sun, Info } from 'lucide-react';
import { applyScanFilter, applyShadowRemoval } from '../utils/imageProcessor';

interface ImageEditorProps {
  imageSrc: string;
  initialRotation?: number;
  initialCrop?: CropArea;
  onSave: (processedImage: string, crop: CropArea, rotation: number) => void;
  onCancel: () => void;
}

type InteractionMode = 
  | 'move' 
  | 'rotate' 
  | 'resize-tl' | 'resize-tc' | 'resize-tr' 
  | 'resize-ml' | 'resize-mr' 
  | 'resize-bl' | 'resize-bc' | 'resize-br' 
  | null;

const ImageEditor: React.FC<ImageEditorProps> = ({ 
  imageSrc, 
  initialRotation = 0, 
  initialCrop,
  onSave, 
  onCancel 
}) => {
  const [rotation, setRotation] = useState(initialRotation);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [enableFilter, setEnableFilter] = useState(true);
  const [enableShadowRemoval, setEnableShadowRemoval] = useState(true);
  const [zoom, setZoom] = useState(0.8);
  const [showTip, setShowTip] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(true);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCropState, setInitialCropState] = useState<CropArea | null>(null);

  // 팁 메시지는 최초 1회만 강조하고 이후에는 작게 유지
  useEffect(() => {
    const timer = setTimeout(() => setShowTip(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        sourceImageRef.current = img;
        const DEFAULT_MARGIN = 30; // 사진 경계보다 30px 작게 설정
        const MIN_SAFE_PADDING = 10; // 자동 분석 결과도 최소 10px 여백 강제
        const MIN_SIZE = 50;

        console.log(`[ImageEditor] 원본 사진 로드: ${img.width}x${img.height}`);
        
        if (initialCrop) {
          // AI 분석 결과가 있을 때: 사진 경계보다 최소 MIN_SAFE_PADDING 만큼 안쪽에 있도록 보정
          const boundedCrop = {
            x: Math.max(MIN_SAFE_PADDING, Math.min(initialCrop.x, img.width - MIN_SIZE - MIN_SAFE_PADDING)),
            y: Math.max(MIN_SAFE_PADDING, Math.min(initialCrop.y, img.height - MIN_SIZE - MIN_SAFE_PADDING)),
            width: Math.min(initialCrop.width, img.width - Math.max(MIN_SAFE_PADDING, initialCrop.x) - MIN_SAFE_PADDING),
            height: Math.min(initialCrop.height, img.height - Math.max(MIN_SAFE_PADDING, initialCrop.y) - MIN_SAFE_PADDING)
          };
          setCrop(boundedCrop);
          console.log(`[ImageEditor] 분석 영역 여백 보정 적용:`, boundedCrop);
        } else {
          // 분석 결과 없을 때: 사진보다 30px 작은 사각형으로 시작
          const x = Math.min(DEFAULT_MARGIN, img.width / 4);
          const y = Math.min(DEFAULT_MARGIN, img.height / 4);
          const w = Math.max(MIN_SIZE, img.width - (x * 2));
          const h = Math.max(MIN_SIZE, img.height - (y * 2));
          
          const defaultCrop = { x, y, width: w, height: h };
          setCrop(defaultCrop);
          console.log(`[ImageEditor] 기본 여백(30px) 크롭 박스 설정:`, defaultCrop);
        }

        if (containerRef.current) {
             const containerW = containerRef.current.clientWidth - 40;
             const containerH = containerRef.current.clientHeight - 100;
             setZoom(Math.min(containerW / img.width, containerH / img.height, 0.9));
        }
        setIsProcessing(false);
    };
  }, [imageSrc, initialCrop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = sourceImageRef.current;
    if (!canvas || !img || !crop) return;
    if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width; canvas.height = img.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Overlay (Background)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(crop.x, crop.y, crop.width, crop.height);
    ctx.fill('evenodd');

    // Crop Box Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    // Handles
    const handleSize = 18 / zoom;
    const drawHandle = (cx: number, cy: number) => {
        ctx.fillStyle = '#4f46e5'; 
        ctx.strokeStyle = '#fff'; 
        ctx.lineWidth = 2/zoom;
        ctx.beginPath(); 
        
        // 핸들이 이미지 경계 밖으로 나가지 않도록 시각적 위치 보정
        const half = handleSize / 2;
        let drawX = cx;
        let drawY = cy;
        
        if (cx <= half) drawX = half;
        if (cx >= img.width - half) drawX = img.width - half;
        if (cy <= half) drawY = half;
        if (cy >= img.height - half) drawY = img.height - half;

        ctx.rect(drawX - half, drawY - half, handleSize, handleSize);
        ctx.fill(); 
        ctx.stroke();
    };

    const midX = crop.x + crop.width / 2;
    const midY = crop.y + crop.height / 2;
    const right = crop.x + crop.width;
    const bottom = crop.y + crop.height;

    drawHandle(crop.x, crop.y); drawHandle(midX, crop.y); drawHandle(right, crop.y);
    drawHandle(crop.x, midY); drawHandle(right, midY);
    drawHandle(crop.x, bottom); drawHandle(midX, bottom); drawHandle(right, bottom);
  }, [crop, zoom, rotation]);

  const getPointerPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const rad = -rotation * Math.PI / 180;
    const relX = clientX - cx, relY = clientY - cy;
    const rotX = relX * Math.cos(rad) - relY * Math.sin(rad);
    const rotY = relX * Math.sin(rad) + relY * Math.cos(rad);
    
    return { x: rotX / zoom + canvas.width / 2, y: rotY / zoom + canvas.height / 2 };
  };

  const getInteractionMode = (pos: {x: number, y: number}): InteractionMode => {
    if (!crop) return null;
    const h = 30 / zoom; 
    const { x, y } = pos;
    const { x: cx, y: cy, width: cw, height: ch } = crop;
    const midX = cx + cw / 2, midY = cy + ch / 2, r = cx + cw, b = cy + ch;

    const near = (px: number, py: number) => Math.abs(x - px) < h && Math.abs(y - py) < h;

    if (near(cx, cy)) return 'resize-tl';
    if (near(r, cy)) return 'resize-tr';
    if (near(cx, b)) return 'resize-bl';
    if (near(r, b)) return 'resize-br';
    if (near(midX, cy)) return 'resize-tc';
    if (near(midX, b)) return 'resize-bc';
    if (near(cx, midY)) return 'resize-ml';
    if (near(r, midY)) return 'resize-mr';
    if (x > cx && x < r && y > cy && y < b) return 'move';
    return null;
  };

  const handlePointerDown = (e: any) => {
    if (!crop) return;
    const pos = getPointerPos(e);
    const mode = getInteractionMode(pos);
    if (mode) { 
      setInteractionMode(mode); 
      setDragStart(pos); 
      setInitialCropState({...crop}); 
      console.log(`[ImageEditor] 드래그 시작: 모드=${mode}`);
    }
  };

  const handlePointerMove = (e: any) => {
    if (!interactionMode || !initialCropState || !sourceImageRef.current) return;
    const pos = getPointerPos(e);
    const dx = pos.x - dragStart.x, dy = pos.y - dragStart.y;
    const { width: iW, height: iH } = sourceImageRef.current;
    
    let { x, y, width: w, height: h } = initialCropState;
    const minSize = 30;

    if (interactionMode === 'move') {
      const targetX = x + dx;
      const targetY = y + dy;
      
      // 이동 경계 제한
      x = Math.max(0, Math.min(iW - w, targetX));
      y = Math.max(0, Math.min(iH - h, targetY));
      
      if (targetX < 0 || targetX > iW - w || targetY < 0 || targetY > iH - h) {
        console.log(`[ImageEditor] 이동 제한: 사진 경계 도달`);
      }
    } else {
      // 리사이즈 경계 제한
      if (interactionMode.includes('l')) {
        const potentialX = initialCropState.x + dx;
        const boundedX = Math.max(0, Math.min(potentialX, initialCropState.x + initialCropState.width - minSize));
        x = boundedX;
        w = initialCropState.x + initialCropState.width - boundedX;
      }
      if (interactionMode.includes('r')) {
        const potentialW = initialCropState.width + dx;
        w = Math.max(minSize, Math.min(iW - x, potentialW));
      }
      if (interactionMode.includes('t')) {
        const potentialY = initialCropState.y + dy;
        const boundedY = Math.max(0, Math.min(potentialY, initialCropState.y + initialCropState.height - minSize));
        y = boundedY;
        h = initialCropState.y + initialCropState.height - boundedY;
      }
      if (interactionMode.includes('b')) {
        const potentialH = initialCropState.height + dy;
        h = Math.max(minSize, Math.min(iH - y, potentialH));
      }
    }
    setCrop({ x, y, width: w, height: h });
  };

  const handleSave = () => {
    const img = sourceImageRef.current;
    if (!img || !crop) return;
    
    console.log(`[ImageEditor] 최종 자르기 영역 확정:`, crop);
    
    const c = document.createElement('canvas');
    c.width = crop.width; c.height = crop.height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

    let final = c;
    if (rotation !== 0) {
      const rad = (rotation * Math.PI) / 180;
      const w = Math.abs(crop.width * Math.cos(rad)) + Math.abs(crop.height * Math.sin(rad));
      const h = Math.abs(crop.width * Math.sin(rad)) + Math.abs(crop.height * Math.cos(rad));
      const rc = document.createElement('canvas');
      rc.width = w; rc.height = h;
      const rx = rc.getContext('2d');
      if (rx) {
        rx.fillStyle = '#ffffff'; rx.fillRect(0,0,w,h);
        rx.translate(w/2, h/2); rx.rotate(rad);
        rx.drawImage(c, -crop.width/2, -crop.height/2);
        final = rc;
      }
    }

    const fx = final.getContext('2d');
    if (fx) {
      if (enableShadowRemoval) applyShadowRemoval(final, fx);
      if (enableFilter) applyScanFilter(final, fx);
    }
    
    onSave(final.toDataURL('image/jpeg', 0.95), crop, rotation);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 touch-none select-none">
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white z-10 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold">편집</h2>
          <p className="text-[10px] text-gray-400 font-medium">영역을 선택하고 필터를 적용해 보세요</p>
        </div>
        <div className="flex gap-4">
           <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition"><X /></button>
           <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 rounded-xl font-bold shadow-lg transition active:scale-95">적용 완료</button>
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 w-full overflow-hidden bg-gray-900 rounded-[2rem] border border-gray-800 flex items-center justify-center group">
         {isProcessing && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>}
         
         {/* UX Tip Message */}
         <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-indigo-600/90 text-white text-xs font-bold rounded-full shadow-2xl z-30 flex items-center gap-2 transition-all duration-500 ${showTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <Info size={14} />
            자르기 영역은 사진 범위 안에서만 조절할 수 있어요.
         </div>

         <canvas 
            ref={canvasRef}
            style={{ 
              width: sourceImageRef.current ? sourceImageRef.current.width * zoom : 'auto', 
              transform: `rotate(${rotation}deg)`,
              maxWidth: 'none' 
            }}
            className="shadow-2xl touch-none block"
            onMouseDown={handlePointerDown} onMouseMove={handlePointerMove} onMouseUp={() => setInteractionMode(null)} onMouseLeave={() => setInteractionMode(null)}
            onTouchStart={handlePointerDown} onTouchMove={handlePointerMove} onTouchEnd={() => setInteractionMode(null)}
         />
      </div>

      <div className="w-full max-w-xl mt-4 p-5 bg-gray-800 rounded-2xl shadow-xl border border-gray-700 space-y-4 z-10 shrink-0">
        <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm font-bold">회전 각도</span>
            <div className="flex items-center gap-3">
                <button onClick={() => setRotation(r => Math.round((r + 90) / 90) * 90)} className="px-4 py-2 bg-gray-700 text-white text-xs font-bold rounded-xl border border-gray-600 active:scale-95 transition hover:bg-gray-600"><RefreshCw size={14} className="inline mr-2"/> +90°</button>
                <div className="flex items-center bg-gray-900 border border-gray-600 rounded-xl px-3 py-1.5">
                    <input type="number" value={Math.round(rotation)} onChange={(e) => setRotation(Number(e.target.value))} className="w-12 bg-transparent text-white text-xs text-center focus:outline-none font-mono" />
                    <span className="text-[10px] text-gray-500">°</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-2xl border border-transparent hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3"><Sun className={enableShadowRemoval ? "text-yellow-400" : "text-gray-500"} size={18}/><span className="text-gray-300 text-xs font-bold">음영 제거</span></div>
                <input type="checkbox" checked={enableShadowRemoval} onChange={(e) => setEnableShadowRemoval(e.target.checked)} className="accent-indigo-500 w-5 h-5 cursor-pointer" />
            </div>
            <div className="flex items-center justify-between bg-gray-700/30 p-3 rounded-2xl border border-transparent hover:border-gray-600 transition-colors">
                <div className="flex items-center gap-3"><Wand2 className={enableFilter ? "text-indigo-400" : "text-gray-500"} size={18}/><span className="text-gray-300 text-xs font-bold">스캔 필터</span></div>
                <input type="checkbox" checked={enableFilter} onChange={(e) => setEnableFilter(e.target.checked)} className="accent-indigo-500 w-5 h-5 cursor-pointer" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;