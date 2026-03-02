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

export interface VideoGenerationOptions {
  prompt: string;
  model?: string;
  negativePrompt?: string;
  aspectRatio?: string;
  image?: {
    imageBytes: string;
    mimeType: string;
  };
}

export interface VideoOperation {
  name: string;
  done?: boolean;
  response?: {
    generatedVideos?: Array<{
      video?: {
        uri: string;
      };
    }>;
  };
}

/**
 * Start a video generation with Veo
 */
export async function generateVideoWithVeo(
  options: VideoGenerationOptions
): Promise<string> {
  const ai = getAi();

  const { prompt, model = "veo-3.0-generate-001", negativePrompt, aspectRatio, image } = options;

  const operation = await ai.models.generateVideos({
    model,
    prompt,
    ...(image ? { image } : {}),
    config: {
      ...(aspectRatio ? { aspectRatio } : {}),
      ...(negativePrompt ? { negativePrompt } : {}),
    },
  });

  const name = (operation as unknown as { name?: string }).name;
  if (!name) {
    throw new Error("No operation name returned");
  }

  return name;
}

/**
 * Poll a video generation operation
 */
export async function getVideoOperation(operationName: string): Promise<VideoOperation> {
  const ai = getAi();

  const fresh = await ai.operations.getVideosOperation({
    operation: { name: operationName } as unknown as never,
  });

  return fresh as unknown as VideoOperation;
}

/**
 * Download a generated video by URI
 */
export async function downloadVideoByUri(uri: string): Promise<Blob> {
  const apiKey = getApiKey();

  const resp = await fetch(uri, {
    headers: {
      "x-goog-api-key": apiKey,
      Accept: "*/*",
    },
    redirect: "follow",
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Download failed: ${resp.status} ${resp.statusText} - ${text}`);
  }

  return resp.blob();
}

/**
 * Helper to convert a File to base64 data
 */
export async function fileToBase64(file: File): Promise<{ imageBytes: string; mimeType: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    imageBytes: btoa(binary),
    mimeType: file.type || "image/png",
  };
}

/**
 * Helper to convert a base64 data URL to base64 data
 */
export function parseDataUrl(dataUrl: string): { imageBytes: string; mimeType: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta?.split(";")?.[0]?.replace("data:", "") || "image/png";
  return {
    imageBytes: b64 || dataUrl,
    mimeType: mime,
  };
}
