
/**
 * components/ImageEditor.tsx
 * 
 * [목적]
 * 사용자가 업로드한 원본 이미지를 캔버스 형태로 띄우고, 직접 영역(Crop box)을 지정하여 자르거나
 * 이미지 회전 각도 조정, 명도 조절(스캔 필터) 및 그림자 제거 여부를 선택적으로 적용할 수 있게 해주는 에디터 창입니다.
 * 
 * [주요 기능]
 * 1. 캔버스를 통한 시각적인 바운딩 박스 드래그 핸들링 (리사이즈 및 8방향 이동 지원)
 * 2. 원본 이미지 회전 적용 (세밀한 각도 조절 가능)
 * 3. 최종 확정 시 입력된 정보를 바탕으로 imageProcessor.ts의 유틸리티를 호출하여 이미지 데이터를 재가공
 */
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
        const MIN_SAFE_PADDING = 10;
        const MIN_SIZE = 50;

        if (initialCrop) {
          const boundedCrop = {
            x: Math.max(MIN_SAFE_PADDING, Math.min(initialCrop.x, img.width - MIN_SIZE - MIN_SAFE_PADDING)),
            y: Math.max(MIN_SAFE_PADDING, Math.min(initialCrop.y, img.height - MIN_SIZE - MIN_SAFE_PADDING)),
            width: Math.min(initialCrop.width, img.width - Math.max(MIN_SAFE_PADDING, initialCrop.x) - MIN_SAFE_PADDING),
            height: Math.min(initialCrop.height, img.height - Math.max(MIN_SAFE_PADDING, initialCrop.y) - MIN_SAFE_PADDING)
          };
          setCrop(boundedCrop);
        } else {
          const x = img.width * 0.1;
          const y = img.height * 0.1;
          const w = img.width * 0.8;
          const h = img.height * 0.8;
          setCrop({ x, y, width: w, height: h });
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

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.rect(crop.x, crop.y, crop.width, crop.height);
    ctx.fill('evenodd');

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);

    const handleSize = 18 / zoom;
    const drawHandle = (cx: number, cy: number) => {
        ctx.fillStyle = '#10b981'; 
        ctx.strokeStyle = '#fff'; 
        ctx.lineWidth = 2/zoom;
        ctx.beginPath(); 
        const half = handleSize / 2;
        ctx.rect(cx - half, cy - half, handleSize, handleSize);
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

  const handlePointerDown = (e: any) => {
    if (!crop) return;
    const pos = getPointerPos(e);
    const h = 30 / zoom;
    const { x, y } = pos;
    const { x: cx, y: cy, width: cw, height: ch } = crop;
    const midX = cx + cw / 2, midY = cy + ch / 2, r = cx + cw, b = cy + ch;

    const near = (px: number, py: number) => Math.abs(x - px) < h && Math.abs(y - py) < h;

    let mode: InteractionMode = null;
    if (near(cx, cy)) mode = 'resize-tl';
    else if (near(r, cy)) mode = 'resize-tr';
    else if (near(cx, b)) mode = 'resize-bl';
    else if (near(r, b)) mode = 'resize-br';
    else if (near(midX, cy)) mode = 'resize-tc';
    else if (near(midX, b)) mode = 'resize-bc';
    else if (near(cx, midY)) mode = 'resize-ml';
    else if (near(r, midY)) mode = 'resize-mr';
    else if (x > cx && x < r && y > cy && y < b) mode = 'move';

    if (mode) { 
      setInteractionMode(mode); 
      setDragStart(pos); 
      setInitialCropState({...crop}); 
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
      x = Math.max(0, Math.min(iW - w, x + dx));
      y = Math.max(0, Math.min(iH - h, y + dy));
    } else {
      if (interactionMode.includes('l')) {
        const nx = Math.max(0, Math.min(initialCropState.x + dx, initialCropState.x + initialCropState.width - minSize));
        w = initialCropState.x + initialCropState.width - nx;
        x = nx;
      }
      if (interactionMode.includes('r')) w = Math.max(minSize, Math.min(iW - x, initialCropState.width + dx));
      if (interactionMode.includes('t')) {
        const ny = Math.max(0, Math.min(initialCropState.y + dy, initialCropState.y + initialCropState.height - minSize));
        h = initialCropState.y + initialCropState.height - ny;
        y = ny;
      }
      if (interactionMode.includes('b')) h = Math.max(minSize, Math.min(iH - y, initialCropState.height + dy));
    }
    setCrop({ x, y, width: w, height: h });
  };

  const handleSave = () => {
    const img = sourceImageRef.current;
    if (!img || !crop) return;
    
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
      <div className="w-full max-w-4xl flex justify-between items-center mb-4 text-white z-10">
        <div className="flex flex-col">
          <h2 className="text-lg font-black tracking-wide">EDIT PROBLEM</h2>
          <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">LOCAL ANALYSIS ENGINE</p>
        </div>
        <div className="flex gap-3">
           <button onClick={onCancel} className="p-3 bg-white text-gray-900 rounded-full hover:bg-gray-200 transition"><X size={20} strokeWidth={2.5}/></button>
           <button onClick={handleSave} className="px-6 py-2.5 bg-white text-gray-900 rounded-full font-black uppercase tracking-wide transition active:scale-95 text-xs flex items-center gap-2"><Check size={16} strokeWidth={3}/> 적용 완료</button>
        </div>
      </div>

      <div ref={containerRef} className="relative flex-1 w-full overflow-hidden bg-gray-900 rounded-[2.5rem] flex items-center justify-center">
         {isProcessing && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}
         
         <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white text-gray-900 text-[10px] font-black rounded-full shadow-2xl z-30 flex items-center gap-2 transition-all duration-500 ${showTip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
            <Info size={16} strokeWidth={2.5} />
            영역의 핸들을 드래그하여 범위를 조절하세요.
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
            <span className="text-gray-300 text-xs font-bold">회전 각도</span>
            <div className="flex items-center gap-3">
                <button onClick={() => setRotation(r => r + 90)} className="px-3 py-1.5 bg-gray-700 text-white text-[10px] font-bold rounded-lg border border-gray-600 active:scale-95 transition hover:bg-gray-600"><RefreshCw size={12} className="inline mr-1"/> +90°</button>
                <div className="flex items-center bg-gray-900 border border-gray-600 rounded-lg px-2 py-1">
                    <input type="number" value={Math.round(rotation)} onChange={(e) => setRotation(Number(e.target.value))} className="w-10 bg-transparent text-white text-xs text-center focus:outline-none font-mono" />
                    <span className="text-[10px] text-gray-500">°</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700">
            <button onClick={() => setEnableShadowRemoval(!enableShadowRemoval)} className={`flex items-center justify-center gap-2 p-3 rounded-full border-2 transition-all font-bold ${enableShadowRemoval ? 'bg-white border-white text-gray-900' : 'bg-transparent border-gray-500 text-gray-400'}`}>
                <Sun size={16}/><span className="text-[10px]">음영 제거</span>
            </button>
            <button onClick={() => setEnableFilter(!enableFilter)} className={`flex items-center justify-center gap-2 p-3 rounded-full border-2 transition-all font-bold ${enableFilter ? 'bg-white border-white text-gray-900' : 'bg-transparent border-gray-500 text-gray-400'}`}>
                <Wand2 size={16}/><span className="text-[10px]">스캔 필터</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
