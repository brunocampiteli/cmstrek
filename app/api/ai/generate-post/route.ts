import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Esta rota integra com o Gemini (Google Generative AI).
// É necessário definir a variável de ambiente GOOGLE_API_KEY com a chave do projeto.
// Opcionalmente, você pode definir GEMINI_MODEL_NAME para trocar o modelo (ex: gemini-2.5-pro).

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || "gemini-1.5-flash";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const theme: string | undefined = body?.theme;
  const language: string | undefined = body?.language;
  const googlePlayUrl: string | undefined = body?.googlePlayUrl;

  if (!theme || !language) {
    return NextResponse.json(
      { error: "Missing theme or language" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_API_KEY is not configured. Defina a chave no .env para usar o Gemini.",
      },
      { status: 500 },
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Prompt bem específico para garantir formato, tamanho e estrutura.
    const prompt = `Você é um redator profissional de artigos para blog.

Gere um artigo COMPLETO em formato HTML no idioma: ${language}.

Tema do artigo: "${theme}".

$${googlePlayUrl ? `
O artigo deve ser focado no aplicativo disponível na Google Play nesta URL:
${googlePlayUrl}

Explique claramente o que o app faz, principais funcionalidades, benefícios para o usuário e em quais situações ele é mais indicado. Não invente informações factuais (como preço exato ou nota de avaliação) se não tiver certeza; descreva de forma qualitativa.
` : ""}

Requisitos OBRIGATÓRIOS:
- Pelo menos 2000 palavras.
- Tom profissional, informativo e confiável.
- Estrutura:
  - Um título principal da matéria, em negrito, dentro de <h1><strong>...</strong></h1>, com título CURTO (idealmente até 60–70 caracteres, sem excesso de subtítulos dentro do próprio título).
  - Logo abaixo do título, um pequeno parágrafo introdutório.
  - Conteúdo dividido em vários parágrafos CURTOS (3-4 frases no máximo), bem separados, sempre dentro de <p>...</p>, para facilitar inserção de blocos de anúncio antes de parágrafos específicos.
  - Use VÁRIOS subtítulos em <h2> e <h3> ao longo do texto (no mínimo 4 subtítulos no total) para organizar os blocos de conteúdo.
- A primeira menção às categorias/assuntos principais pode aparecer no topo do artigo (por exemplo, em um parágrafo logo após o título, destacando os tópicos).

IMAGEM DE CAPA:
- Gere também uma URL de imagem de capa MUITO relacionada ao tema, como se fosse uma foto ilustrativa do assunto principal do artigo.
- Para garantir relação com o tema, use uma URL no formato do Unsplash, por exemplo:
  https://source.unsplash.com/featured/1200x675/?PALAVRAS-CHAVE-DO-TEMA
  onde PALAVRAS-CHAVE-DO-TEMA devem ser derivadas do tema do artigo.
- NÃO use URLs genéricas como via.placeholder ou example.com.
- Além de retornar a URL da imagem de capa, inclua a mesma imagem EXATAMENTE UMA vez no MEIO do texto, usando uma tag <img src="URL-DA-IMAGEM" alt="Descrição" /> entre parágrafos. Não repita a mesma imagem em outros lugares do HTML.

Saída esperada (formato JSON em texto):
{
  "title": "...",
  "slug": "...",
  "coverImageUrl": "https://...",
  "htmlContent": "<h1><strong>...</strong></h1> ... (HTML completo do artigo) ..."
}

Onde:
- "slug" deve ser uma versão adequada para URL (minúscula, sem acentos, palavras separadas por hífen).
- O HTML NÃO deve conter a tag <html>, <head> ou <body>, apenas o conteúdo do artigo.
`; 

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Tentar fazer parse do JSON retornado pelo modelo
    let parsed: {
      title?: string;
      slug?: string;
      coverImageUrl?: string;
      htmlContent?: string;
      imagePrompt?: string;
    } = {};

    try {
      // Muitos modelos devolvem explicação + bloco ```json ... ```;
      // vamos isolar apenas a parte do JSON.
      let cleaned = text;

      // 1) Se houver bloco ```json ... ``` em qualquer lugar, recorta só ele.
      const fencedMatch = cleaned.match(/```json([\s\S]*?)```/i);
      if (fencedMatch) {
        cleaned = fencedMatch[1];
      }

      // 2) Se ainda não tiver só o JSON, tenta pegar apenas do primeiro '{' até o último '}'.
      const braceMatch = cleaned.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        cleaned = braceMatch[0];
      }

      cleaned = cleaned.trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // fallback se não conseguir fazer parse: vamos tentar extrair ao menos o HTML limpo
      let fallback = text;

      // Remover qualquer bloco ```...``` que sobrou
      fallback = fallback.replace(/```[\s\S]*?```/g, "").trim();

      // Se houver um <h1> ou <p>, usar a partir daí para evitar frases do tipo
      // "Claro, aqui está o artigo completo...".
      const firstH1 = fallback.search(/<h1[\s>]/i);
      const firstP = fallback.search(/<p[\s>]/i);
      const idxCandidates = [firstH1, firstP].filter((i) => i >= 0);

      if (idxCandidates.length) {
        const start = Math.min(...idxCandidates);
        fallback = fallback.slice(start);
      }

      parsed.htmlContent = fallback;
    }

    const rawTitle = parsed.title || `Post sobre ${theme}`;
    const rawSlug = (parsed.slug || theme)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // Definir URL de capa usando a sugestão do Gemini quando disponível,
    // com fallback para uma imagem estática confiável.
    // Ignoramos URLs do Unsplash Source, que podem falhar com "Application error".
    const isValidCover =
      parsed.coverImageUrl &&
      /^https?:\/\//i.test(parsed.coverImageUrl) &&
      !parsed.coverImageUrl.includes("source.unsplash.com");

    const coverImageUrl = isValidCover
      ? parsed.coverImageUrl!
      : "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg";

    // Prompt de imagem detalhado para ser usado pelo modelo de imagem (imagen-4.0-fast-generate-001)
    const imagePrompt =
      parsed.imagePrompt ||
      `Foto realista, horizontal, em alta resolução, ilustrando o tema: "${theme}". ` +
        "Mostre o assunto principal do post de forma clara, com contexto visual coerente e foco no objeto principal. " +
        "NÃO coloque texto na imagem: sem letras, números, logos, interface de aplicativo ou telas com texto legível. " +
        "Estilo moderno, bem iluminado, sem elementos genéricos.";

    let content = parsed.htmlContent
      ? parsed.htmlContent
      : `<h1><strong>${rawTitle}</strong></h1><p>Conteúdo gerado automaticamente sobre ${theme}.</p>`;

    // Se já houver uma <img>, sobrescrever apenas o src pela coverImageUrl (Cloudinary),
    // preservando alt e demais atributos.
    if (/<img\s/i.test(content)) {
      content = content.replace(
        /(<img\b[^>]*\bsrc=")[^"]+("[^>]*>)/i,
        `$1${coverImageUrl}$2`,
      );
    } else {
      // Se não houver nenhuma <img>, inserimos uma usando coverImageUrl logo após um título ou parágrafo.
      const imgTag = `<p><img src="${coverImageUrl}" alt="${rawTitle}" /></p>`;

      if (content.includes("</h2>")) {
        content = content.replace("</h2>", `</h2>${imgTag}`);
      } else if (content.includes("</p>")) {
        content = content.replace("</p>", `</p>${imgTag}`);
      } else {
        content = `${imgTag}${content}`;
      }
    }

    return NextResponse.json({
      title: rawTitle,
      slug: rawSlug || "post-gerado",
      content,
      coverImageUrl,
      imagePrompt,
      language,
    });
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return NextResponse.json(
      { error: "Erro ao gerar conteúdo com Gemini" },
      { status: 500 },
    );
  }
}


