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
 * Generate an image using Gemini
 */
export async function generateImageWithGemini(prompt: string): Promise<GeneratedImage> {
  const ai = getAi();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
  });

  // Process the response to extract the image
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        imageBytes: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("No image generated");
}

/**
 * Edit an image using Gemini with a prompt
 */
export async function editImageWithGemini(
  prompt: string,
  images: Array<{ data: string; mimeType: string }>
): Promise<GeneratedImage> {
  const ai = getAi();

  const contents: (
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  )[] = [];

  // Add the prompt as text
  contents.push({ text: prompt });

  // Process each image
  for (const image of images) {
    contents.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: contents,
  });

  // Process the response to extract the image
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return {
        imageBytes: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("No image generated");
}

/**
 * Helper to convert a File to base64 data
 */
export async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: file.type || "image/png",
  };
}

/**
 * Helper to convert a base64 data URL to base64 data
 */
export function parseDataUrl(dataUrl: string): { data: string; mimeType: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
  return {
    data: b64 || dataUrl,
    mimeType: mime,
  };
}
