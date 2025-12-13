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

async function updateAdBlock(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = String(formData.get("id") ?? "");
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

  if (!id || !name || !code) return;

  const paragraphIndex =
    position === "BEFORE_PARAGRAPH_X" && paragraphIndexRaw
      ? Number(paragraphIndexRaw)
      : null;

  // First disconnect all, then connect selected
  await prisma.adBlock.update({
    where: { id },
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
        set: [], // Clear existing relations
        connect: excludedCategoryIds.map((id) => ({ id })),
      },
    },
  });

  redirect("/admin/ads");
}

export default async function AdminAdEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const ad = await prisma.adBlock.findUnique({
    where: { id },
    include: { excludedCategories: true },
  });

  if (!ad) {
    redirect("/admin/ads");
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  const excludedIds = ad.excludedCategories.map((c) => c.id);

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Editar bloco de anúncio
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Ajuste nome, posição, parágrafo e código do bloco existente.
        </p>
      </header>

      <form
        action={updateAdBlock}
        className="space-y-3 text-sm rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"
      >
        <input type="hidden" name="id" value={ad.id} />

        <div className="space-y-1">
          <label className="block text-zinc-300" htmlFor="name">
            Nome do bloco
          </label>
          <input
            id="name"
            name="name"
            defaultValue={ad.name}
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
            defaultValue={ad.position}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="AFTER_TITLE">Depois do título</option>
            <option value="BEFORE_PARAGRAPH_X">Antes do parágrafo X</option>
            <option value="HEADER">Header do site</option>
          </select>
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
            defaultValue={ad.paragraphIndex ?? undefined}
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
            rows={8}
            defaultValue={ad.code}
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
          />
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
                  defaultChecked={excludedIds.includes(cat.id)}
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
            defaultChecked={ad.isActive}
            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500"
          />
          Ativo
        </label>

        <div className="flex items-center justify-between pt-2">
          <a
            href="/admin/ads"
            className="text-xs text-zinc-400 hover:text-zinc-100"
          >
            Voltar
          </a>

          <button
            type="submit"
            className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
          >
            Salvar alterações
          </button>
        </div>
      </form>
    </div>
  );
}
