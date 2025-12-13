"use client";

import { useState, useTransition, FormEvent } from "react";
import useSWR from "swr";
import Link from "next/link";

type Category = {
  id: string;
  name: string;
};

type PostListItem = {
  id: string;
  postNumber: number;
  title: string;
  slug: string;
  language: string;
  status: string;
  createdAt: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPostsPage() {
  const { data: categories } = useSWR<Category[]>("/api/admin/categories", fetcher);
  const { data: posts, mutate } = useSWR<PostListItem[]>("/api/admin/posts", fetcher);

  const [theme, setTheme] = useState("");
  const [language, setLanguage] = useState("pt");
  const [googlePlayUrl, setGooglePlayUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDeletePost(id: string) {
    if (!confirm("Tem certeza que deseja apagar este post?")) return;

    try {
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Falha ao apagar o post.");
        return;
      }

      await mutate();
    } catch (e) {
      console.error(e);
      alert("Erro inesperado ao apagar o post.");
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function handleGeneratePost(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!theme.trim()) {
      setError("Informe um tema para o post");
      return;
    }

    startTransition(async () => {
      try {
        // 1) Gerar conteúdo com IA
        const aiRes = await fetch("/api/ai/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme,
            language,
            googlePlayUrl: googlePlayUrl || undefined,
          }),
        });

        if (!aiRes.ok) {
          setError("Falha ao gerar conteúdo com IA");
          return;
        }

        const aiData = await aiRes.json();

        // 2) Gerar imagem com modelo de imagem + Cloudinary
        const imgRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imagePrompt: aiData.imagePrompt,
            theme,
          }),
        });

        if (!imgRes.ok) {
          console.error(
            "Falha ao gerar imagem, usando coverImageUrl do texto se existir.",
          );
        }

        const imgData = imgRes.ok ? await imgRes.json() : null;
        const coverImageUrl = imgData?.imageUrl || aiData.coverImageUrl;

        // 3) Ajustar HTML para usar a mesma imagem da capa (Cloudinary)
        let content: string = aiData.content;
        if (/<img\s/i.test(content)) {
          content = content.replace(
            /(<img\b[^>]*\bsrc=")[^"]+("[^>]*>)/i,
            `$1${coverImageUrl}$2`,
          );
        } else if (coverImageUrl) {
          const imgTag = `<p><img src="${coverImageUrl}" alt="${aiData.title}" /></p>`;
          if (content.includes("</h2>")) {
            content = content.replace("</h2>", `</h2>${imgTag}`);
          } else if (content.includes("</p>")) {
            content = content.replace("</p>", `</p>${imgTag}`);
          } else {
            content = `${imgTag}${content}`;
          }
        }

        // 4) Inserir marcador do card da Google Play após o 1º parágrafo
        if (googlePlayUrl && content.includes("</p>")) {
          const parts = content.split("</p>");
          if (parts.length >= 2) {
            content = `${parts[0]}</p><!-- GOOGLE_PLAY_CARD -->${parts
              .slice(1)
              .join("</p>")}`;
          } else {
            content = `${content}<!-- GOOGLE_PLAY_CARD -->`;
          }
        }

        // 5) Salvar post
        const saveRes = await fetch("/api/admin/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme,
            language,
            categoryIds: selectedCategories,
            title: aiData.title,
            slug: aiData.slug,
            content,
            coverImageUrl,
            googlePlayUrl: googlePlayUrl || undefined,
          }),
        });

        if (!saveRes.ok) {
          setError("Falha ao salvar o post gerado");
          return;
        }

        setTheme("");
        setGooglePlayUrl("");
        setSelectedCategories([]);
        await mutate();
      } catch (err) {
        console.error(err);
        setError("Erro inesperado ao gerar post");
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Posts</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Gere posts com IA informando um tema, idioma base e categorias.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Gerar post com IA</h2>
          <p className="mt-1 text-xs text-zinc-400">
            A API interna <code>/api/ai/generate-post</code> cria título, slug,
            conteúdo e imagem de capa a partir do tema informado.
          </p>

          {error && (
            <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <form
            onSubmit={handleGeneratePost}
            className="mt-4 space-y-3 text-sm"
          >
            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="theme">
                Tema do post
              </label>
              <input
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex: Ideias de negócios digitais para 2025"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="googlePlayUrl">
                URL do app na Google Play (opcional)
              </label>
              <input
                id="googlePlayUrl"
                value={googlePlayUrl}
                onChange={(e) => setGooglePlayUrl(e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Quando preenchido, o post será gerado focado nesse aplicativo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-zinc-300" htmlFor="language">
                  Idioma base
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="pt">Português (pt)</option>
                  <option value="en">Inglês (en)</option>
                  <option value="es">Espanhol (es)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="block text-zinc-300">Categorias</span>
                <div className="flex flex-wrap gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs">
                  {categories?.length ? (
                    categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`rounded-full px-2 py-0.5 ${
                          selectedCategories.includes(cat.id)
                            ? "bg-emerald-500 text-black"
                            : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))
                  ) : (
                    <span className="text-zinc-500">
                      Nenhuma categoria cadastrada.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Gerando post..." : "Gerar e publicar post"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200">Posts recentes</h2>
            <span className="text-xs text-zinc-500">{posts?.length ?? 0} itens</span>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            {posts?.length ? (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3 rounded-md bg-zinc-900/60 px-3 py-2"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-100 line-clamp-1">
                      #{post.postNumber} · {post.title}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {post.language} · {post.status} · {post.createdAt.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="text-zinc-400 hover:text-zinc-100"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/post/${post.postNumber}/${post.slug}`}
                      className="text-emerald-400 hover:underline"
                    >
                      Ver
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">
                Nenhum post gerado ainda.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

