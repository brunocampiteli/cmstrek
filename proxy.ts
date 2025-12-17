import { NextRequest, NextResponse } from "next/server";

const MAIN_LANG = "pt";

const SUPPORTED_LANGS = new Set([
  "af",
  "am",
  "ar",
  "az",
  "be",
  "bg",
  "bn",
  "bs",
  "ca",
  "ceb",
  "co",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "eo",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fr",
  "fy",
  "ga",
  "gd",
  "gl",
  "gu",
  "ha",
  "haw",
  "hi",
  "hmn",
  "hr",
  "ht",
  "hu",
  "hy",
  "id",
  "ig",
  "is",
  "it",
  "iw",
  "ja",
  "jw",
  "ka",
  "kk",
  "km",
  "ko",
  "ku",
  "ky",
  "la",
  "lb",
  "lo",
  "lt",
  "lv",
  "mg",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "my",
  "ne",
  "nl",
  "no",
  "ny",
  "pa",
  "pl",
  "ps",
  "pt",
  "ro",
  "ru",
  "sd",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sq",
  "sr",
  "st",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "th",
  "tl",
  "tr",
  "uk",
  "ur",
  "uz",
  "vi",
  "xh",
  "yi",
  "yo",
  "zu",
  "zh-cn",
  "zh-tw",
]);

function normalizeLang(lang: string) {
  return lang.toLowerCase();
}

function encodeGurlFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((s) => encodeURIComponent(s)).join("/");
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return NextResponse.next();

  const first = segments[0]?.toLowerCase();
  if (first === "api" || first === "admin" || first === "_next") {
    return NextResponse.next();
  }

  const lang = normalizeLang(segments[0]);
  if (!SUPPORTED_LANGS.has(lang)) return NextResponse.next();

  const restPath = "/" + segments.slice(1).join("/");

  if (
    restPath === "/_next" ||
    restPath.startsWith("/_next/") ||
    restPath === "/favicon.ico" ||
    restPath === "/robots.txt" ||
    restPath === "/sitemap.xml" ||
    restPath.startsWith("/api/") ||
    restPath.startsWith("/admin") ||
    restPath.startsWith("/public")
  ) {
    if (restPath.startsWith("/_next/") || restPath.startsWith("/api/")) {
      const url = req.nextUrl.clone();
      url.pathname = restPath;
      return NextResponse.rewrite(url);
    }

    return NextResponse.next();
  }

  if (lang === MAIN_LANG) {
    const url = req.nextUrl.clone();
    url.pathname = restPath === "/" ? "/" : restPath;
    return NextResponse.redirect(url, 301);
  }

  const url = req.nextUrl.clone();
  url.pathname = "/api/gtranslate";
  url.search = `?glang=${encodeURIComponent(lang)}&gurl=${encodeGurlFromPath(restPath)}${search ? "&" + search.replace(/^\?/, "") : ""}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"],
};
