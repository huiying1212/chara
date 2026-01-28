import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using gemini-2.5-flash-image for speed and efficiency in batch generation
const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';
// Using gemini-3-flash-preview for text generation (character description)
// Gemini 3 Flash offers Pro-level intelligence with better reasoning capabilities
const TEXT_MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Generate a character description based on the three axis levels.
 * This uses a text model to infer what character fits the given dimensions.
 */
export const generateCharacterDescription = async (
  xDescription: string,  // Identity Stylization
  yDescription: string,  // Energy Presence
  zDescription: string   // Embodiment Constraints
): Promise<string> => {
  const prompt = `You are a creative character designer. Based on the following three dimensional descriptions, suggest a specific character that fits these attributes. The character should be a recognizable type, archetype, or specific fictional/real-world figure.

Dimension 1 - Identity/Stylization (from realistic to fictional/iconic):
${xDescription}

Dimension 2 - Energy/Expression (from subdued to intense):
${yDescription}

Dimension 3 - Physical Embodiment/Constraints:
${zDescription}

Based on these three dimensions, what specific character would fit? Provide ONLY a brief character description (1-2 sentences max) that captures who this character is. Examples of good responses:
- "A shy elementary school girl in a casual dress"
- "Sun Wukong, the Monkey King from Journey to the West"
- "A cheerful children's TV show host in colorful costume"
- "Captain America in his iconic suit with shield"
- "An elderly tai chi master in traditional robes"

Your response (character description only, no explanation):`;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        // Gemini 3 works best with default temperature (1.0), so we don't override it
        // Using minimal thinking for this simple character description task
        // "minimal" matches "no thinking" for most queries, minimizing latency
        thinkingConfig: {
          thinkingLevel: "minimal"
        },
        maxOutputTokens: 512,  // Increased to avoid truncation (includes thinking overhead)
      }
    });

    // Check finish reason to see why generation stopped
    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    console.log(`[DEBUG] Finish reason:`, finishReason);
    console.log(`[DEBUG] Safety ratings:`, candidate?.safetyRatings);
    
    // Gemini 3 may return multiple parts (including thinking parts)
    const parts = candidate?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error("No response parts from character generation");
    }
    
    // Debug: log all parts to see what we're getting
    console.log(`[DEBUG] Response has ${parts.length} parts`);
    parts.forEach((part, idx) => {
      console.log(`[DEBUG] Part ${idx}:`, {
        hasText: !!part.text,
        hasThought: !!part.thought,
        textLength: part.text?.length || 0,
        fullText: part.text
      });
    });
    
    // Collect all text parts (excluding thought parts)
    let textParts: string[] = [];
    for (const part of parts) {
      if (part.text && !part.thought) {
        textParts.push(part.text);
      }
    }
    
    // If no non-thought text found, try all text parts
    if (textParts.length === 0) {
      textParts = parts.filter(p => p.text).map(p => p.text!);
    }
    
    if (textParts.length === 0) {
      console.error("[DEBUG] Full response:", JSON.stringify(response, null, 2));
      throw new Error("No text response from character generation");
    }
    
    const text = textParts.join(' ').trim();
    console.log(`[DEBUG] Final text (${text.length} chars):`, text);
    
    // If text seems truncated, warn
    if (text.length < 20 || !text.match(/[.!?]$/)) {
      console.warn(`[WARNING] Response may be truncated. Length: ${text.length}, Finish reason: ${finishReason}`);
    }
    
    return text;
  } catch (error) {
    console.error("Character Description Generation Error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        // Only one candidate needed for filling the grid
        candidateCount: 1,
        // Set aspect ratio to 3:4 (portrait/vertical orientation)
        imageConfig: {
          aspectRatio: "3:4"
        }
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