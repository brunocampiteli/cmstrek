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

export async function createCategory(formData: FormData) {
  "use server";

  await requireEditorOrAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();

  if (!name || !slug) return;

  await prisma.category.create({
    data: {
      name,
      slug,
      description: description || null,
    },
  });
}

export async function deleteCategory(formData: FormData) {
  "use server";

  await requireEditorOrAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.postCategory.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
}

export default async function AdminCategoriesPage() {
  await requireEditorOrAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Categorias</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Defina as categorias usadas para organizar os posts do blog.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Adicionar nova categoria</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Nome, slug e descrição opcional, similar ao painel de categorias do WordPress.
          </p>
          <form
            action={createCategory}
            className="mt-4 space-y-3 text-sm"
          >
            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="name">
                Nome
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Como a categoria aparece no site.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                required
                placeholder="tecnologia"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Versão em minúsculas, sem acentos, usada na URL.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Opcional. Pode ser usada no tema para explicar a categoria.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
            >
              Adicionar categoria
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200">Todas as categorias</h2>
            <span className="text-xs text-zinc-500">{categories.length} itens</span>
          </div>

          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead className="text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-2 pb-1 text-left">Nome</th>
                  <th className="px-2 pb-1 text-left">Slug</th>
                  <th className="px-2 pb-1 text-left">Descrição</th>
                  <th className="px-2 pb-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className="rounded-md bg-zinc-900/60">
                    <td className="px-2 py-2 align-top font-medium text-zinc-100">
                      {cat.name}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">{cat.slug}</td>
                    <td className="px-2 py-2 align-top text-zinc-400">
                      {cat.description || <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-2 py-2 align-top text-right">
                      <form action={deleteCategory} className="inline-block">
                        <input type="hidden" name="id" value={cat.id} />
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
