import { GoogleGenAI, Type } from "@google/genai";
import { AutoAnalysisResult } from "../types";

/**
 * Uses Gemini AI to detect the academic problem area and rotation angle in the image.
 * This provides human-level accuracy for complex document layouts, far exceeding local Sobel filters.
 */
export const detectProblemArea = async (base64Image: string): Promise<AutoAnalysisResult | null> => {
  // Always initialize GoogleGenAI with the API key from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Extract the base64 data and mime type from the data URL.
  const base64Parts = base64Image.split(',');
  if (base64Parts.length < 2) return null;
  
  const mimeType = base64Parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const data = base64Parts[1];

  try {
    // We utilize gemini-3-flash-preview for high-performance vision reasoning.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this image and find the main academic problem or question block. Provide the bounding box in [ymin, xmin, ymax, xmax] format using normalized coordinates (0-1000) and the rotation_angle in degrees required to make the text perfectly horizontal. Return only valid JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            box_2d: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              description: "[ymin, xmin, ymax, xmax] normalized to 1000 range.",
            },
            rotation_angle: {
              type: Type.NUMBER,
              description: "The angle in degrees to rotate the image to straighten it.",
            },
          },
          required: ["box_2d", "rotation_angle"],
        },
      },
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;

    const result = JSON.parse(jsonStr);
    
    // Validate that the AI response matches the AutoAnalysisResult interface.
    if (
      result && 
      Array.isArray(result.box_2d) && 
      result.box_2d.length === 4 && 
      typeof result.rotation_angle === 'number'
    ) {
      return {
        box_2d: result.box_2d as [number, number, number, number],
        rotation_angle: result.rotation_angle
      };
    }
    
    return null;
  } catch (error) {
    // Log the error and return null to allow the dashboard to gracefully fallback to the original image.
    console.error("Gemini problem detection failed:", error);
    return null;
  }
};