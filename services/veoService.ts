import { GoogleGenAI } from "@google/genai";
import { AspectRatio, VeoGenerationConfig } from "../types";

export class VeoService {
  private ai: GoogleGenAI | null = null;

  private async ensureApiKey(): Promise<void> {
    const aistudio = (window as any).aistudio;
    if (!aistudio) {
        console.warn("AI Studio window object not found.");
        return;
    }

    const hasKey = await aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await aistudio.openSelectKey();
    }
  }

  private getClient(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async generateVideo(
    config: VeoGenerationConfig,
    onStatusUpdate: (msg: string) => void
  ): Promise<string> {
    await this.ensureApiKey();
    this.ai = this.getClient();

    onStatusUpdate("正在初始化 Veo 模型...");

    try {
      // Convert AspectRatio enum to strict string values expected by Veo
      // Veo mainly supports 16:9 or 9:16. 
      // If user selected Vertical (3:4) or Square (1:1), we map to closest valid Veo ratio (9:16 for vertical/square usually works best for mobile).
      let targetAspectRatio = '9:16'; 
      if (config.aspectRatio === AspectRatio.LANDSCAPE) targetAspectRatio = '16:9';
      // Note: Veo API specifically asks for '16:9' or '9:16'. 

      let operation = await this.ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: config.prompt,
        image: {
          imageBytes: config.imageBase64,
          mimeType: config.mimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: targetAspectRatio,
        }
      });

      onStatusUpdate("正在生成动态封面...");

      // Polling Loop
      const pollingInterval = 5000; 
      let attempts = 0;
      
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
        attempts++;
        if (attempts === 1) onStatusUpdate("正在分析画面布局...");
        if (attempts === 3) onStatusUpdate("正在合成视频帧...");
        if (attempts === 6) onStatusUpdate("即将完成...");
        
        operation = await this.ai.operations.getVideosOperation({ operation: operation });
      }

      onStatusUpdate("下载完成");

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error("No video URI returned from Veo.");
      }

      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
      }

      const blob = await videoResponse.blob();
      return URL.createObjectURL(blob);

    } catch (error: any) {
      console.error("Veo Generation Error:", error);
      if (error.message && error.message.includes("Requested entity was not found")) {
        const aistudio = (window as any).aistudio;
        if (aistudio) {
             await aistudio.openSelectKey();
             throw new Error("API Key validation failed. Please select your key again and retry.");
        }
      }
      throw error;
    }
  }
}

export const veoService = new VeoService();