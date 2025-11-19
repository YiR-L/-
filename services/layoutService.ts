
import { GoogleGenAI, Type } from "@google/genai";
import { LayoutConfig, FONT_OPTIONS } from "../types";

export class LayoutService {
  private async ensureApiKey(): Promise<void> {
    const aistudio = (window as any).aistudio;
    if (!aistudio) {
        // If not running in AI Studio environment, we assume process.env.API_KEY is set
        return;
    }

    const hasKey = await aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await aistudio.openSelectKey();
      // Wait a brief moment for the key to propagate if needed, 
      // though openSelectKey usually handles the user interaction promise.
    }
  }

  private getClient(): GoogleGenAI {
    // Re-instantiate client to ensure it picks up any newly selected key in the environment proxy
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async generateLayoutConfig(imageBase64: string, theme: string, filterContext: string): Promise<LayoutConfig> {
    await this.ensureApiKey();
    const ai = this.getClient();

    const prompt = `
      You are a professional creative director for Xiaohongshu (RedNote).
      Analyze the provided image and the user's title theme: "${theme}".
      
      VISUAL CONTEXT: The user has applied a "${filterContext}" filter to the image.
      
      Your task is to generate a TEXT LAYOUT that complements this visual style and the image content.
      
      Guidelines based on Filter:
      - If filter is "黑白" (B&W): Use bold, high contrast text (White, Yellow, Red).
      - If filter is "鲜艳" (Vivid): Use bold text that stands out against saturated colors (White with black shadow often works best).
      - If filter is "复古" (Retro) or "胶片" (Film): Use serif or handwritten fonts. Colors like muted yellow, off-white, or dark brown.
      - If filter is "柔和" (Soft) or "清冷" (Cool): Use thin, modern fonts. White or pastel text colors.
      
      Return a JSON object with:
      1. 'subtitle': A catchy, short, engaging subtitle (max 10 chars).
      2. 'textColor': The best hex color for the text.
      3. 'shadowColor': A contrasting hex color for text shadow/outline.
      4. 'position': Best placement ('top', 'bottom', 'center', 'split').
      5. 'fontStyle': Best font style ('bold', 'serif', 'handwritten', 'modern').
      6. 'titleBackgroundColor': Optional. A background color hex for the title box (use 'transparent' if not needed).
      7. 'veoPrompt': A prompt for an AI video generator. Describe motion that fits the "${filterContext}" mood (e.g., "Vintage film flicker" for Retro, "Slow cinematic zoom" for Movie).
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/png', data: imageBase64 } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtitle: { type: Type.STRING },
              textColor: { type: Type.STRING },
              shadowColor: { type: Type.STRING },
              position: { type: Type.STRING, enum: ['top', 'bottom', 'center', 'split'] },
              fontStyle: { type: Type.STRING, enum: ['bold', 'serif', 'handwritten', 'modern'] },
              titleBackgroundColor: { type: Type.STRING, nullable: true },
              veoPrompt: { type: Type.STRING }
            },
            required: ['subtitle', 'textColor', 'shadowColor', 'position', 'fontStyle', 'veoPrompt']
          }
        }
      });

      const json = JSON.parse(response.text || "{}");
      
      // Map abstract font style to concrete font family
      let fontFamily = FONT_OPTIONS[0].value; // Default YaHei
      
      if (json.fontStyle === 'serif') {
          fontFamily = '"Noto Serif SC", serif';
      } else if (json.fontStyle === 'handwritten') {
          fontFamily = '"Ma Shan Zheng", cursive';
      } else if (json.fontStyle === 'bold') {
          fontFamily = '"ZCOOL QingKe HuangYou", sans-serif';
      } else if (json.fontStyle === 'modern') {
          fontFamily = '"Noto Sans SC", sans-serif';
      }
      
      return { ...json, fontFamily } as LayoutConfig;
    } catch (error: any) {
      console.error("Layout Generation Error:", error);

      // Check for API Key specific errors
      if (error.message && (error.message.includes("Requested entity was not found") || error.message.includes("API key not valid") || error.message.includes("403"))) {
         const aistudio = (window as any).aistudio;
         if (aistudio) {
             await aistudio.openSelectKey();
             // Don't fallback, let user retry
             throw new Error("API Key required. Please select a key."); 
         }
      }

      // Fallback config for other errors
      return {
        subtitle: "爆款封面",
        textColor: "#FFFFFF",
        shadowColor: "#000000",
        position: "bottom",
        fontStyle: "bold",
        veoPrompt: "Cinematic slow motion, keep text static.",
        fontFamily: '"Microsoft YaHei", sans-serif'
      };
    }
  }
}

export const layoutService = new LayoutService();
