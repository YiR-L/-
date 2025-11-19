import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string, previewUrl: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("请上传有效的图片文件 (JPEG 或 PNG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError("文件过大，请上传 10MB 以内的图片");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Extract base64 data only (remove "data:image/png;base64," prefix)
      const base64Data = result.split(',')[1];
      onImageSelected(base64Data, file.type, result);
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed transition-all duration-300 ease-out group cursor-pointer
        h-80 flex flex-col items-center justify-center p-8
        ${isDragging ? 'border-black bg-gray-100' : 'border-gray-300 hover:border-gray-500'}
      `}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className={`p-4 rounded-full bg-gray-100 mb-4 transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-105'}`}>
        <Upload className="w-8 h-8 text-gray-700" />
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-2 tracking-wide">
        上传图片
      </h3>
      <p className="text-gray-500 text-center max-w-xs font-light">
        点击或拖拽图片到此处 (支持 JPG/PNG)
      </p>

      {error && (
        <div className="absolute bottom-4 flex items-center text-red-600 text-sm bg-red-50 px-3 py-1 rounded-md">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;