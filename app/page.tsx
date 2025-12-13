import { prisma } from "@/lib/prisma";
import Link from "next/link";

type HomeSearchParams = {
  searchParams?: Promise<{ category?: string }>;
};

export default async function Home({ searchParams }: HomeSearchParams) {
  const resolved = (await searchParams) ?? {};
  const categorySlug = resolved.category;

  const posts = await prisma.post.findMany({
    where: {
      language: "pt",
      ...(categorySlug
        ? {
            categories: {
              some: {
                category: {
                  slug: categorySlug,
                },
              },
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      categories: { include: { category: true } },
    },
    take: 20,
  });

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8">
      <header className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Blog (Português)
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Posts gerenciados pelo cms-next. A home principal sempre mostra o
          conteúdo em português.
          {categorySlug
            ? ` · Filtrando pela categoria "${categorySlug}"`
            : ""}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nenhum post publicado em português ainda. Crie um post em /admin/posts.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.postNumber}/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/60 transition hover:border-emerald-500/60 hover:bg-zinc-900"
            >
              {post.coverImageUrl && (
                // FUTURO: trocar por next/image
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="h-40 w-full border-b border-zinc-800 object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-zinc-400">
                  {post.categories.map((pc) => (
                    <span
                      key={pc.categoryId}
                      className="rounded-full bg-zinc-800 px-2 py-0.5"
                    >
                      {pc.category.name}
                    </span>
                  ))}
                </div>
                <h2 className="line-clamp-2 text-sm font-semibold text-zinc-50 group-hover:text-emerald-400">
                  {post.title}
                </h2>
                <p className="mt-auto text-[11px] text-zinc-500">
                  Publicado em {post.createdAt.toISOString().slice(0, 10)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
