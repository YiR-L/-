
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, Layout, Video, Loader2, Share2, Ratio, Type, Image as ImageIcon, Plus, Smile, Star, Heart, Zap, Settings2, Palette, Maximize, Move, Wand2, Info, X } from 'lucide-react';
import { AppState, AspectRatio, LayoutConfig, Sticker, FONT_OPTIONS } from './types';
import { veoService } from './services/veoService';
import { layoutService } from './services/layoutService';
import ImageUploader from './components/ImageUploader';
import ImageCropper from './components/ImageCropper';
import CoverCanvas, { CoverCanvasHandle } from './components/CoverCanvas';
import StickerOverlay from './components/StickerOverlay';
import LayoutEditorOverlay from './components/LayoutEditorOverlay';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // Data State
  const [rawImage, setRawImage] = useState<string>(''); // Original uploaded image
  const [croppedImage, setCroppedImage] = useState<string>(''); // Result after cropping
  const [theme, setTheme] = useState<string>('');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  
  // Config State
  const [activeFilter, setActiveFilter] = useState<string>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.VERTICAL);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig | null>(null);
  
  // UI State
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'template' | 'text'>('template'); // Toggle between template and text edit
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const canvasRef = useRef<CoverCanvasHandle>(null);

  useEffect(() => {
    // Show welcome screen on first load to guide new users
    const hasSeenIntro = sessionStorage.getItem('hasSeenIntro');
    if (!hasSeenIntro) {
        setShowInfoModal(true);
        sessionStorage.setItem('hasSeenIntro', 'true');
    }
  }, []);

  // --- Constants ---
  const RATIO_CONFIG = {
    [AspectRatio.VERTICAL]: { w: 750, h: 1000, label: '3:4 小红书' },
    [AspectRatio.SQUARE]: { w: 1080, h: 1080, label: '1:1 正方形' },
    [AspectRatio.PORTRAIT]: { w: 720, h: 1280, label: '9:16 快拍' },
    [AspectRatio.LANDSCAPE]: { w: 1280, h: 720, label: '16:9 横屏' },
  };

  // Algorithm-based Filters (CSS/Canvas Filter Strings)
  const FILTERS = [
      { name: '原图', value: 'none', color: '#eee' },
      { name: '鲜艳', value: 'saturate(1.5) contrast(1.1)', color: '#FF5B5B' },
      { name: '柔和', value: 'brightness(1.1) saturate(0.8) contrast(0.9)', color: '#FFC6C6' },
      { name: '黑白', value: 'grayscale(1) contrast(1.2)', color: '#333' },
      { name: '复古', value: 'sepia(0.4) contrast(1.1) saturate(0.8)', color: '#D2B48C' },
      { name: '清冷', value: 'saturate(0.9) hue-rotate(10deg) contrast(1.1)', color: '#87CEEB' },
      { name: '胶片', value: 'contrast(1.1) brightness(0.9) saturate(1.3) sepia(0.2)', color: '#FFA500' },
      { name: '电影', value: 'contrast(1.2) saturate(0.8) brightness(0.9)', color: '#708090' },
  ];
  
  const STICKER_PRESETS = ['✨', '🔥', '❤️', '⭐', 'NEW', 'OOTD', 'SALE', 'Hi', '🌸', '📸', '🍓', '👍', '💯', '👀', '‼️'];

  const COLORS = [
      { label: '黑', value: '#000000' },
      { label: '白', value: '#FFFFFF' },
      { label: '红', value: '#FF2442' },
      { label: '橙', value: '#FF8800' },
      { label: '黄', value: '#FFD700' },
      { label: '绿', value: '#00CC44' },
      { label: '青', value: '#00CED1' },
      { label: '蓝', value: '#1E90FF' },
      { label: '紫', value: '#9370DB' },
      { label: '粉', value: '#FF69B4' },
      { label: '灰', value: '#808080' },
  ];

  const BG_COLORS = [
      { label: '无', value: 'transparent' },
      ...COLORS
  ];

  // --- Handlers ---

  const handleImageSelected = (base64: string, mime: string, preview: string) => {
    setRawImage(preview); // Save the full URL/Base64 for cropping
    setAppState(AppState.CROPPING); // Go to crop mode immediately
  };

  const handleCropConfirm = (base64: string) => {
    setCroppedImage(base64);
    setAppState(AppState.UPLOADING); // Back to main config flow
  };

  const handleReCrop = () => {
     if (rawImage) setAppState(AppState.CROPPING);
  };

  const handleGenerateLayout = async () => {
    if (!theme) return;
    setAppState(AppState.ANALYZING);
    setActiveTab('template');
    try {
      // Find the filter name to help AI context
      const filterName = FILTERS.find(f => f.value === activeFilter)?.name || '原图';
      
      const config = await layoutService.generateLayoutConfig(croppedImage, theme, filterName);
      
      // Initialize Layout logic based on return config
      let initY = 50;
      let initSubY = 65; // Default subtitle position
      
      // Intelligent default positioning
      if (config.position === 'top') {
          initY = 20;
          initSubY = 30;
      } else if (config.position === 'bottom') {
          initY = 80;
          initSubY = 90;
      } else if (config.position === 'split') {
          // For "Comparison" style: Title at Top, Subtitle at Bottom
          initY = 15;
          initSubY = 85;
      } else if (config.position === 'center') {
          initY = 50;
          initSubY = 65;
      }
      
      setLayoutConfig({
          ...config,
          x: 50,
          y: initY,
          subtitleX: 50, 
          subtitleY: initSubY,
          scale: 1,
          filter: activeFilter, // Store current filter in config
          titleBackgroundColor: config.titleBackgroundColor || 'transparent',
          subtitleTextColor: config.textColor === '#FFFFFF' ? '#FFFFFF' : config.shadowColor,
          subtitleBackgroundColor: config.textColor === '#FFFFFF' ? config.shadowColor : '#FFFFFF'
      });
      setAppState(AppState.PREVIEW);
    } catch (error) {
      console.error(error);
      setStatusMessage("无法生成布局");
      setAppState(AppState.ERROR);
    }
  };

  const handleUpdateLayout = (changes: Partial<LayoutConfig>) => {
      if (layoutConfig) {
          setLayoutConfig({ ...layoutConfig, ...changes });
      }
  };

  const handleFilterChange = (filterValue: string) => {
      setActiveFilter(filterValue);
      // If we already have a layout, update it so the canvas redraws immediately with the new filter
      if (layoutConfig) {
          setLayoutConfig({ ...layoutConfig, filter: filterValue });
      }
  };

  const handleAddSticker = (content: string) => {
      if (appState === AppState.COMPLETED) {
          setAppState(AppState.PREVIEW);
          setVideoUrl(''); 
      }

      const newSticker: Sticker = {
          id: Date.now().toString(),
          type: 'emoji',
          content,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0
      };
      setStickers([...stickers, newSticker]);
  };

  const handleUpdateSticker = (id: string, changes: Partial<Sticker>) => {
      setStickers(prev => prev.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  const handleRemoveSticker = (id: string) => {
      setStickers(prev => prev.filter(s => s.id !== id));
  };

  const handleDownloadImage = () => {
    if (canvasRef.current) {
      const base64 = canvasRef.current.getCanvasImage();
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${base64}`;
      link.download = `rednote-cover-${Date.now()}.png`;
      link.click();
    }
  };

  const handleShare = async () => {
    if (canvasRef.current) {
      try {
        const blob = await canvasRef.current.getBlob();
        if (!blob) return;
        const file = new File([blob], "cover.png", { type: "image/png" });
        if (navigator.share) {
          await navigator.share({
            title: '小红书封面',
            text: theme,
            files: [file],
          });
        } else {
             await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
             alert("图片已复制到剪贴板！");
        }
      } catch (error) {
        console.error("Error sharing:", error);
      }
    }
  };

  const handleGenerateVideo = async () => {
    if (!canvasRef.current || !layoutConfig) return;
    setAppState(AppState.GENERATING_VIDEO);
    const compositedImage = canvasRef.current.getCanvasImage();
    
    try {
      const uri = await veoService.generateVideo({
        prompt: layoutConfig.veoPrompt,
        imageBase64: compositedImage,
        mimeType: 'image/png',
        aspectRatio: aspectRatio 
      }, setStatusMessage);
      setVideoUrl(uri);
      setAppState(AppState.COMPLETED);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      setStatusMessage("视频生成失败，请重试。");
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setRawImage('');
    setCroppedImage('');
    setTheme('');
    setLayoutConfig(null);
    setStickers([]);
    setVideoUrl('');
    setActiveFilter('none');
  };

  // --- Components ---
  const ColorPickerSection = ({ label, value, onChange, colors }: { label: string, value: string, onChange: (v: string) => void, colors: {label: string, value: string}[] }) => (
    <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Palette size={16} /> {label}
            </h2>
            <div className="relative group">
                 <div className="w-6 h-6 rounded-full border border-gray-200 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer">
                     <div className="w-full h-full" style={{ backgroundColor: value === 'transparent' ? '#fff' : value }}>
                        {value === 'transparent' && (
                            <div className="w-full h-full bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc)] bg-[length:4px_4px]" />
                        )}
                     </div>
                 </div>
                 {/* Native Color Input overlay */}
                 <input 
                    type="color" 
                    value={value === 'transparent' ? '#ffffff' : value}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                 />
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
                <button
                    key={c.value}
                    onClick={() => onChange(c.value)}
                    className={`
                        w-6 h-6 rounded-full border transition-all hover:scale-110
                        ${value === c.value ? 'border-[#FF2442] scale-110 ring-2 ring-red-100' : 'border-gray-200'}
                    `}
                    style={{ 
                        backgroundColor: c.value === 'transparent' ? 'transparent' : c.value,
                        backgroundImage: c.value === 'transparent' ? 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd)' : 'none',
                        backgroundSize: '6px 6px'
                    }}
                    title={c.label}
                />
            ))}
        </div>
    </div>
  );

  // --- Render ---

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#333] flex flex-col font-sans selection:bg-[#FF2442] selection:text-white">
      
      {/* Global Cropper Modal */}
      {appState === AppState.CROPPING && (
          <ImageCropper 
            imageUrl={rawImage} 
            aspectRatio={aspectRatio}
            onConfirm={handleCropConfirm}
            onCancel={() => rawImage ? setAppState(AppState.UPLOADING) : setAppState(AppState.IDLE)}
          />
      )}

      {/* Feature Info Modal */}
      {showInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 custom-fade-in">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative custom-zoom-in">
                  <button 
                    onClick={() => setShowInfoModal(false)}
                    className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                      <X size={20} className="text-gray-500" />
                  </button>
                  
                  <div className="mb-6 text-center">
                      <div className="w-16 h-16 bg-[#FF2442] rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-red-200">
                          <Sparkles size={32} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800">欢迎使用 AI 封面生成器</h2>
                      <p className="text-gray-400 text-sm mt-1">打造您的爆款小红书内容</p>
                  </div>

                  <div className="space-y-4">
                      {[
                          { icon: <Layout className="text-[#FF2442]" />, title: 'AI 智能排版', desc: '上传图片，自动生成完美的标题布局与配色方案。' },
                          { icon: <Video className="text-[#FF2442]" />, title: 'Veo 动态封面', desc: '集成 Google Veo，一键生成吸睛的动态视频。' },
                          { icon: <Ratio className="text-[#FF2442]" />, title: '多尺寸适配', desc: '支持 3:4、9:16、1:1 等主流社交媒体尺寸裁剪。' },
                          { icon: <Settings2 className="text-[#FF2442]" />, title: '创意编辑器', desc: '内置滤镜、贴纸，支持文字拖拽与样式微调。' },
                      ].map((feature, idx) => (
                          <div key={idx} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                              <div className="p-2 bg-red-50 rounded-xl shrink-0">
                                  {feature.icon}
                              </div>
                              <div>
                                  <h3 className="font-bold text-gray-800">{feature.title}</h3>
                                  <p className="text-xs text-gray-500 leading-relaxed mt-1">{feature.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>

                  <button 
                    onClick={() => setShowInfoModal(false)}
                    className="w-full mt-8 py-3 bg-[#333] text-white rounded-xl font-bold hover:bg-black transition-colors"
                  >
                      开始创作
                  </button>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={reset}>
            <div className="w-10 h-10 bg-[#FF2442] rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-red-200 group-hover:scale-105 transition-transform">R</div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 hidden sm:block">一键生成小红书封面</h1>
          </div>
          
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowInfoModal(true)}
                className="p-2 text-gray-400 hover:text-[#FF2442] hover:bg-red-50 rounded-full transition-colors"
                title="功能介绍"
              >
                  <Info size={22} />
              </button>
              {appState !== AppState.IDLE && (
                <button onClick={reset} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-sm font-bold transition-colors">
                  新建
                </button>
              )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
        
        {/* LEFT: Editor Panel */}
        <div className="w-full lg:w-[380px] flex flex-col gap-5 shrink-0">
          
          {/* Step 1: Image & Crop */}
          <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 transition-all hover:shadow-md">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon size={16} /> 图片源
                </h2>
                {croppedImage && (
                    <button onClick={handleReCrop} className="text-xs font-bold text-[#FF2442] hover:underline">
                        重新裁剪
                    </button>
                )}
             </div>
             
             {appState === AppState.IDLE ? (
                 <ImageUploader onImageSelected={handleImageSelected} />
             ) : (
                 <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 group cursor-pointer" onClick={handleReCrop}>
                    <img 
                        src={`data:image/png;base64,${croppedImage}`} 
                        className="w-full h-full object-cover transition-all duration-500" 
                        style={{ filter: activeFilter }}
                        alt="source" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur">点击裁剪</span>
                    </div>
                 </div>
             )}

             {appState !== AppState.IDLE && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                    {Object.values(AspectRatio).map((ratio) => (
                        <button
                            key={ratio}
                            onClick={() => {
                                setAspectRatio(ratio);
                                setAppState(AppState.CROPPING);
                            }}
                            className={`
                                flex flex-col items-center justify-center py-2 rounded-xl border transition-all
                                ${aspectRatio === ratio ? 'border-[#FF2442] bg-red-50 text-[#FF2442]' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}
                            `}
                        >
                           <div className="border border-current rounded-sm mb-1 opacity-50" 
                                style={{
                                    width: ratio === AspectRatio.LANDSCAPE ? 16 : 10,
                                    height: ratio === AspectRatio.LANDSCAPE ? 10 : (ratio === AspectRatio.SQUARE ? 10 : 14)
                                }}
                           />
                           <span className="text-[10px] font-bold scale-90">{RATIO_CONFIG[ratio].label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
             )}
          </div>

          {/* Step 2: Content Config & Tabs */}
          {appState !== AppState.IDLE && (
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs */}
                {layoutConfig && (
                    <div className="flex border-b border-gray-100">
                        <button 
                            onClick={() => setActiveTab('template')}
                            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'template' ? 'bg-gray-50 text-[#FF2442]' : 'text-gray-400'}`}
                        >
                            <Layout size={16} /> 模板生成
                        </button>
                        <button 
                             onClick={() => setActiveTab('text')}
                             className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'text' ? 'bg-gray-50 text-[#FF2442]' : 'text-gray-400'}`}
                        >
                            <Settings2 size={16} /> 标题调整
                        </button>
                    </div>
                )}

                <div className="p-5">
                    {/* Tab: Template Generation */}
                    {activeTab === 'template' && (
                        <div className="custom-slide-left">
                             <div className="mb-6">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Type size={16} /> 标题
                                </h2>
                                <input 
                                type="text" 
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                placeholder="输入标题 (例如: OOTD)"
                                className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#FF2442] focus:bg-white transition-all outline-none font-bold text-lg placeholder:text-gray-300"
                                />
                            </div>

                            <div className="mb-6">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Wand2 size={16} /> 滤镜风格
                                </h2>
                                <div className="grid grid-cols-4 gap-2">
                                {FILTERS.map((f) => (
                                    <button
                                    key={f.value}
                                    onClick={() => handleFilterChange(f.value)}
                                    className={`
                                        relative group flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                                        ${activeFilter === f.value ? 'border-[#FF2442] bg-red-50' : 'border-gray-100 hover:bg-gray-50'}
                                    `}
                                    >
                                        <div 
                                            className="w-full aspect-square rounded-lg mb-1 shadow-inner"
                                            style={{ backgroundColor: f.color }}
                                        ></div>
                                        <span className={`text-xs font-bold ${activeFilter === f.value ? 'text-[#FF2442]' : 'text-gray-500'}`}>
                                            {f.name}
                                        </span>
                                    </button>
                                ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleGenerateLayout}
                                disabled={!theme || appState === AppState.ANALYZING}
                                className="w-full py-4 bg-[#FF2442] text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-200 hover:shadow-red-300 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                            >
                                {appState === AppState.ANALYZING ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />}
                                {appState === AppState.PREVIEW ? '重新生成排版' : '一键生成封面'}
                            </button>
                        </div>
                    )}

                    {/* Tab: Text Adjustments */}
                    {activeTab === 'text' && layoutConfig && (
                        <div className="custom-slide-right space-y-6">
                             
                             {/* Hint */}
                             <div className="bg-red-50 text-[#FF2442] p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                                <Move size={14} />
                                提示：直接拖动预览图中的标题可调整位置
                             </div>

                             {/* Font Selection UI */}
                             <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Type size={16} /> 字体样式
                                </h2>
                                <div className="relative">
                                    <select
                                        value={layoutConfig.fontFamily || FONT_OPTIONS[0].value}
                                        onChange={(e) => handleUpdateLayout({ fontFamily: e.target.value })}
                                        className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold focus:border-[#FF2442] outline-none appearance-none"
                                        style={{ fontFamily: layoutConfig.fontFamily?.replace(/"/g, '') }}
                                    >
                                        {FONT_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value} style={{ fontFamily: opt.value.replace(/"/g, '') }}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <Type size={14} />
                                    </div>
                                </div>
                             </div>

                             {/* Size Slider */}
                             <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Maximize size={16} /> 大小缩放
                                </h2>
                                <input 
                                    type="range" 
                                    min="0.5" 
                                    max="2.5" 
                                    step="0.1"
                                    value={layoutConfig.scale || 1}
                                    onChange={(e) => handleUpdateLayout({ scale: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#FF2442]"
                                />
                             </div>

                             <div className="h-px bg-gray-100 my-2"></div>

                             {/* Title Colors */}
                             <ColorPickerSection 
                                label="主标题字体颜色" 
                                value={layoutConfig.textColor} 
                                onChange={(c) => handleUpdateLayout({ textColor: c })}
                                colors={COLORS}
                             />

                             <ColorPickerSection 
                                label="主标题背景颜色" 
                                value={layoutConfig.titleBackgroundColor || 'transparent'} 
                                onChange={(c) => handleUpdateLayout({ titleBackgroundColor: c })}
                                colors={BG_COLORS}
                             />
                             
                             <div className="h-px bg-gray-100 my-2"></div>

                             {/* Subtitle Text */}
                             <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                                    <Type size={16} /> 副标题内容
                                </h2>
                                <input 
                                    type="text" 
                                    value={layoutConfig.subtitle}
                                    onChange={(e) => handleUpdateLayout({ subtitle: e.target.value })}
                                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm font-bold focus:border-[#FF2442] outline-none"
                                />
                             </div>

                             {/* Subtitle Colors */}
                             <ColorPickerSection 
                                label="副标题字体颜色" 
                                value={layoutConfig.subtitleTextColor || '#FFFFFF'} 
                                onChange={(c) => handleUpdateLayout({ subtitleTextColor: c })}
                                colors={COLORS}
                             />

                             <ColorPickerSection 
                                label="副标题背景颜色" 
                                value={layoutConfig.subtitleBackgroundColor || 'transparent'} 
                                onChange={(c) => handleUpdateLayout({ subtitleBackgroundColor: c })}
                                colors={BG_COLORS}
                             />

                        </div>
                    )}
                </div>
            </div>
          )}

          {/* Step 3: Sticker Bar */}
          {(appState === AppState.PREVIEW || appState === AppState.COMPLETED) && (
              <div className="bg-white p-5 rounded-[32px] shadow-sm border border-gray-100 custom-slide-up delay-100">
                  <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Smile size={16} /> 贴纸装饰
                  </h2>
                  <div className="grid grid-cols-5 gap-2">
                      {STICKER_PRESETS.map(emoji => (
                          <button 
                            key={emoji}
                            onClick={() => handleAddSticker(emoji)}
                            className="aspect-square flex items-center justify-center text-2xl bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors active:scale-90"
                          >
                              {emoji}
                          </button>
                      ))}
                  </div>
              </div>
          )}

        </div>

        {/* RIGHT: Preview Canvas */}
        <div className="flex-1 flex flex-col">
            <div className="sticky top-24 flex flex-col items-center gap-6">
                
                {/* Canvas Wrapper */}
                <div 
                    className="relative bg-white p-2 rounded-[24px] shadow-2xl shadow-gray-200 border border-gray-100 transition-all duration-500"
                    style={{ 
                        width: aspectRatio === AspectRatio.LANDSCAPE ? '100%' : 'auto',
                        maxWidth: '100%',
                        height: 'auto'
                    }}
                >
                    <div 
                        className="preview-container relative overflow-hidden rounded-[16px] bg-gray-50"
                        style={{
                            width: aspectRatio === AspectRatio.LANDSCAPE ? 'auto' : (window.innerWidth < 640 ? '300px' : '450px'),
                            aspectRatio: `${RATIO_CONFIG[aspectRatio].w} / ${RATIO_CONFIG[aspectRatio].h}`
                        }}
                    >
                        {/* Empty State */}
                        {appState === AppState.IDLE || (!layoutConfig && !croppedImage) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
                                <ImageIcon size={48} className="mb-4 opacity-20" />
                                <p className="font-bold text-gray-300">预览区域</p>
                            </div>
                        ) : (
                            <>
                                {/* Render Layer */}
                                {videoUrl && appState === AppState.COMPLETED ? (
                                    <video src={videoUrl} autoPlay loop controls className="w-full h-full object-cover" />
                                ) : (
                                    <CoverCanvas 
                                        ref={canvasRef}
                                        imageBase64={croppedImage}
                                        title={theme}
                                        layoutConfig={layoutConfig || {
                                            subtitle: "", textColor: "transparent", shadowColor: "transparent", position: "center", fontStyle: "bold", veoPrompt: ""
                                        }}
                                        width={RATIO_CONFIG[aspectRatio].w}
                                        height={RATIO_CONFIG[aspectRatio].h}
                                        stickers={stickers}
                                        filter={layoutConfig?.filter || activeFilter}
                                    />
                                )}
                                
                                {/* Layout Editor Overlay (Title/Subtitle Dragging) */}
                                {appState === AppState.PREVIEW && layoutConfig && (
                                    <LayoutEditorOverlay 
                                        layoutConfig={layoutConfig}
                                        onUpdateLayout={handleUpdateLayout}
                                        showGuides={activeTab === 'text'}
                                    />
                                )}

                                {/* Interactive Sticker Layer (Overlay) - Only show when not generating video */}
                                {appState === AppState.PREVIEW && (
                                    <StickerOverlay 
                                        stickers={stickers}
                                        onUpdateSticker={handleUpdateSticker}
                                        onRemoveSticker={handleRemoveSticker}
                                    />
                                )}
                            </>
                        )}
                        
                        {/* Loading Overlay */}
                        {(appState === AppState.ANALYZING || appState === AppState.GENERATING_VIDEO) && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
                                <Loader2 className="w-10 h-10 text-[#FF2442] animate-spin mb-4" />
                                <p className="text-lg font-bold text-gray-800">
                                    {appState === AppState.ANALYZING ? 'AI 正在设计排版...' : statusMessage || '视频生成中...'}
                                </p>
                            </div>
                        )}
                        
                        {/* Error Overlay */}
                        {appState === AppState.ERROR && (
                             <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-[#FF2442]">
                                    <X size={24} />
                                </div>
                                <p className="text-lg font-bold text-gray-800 mb-2">操作失败</p>
                                <p className="text-sm text-gray-500 mb-6">{statusMessage || "请检查网络或 API Key 设置"}</p>
                                <button 
                                    onClick={() => {
                                        setAppState(AppState.UPLOADING); 
                                        if (rawImage && theme) handleGenerateLayout();
                                        else reset();
                                    }}
                                    className="px-6 py-2 bg-[#FF2442] text-white rounded-full font-bold shadow-lg shadow-red-200 hover:-translate-y-0.5 transition-transform"
                                >
                                    重试
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Actions */}
                {(appState === AppState.PREVIEW || appState === AppState.COMPLETED) && (
                    <div className="flex flex-wrap justify-center gap-4 custom-slide-up">
                        <button onClick={handleDownloadImage} className="btn-secondary">
                            <Download size={18} /> 下载图片
                        </button>
                        <button onClick={handleShare} className="btn-secondary">
                            <Share2 size={18} /> 分享
                        </button>
                        {appState !== AppState.COMPLETED && (
                            <button onClick={handleGenerateVideo} className="btn-primary">
                                <Video size={18} /> 生成动效 (Veo)
                            </button>
                        )}
                    </div>
                )}

            </div>
        </div>
      </main>
      
      <footer className="w-full py-8 text-center text-gray-400 text-xs border-t border-gray-100 bg-white/50 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2024 AI Cover Generator. All rights reserved.</p>
            <div className="flex items-center gap-4">
                <span>Powered by <span className="font-bold text-gray-600">Google Gemini</span></span>
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                <span>Designed by <Heart size={10} className="inline text-red-400 fill-current" />  Xuan & Rae</span>
            </div>
        </div>
      </footer>

      <style>{`
        .preview-container {
           container-type: inline-size;
        }
        .btn-primary {
            @apply px-6 py-3 bg-[#333] text-white rounded-xl font-bold shadow-lg hover:bg-black hover:-translate-y-1 transition-all active:translate-y-0 flex items-center gap-2;
        }
        .btn-secondary {
            @apply px-6 py-3 bg-white text-gray-800 border border-gray-200 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:-translate-y-1 transition-all active:translate-y-0 flex items-center gap-2;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes zoomIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideLeft {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideRight {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .custom-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .custom-zoom-in { animation: zoomIn 0.3s ease-out forwards; }
        .custom-slide-up { animation: slideUp 0.5s ease-out forwards; }
        .custom-slide-left { animation: slideLeft 0.3s ease-out forwards; }
        .custom-slide-right { animation: slideRight 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
