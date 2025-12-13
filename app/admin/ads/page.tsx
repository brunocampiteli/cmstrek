import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    redirect("/admin");
  }

  return session;
}

export async function createAdBlock(formData: FormData) {
  "use server";

  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const position = String(formData.get("position") ?? "AFTER_TITLE");
  const paragraphIndexRaw = formData.get("paragraphIndex");
  const code = String(formData.get("code") ?? "");
  const isActive = formData.get("isActive") === "on";

  // Get all selected excluded categories
  const excludedCategoryIds = [];
  for (const key of Array.from(formData.keys())) {
    if (key.startsWith("excluded_cat_")) {
      excludedCategoryIds.push(key.replace("excluded_cat_", ""));
    }
  }

  if (!name || !code) return;

  const paragraphIndex =
    position === "BEFORE_PARAGRAPH_X" && paragraphIndexRaw
      ? Number(paragraphIndexRaw)
      : null;

  await prisma.adBlock.create({
    data: {
      name,
      position:
        position === "BEFORE_PARAGRAPH_X"
          ? "BEFORE_PARAGRAPH_X"
          : position === "HEADER"
            ? "HEADER"
            : "AFTER_TITLE",
      paragraphIndex: paragraphIndex ?? undefined,
      code,
      isActive,
      excludedCategories: {
        connect: excludedCategoryIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath("/", "layout");
}

export async function deleteAdBlock(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.adBlock.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function toggleAdBlock(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  if (!id) return;

  await prisma.adBlock.update({ where: { id }, data: { isActive: !active } });
  revalidatePath("/", "layout");
}

export default async function AdminAdsPage() {
  await requireAdmin();

  const ads = await prisma.adBlock.findMany({
    orderBy: { createdAt: "desc" },
    include: { excludedCategories: true },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Blocos de anúncio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure snippets de anúncio para serem injetados automaticamente nos posts.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Criar bloco de anúncio</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Nome, posição, índice de parágrafo (quando aplicável) e código HTML/JS do anúncio.
          </p>
          <form
            action={createAdBlock}
            className="mt-4 space-y-3 text-sm"
          >
            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="name">
                Nome do bloco
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="position">
                Posição
              </label>
              <select
                id="position"
                name="position"
                defaultValue="AFTER_TITLE"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="AFTER_TITLE">Depois do título</option>
                <option value="BEFORE_PARAGRAPH_X">Antes do parágrafo X</option>
                <option value="HEADER">Header do site</option>
              </select>
              <p className="text-xs text-zinc-500">
                Quando escolher "Antes do parágrafo X", informe o índice do parágrafo abaixo.
              </p>
              <p
                id="header-position-hint"
                className="hidden text-xs text-amber-400"
              >
                Ao escolher "Header do site", o código será inserido na &lt;head&gt; de todas as páginas.
                Ideal para scripts globais como Google Tag Manager, pixels e AdSense.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="paragraphIndex">
                Índice do parágrafo (opcional)
              </label>
              <input
                id="paragraphIndex"
                name="paragraphIndex"
                type="number"
                min={1}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="code">
                Código do anúncio (HTML/JS)
              </label>
              <textarea
                id="code"
                name="code"
                rows={6}
                required
                className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Cole aqui o snippet fornecido pelo provedor (AdSense, ADX, etc.).
              </p>
            </div>

            <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
              <span className="block text-xs font-medium text-zinc-300">
                Não exibir nas categorias:
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {categories.length === 0 && (
                  <p className="text-xs text-zinc-500">Nenhuma categoria cadastrada.</p>
                )}
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200">
                    <input
                      type="checkbox"
                      name={`excluded_cat_${cat.id}`}
                      className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500/30"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
              />
              Ativo
            </label>

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
            >
              Criar bloco
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200">Blocos cadastrados</h2>
            <span className="text-xs text-zinc-500">{ads.length} itens</span>
          </div>

          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead className="text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-2 pb-1 text-left">Nome</th>
                  <th className="px-2 pb-1 text-left">Posição</th>
                  <th className="px-2 pb-1 text-left">Exclusões</th>
                  <th className="px-2 pb-1 text-left">Status</th>
                  <th className="px-2 pb-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad: any) => (
                  <tr key={ad.id} className="rounded-md bg-zinc-900/60">
                    <td className="px-2 py-2 align-top font-medium text-zinc-100">
                      {ad.name}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">
                      {ad.position === "AFTER_TITLE"
                        ? "Depois do título"
                        : ad.position === "BEFORE_PARAGRAPH_X"
                          ? "Antes do parágrafo X"
                          : ad.position === "HEADER"
                            ? "Header do site"
                            : ""}
                      {ad.paragraphIndex && <span className="ml-1 text-zinc-500">({ad.paragraphIndex})</span>}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">
                      {ad.excludedCategories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ad.excludedCategories.map((cat: any) => (
                            <span key={cat.id} className="inline-flex rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">
                      {ad.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700/40 px-2 py-0.5 text-xs font-medium text-zinc-300">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 align-top text-right">
                      <div className="inline-flex items-center gap-2">
                        <a
                          href={`/admin/ads/${ad.id}`}
                          className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                        >
                          Editar
                        </a>
                        <form action={toggleAdBlock}>
                          <input type="hidden" name="id" value={ad.id} />
                          <input
                            type="hidden"
                            name="active"
                            value={ad.isActive ? "true" : "false"}
                          />
                          <button
                            type="submit"
                            className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 hover:bg-zinc-700"
                          >
                            {ad.isActive ? "Desativar" : "Ativar"}
                          </button>
                        </form>
                        <form action={deleteAdBlock}>
                          <input type="hidden" name="id" value={ad.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-200 hover:bg-red-500/20"
                          >
                            Remover
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {/* Script simples para mostrar/ocultar aviso do HEADER conforme seleção */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function () {
              var select = document.getElementById('position');
              var hint = document.getElementById('header-position-hint');
              if (!select || !hint) return;

              function updateHint() {
                if (select.value === 'HEADER') {
                  hint.classList.remove('hidden');
                } else {
                  hint.classList.add('hidden');
                }
              }

              select.addEventListener('change', updateHint);
              updateHint();
            });
          `,
        }}
      />
    </div>
  );
}

