
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { LayoutConfig, Sticker } from '../types';

interface CoverCanvasProps {
  imageBase64: string;
  title: string;
  layoutConfig: LayoutConfig;
  width: number;
  height: number;
  stickers?: Sticker[];
  filter?: string; // CSS Filter String
}

export interface CoverCanvasHandle {
  getCanvasImage: () => string;
  getBlob: () => Promise<Blob | null>;
}

const CoverCanvas = forwardRef<CoverCanvasHandle, CoverCanvasProps>(({ 
  imageBase64, 
  title, 
  layoutConfig,
  width,
  height,
  stickers = [],
  filter = 'none'
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    getCanvasImage: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL('image/png').split(',')[1];
      }
      return '';
    },
    getBlob: async () => {
      if (!canvasRef.current) return null;
      return new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((blob) => resolve(blob), 'image/png');
      });
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const img = new Image();
    img.src = `data:image/png;base64,${imageBase64}`;
    
    img.onload = () => {
      // 1. Draw Background Image with Filter
      ctx.save(); // Save state before applying filter
      if (filter && filter !== 'none') {
          ctx.filter = filter;
      }
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore(); // Restore state (removes filter for subsequent text/stickers)

      // 2. Overlay Filter (Gradient)
      const gradient = ctx.createLinearGradient(0, height, 0, height * 0.7);
      gradient.addColorStop(0, 'rgba(0,0,0,0.1)'); 
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, height / 2, width, height / 2);
      
      // Minimal global dimming
      ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
      ctx.fillRect(0, 0, width, height);

      // 3. Draw Layout Text
      if (layoutConfig) {
        drawLayoutText(ctx, layoutConfig, title, width, height);
      }

      // 4. Draw Stickers
      stickers.forEach(sticker => {
          ctx.save();
          const x = (sticker.x / 100) * width;
          const y = (sticker.y / 100) * height;
          
          ctx.translate(x, y);
          ctx.scale(sticker.scale, sticker.scale);
          ctx.rotate((sticker.rotation * Math.PI) / 180);
          
          if (sticker.type === 'emoji') {
              ctx.font = `${width * 0.15}px serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(sticker.content, 0, 0);
          }
          
          ctx.restore();
      });
    };
  }, [imageBase64, title, layoutConfig, width, height, stickers, filter]);

  return (
    <canvas 
      ref={canvasRef} 
      className="max-w-full max-h-full object-contain rounded-lg"
      style={{ width: '100%', height: 'auto', aspectRatio: `${width}/${height}` }}
    />
  );
});

function drawLayoutText(ctx: CanvasRenderingContext2D, config: LayoutConfig, title: string, width: number, height: number) {
      const { 
          subtitle, 
          textColor, 
          shadowColor, 
          position, 
          fontStyle, 
          fontFamily,
          x, 
          y, 
          subtitleX,
          subtitleY,
          scale = 1, 
          titleBackgroundColor,
          subtitleTextColor,
          subtitleBackgroundColor
      } = config;

      const minDim = Math.min(width, height);
      const baseSize = minDim * 0.13 * scale; 
      const subtitleSize = baseSize * 0.45;
      
      // Determine Font Settings
      let fontName = fontFamily || '"Microsoft YaHei", sans-serif';
      let fontWeight = '900';

      // Special handling for artistic fonts that don't have bold weights
      // "Ma Shan Zheng" and "ZCOOL QingKe HuangYou" are display fonts where 'bold' might distort them or isn't available.
      if (fontName.includes('Ma Shan Zheng') || fontName.includes('ZCOOL')) {
          fontWeight = 'normal';
      } else if (fontStyle === 'serif' && !fontFamily) {
          // Legacy fallback if fontFamily wasn't in config for some reason
          fontName = '"Noto Serif SC", serif';
          fontWeight = 'bold';
      } else if (fontStyle === 'modern' && !fontFamily) {
          fontName = '"Noto Sans SC", sans-serif';
          fontWeight = '700';
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Determine Title Position
      let titleX = width / 2;
      let titleY = height / 2;

      if (x !== undefined && y !== undefined) {
          titleX = (x / 100) * width;
          titleY = (y / 100) * height;
      } else {
          const safeAreaTop = height * 0.15;
          const safeAreaBottom = height * 0.15;
          
          if (position === 'top') {
            titleY = safeAreaTop + baseSize / 2;
          } else if (position === 'bottom') {
            titleY = height - safeAreaBottom - baseSize * 0.8;
          } else if (position === 'split') {
            titleY = height * 0.15; 
          } else {
            titleY = height / 2;
          }
      }

      // Determine Subtitle Position
      let subX = titleX;
      let subY = titleY + baseSize * 1.2; 

      if (subtitleX !== undefined && subtitleY !== undefined) {
          subX = (subtitleX / 100) * width;
          subY = (subtitleY / 100) * height;
      } else if (position === 'split' && x === undefined) {
           subY = height * 0.85;
      }

      // --- Draw Title Background ---
      ctx.font = `${fontWeight} ${baseSize}px ${fontName}`;
      const titleMetrics = ctx.measureText(title);
      
      if (titleBackgroundColor && titleBackgroundColor !== 'transparent') {
          const paddingX = baseSize * 0.6; 
          const paddingY = baseSize * 0.4;
          const bgWidth = titleMetrics.width + paddingX * 2;
          const bgHeight = baseSize * 1.6; 
          
          ctx.fillStyle = titleBackgroundColor;
          roundRect(ctx, titleX - bgWidth / 2, titleY - bgHeight / 2, bgWidth, bgHeight, 16);
          ctx.fill();
      }

      // --- Draw Title Text ---
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.lineWidth = baseSize * 0.08;
      ctx.strokeStyle = shadowColor;
      ctx.strokeText(title, titleX, titleY);
      
      ctx.fillStyle = textColor;
      ctx.fillText(title, titleX, titleY);

      // --- Draw Subtitle ---
      const subBgFinal = subtitleBackgroundColor || (textColor === '#FFFFFF' ? shadowColor : '#FFFFFF');
      const subTextFinal = subtitleTextColor || (textColor === '#FFFFFF' ? '#FFFFFF' : shadowColor);

      // Subtitle typically matches title font but bold
      ctx.font = `${fontWeight} ${subtitleSize}px ${fontName}`;
      const subtitleMetrics = ctx.measureText(subtitle);
      const pillPadding = subtitleSize * 0.4;
      const pillWidth = subtitleMetrics.width + pillPadding * 2;
      const pillHeight = subtitleSize * 1.6;
      
      // Subtitle Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      roundRect(ctx, subX - pillWidth / 2 + 4, subY - pillHeight / 2 + 4, pillWidth, pillHeight, pillHeight / 2);
      ctx.fill();

      // Subtitle Background Pill
      if (subBgFinal !== 'transparent') {
        ctx.fillStyle = subBgFinal;
        roundRect(ctx, subX - pillWidth / 2, subY - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
        ctx.fill();
      }

      // Subtitle Text
      ctx.fillStyle = subTextFinal;
      ctx.fillText(subtitle, subX, subY);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default CoverCanvas;