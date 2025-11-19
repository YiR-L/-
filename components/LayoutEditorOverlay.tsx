
import React, { useRef } from 'react';
import { Move } from 'lucide-react';
import { LayoutConfig } from '../types';

interface LayoutEditorOverlayProps {
  layoutConfig: LayoutConfig;
  onUpdateLayout: (changes: Partial<LayoutConfig>) => void;
  showGuides?: boolean;
}

const LayoutEditorOverlay: React.FC<LayoutEditorOverlayProps> = ({
  layoutConfig,
  onUpdateLayout,
  showGuides = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{type: 'title' | 'subtitle', startX: number, startY: number, initX: number, initY: number} | null>(null);

  // Title Config
  const titleX = layoutConfig.x ?? 50;
  const titleY = layoutConfig.y ?? 50;
  const titleScale = layoutConfig.scale ?? 1;

  // Subtitle Config (Fallback to relative if not set yet)
  const subX = layoutConfig.subtitleX ?? titleX;
  const subY = layoutConfig.subtitleY ?? (titleY + 15); // Fallback rough offset

  const handlePointerDown = (e: React.PointerEvent, type: 'title' | 'subtitle') => {
    e.stopPropagation();
    const initX = type === 'title' ? titleX : subX;
    const initY = type === 'title' ? titleY : subY;
    
    dragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        initX,
        initY
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    e.preventDefault();

    const { startX, startY, initX, initY, type } = dragRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate delta in pixels
    const deltaXPixels = e.clientX - startX;
    const deltaYPixels = e.clientY - startY;

    // Convert to percentages relative to the VISUAL container size
    const deltaXPercent = (deltaXPixels / rect.width) * 100;
    const deltaYPercent = (deltaYPixels / rect.height) * 100;

    if (type === 'title') {
        onUpdateLayout({
            x: initX + deltaXPercent,
            y: initY + deltaYPercent
        });
    } else {
        onUpdateLayout({
            subtitleX: initX + deltaXPercent,
            subtitleY: initY + deltaYPercent
        });
    }
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
        className="absolute inset-0 z-10 overflow-hidden pointer-events-none"
    >
      {/* 1. Draggable Area for Main Title */}
      <div
          className="absolute cursor-move group pointer-events-auto flex flex-col items-center justify-center"
          style={{
            left: `${titleX}%`,
            top: `${titleY}%`,
            transform: `translate(-50%, -50%) scale(${titleScale})`,
            width: '80%', 
            height: '15%', // Adjusted height to not overlap with subtitle
            touchAction: 'none' 
          }}
          onPointerDown={(e) => handlePointerDown(e, 'title')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
      >
          <div className={`
            absolute inset-0 border-2 rounded-lg transition-all duration-300 flex items-start justify-end p-1
            ${showGuides ? 'border-dashed border-[#FF2442]/30 bg-[#FF2442]/5' : 'border-transparent'}
            group-hover:border-[#FF2442] group-hover:border-dashed
          `}>
             <div className={`
                bg-[#FF2442] text-white p-1 rounded-md transition-opacity duration-300
                ${showGuides ? 'opacity-100' : 'opacity-0'}
                group-hover:opacity-100
             `}>
                <Move size={12} />
             </div>
          </div>
      </div>

      {/* 2. Draggable Area for Subtitle */}
      <div
          className="absolute cursor-move group pointer-events-auto flex flex-col items-center justify-center"
          style={{
            left: `${subX}%`,
            top: `${subY}%`,
            transform: `translate(-50%, -50%) scale(${titleScale})`, // Scale with title for consistency
            width: '60%', 
            height: '10%', 
            touchAction: 'none' 
          }}
          onPointerDown={(e) => handlePointerDown(e, 'subtitle')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
      >
          <div className={`
            absolute inset-0 border-2 rounded-lg transition-all duration-300 flex items-start justify-end p-1
            ${showGuides ? 'border-dashed border-blue-400/30 bg-blue-400/5' : 'border-transparent'}
            group-hover:border-blue-400 group-hover:border-dashed
          `}>
             <div className={`
                bg-blue-400 text-white p-1 rounded-md transition-opacity duration-300
                ${showGuides ? 'opacity-100' : 'opacity-0'}
                group-hover:opacity-100
             `}>
                <Move size={12} />
             </div>
          </div>
      </div>
    </div>
  );
};

export default LayoutEditorOverlay;
