import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getOrCreatePostTranslation } from "@/lib/translation";

type PostPageProps = {
  params: Promise<{
    lang: string;
    id: string;
    slug: string;
  }>;
};

function injectAdsIntoContent(
  content: string,
  beforeParagraphIndexAds: { paragraphIndex: number; code: string }[],
) {
  // Conteúdo esperado como HTML simples já segmentável por <p>...</p>
  // Em uma versão futura, podemos trabalhar com Markdown -> AST e inserir anúncios no AST.
  const paragraphs = content.split(/(<\/p>)/i);

  const result: string[] = [];

  for (let i = 0, visualIndex = 0; i < paragraphs.length; i++) {
    const chunk = paragraphs[i];
    if (!chunk) continue;

    // Sempre empurra o pedaço atual
    result.push(chunk);

    // Se terminou um parágrafo, checar se há ads antes do próximo índice visual
    if (chunk.toLowerCase() === "</p>") {
      visualIndex += 1;

      beforeParagraphIndexAds
        .filter((ad) => ad.paragraphIndex === visualIndex)
        .forEach((ad) => {
          result.push(`<div class="my-4">${ad.code}</div>`);
        });
    }
  }

  return result.join("");
}

export default async function PublicPostPage({ params }: PostPageProps) {
  const { lang, id } = await params;

  // Aceita tanto ID numérico (postNumber) quanto ID string (id), sempre em pt como origem
  const numericId = Number(id);

  const post = await prisma.post.findFirst({
    where: Number.isFinite(numericId)
      ? { postNumber: numericId, language: "pt" }
      : { id, language: "pt" },
    include: {
      author: true,
      categories: {
        include: { category: true },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const adBlocks = await prisma.adBlock.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: { excludedCategories: true },
  });

  const postCategoryIds = post.categories.map((pc) => pc.categoryId);

  const validAds = adBlocks.filter((ad) => {
    if (ad.excludedCategories.length === 0) return true;
    const hasExclusion = ad.excludedCategories.some((cat) =>
      postCategoryIds.includes(cat.id)
    );
    return !hasExclusion;
  });

  const afterTitleAds = validAds.filter((ad) => ad.position === "AFTER_TITLE");
  const beforeParagraphAds = validAds
    .filter((ad) => ad.position === "BEFORE_PARAGRAPH_X" && ad.paragraphIndex != null)
    .map((ad) => ({ paragraphIndex: ad.paragraphIndex as number, code: ad.code }));

  // Tradução dinâmica quando lang for diferente de pt, com cache em TranslationCache
  const { title: translatedTitle, content: translatedContent } =
    await getOrCreatePostTranslation({
      postId: post.id,
      originalTitle: post.title,
      originalContent: post.content,
      targetLanguage: lang,
    });

  const contentWithAds = injectAdsIntoContent(
    translatedContent,
    beforeParagraphAds,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <article className="space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {lang} · Post
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
            {translatedTitle}
          </h1>

          {/* Após o título: blocos de anúncio com position=AFTER_TITLE */}
          {afterTitleAds.length > 0 && (
            <div className="space-y-3">
              {afterTitleAds.map((ad) => (
                <div
                  key={ad.id}
                  className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3"
                  // FUTURO: aqui é o ponto para integrar provedores de anúncio reais (AdSense/ADX)
                  dangerouslySetInnerHTML={{ __html: ad.code }}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            {post.author && <span>Por {post.author.name}</span>}
            <span>•</span>
            <span>{post.createdAt.toISOString().slice(0, 10)}</span>
            {post.categories.length > 0 && (
              <>
                <span>•</span>
                <span>
                  {post.categories.map((pc) => pc.category.name).join(", ")}
                </span>
              </>
            )}
          </div>
        </header>

        {post.coverImageUrl && (
          // FUTURO: trocar por next/image com otimização e lazy loading
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-auto w-full rounded-md border border-zinc-800 object-cover"
          />
        )}

        <section className="prose prose-invert max-w-none text-sm">
          {/* Conteúdo do post com anúncios injetados antes de parágrafos específicos */}
          <div dangerouslySetInnerHTML={{ __html: contentWithAds }} />
        </section>
      </article>
    </div>
  );
}

