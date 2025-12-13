import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { GooglePlayCard } from "@/app/components/GooglePlayCard";

type PostPageProps = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
};

function injectAdsIntoContent(
  content: string,
  beforeParagraphIndexAds: { paragraphIndex: number; code: string }[],
) {
  const paragraphs = content.split(/(<\/p>)/i);
  const result: string[] = [];

  for (let i = 0, visualIndex = 0; i < paragraphs.length; i++) {
    const chunk = paragraphs[i];
    if (!chunk) continue;

    result.push(chunk);

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
  const { id } = await params;
  const postNumber = Number(id);

  if (!Number.isFinite(postNumber)) {
    notFound();
  }

  const post = await prisma.post.findFirst({
    where: { postNumber },
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

  const postCategoryIds = post.categories.map(
    (pc: { categoryId: string }) => pc.categoryId,
  );

  const validAds = adBlocks.filter((ad: { excludedCategories: { id: string }[] }) => {
    if (ad.excludedCategories.length === 0) return true;
    const hasExclusion = ad.excludedCategories.some((cat) =>
      postCategoryIds.includes(cat.id),
    );
    return !hasExclusion;
  });

  const afterTitleAds = validAds.filter(
    (ad: { position: string }) => ad.position === "AFTER_TITLE",
  );
  const beforeParagraphAds = validAds
    .filter(
      (ad: { position: string; paragraphIndex: number | null }) =>
        ad.position === "BEFORE_PARAGRAPH_X" && ad.paragraphIndex != null,
    )
    .map((ad: { paragraphIndex: number | null; code: string }) => ({
      paragraphIndex: ad.paragraphIndex as number,
      code: ad.code,
    }));

  // Primeiro injeta anúncios configurados para BEFORE_PARAGRAPH_X
  let contentWithAds = injectAdsIntoContent(post.content, beforeParagraphAds);

  // Em seguida, se houver anúncios AFTER_TITLE, injeta logo após o primeiro </h1>
  if (afterTitleAds.length > 0) {
    const afterTitleHtml = afterTitleAds
      .map((ad) => `<div class="my-4">${ad.code}</div>`)
      .join("");

    contentWithAds = contentWithAds.replace(/(<\/h1>)/i, `$1${afterTitleHtml}`);
  }

  // Só depois tratamos o marcador especial para o card da Google Play
  const hasPlayCardMarker = contentWithAds.includes("<!-- GOOGLE_PLAY_CARD -->");
  const [beforeCardHtml, afterCardHtml] = hasPlayCardMarker
    ? contentWithAds.split("<!-- GOOGLE_PLAY_CARD -->")
    : [contentWithAds, ""];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <article className="space-y-8 rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 shadow-sm sm:p-8">
        {/* Breadcrumb simples: Home > Categoria > Post */}
        <nav className="mb-3 text-xs text-zinc-500">
          <a href="/" className="hover:text-emerald-400">Home</a>
          <span className="mx-1">&gt;</span>
          {post.categories.length > 0 ? (
            <>
              <span>{post.categories[0].category.name}</span>
              <span className="mx-1">&gt;</span>
            </>
          ) : (
            <>
              <span>Artigos</span>
              <span className="mx-1">&gt;</span>
            </>
          )}
          <span className="text-zinc-300">Post</span>
        </nav>

        <header className="space-y-2 text-center">

          <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs text-zinc-400">
            {post.author && <span>Por {post.author.name}</span>}
            <span>•</span>
            <span>{post.createdAt.toISOString().slice(0, 10)}</span>
            {post.categories.length > 0 && (
              <>
                <span>•</span>
                <span>
                  {post.categories.map((pc: { category: { name: string } }) => pc.category.name).join(", ")}
                </span>
              </>
            )}
          </div>
        </header>

        <section className="prose prose-invert mx-auto max-w-none text-sm leading-relaxed sm:text-base">
          <div dangerouslySetInnerHTML={{ __html: beforeCardHtml }} />
          {hasPlayCardMarker && post.googlePlayUrl && (
            <GooglePlayCard url={post.googlePlayUrl} />
          )}
          {afterCardHtml && (
            <div dangerouslySetInnerHTML={{ __html: afterCardHtml }} />
          )}
        </section>
      </article>
    </div>
  );
}
