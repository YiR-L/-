
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  CROPPING = 'CROPPING', // New state for manual crop
  ANALYZING = 'ANALYZING',
  PREVIEW = 'PREVIEW',
  GENERATING_VIDEO = 'GENERATING_VIDEO',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export enum AspectRatio {
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  SQUARE = '1:1',
  VERTICAL = '3:4'
}

export interface LayoutConfig {
  subtitle: string;
  textColor: string;
  shadowColor: string;
  fontStyle: 'bold' | 'serif' | 'handwritten' | 'modern';
  position: 'top' | 'bottom' | 'center' | 'split';
  veoPrompt: string;
  // New interactive properties
  x?: number; // Percentage 0-100 (Title X)
  y?: number; // Percentage 0-100 (Title Y)
  subtitleX?: number; // Percentage 0-100 (Subtitle X)
  subtitleY?: number; // Percentage 0-100 (Subtitle Y)
  scale?: number;
  titleBackgroundColor?: string; // For the main title box
  subtitleTextColor?: string;
  subtitleBackgroundColor?: string;
  filter?: string; // CSS filter string (e.g. "contrast(1.2) saturate(1.5)")
  fontFamily?: string; // New font family property
}

export interface VeoGenerationConfig {
  prompt: string;
  imageBase64: string;
  mimeType: string;
  aspectRatio: AspectRatio;
}

export interface Sticker {
  id: string;
  type: 'emoji' | 'text';
  content: string;
  x: number; // Percentage 0-100 relative to canvas width
  y: number; // Percentage 0-100 relative to canvas height
  scale: number;
  rotation: number;
}

export const FONT_OPTIONS = [
  { label: '默认 (微软雅黑)', value: '"Microsoft YaHei", sans-serif' },
  { label: '思源黑体 (Noto Sans)', value: '"Noto Sans SC", sans-serif' },
  { label: '思源宋体 (Noto Serif)', value: '"Noto Serif SC", serif' },
  { label: '毛笔书法 (Ma Shan Zheng)', value: '"Ma Shan Zheng", cursive' },
  { label: '站酷黄油 (ZCOOL)', value: '"ZCOOL QingKe HuangYou", sans-serif' },
];