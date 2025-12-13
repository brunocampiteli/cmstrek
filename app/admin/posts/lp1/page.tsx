"use client";

import { useState, useTransition, FormEvent } from "react";
import useSWR from "swr";

type Category = {
  id: string;
  name: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type PostStatus = "idle" | "generating_post" | "generating_image" | "saving" | "done" | "error";

type AltPostConfig = {
  type: "generate" | "url";
  theme: string;
  url: string;
  buttonLabel: string;
  status: PostStatus;
  generatedUrl?: string;
  generatedId?: string;
};

type MotherPostConfig = {
  theme: string;
  googlePlayUrl: string;
  status: PostStatus;
  generatedUrl?: string;
  generatedId?: string;
};

export default function PostLP1Page() {
  const { data: categories } = useSWR<Category[]>("/api/admin/categories", fetcher);

  const [mother, setMother] = useState<MotherPostConfig>({
    theme: "",
    googlePlayUrl: "",
    status: "idle",
  });

  const [alt1, setAlt1] = useState<AltPostConfig>({
    type: "generate",
    theme: "",
    url: "",
    buttonLabel: "",
    status: "idle",
  });

  const [alt2, setAlt2] = useState<AltPostConfig>({
    type: "generate",
    theme: "",
    url: "",
    buttonLabel: "",
    status: "idle",
  });

  const [running, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(msg: string) {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function generateSinglePost(
    theme: string,
    categoryIds: string[],
    googlePlayUrl?: string
  ): Promise<{ id: string; postNumber: number; slug: string; title: string; coverImageUrl?: string }> {
    // 1. Generate Text
    const aiRes = await fetch("/api/ai/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, language: "pt", googlePlayUrl }),
    });
    if (!aiRes.ok) throw new Error("Falha ao gerar texto do post: " + theme);
    const aiData = await aiRes.json();

    // 2. Generate Image
    const imgRes = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePrompt: aiData.imagePrompt, theme }),
    });
    const imgData = imgRes.ok ? await imgRes.json() : null;
    const coverImageUrl = imgData?.imageUrl || aiData.coverImageUrl;

    // 3. Inject Image
    let content: string = aiData.content;
    if (/<img\s/i.test(content)) {
      content = content.replace(
        /(<img\b[^>]*\bsrc=")[^"]+("[^>]*>)/i,
        `$1${coverImageUrl}$2`
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

    // 4. Inject Google Play Card if needed
    if (googlePlayUrl && content.includes("</p>")) {
      const parts = content.split("</p>");
      if (parts.length >= 2) {
        content = `${parts[0]}</p><!-- GOOGLE_PLAY_CARD -->${parts.slice(1).join("</p>")}`;
      } else {
        content = `${content}<!-- GOOGLE_PLAY_CARD -->`;
      }
    }

    // 5. Save
    const saveRes = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme,
        language: "pt",
        categoryIds,
        title: aiData.title,
        slug: aiData.slug,
        content,
        coverImageUrl,
        googlePlayUrl,
      }),
    });

    if (!saveRes.ok) throw new Error("Falha ao salvar post: " + theme);
    const saveData = await saveRes.json();

    return {
      id: saveData.id,
      postNumber: saveData.postNumber,
      slug: aiData.slug,
      title: aiData.title,
      coverImageUrl,
    };
  }

  async function handleGenerateLP1(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLogs([]);

    if (!mother.theme) {
      setError("O tema do Post Mãe é obrigatório.");
      return;
    }
    if ((alt1.type === "generate" && !alt1.theme) || (alt1.type === "url" && !alt1.url)) {
      setError("Configure a Alternativa 1 corretamente.");
      return;
    }
    if ((alt2.type === "generate" && !alt2.theme) || (alt2.type === "url" && !alt2.url)) {
      setError("Configure a Alternativa 2 corretamente.");
      return;
    }
    if (!alt1.buttonLabel || !alt2.buttonLabel) {
      setError("Defina os textos dos botões.");
      return;
    }

    // ENFORCE CATEGORIES
    const lp1Cat = categories?.find((c) => c.name === "LP1");
    const appsCat = categories?.find((c) => c.name === "Aplicativos");

    if (!lp1Cat || !appsCat) {
      setError("Categorias 'LP1' e 'Aplicativos' são necessárias. Verifique se elas existem no sistema.");
      return;
    }

    startTransition(async () => {
      try {
        // --- PROCESS ALT 1 ---
        let url1 = alt1.url;
        if (alt1.type === "generate") {
          setAlt1((p) => ({ ...p, status: "generating_post" }));
          addLog("Iniciando Alternativa 1...");
          try {
            const p1 = await generateSinglePost(alt1.theme, [appsCat.id]);
            url1 = `/post/${p1.postNumber}/${p1.slug}`;
            setAlt1((p) => ({ ...p, status: "done", generatedUrl: url1, generatedId: p1.id }));
            addLog(`Alternativa 1 criada: ${p1.title}`);
          } catch (err: any) {
            setAlt1((p) => ({ ...p, status: "error" }));
            throw err;
          }
        } else {
          setAlt1((p) => ({ ...p, status: "done" })); // Already done if URL
        }

        // --- PROCESS ALT 2 ---
        let url2 = alt2.url;
        if (alt2.type === "generate") {
          setAlt2((p) => ({ ...p, status: "generating_post" }));
          addLog("Iniciando Alternativa 2...");
          try {
            const p2 = await generateSinglePost(alt2.theme, [appsCat.id]);
            url2 = `/post/${p2.postNumber}/${p2.slug}`;
            setAlt2((p) => ({ ...p, status: "done", generatedUrl: url2, generatedId: p2.id }));
            addLog(`Alternativa 2 criada: ${p2.title}`);
          } catch (err: any) {
            setAlt2((p) => ({ ...p, status: "error" }));
            throw err;
          }
        } else {
          setAlt2((p) => ({ ...p, status: "done" }));
        }

        // --- PROCESS MOTHER ---
        setMother((p) => ({ ...p, status: "generating_post" }));
        addLog("Gerando Post Mãe...");

        // 1. Generate Text
        const aiRes = await fetch("/api/ai/generate-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme: mother.theme,
            language: "pt",
            googlePlayUrl: mother.googlePlayUrl || undefined,
          }),
        });
        if (!aiRes.ok) throw new Error("Falha ao gerar texto do Post Mãe");
        const aiData = await aiRes.json();

        setMother((p) => ({ ...p, status: "generating_image" }));
        // 2. Generate Image
        const imgRes = await fetch("/api/ai/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagePrompt: aiData.imagePrompt, theme: mother.theme }),
        });
        const imgData = imgRes.ok ? await imgRes.json() : null;
        const coverImageUrl = imgData?.imageUrl || aiData.coverImageUrl;

        // 3. Inject Image
        let content: string = aiData.content;
        if (/<img\s/i.test(content)) {
          content = content.replace(
            /(<img\b[^>]*\bsrc=")[^"]+("[^>]*>)/i,
            `$1${coverImageUrl}$2`
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

        // 4. Inject Google Play Card
        if (mother.googlePlayUrl && content.includes("</p>")) {
          const parts = content.split("</p>");
          if (parts.length >= 2) {
            content = `${parts[0]}</p><!-- GOOGLE_PLAY_CARD -->${parts.slice(1).join("</p>")}`;
          } else {
            content = `${content}<!-- GOOGLE_PLAY_CARD -->`;
          }
        }

        // 5. INJECT BUTTONS (The Core Feature)
        const buttonsHtml = `
<div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem; margin-bottom: 2rem;">
  <a href="${url1}" style="display: block; width: 100%; padding: 1rem; background-color: #10b981; color: #000; text-align: center; font-weight: bold; text-decoration: none; border-radius: 9999px; text-transform: uppercase;">
    ${alt1.buttonLabel} &rarr;
  </a>
  <a href="${url2}" style="display: block; width: 100%; padding: 1rem; background-color: #60a5fa; color: #000; text-align: center; font-weight: bold; text-decoration: none; border-radius: 9999px; text-transform: uppercase;">
    ${alt2.buttonLabel} &rarr;
  </a>
</div>
`;

        if (content.includes("</p>")) {
          const parts = content.split("</p>");
          if (parts.length >= 2) {
            // Reconstruct: p1 + </p> + p2 + </p> + BUTTONS + rest
            const before = parts.slice(0, 2).join("</p>") + "</p>";
            const after = parts.slice(2).join("</p>");
            content = before + buttonsHtml + after;
          } else {
            content += buttonsHtml;
          }
        } else {
          content += buttonsHtml;
        }

        setMother((p) => ({ ...p, status: "saving" }));
        addLog("Salvando Post Mãe...");

        // 6. Save Mother
        const saveRes = await fetch("/api/admin/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme: mother.theme,
            language: "pt",
            categoryIds: [lp1Cat.id], // Enforce LP1
            title: aiData.title,
            slug: aiData.slug,
            content,
            coverImageUrl,
            googlePlayUrl: mother.googlePlayUrl || undefined,
          }),
        });

        if (!saveRes.ok) throw new Error("Falha ao salvar Post Mãe");
        const saveData = await saveRes.json();

        setMother((p) => ({
          ...p,
          status: "done",
          generatedUrl: `/post/${saveData.postNumber}/${aiData.slug}`,
          generatedId: saveData.id,
        }));
        addLog("Processo LP1 concluído com sucesso!");

      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro desconhecido");
        addLog(`ERRO: ${err.message}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Post LP1 (Funil)</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Gera um post principal ("Mãe") contendo dois botões que levam a outros posts ou URLs.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleGenerateLP1} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            {/* MOTHER POST */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-3 text-sm font-semibold text-emerald-400">1. Post Mãe</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400">Tema do Post</label>
                  <input
                    value={mother.theme}
                    onChange={(e) => setMother({ ...mother, theme: e.target.value })}
                    className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                    placeholder="Ex: Melhores cortes de cabelo 2025"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400">Google Play URL (Opcional)</label>
                  <input
                    value={mother.googlePlayUrl}
                    onChange={(e) => setMother({ ...mother, googlePlayUrl: e.target.value })}
                    className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                    placeholder="https://play.google.com/..."
                  />
                </div>
              </div>
            </div>

            {/* ALT 1 */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-3 text-sm font-semibold text-emerald-400">2. Alternativa 1 (Botão Verde)</h2>
              <div className="space-y-3">
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={alt1.type === "generate"}
                      onChange={() => setAlt1({ ...alt1, type: "generate" })}
                    />
                    Gerar Novo Post
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={alt1.type === "url"}
                      onChange={() => setAlt1({ ...alt1, type: "url" })}
                    />
                    Usar URL Existente
                  </label>
                </div>

                {alt1.type === "generate" ? (
                  <div>
                    <label className="block text-xs text-zinc-400">Tema do Post Alternativo</label>
                    <input
                      value={alt1.theme}
                      onChange={(e) => setAlt1({ ...alt1, theme: e.target.value })}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                      placeholder="Ex: Cortes Femininos"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-zinc-400">URL de Destino</label>
                    <input
                      value={alt1.url}
                      onChange={(e) => setAlt1({ ...alt1, url: e.target.value })}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-zinc-400">Texto do Botão</label>
                  <input
                    value={alt1.buttonLabel}
                    onChange={(e) => setAlt1({ ...alt1, buttonLabel: e.target.value })}
                    className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                    placeholder="Ex: SIMULE CORTE FEMININO"
                  />
                </div>
              </div>
            </div>

            {/* ALT 2 */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <h2 className="mb-3 text-sm font-semibold text-blue-400">3. Alternativa 2 (Botão Azul)</h2>
              <div className="space-y-3">
                <div className="flex gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={alt2.type === "generate"}
                      onChange={() => setAlt2({ ...alt2, type: "generate" })}
                    />
                    Gerar Novo Post
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={alt2.type === "url"}
                      onChange={() => setAlt2({ ...alt2, type: "url" })}
                    />
                    Usar URL Existente
                  </label>
                </div>

                {alt2.type === "generate" ? (
                  <div>
                    <label className="block text-xs text-zinc-400">Tema do Post Alternativo</label>
                    <input
                      value={alt2.theme}
                      onChange={(e) => setAlt2({ ...alt2, theme: e.target.value })}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                      placeholder="Ex: Cortes Masculinos"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-zinc-400">URL de Destino</label>
                    <input
                      value={alt2.url}
                      onChange={(e) => setAlt2({ ...alt2, url: e.target.value })}
                      className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                      placeholder="https://..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-zinc-400">Texto do Botão</label>
                  <input
                    value={alt2.buttonLabel}
                    onChange={(e) => setAlt2({ ...alt2, buttonLabel: e.target.value })}
                    className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-white"
                    placeholder="Ex: SIMULE CORTE MASCULINO"
                  />
                </div>
              </div>
            </div>

            {/* CATEGORIES REMOVED - AUTOMATICALLY ASSIGNED */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs text-zinc-500">
                * As categorias serão atribuídas automaticamente: <strong>LP1</strong> para o Post Mãe e <strong>Aplicativos</strong> para os alternativos.
              </p>
            </div>

            <button
              type="submit"
              disabled={running}
              className="w-full rounded-md bg-emerald-500 px-4 py-3 text-sm font-bold text-black shadow-sm hover:bg-emerald-400 disabled:opacity-50"
            >
              {running ? "GERANDO LP1..." : "GERAR POST LP1"}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: LOGS & RESULTS */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-400 h-64 overflow-y-auto">
            <h3 className="mb-2 font-bold text-zinc-500 uppercase">Logs de Execução</h3>
            {logs.length === 0 && <span className="opacity-50">Aguardando início...</span>}
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>

          {mother.generatedUrl && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <h3 className="mb-2 text-sm font-bold text-emerald-400">Sucesso!</h3>
              <a
                href={mother.generatedUrl}
                target="_blank"
                className="block mb-2 text-sm text-zinc-200 hover:underline"
              >
                👉 Abrir Post Mãe
              </a>
              {alt1.generatedUrl && (
                <a
                  href={alt1.generatedUrl}
                  target="_blank"
                  className="block text-xs text-zinc-400 hover:underline"
                >
                  ↳ Abrir Alternativa 1
                </a>
              )}
              {alt2.generatedUrl && (
                <a
                  href={alt2.generatedUrl}
                  target="_blank"
                  className="block text-xs text-zinc-400 hover:underline"
                >
                  ↳ Abrir Alternativa 2
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
