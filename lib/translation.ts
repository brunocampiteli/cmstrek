import { prisma } from "@/lib/prisma";

// Simple helper to translate post content using OpenAI and cache in TranslationCache
// Assumes original language is always "pt".

type TranslationResult = {
  title: string;
  content: string; // HTML
};

export async function getOrCreatePostTranslation(params: {
  postId: string;
  originalTitle: string;
  originalContent: string;
  targetLanguage: string;
}): Promise<TranslationResult> {
  const { postId, originalTitle, originalContent, targetLanguage } = params;

  if (!targetLanguage || targetLanguage.toLowerCase() === "pt") {
    return { title: originalTitle, content: originalContent };
  }

  const normalizedLang = targetLanguage.toLowerCase();

  // 1. Check cache
  const existing = await prisma.translationCache.findFirst({
    where: {
      originalPostId: postId,
      targetLanguage: normalizedLang,
    },
  });

  if (existing) {
    return {
      title: existing.translatedTitle,
      content: existing.translatedContent,
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // If no API key, fall back to original
    return { title: originalTitle, content: originalContent };
  }

  // 2. Call OpenAI for translation
  const systemPrompt = `You are a professional translator.

Your ONLY job is to translate Brazilian Portuguese blog posts to a target language.

STRICT RULES (do not break these):
- Preserve 100% of the original HTML structure.
- Do NOT add, remove or reorder any HTML tags.
- Do NOT add or remove attributes (class, id, style, data-*, href, src, etc.).
- Do NOT change any inline HTML comments, script tags, or ad snippets.
- Only replace human-readable text nodes (the visible text between tags) with their translation.
- The output HTML must be valid and render the same layout as the input, only with text translated.`;

  const userPrompt = `Target language (ISO code): ${normalizedLang}

Translate the following blog post title and HTML content from Brazilian Portuguese to the target language.

VERY IMPORTANT:
- Keep all HTML tags, attributes, ids, classes, inline styles, scripts and comments EXACTLY the same.
- Do not change ad/snippet blocks or script tags.
- Only translate the visible text.

TITLE (plain text):
"""
${originalTitle}
"""

CONTENT_HTML (full HTML):
"""
${originalContent}
"""

Return ONLY a JSON object with the following shape:
{
  "title": "translated title here",
  "contentHtml": "translated HTML content here (same HTML structure, only text translated)"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    // On failure, fall back to original
    return { title: originalTitle, content: originalContent };
  }

  const data = await response.json();

  let translatedTitle = originalTitle;
  let translatedContent = originalContent;

  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    if (typeof parsed.title === "string") {
      translatedTitle = parsed.title;
    }
    if (typeof parsed.contentHtml === "string") {
      translatedContent = parsed.contentHtml;
    }
  } catch {
    // ignore parse errors and keep original
  }

  // 3. Save to cache (best-effort)
  try {
    await prisma.translationCache.create({
      data: {
        originalPostId: postId,
        targetLanguage: normalizedLang,
        translatedTitle,
        translatedContent,
      },
    });
  } catch {
    // ignore DB errors, still return the translation
  }

  return {
    title: translatedTitle,
    content: translatedContent,
  };
}
