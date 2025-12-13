import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import bcrypt from "bcrypt";

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  const role = (session?.user as any)?.role;

  if (!session || role !== "ADMIN") {
    redirect("/admin");
  }

  return session;
}

export async function createUser(formData: FormData) {
  "use server";

  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "EDITOR").toUpperCase();

  if (!name || !email || !password) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role === "ADMIN" ? "ADMIN" : "EDITOR",
    },
  });
}

export async function deleteUser(formData: FormData) {
  "use server";

  const session = await requireAdmin();
  const currentUserId = (session.user as any)?.id as string | undefined;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  if (userId === currentUserId) {
    return;
  }

  await prisma.user.delete({
    where: { id: userId },
  });
}

export default async function AdminUsersPage() {
  await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <header className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-semibold tracking-tight">Usuários</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Apenas administradores podem criar e remover usuários do painel.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Criar novo usuário</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Defina nome, email, senha inicial e papel (admin ou editor).
          </p>
          <form
            action={createUser}
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
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="password">
                Senha inicial
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-500">
                Recomende que o usuário altere a senha após o primeiro acesso.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-zinc-300" htmlFor="role">
                Papel
              </label>
              <select
                id="role"
                name="role"
                defaultValue="editor"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
            >
              Criar usuário
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-zinc-200">Todos os usuários</h2>
            <span className="text-xs text-zinc-500">{users.length} itens</span>
          </div>

          <div className="mt-3 overflow-x-auto text-sm">
            <table className="min-w-full border-separate border-spacing-y-1">
              <thead className="text-xs uppercase text-zinc-400">
                <tr>
                  <th className="px-2 pb-1 text-left">Nome</th>
                  <th className="px-2 pb-1 text-left">Email</th>
                  <th className="px-2 pb-1 text-left">Papel</th>
                  <th className="px-2 pb-1 text-left">Criado em</th>
                  <th className="px-2 pb-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="rounded-md bg-zinc-900/60">
                    <td className="px-2 py-2 align-top font-medium text-zinc-100">
                      {user.name}
                    </td>
                    <td className="px-2 py-2 align-top text-zinc-300">{user.email}</td>
                    <td className="px-2 py-2 align-top text-zinc-300">{user.role}</td>
                    <td className="px-2 py-2 align-top text-zinc-400">
                      {user.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-2 py-2 align-top text-right">
                      <form action={deleteUser} className="inline-block">
                        <input type="hidden" name="userId" value={user.id} />
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

