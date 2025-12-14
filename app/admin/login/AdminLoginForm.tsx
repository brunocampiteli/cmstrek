"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type AdminLoginFormProps = {
  logoUrl: string | null;
};

export function AdminLoginForm({ logoUrl }: AdminLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    const result = await signIn("credentials", {
      redirect: false,
      email: normalizedEmail,
      password,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Credenciais inválidas");
      return;
    }

    // Já estamos em /admin; apenas força o Next a recarregar os
    // server components (layout) com a sessão autenticada.
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-zinc-100">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-black/60 p-8 shadow-2xl shadow-black/70">
        <div className="mb-4 flex flex-col items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 w-auto"
            />
          ) : (
            <span className="text-base font-semibold tracking-tight">cms-next</span>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">Login do Admin</h1>
        </div>

        <p className="text-sm text-zinc-400 text-center">
          Acesse o painel de controle do <span className="font-semibold">cms-next</span>.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          <div className="space-y-1 text-sm">
            <label className="block text-zinc-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="block text-zinc-300" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
