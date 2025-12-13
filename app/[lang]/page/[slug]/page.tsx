import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

type PageBySlugProps = {
  params: Promise<{
    lang: string;
    slug: string;
  }>;
};

export default async function PublicPageBySlug({ params }: PageBySlugProps) {
  const { lang, slug } = await params;

  const page = await prisma.page.findFirst({
    where: {
      slug,
      language: lang,
    },
  });

  if (!page) {
    notFound();
  }

  const adsDisabled = !page.showAds;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <article className="space-y-4">
        {!page.isRequired && (
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
              {page.title}
            </h1>
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {page.language} · {page.isRequired ? "Página obrigatória" : "Página"}
            </p>
          </header>
        )}

        {adsDisabled && !page.isRequired && (
          <p className="text-[11px] text-zinc-500">
            Anúncios desativados para esta página
            .
          </p>
        )}

        <section className="prose prose-invert max-w-none text-sm">
          {/* FUTURO: renderizar Markdown com um parser (remark/rehype). Por enquanto, HTML simples. */}
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </section>
      </article>
    </div>
  );
}

