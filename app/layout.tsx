import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "cms-next",
  description: "CMS em Next.js com IA, anúncios e multilíngue",
};

async function getSiteSettings() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    return settings;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();

  const headerAds = await prisma.adBlock.findMany({
    where: { isActive: true, position: "HEADER" },
    orderBy: { createdAt: "asc" },
  });

  const requiredPages = await prisma.page.findMany({
    where: { isRequired: true, language: "pt" },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, slug: true },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const primaryColor = settings?.primaryColor ?? "#0f172a";
  const secondaryColor = settings?.secondaryColor ?? "#020617";
  const fontFamily = settings?.fontFamily ?? "system-ui, sans-serif";

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {headerAds.map((ad: { id: string; code: string }) => (
          <script
            key={ad.id}
            dangerouslySetInnerHTML={{ __html: ad.code }}
          />
        ))}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-zinc-100`}
        style={{ fontFamily }}
      >
        <div className="flex min-h-screen flex-col bg-black">
          <header
            className="border-b border-zinc-800"
            style={{ background: primaryColor }}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
              <Link href="/" className="flex items-center gap-3">
                {settings?.logoUrl ? (
                  // FUTURO: trocar por next/image com otimização e dimensões adequadas
                  // e carregar logoUrl vindo de um provedor como Cloudinary
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="h-10 w-auto sm:h-12"
                  />
                ) : (
                  <span className="text-base font-semibold tracking-tight">
                    cms-next
                  </span>
                )}
              </Link>

              <nav className="flex flex-1 items-center justify-end gap-4 text-xs text-zinc-200">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {categories.map((cat: { id: string; name: string; slug: string }) => (
                    <Link
                      key={cat.id}
                      href={`/?category=${encodeURIComponent(cat.slug)}`}
                      className="rounded-full bg-black/20 px-3 py-1 text-[11px] font-medium hover:bg-black/40"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </header>

          <main className="flex-1 bg-black">{children}</main>

          <footer
            className="border-t border-zinc-800 text-xs text-zinc-400"
            style={{ background: primaryColor }}
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                © {new Date().getFullYear()} cms-next. Todos os direitos reservados.
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {requiredPages.map((page: { id: string; title: string; slug: string }) => (
                  <Link
                    key={page.id}
                    href={`/pt/page/${page.slug}`}
                    className="hover:text-white"
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
