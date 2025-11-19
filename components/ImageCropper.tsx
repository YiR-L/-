import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { AspectRatio } from '../types';

interface ImageCropperProps {
  imageUrl: string;
  aspectRatio: AspectRatio;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

const RATIO_MULTIPLIERS = {
  [AspectRatio.VERTICAL]: 3 / 4,
  [AspectRatio.SQUARE]: 1 / 1,
  [AspectRatio.PORTRAIT]: 9 / 16,
  [AspectRatio.LANDSCAPE]: 16 / 9,
};

const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, aspectRatio, onConfirm, onCancel }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, loaded: false });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const targetRatio = RATIO_MULTIPLIERS[aspectRatio];

  // Reset when config changes
  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    setScale(1);
  }, [imageUrl, aspectRatio]);

  // Update container size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width, height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [aspectRatio]); // Re-check when aspect ratio changes the container shape

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight,
      loaded: true
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // Determine if the image is "wider" than the container (for object-fit: cover logic)
  const isImageWider = () => {
    if (!imageDimensions.loaded || containerDimensions.height === 0) return true;
    const imgRatio = imageDimensions.width / imageDimensions.height;
    const contRatio = containerDimensions.width / containerDimensions.height;
    return imgRatio > contRatio;
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;

    if (!canvas || !container || !img || !imageDimensions.loaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Get Dimensions
    const { width: cw, height: ch } = container.getBoundingClientRect();
    const { width: nw, height: nh } = imageDimensions;

    // 2. Calculate "Base Rendered Size" (The size of the image element in pixels before transform scale)
    // Matches the logic in the render (isImageWider)
    const imgRatio = nw / nh;
    const containerRatio = cw / ch;
    
    let rw, rh; // Rendered Width, Rendered Height
    if (imgRatio > containerRatio) {
       // Image is wider: Height fits container, Width overflows
       rh = ch;
       rw = ch * imgRatio;
    } else {
       // Image is taller: Width fits container, Height overflows
       rw = cw;
       rh = cw / imgRatio;
    }

    // 3. Map DOM Coordinates to Source Coordinates
    // DOM Center relative to Container Top-Left
    const cx_dom = cw / 2;
    const cy_dom = ch / 2;

    // Mapping Function
    const mapDomToSource = (dx: number, dy: number) => {
        // Vector from Visual Image Center to Point (dx, dy)
        // Visual Center = (cx_dom + position.x, cy_dom + position.y)
        const vx = dx - (cx_dom + position.x);
        const vy = dy - (cy_dom + position.y);

        // Undo Scale (to get to Base Rendered Space)
        const vx_unscaled = vx / scale;
        const vy_unscaled = vy / scale;

        // Map to Source Space (Natural Dimensions)
        const scaleX = nw / rw;
        
        // Offset from Source Center
        const sx_offset = vx_unscaled * scaleX;
        const sy_offset = vy_unscaled * scaleX; // scaleY is same as scaleX

        return {
            x: nw / 2 + sx_offset,
            y: nh / 2 + sy_offset
        };
    };

    const topLeft = mapDomToSource(0, 0);
    const bottomRight = mapDomToSource(cw, ch);

    const sx = topLeft.x;
    const sy = topLeft.y;
    const sw = bottomRight.x - topLeft.x;
    const sh = bottomRight.y - topLeft.y;

    // 4. Output Configuration
    const outputWidth = 1080; 
    const outputHeight = outputWidth / targetRatio;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // 5. Draw
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
    
    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    // 6. Export
    const base64 = canvas.toDataURL('image/png', 0.95);
    onConfirm(base64.split(',')[1]);
  };

  const isWide = isImageWider();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">调整画面</h3>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden select-none flex items-center justify-center p-8 min-h-[400px]">
            
            {/* Mask / Window */}
            <div 
                ref={containerRef}
                className="relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-10 border-2 border-white ring-1 ring-black/20"
                style={{
                    aspectRatio: `${targetRatio}`,
                    width: targetRatio >= 1 ? '100%' : 'auto',
                    height: targetRatio < 1 ? '450px' : 'auto',
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* 
                   Image: 
                   - Rendered using standard flow relative to container.
                   - Transformed via CSS to handle pan/zoom.
                   - 'isWide' logic ensures it covers the area initially (min-width/height equivalent).
                */}
                <img 
                    ref={imageRef}
                    src={imageUrl} 
                    onLoad={onImageLoad}
                    alt="Crop target"
                    className="absolute top-1/2 left-1/2 max-w-none select-none pointer-events-none origin-center will-change-transform"
                    style={{
                        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        width: isWide ? 'auto' : '100%',
                        height: isWide ? '100%' : 'auto',
                    }}
                    draggable={false}
                />
                
                {/* Grid Overlay */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-white/60 shadow-sm"></div>
                    <div className="border-r border-white/60 shadow-sm"></div>
                    <div className="border-white/60"></div>
                    <div className="border-t border-r border-white/60 shadow-sm"></div>
                    <div className="border-t border-r border-white/60 shadow-sm"></div>
                    <div className="border-t border-white/60 shadow-sm"></div>
                    <div className="border-t border-r border-white/60 shadow-sm"></div>
                    <div className="border-t border-r border-white/60 shadow-sm"></div>
                    <div className="border-t border-white/60 shadow-sm"></div>
                </div>
            </div>
        </div>

        {/* Controls */}
        <div className="px-8 py-6 bg-white border-t border-gray-100 flex flex-col gap-4">
            <div className="flex items-center gap-4 px-2">
                <ZoomOut size={18} className="text-gray-400" />
                <input 
                    type="range" 
                    min="0.5" 
                    max="3" 
                    step="0.01" 
                    value={scale} 
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF2442]"
                />
                <ZoomIn size={18} className="text-gray-400" />
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={onCancel}
                    className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    取消
                </button>
                <button 
                    onClick={handleSave}
                    className="flex-1 py-3.5 bg-[#FF2442] text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:shadow-red-300 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center gap-2"
                >
                    <Check size={18} strokeWidth={3} /> 确认裁剪
                </button>
            </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default ImageCropper;