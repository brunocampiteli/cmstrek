import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

async function requireEditorOrAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || (role !== "ADMIN" && role !== "EDITOR")) {
    redirect("/admin");
  }

  return session;
}

export async function createPage(formData: FormData) {
  "use server";

  await requireEditorOrAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  const language = String(formData.get("language") ?? "pt");
  const isRequired = formData.get("isRequired") === "on";
  const showAds = formData.get("showAds") === "on";

  if (!title || !slug) return;

  await prisma.page.create({
    data: {
      title,
      slug,
      content,
      language,
      isRequired,
      // Regra: páginas obrigatórias não exibem anúncios
      showAds: isRequired ? false : showAds,
    },
  });
}

export async function deletePage(formData: FormData) {
  "use server";

  await requireEditorOrAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.page.delete({ where: { id } });
}

export default async function AdminPagesPage() {
  await requireEditorOrAdmin();

  const pages = await prisma.page.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Páginas obrigatórias</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Crie e gerencie páginas estáticas como Política de Privacidade, Termos de Uso, etc.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Criar nova página</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Informe título, slug, idioma e conteúdo (Markdown ou HTML simples).
          </p>
          <form
            action={createPage}
            className="mt-4 space-y-3 text-sm"
          >
            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="title">
                Título
              </label>
              <input
                id="title"
                name="title"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                required
                placeholder="politica-de-privacidade"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Usado na URL: /[lang]/page/[slug]
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 text-sm">
                <label className="block text-zinc-300" htmlFor="language">
                  Idioma
                </label>
                <select
                  id="language"
                  name="language"
                  defaultValue="pt"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="pt">Português (pt)</option>
                  <option value="en">Inglês (en)</option>
                  <option value="es">Espanhol (es)</option>
                </select>
              </div>

              <div className="space-y-1 text-sm">
                <label className="block text-zinc-300">Configurações</label>
                <div className="space-y-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isRequired"
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                    />
                    Página obrigatória (não exibe anúncios)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="showAds"
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                    />
                    Permitir anúncios nesta página
                  </label>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Se "Página obrigatória" estiver marcado, anúncios serão desativados
                    independentemente da opção acima.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="content">
                Conteúdo (Markdown/HTML)
              </label>
              <textarea
                id="content"
                name="content"
                rows={8}
                className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
            >
              Criar página
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200">Páginas cadastradas</h2>
            <span className="text-xs text-zinc-500">{pages.length} itens</span>
          </div>

          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead className="text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-2 pb-1 text-left">Título</th>
                  <th className="px-2 pb-1 text-left">Slug</th>
                  <th className="px-2 pb-1 text-left">Idioma</th>
                  <th className="px-2 pb-1 text-left">Tipo</th>
                  <th className="px-2 pb-1 text-left">Anúncios</th>
                  <th className="px-2 pb-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="rounded-md bg-zinc-900/60">
                    <td className="px-2 py-2 align-top font-medium text-zinc-100">
                      {page.title}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">{page.slug}</td>
                    <td className="px-2 py-2 align-top text-zinc-300">{page.language}</td>
                    <td className="px-2 py-2 align-top text-zinc-300">
                      {page.isRequired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                          Obrigatória
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 px-2 py-0.5 text-xs font-medium text-zinc-300">
                          Opcional
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">
                      {page.isRequired || !page.showAds ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 px-2 py-0.5 text-xs font-medium text-zinc-300">
                          Sem anúncios
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                          Com anúncios
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-right">
                      <form action={deletePage} className="inline-block">
                        <input type="hidden" name="id" value={page.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20"
                        >
                          Remover
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
