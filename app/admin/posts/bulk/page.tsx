"use client";

import { useState, useTransition, FormEvent } from "react";
import useSWR from "swr";

type Category = {
  id: string;
  name: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type BulkRow = {
  id: number;
  theme: string;
  googlePlayUrl: string;
  selectedCategories: string[];
  status: "idle" | "queue" | "generating_post" | "generating_image" | "saving" | "done" | "error";
  message?: string;
};

type CreatedPost = {
  rowId: number;
  id: string;
  slug: string;
  title: string;
};

export default function BulkPostsPage() {
  const { data: categories } = useSWR<Category[]>("/api/admin/categories", fetcher);

  const [rows, setRows] = useState<BulkRow[]>(
    Array.from({ length: 5 }).map((_, idx) => ({
      id: idx,
      theme: "",
      googlePlayUrl: "",
      selectedCategories: [],
      status: "idle",
      message: undefined,
    })),
  );
  const [running, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdPosts, setCreatedPosts] = useState<CreatedPost[]>([]);

  function updateRow(id: number, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function toggleCategory(rowId: number, catId: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const exists = r.selectedCategories.includes(catId);
        return {
          ...r,
          selectedCategories: exists
            ? r.selectedCategories.filter((c) => c !== catId)
            : [...r.selectedCategories, catId],
        };
      }),
    );
  }

  async function handleGenerateAll(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedPosts([]);

    const toProcess = rows.filter((r) => r.theme.trim());
    if (!toProcess.length) {
      setError("Preencha pelo menos um tema para gerar posts em massa.");
      return;
    }

    startTransition(async () => {
      try {
        for (const row of toProcess) {
          updateRow(row.id, { status: "queue", message: "Na fila" });

          try {
            updateRow(row.id, { status: "generating_post", message: "Gerando texto (IA)..." });
            const aiRes = await fetch("/api/ai/generate-post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                theme: row.theme,
                language: "pt",
                googlePlayUrl: row.googlePlayUrl || undefined,
              }),
            });

            if (!aiRes.ok) {
              throw new Error("Falha ao gerar conteúdo");
            }

            const aiData = await aiRes.json();

            updateRow(row.id, { status: "generating_image", message: "Gerando imagem..." });
            const imgRes = await fetch("/api/ai/generate-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imagePrompt: aiData.imagePrompt,
                theme: row.theme,
              }),
            });

            const imgData = imgRes.ok ? await imgRes.json() : null;
            const coverImageUrl = imgData?.imageUrl || aiData.coverImageUrl;

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

            if (row.googlePlayUrl && content.includes("</p>")) {
              const parts = content.split("</p>");
              if (parts.length >= 2) {
                content = `${parts[0]}</p><!-- GOOGLE_PLAY_CARD -->${parts.slice(1).join("</p>")}`;
              } else {
                content = `${content}<!-- GOOGLE_PLAY_CARD -->`;
              }
            }

            updateRow(row.id, { status: "saving", message: "Salvando post..." });
            const saveRes = await fetch("/api/admin/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                theme: row.theme,
                language: "pt",
                categoryIds: row.selectedCategories,
                title: aiData.title,
                slug: aiData.slug,
                content,
                coverImageUrl,
                googlePlayUrl: row.googlePlayUrl || undefined,
              }),
            });

            if (!saveRes.ok) {
              throw new Error("Falha ao salvar o post");
            }

            const saveData = await saveRes.json();

            setCreatedPosts((prev) => [
              ...prev,
              {
                rowId: row.id,
                id: saveData.id as string,
                slug: aiData.slug as string,
                title: aiData.title as string,
              },
            ]);

            updateRow(row.id, { status: "done", message: "Concluído" });
          } catch (err: any) {
            console.error(err);
            updateRow(row.id, {
              status: "error",
              message: err?.message || "Erro ao gerar este post",
            });
          }
        }
      } catch (err) {
        console.error(err);
        setError("Erro inesperado ao gerar posts em massa.");
      }
    });
  }

  function statusLabel(row: BulkRow): string {
    switch (row.status) {
      case "idle":
        return "Aguardando";
      case "queue":
        return "Na fila";
      case "generating_post":
        return "Gerando texto";
      case "generating_image":
        return "Gerando imagem";
      case "saving":
        return "Salvando";
      case "done":
        return "Concluído";
      case "error":
        return "Erro";
      default:
        return "";
    }
  }

  function statusProgress(row: BulkRow): number {
    switch (row.status) {
      case "idle":
        return 0;
      case "queue":
        return 10;
      case "generating_post":
        return 40;
      case "generating_image":
        return 70;
      case "saving":
        return 90;
      case "done":
        return 100;
      case "error":
        return 100;
      default:
        return 0;
    }
  }

  const hasQueue = rows.some((r) => r.theme.trim());
  const allFinished =
    hasQueue &&
    !running &&
    rows
      .filter((r) => r.theme.trim())
      .every((r) => r.status === "done" || r.status === "error");

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Posts em massa</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure até 5 posts e gere tudo em sequência usando a mesma IA dos posts
          individuais (sempre em português).
        </p>
      </header>

      <form onSubmit={handleGenerateAll} className="space-y-4 text-sm">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 sm:p-4"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-300">
                  Post #{row.id + 1}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {statusLabel(row)}
                  {row.message ? ` · ${row.message}` : ""}
                </p>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="block text-zinc-300" htmlFor={`theme-${row.id}`}>
                    Tema do post
                  </label>
                  <input
                    id={`theme-${row.id}`}
                    value={row.theme}
                    onChange={(e) => updateRow(row.id, { theme: e.target.value })}
                    placeholder="Ex: Ideias de negócios digitais para 2025"
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    className="block text-zinc-300"
                    htmlFor={`googlePlayUrl-${row.id}`}
                  >
                    URL do app na Google Play (opcional)
                  </label>
                  <input
                    id={`googlePlayUrl-${row.id}`}
                    value={row.googlePlayUrl}
                    onChange={(e) => updateRow(row.id, { googlePlayUrl: e.target.value })}
                    placeholder="https://play.google.com/store/apps/details?id=..."
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div className="space-y-1">
                  <span className="block text-zinc-300">Categorias</span>
                  <div className="flex flex-wrap gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-2 text-xs">
                    {categories?.length ? (
                      categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(row.id, cat.id)}
                          className={`rounded-full px-2 py-0.5 ${
                            row.selectedCategories.includes(cat.id)
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

                <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800">
                  <div
                    className="h-1.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${statusProgress(row)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={running}
          className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? "Gerando posts em massa..." : "Gerar posts em massa"}
        </button>
      </form>

      {allFinished && createdPosts.length > 0 && (
        <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-sm">
          <h2 className="text-sm font-semibold text-zinc-200">Posts criados</h2>
          <p className="text-xs text-zinc-400">
            Os links abaixo já estão publicados e apontam para as URLs públicas dos posts.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {createdPosts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-zinc-200">{post.title}</span>
                <a
                  href={`/post/${post.id}/${post.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-emerald-400 hover:text-emerald-300"
                >
                  Abrir post
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
