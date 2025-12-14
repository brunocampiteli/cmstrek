import type { ReactNode } from "react";
import "../globals.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type AdminLayoutProps = {
  children: ReactNode;
};

const navLinkBase =
  "block rounded-md px-3 py-2 text-sm font-medium transition-colors";

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === "ADMIN";

  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <aside className="w-60 border-r border-zinc-800 bg-zinc-950 px-4 py-6">
        <h1 className="mb-6 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          cms-next
          <span className="ml-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-400">
            Admin
          </span>
        </h1>

        <nav className="space-y-1 text-sm">
          <Link href="/admin" className={`${navLinkBase} bg-zinc-800/70`}>
            Dashboard
          </Link>
          <p className="mt-4 mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Conteúdo
          </p>
          <Link href="/admin/posts" className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}>
            Posts (IA)
          </Link>
          <Link
            href="/admin/posts/bulk"
            className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}
          >
            Posts em massa
          </Link>
          <Link
            href="/admin/posts/lp1"
            className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}
          >
            Post LP1 (Funil)
          </Link>
          <Link href="/admin/categories" className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}>
            Categorias
          </Link>
          <Link href="/admin/pages" className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}>
            Páginas obrigatórias
          </Link>

          {isAdmin && (
            <>
              <p className="mt-4 mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Monetização
              </p>
              <Link
                href="/admin/ads"
                className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}
              >
                Blocos de anúncio
              </Link>

              <p className="mt-4 mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Configurações
              </p>
              <Link
                href="/admin/settings"
                className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}
              >
                Aparência / Tema
              </Link>
              <Link
                href="/admin/users"
                className={navLinkBase + " text-zinc-200 hover:bg-zinc-800"}
              >
                Usuários
              </Link>
            </>
          )}
        </nav>
      </aside>

      <main className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}

