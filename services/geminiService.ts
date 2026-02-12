
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const geminiService = {
  async moderateContent(text: string): Promise<{ isSafe: boolean; reason?: string }> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze this message for a dating app. Is it toxic, harassing, or sexually explicit? Message: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isSafe: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ['isSafe']
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Moderation failed", error);
      return { isSafe: true };
    }
  },

  async generateProfile(name: string): Promise<{ bio: string; interests: string[] }> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a charming, authentic dating profile bio for someone named ${name}. Also suggest 4 interests.`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bio: { type: Type.STRING },
              interests: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['bio', 'interests']
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      return { 
        bio: "Just looking for someone special to share adventures with!", 
        interests: ["Hiking", "Cooking", "Movies", "Travel"] 
      };
    }
  }
};
