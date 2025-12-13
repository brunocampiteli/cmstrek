import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Bem-vindo ao painel do <span className="font-semibold">cms-next</span>.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Conteúdo</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Gerencie posts, categorias e páginas obrigatórias do blog.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link href="/admin/posts" className="text-emerald-400 hover:underline">
                Gerenciar posts (IA)
              </Link>
            </li>
            <li>
              <Link href="/admin/categories" className="text-emerald-400 hover:underline">
                Categorias do blog
              </Link>
            </li>
            <li>
              <Link href="/admin/pages" className="text-emerald-400 hover:underline">
                Páginas obrigatórias
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Monetização</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Configure blocos de anúncio para inserir nos posts.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link href="/admin/ads" className="text-emerald-400 hover:underline">
                Blocos de anúncio
              </Link>
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Configurações</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Aparência do site e gestão de usuários do painel.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <Link href="/admin/settings" className="text-emerald-400 hover:underline">
                Aparência / Tema do site
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="text-emerald-400 hover:underline">
                Usuários (apenas admin)
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
