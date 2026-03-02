import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY environment variable is not set.");
  }
  return apiKey;
};

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return aiInstance;
};

export interface GeneratedImage {
  imageBytes: string;
  mimeType: string;
}

/**
 * Generate an image using Imagen
 */
export async function generateImageWithImagen(
  prompt: string,
  model: string = "imagen-4.0-fast-generate-001"
): Promise<GeneratedImage> {
  const ai = getAi();

  const resp = await ai.models.generateImages({
    model,
    prompt,
    config: {
      aspectRatio: "16:9",
    },
  });

  const image = resp.generatedImages?.[0]?.image;
  if (!image?.imageBytes) {
    throw new Error("No image returned");
  }

  return {
    imageBytes: image.imageBytes,
    mimeType: image.mimeType || "image/png",
  };
}
