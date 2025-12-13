type LangPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

export default async function LangHomePage({ params }: LangPageProps) {
  const { lang } = await params;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Home pública ({lang})</h1>
      <p>
        Esta é a página inicial para o idioma <strong>{lang}</strong>.
      </p>
      <p>
        No futuro, aqui vamos listar os posts do blog, filtrados por idioma, e
        exibir categorias e páginas obrigatórias.
      </p>
    </main>
  );
}

