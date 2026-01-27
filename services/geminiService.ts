import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-2.5-flash-image for speed and efficiency in batch generation
const MODEL_NAME = 'gemini-2.5-flash-image';

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        // Only one candidate needed for filling the grid
        candidateCount: 1, 
      }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data returned from API");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};