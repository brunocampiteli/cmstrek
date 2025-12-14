"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  async function handleLogout() {
    await signOut({ callbackUrl: "/admin" });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-sm transition hover:bg-zinc-800 hover:text-white"
    >
      Sair
    </button>
  );
}
