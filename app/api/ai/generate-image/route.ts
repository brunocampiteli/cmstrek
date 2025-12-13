import { NextResponse } from "next/server";
import crypto from "crypto";

const IMAGE_MODEL_NAME = process.env.IMAGE_MODEL_NAME || "imagen-4.0-fast-generate-001";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "cms_next_posts";
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || "cms_next_posts";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: Request) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "Missing GOOGLE_API_KEY env var" },
      { status: 500 },
    );
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { error: "Missing Cloudinary env vars (cloud name, upload preset, api key or secret)" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null) as
    | { imagePrompt?: string; theme?: string }
    | null;

  if (!body || !body.imagePrompt) {
    return NextResponse.json(
      { error: "imagePrompt is required" },
      { status: 400 },
    );
  }

  const { imagePrompt, theme } = body;

  try {
    // 1) Chamar modelo de imagem do Gemini / Imagen
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        IMAGE_MODEL_NAME,
      )}:predict?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: imagePrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
          },
        }),
      },
    );

    if (!genRes.ok) {
      const text = await genRes.text();
      console.error("Imagen API error:", genRes.status, text);
      return NextResponse.json(
        {
          error: "Failed to generate image",
          status: genRes.status,
          details: text,
        },
        { status: 500 },
      );
    }

    const genJson = (await genRes.json()) as any;

    // Tentar extrair o base64 em formatos de resposta comuns
    const imageBase64 =
      genJson?.generatedImages?.[0]?.bytesBase64Encoded ||
      genJson?.predictions?.[0]?.bytesBase64Encoded ||
      genJson?.predictions?.[0]?.bytesBase64 ||
      genJson?.candidates?.[0]?.outputImage?.bytesBase64Encoded ||
      genJson?.candidates?.[0]?.image?.base64 ||
      genJson?.candidates?.[0]?.output?.image?.base64;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image returned from model" },
        { status: 500 },
      );
    }

    // 2) Upload assinado para Cloudinary usando API HTTP
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const timestamp = Math.floor(Date.now() / 1000);

    // String a ser assinada segue o formato: key=val&key=val... + api_secret
    // Incluímos folder e upload_preset para que o preset funcione em modo signed.
    const paramsToSign = [
      `folder=${CLOUDINARY_FOLDER}`,
      `timestamp=${timestamp}`,
      `upload_preset=${CLOUDINARY_UPLOAD_PRESET}`,
    ].join("&");

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + CLOUDINARY_API_SECRET)
      .digest("hex");

    const form = new FormData();
    form.append("file", `data:image/png;base64,${imageBase64}`);
    form.append("api_key", CLOUDINARY_API_KEY);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    form.append("folder", CLOUDINARY_FOLDER);

    const cloudRes = await fetch(uploadUrl, {
      method: "POST",
      body: form,
    });

    if (!cloudRes.ok) {
      const text = await cloudRes.text();
      console.error("Cloudinary error:", text);
      return NextResponse.json(
        { error: "Failed to upload image to Cloudinary" },
        { status: 500 },
      );
    }

    const cloudJson = (await cloudRes.json()) as any;
    const imageUrl = cloudJson.secure_url as string | undefined;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Cloudinary did not return secure_url" },
        { status: 500 },
      );
    }

    return NextResponse.json({ imageUrl, theme, prompt: imagePrompt });
  } catch (error) {
    console.error("Error generating/uploading image:", error);
    return NextResponse.json(
      { error: "Unexpected error generating image" },
      { status: 500 },
    );
  }
}
