"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";

type Category = {
  id: string;
  name: string;
};

type PostData = {
  id: string;
  postNumber: number;
  title: string;
  slug: string;
  content: string;
  coverImageUrl: string;
  language: string;
  status: string;
  categoryIds: string[];
};

export default function EditPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [post, setPost] = useState<PostData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!postId) return;

    async function load() {
      try {
        setLoading(true);

        const [postRes, catRes] = await Promise.all([
          fetch(`/api/admin/posts/${postId}`),
          fetch("/api/admin/categories"),
        ]);

        if (!postRes.ok) throw new Error("Falha ao carregar post");
        if (!catRes.ok) throw new Error("Falha ao carregar categorias");

        const postJson = (await postRes.json()) as PostData;
        const catJson = (await catRes.json()) as Category[];

        setPost(postJson);
        setCategories(catJson);
      } catch (e) {
        console.error(e);
        setError("Erro ao carregar dados do post");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [postId]);

  function toggleCategory(id: string) {
    if (!post) return;
    setPost({
      ...post,
      categoryIds: post.categoryIds.includes(id)
        ? post.categoryIds.filter((c) => c !== id)
        : [...post.categoryIds, id],
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!postId || !post) return;

    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(post),
      });

      if (!res.ok) {
        setError("Falha ao salvar alterações do post");
        return;
      }

      router.push("/admin/posts");
    } catch (e) {
      console.error(e);
      setError("Erro inesperado ao salvar o post");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Carregando post...</p>;
  }

  if (!post) {
    return <p className="text-sm text-red-400">Post não encontrado.</p>;
  }

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Editar post #{post.postNumber}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ajuste título, slug, conteúdo e categorias do post gerado pela IA.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-zinc-300" htmlFor="title">
              Título
            </label>
            <input
              id="title"
              value={post.title}
              onChange={(e) => setPost({ ...post, title: e.target.value })}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-zinc-300" htmlFor="slug">
              Slug
            </label>
            <input
              id="slug"
              value={post.slug}
              onChange={(e) => setPost({ ...post, slug: e.target.value })}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-zinc-300" htmlFor="cover">
            URL da imagem de capa
          </label>
          <input
            id="cover"
            value={post.coverImageUrl}
            onChange={(e) =>
              setPost({ ...post, coverImageUrl: e.target.value })
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-zinc-300" htmlFor="content">
            Conteúdo (HTML)
          </label>
          <textarea
            id="content"
            value={post.content}
            onChange={(e) => setPost({ ...post, content: e.target.value })}
            rows={18}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-mono text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
          />
          <p className="text-xs text-zinc-500">
            Este campo suporta HTML completo. No futuro, podemos substituir por
            um editor visual.
          </p>
        </div>

        <div className="space-y-1">
          <span className="block text-zinc-300">Categorias</span>
          <div className="flex flex-wrap gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs">
            {categories.length ? (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-full px-2 py-0.5 ${
                    post.categoryIds.includes(cat.id)
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

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push("/admin/posts")}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Voltar para lista de posts
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
