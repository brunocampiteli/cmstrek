import type { ReactNode } from "react";
import "../globals.css";

export default async function LangLayout({
  children,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  // FUTURO: aqui é o ponto ideal para integrar o script do GT Translate
  // Exemplo: carregar script externo e inicializar tradução automática

  return <>{children}</>;
}

