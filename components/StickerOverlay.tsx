import React, { useRef } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Sticker } from '../types';

interface StickerOverlayProps {
  stickers: Sticker[];
  onUpdateSticker: (id: string, changes: Partial<Sticker>) => void;
  onRemoveSticker: (id: string) => void;
}

const StickerOverlay: React.FC<StickerOverlayProps> = ({
  stickers,
  onUpdateSticker,
  onRemoveSticker,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{id: string, startX: number, startY: number, initX: number, initY: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent, sticker: Sticker) => {
    e.stopPropagation();
    dragRef.current = {
        id: sticker.id,
        startX: e.clientX,
        startY: e.clientY,
        initX: sticker.x,
        initY: sticker.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    e.preventDefault();

    const { startX, startY, initX, initY, id } = dragRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate delta in pixels
    const deltaXPixels = e.clientX - startX;
    const deltaYPixels = e.clientY - startY;

    // Convert to percentages relative to the VISUAL container size
    const deltaXPercent = (deltaXPixels / rect.width) * 100;
    const deltaYPercent = (deltaYPixels / rect.height) * 100;

    onUpdateSticker(id, {
        x: initX + deltaXPercent,
        y: initY + deltaYPercent
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        dragRef.current = null;
    }
  };

  return (
    <div 
        ref={containerRef}
        className="absolute inset-0 z-20 overflow-hidden pointer-events-none"
        style={{ touchAction: 'none' }} // Prevent scrolling while interacting
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
    >
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute cursor-move group touch-none select-none pointer-events-auto"
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
          }}
          onPointerDown={(e) => handlePointerDown(e, sticker)}
        >
           {/* Sticker Content */}
           {/* 15cqw matches the 0.15 * width logic in CoverCanvas perfectly */}
           <div 
             className="relative p-2 border-2 border-transparent hover:border-[#FF2442] hover:border-dashed rounded-xl transition-colors font-serif"
             style={{ fontSize: '15cqw', lineHeight: 1, cursor: 'default' }}
           >
              <div className="drop-shadow-md">
                  {sticker.content}
              </div>
              
              {/* Delete Handle */}
              <button 
                className="absolute -top-3 -right-3 w-6 h-6 bg-[#FF2442] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 hover:scale-110"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onRemoveSticker(sticker.id);
                }}
              >
                <X size={14} strokeWidth={3} />
              </button>

               {/* Simple Scale Controls */}
               <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 bg-white rounded-full shadow-lg px-2 py-1 transition-opacity scale-[0.4] origin-top">
                   <button 
                     className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-600 font-bold"
                     onPointerDown={(e) => {
                        e.stopPropagation();
                        onUpdateSticker(sticker.id, { scale: Math.max(0.2, sticker.scale - 0.1) });
                     }}
                   > <Minus size={20} /> </button>
                   <button 
                     className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full text-gray-600 font-bold"
                     onPointerDown={(e) => {
                        e.stopPropagation();
                        onUpdateSticker(sticker.id, { scale: Math.min(5, sticker.scale + 0.1) });
                     }}
                   > <Plus size={20} /> </button>
               </div>
           </div>
        </div>
      ))}
    </div>
  );
};

export default StickerOverlay;