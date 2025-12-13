import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    redirect("/admin");
  }

  return session;
}

export async function saveSettings(formData: FormData) {
  "use server";

  await requireAdmin();

  const logoUrl = String(formData.get("logoUrl") ?? "").trim() || null;
  const faviconUrl = String(formData.get("faviconUrl") ?? "").trim() || null;
  const primaryColor = String(formData.get("primaryColor") ?? "").trim() || null;
  const secondaryColor = String(formData.get("secondaryColor") ?? "").trim() || null;
  const fontFamily = String(formData.get("fontFamily") ?? "").trim() || null;
  const layoutStyle = String(formData.get("layoutStyle") ?? "dark").trim() || "dark";

  const existing = await prisma.siteSettings.findFirst();

  if (existing) {
    await prisma.siteSettings.update({
      where: { id: existing.id },
      data: {
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        fontFamily,
        layoutStyle,
      },
    });
  } else {
    await prisma.siteSettings.create({
      data: {
        logoUrl,
        faviconUrl,
        primaryColor,
        secondaryColor,
        fontFamily,
        layoutStyle,
      },
    });
  }
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const settings = await prisma.siteSettings.findFirst();

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Aparência / Tema do site</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure logo, cores e fonte principal utilizadas no layout público do site.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <form
          action={saveSettings}
          className="grid gap-6 md:grid-cols-2 text-sm"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="logoUrl">
                Logo URL
              </label>
              <input
                id="logoUrl"
                name="logoUrl"
                defaultValue={settings?.logoUrl ?? ""}
                placeholder="https://.../logo.png"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                No futuro, podemos integrar um upload direto (ex: Cloudinary) e salvar apenas a URL aqui.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="faviconUrl">
                Favicon URL
              </label>
              <input
                id="faviconUrl"
                name="faviconUrl"
                defaultValue={settings?.faviconUrl ?? ""}
                placeholder="https://.../favicon.ico"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="fontFamily">
                Fonte principal
              </label>
              <input
                id="fontFamily"
                name="fontFamily"
                defaultValue={settings?.fontFamily ?? ""}
                placeholder="system-ui, sans-serif"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Família de fontes a ser aplicada no layout público.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-zinc-300" htmlFor="primaryColor">
                  Cor primária
                </label>
                <input
                  id="primaryColor"
                  name="primaryColor"
                  defaultValue={settings?.primaryColor ?? "#10b981"}
                  type="text"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-zinc-300" htmlFor="secondaryColor">
                  Cor secundária
                </label>
                <input
                  id="secondaryColor"
                  name="secondaryColor"
                  defaultValue={settings?.secondaryColor ?? "#0f172a"}
                  type="text"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="layoutStyle">
                Estilo do layout
              </label>
              <select
                id="layoutStyle"
                name="layoutStyle"
                defaultValue={settings?.layoutStyle ?? "dark"}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
              </select>
              <p className="text-xs text-zinc-500">
                No futuro, podemos usar esse valor para alternar entre temas claro/escuro no front.
              </p>
            </div>

            <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
              <p className="font-medium text-zinc-200">Como isso será aplicado no front?</p>
              <p className="mt-1">
                O layout público (`app/[lang]/layout.tsx`) pode ler essas configurações para
                aplicar logo, cores e fonte no header/footer, além de ajustar o tema geral.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
            >
              Salvar configurações
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

