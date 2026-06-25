import crypto from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { task } from "@trigger.dev/sdk";
import sharp from "sharp";

export type CropImagePayload = {
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GeminiPayload = {
  model: string;
  prompt: string;
  systemPrompt?: string;
  imageUrls?: string[];
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getUploadedFileUrl = (json: unknown) => {
  const data = json as {
    results?: Record<string, Array<{ ssl_url?: string; url?: string }>>;
    uploads?: Array<{ ssl_url?: string; url?: string }>;
  };
  const resultFile = Object.values(data.results ?? {})
    .flat()
    .find((file) => file.ssl_url || file.url);
  const uploadFile = data.uploads?.find((file) => file.ssl_url || file.url);
  return resultFile?.ssl_url ?? resultFile?.url ?? uploadFile?.ssl_url ?? uploadFile?.url ?? null;
};

const uploadBufferToTransloadit = async (buffer: Buffer, filename: string, mimeType: string) => {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;
  if (!authKey || !authSecret) return null;

  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const params = JSON.stringify({
    auth: { key: authKey, expires },
    steps: {
      ":original": {
        robot: "/upload/handle",
      },
    },
  });
  const signature = `sha384:${crypto.createHmac("sha384", authSecret).update(params).digest("hex")}`;
  const form = new FormData();
  form.append("params", params);
  form.append("signature", signature);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append("file", new Blob([arrayBuffer], { type: mimeType }), filename);

  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: form,
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json?.message ?? "Transloadit cropped upload failed");
  return getUploadedFileUrl(json);
};

const fetchImageAsBuffer = async (url: string) => {
  if (!url || url.startsWith("/") || url.startsWith("blob:")) {
    throw new Error("Crop Image needs a completed remote upload URL. Re-upload the image and wait until the upload warning disappears.");
  }
  if (url.includes("/assemblies/")) {
    throw new Error("Crop Image received a Transloadit assembly URL instead of an image file URL. Re-upload the image and wait for the real uploaded file URL.");
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to download input image");
  return Buffer.from(await response.arrayBuffer());
};

export async function cropImageTask(payload: CropImagePayload) {
  await wait(30_000);

  const inputBuffer = await fetchImageAsBuffer(payload.imageUrl);
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const sourceWidth = metadata.width ?? 1;
  const sourceHeight = metadata.height ?? 1;
  const left = Math.max(0, Math.round((payload.x / 100) * sourceWidth));
  const top = Math.max(0, Math.round((payload.y / 100) * sourceHeight));
  const width = Math.max(1, Math.min(sourceWidth - left, Math.round((payload.width / 100) * sourceWidth)));
  const height = Math.max(1, Math.min(sourceHeight - top, Math.round((payload.height / 100) * sourceHeight)));
  const cropped = await image.extract({ left, top, width, height }).png().toBuffer();
  const uploadedUrl = await uploadBufferToTransloadit(cropped, "nextflow-crop.png", "image/png");

  return {
    outputImageUrl: uploadedUrl ?? payload.imageUrl,
    note: "Cropped image generated after the mandatory 30 second delay.",
    crop: {
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
    },
  };
}

export async function geminiTask(payload: GeminiPayload) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    return {
      response:
        "Demo Gemini response: add GOOGLE_GENERATIVE_AI_API_KEY to execute the real model through Trigger.dev.",
    };
  }

  const imageParts = await Promise.all(
    (payload.imageUrls ?? []).map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) return null;
      const mimeType = response.headers.get("content-type") ?? "image/png";
      const data = Buffer.from(await response.arrayBuffer()).toString("base64");
      return { inlineData: { mimeType, data } };
    }),
  );
  const parts = [payload.prompt, ...imageParts.filter((part): part is NonNullable<typeof part> => Boolean(part))];

  const genAI = new GoogleGenerativeAI(apiKey);
  const preferredModel = payload.model === "gemini-3.1-pro" ? "gemini-3.1-pro-preview" : payload.model;
  const fallbackModels =
    preferredModel === "gemini-3.1-pro-preview"
      ? ["gemini-3.1-flash-lite", "gemini-2.0-flash-lite", "gemini-flash-lite-latest"]
      : [];
  const modelsToTry = [preferredModel, ...fallbackModels];
  const errors: string[] = [];

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: payload.systemPrompt,
      });
      const result = await model.generateContent(parts);
      const text = result.response.text();
      if (!text.trim()) {
        throw new Error("Gemini returned an empty response.");
      }
      return {
        response:
          modelName === preferredModel
            ? text
            : `${text}\n\nModel fallback used: ${modelName}`,
      };
    } catch (error) {
      errors.push(`${modelName}: ${error instanceof Error ? error.message : "Gemini request failed"}`);
    }
  }

  throw new Error(errors.join("\n\n"));
}

export const cropImageTriggerTask = task({
  id: "crop-image",
  run: cropImageTask,
});

export const geminiTriggerTask = task({
  id: "gemini-llm",
  run: geminiTask,
});
