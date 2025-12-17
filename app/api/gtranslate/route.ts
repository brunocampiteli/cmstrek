import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const MAIN_LANG = "pt";

const SERVERS = [
  "van",
  "kars",
  "sis",
  "dvin",
  "ani",
  "evn",
  "vagh",
  "step",
  "sis",
  "tigr",
  "ani",
  "van",
];

const ALLOWED_LANGS = new Set([
  "en",
  "ar",
  "bg",
  "zh-cn",
  "zh-tw",
  "hr",
  "cs",
  "da",
  "nl",
  "fi",
  "fr",
  "de",
  "el",
  "hi",
  "it",
  "ja",
  "ko",
  "no",
  "pl",
  "pt",
  "ro",
  "ru",
  "es",
  "sv",
  "ca",
  "tl",
  "iw",
  "id",
  "lv",
  "lt",
  "sr",
  "sk",
  "sl",
  "uk",
  "vi",
  "sq",
  "et",
  "gl",
  "hu",
  "mt",
  "th",
  "tr",
  "fa",
  "af",
  "ms",
  "sw",
  "ga",
  "cy",
  "be",
  "is",
  "mk",
  "yi",
  "hy",
  "az",
  "eu",
  "ka",
  "ht",
  "ur",
  "bn",
  "bs",
  "ceb",
  "eo",
  "gu",
  "ha",
  "hmn",
  "ig",
  "jw",
  "kn",
  "km",
  "lo",
  "la",
  "mi",
  "mr",
  "mn",
  "ne",
  "pa",
  "so",
  "ta",
  "te",
  "yo",
  "zu",
  "my",
  "ny",
  "kk",
  "mg",
  "ml",
  "si",
  "st",
  "su",
  "tg",
  "uz",
  "am",
  "co",
  "haw",
  "ku",
  "ky",
  "lb",
  "ps",
  "sm",
  "gd",
  "sn",
  "sd",
  "fy",
  "xh",
]);

function pickServerId(hostname: string) {
  const base = hostname.replace(/^www\./i, "");
  const md5 = crypto.createHash("md5").update(base).digest("hex");
  const prefix = md5.slice(0, 5);
  const n = parseInt(prefix, 16);
  return n % SERVERS.length;
}

function getProto(req: NextRequest) {
  const xfProto = req.headers.get("x-forwarded-proto");
  if (xfProto === "https" || xfProto === "http") return xfProto;
  return req.nextUrl.protocol.replace(":", "") || "https";
}

function rewriteHeaderLocation(location: string, glang: string, originalHost: string, tdnHost: string) {
  let out = location;

  out = out.replace(new RegExp(tdnHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), `${originalHost}/${glang}`);

  if (out.startsWith("/")) {
    out = `/${glang}${out}`;
  }

  out = out.replace(new RegExp(`/${glang}/(${Array.from(ALLOWED_LANGS).join("|")})/`, "i"), "/$1/");

  return out;
}

function rewriteHtml(html: string, glang: string, originalHost: string, tdnHost: string) {
  let out = html;

  out = out.replace(new RegExp(tdnHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), `${originalHost}/${glang}`);

  const prefix = `/${glang}/`;

  out = out.replace(/href="\//gi, `href=\"${prefix}`);
  out = out.replace(/src="\//gi, `src=\"${prefix}`);
  out = out.replace(/action="\//gi, `action=\"${prefix}`);

  out = out.replace(new RegExp(`href=\"/${glang}//`, "gi"), 'href="//');
  out = out.replace(new RegExp(`src=\"/${glang}//`, "gi"), 'src="//');
  out = out.replace(new RegExp(`action=\"/${glang}//`, "gi"), 'action="//');

  const langPattern = Array.from(ALLOWED_LANGS)
    .map((l) => l.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
    .join("|");

  out = out.replace(new RegExp(`(href|src|action)=\\"/${glang}/(${langPattern})/`, "gi"), `$1=\\"/$2/`);

  return out;
}

async function proxy(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const glang = (sp.get("glang") ?? "").toLowerCase();
  const gurl = sp.get("gurl") ?? "";

  if (!glang || !gurl) {
    return new NextResponse(null, { status: 400 });
  }

  if (!ALLOWED_LANGS.has(glang)) {
    return new NextResponse(null, { status: 400 });
  }

  if (glang === MAIN_LANG) {
    const url = new URL(req.nextUrl.toString());
    url.pathname = "/" + gurl.replace(/^\//, "");
    url.searchParams.delete("glang");
    url.searchParams.delete("gurl");
    return NextResponse.redirect(url, 301);
  }

  const originalHostRaw = req.headers.get("host") ?? "";
  const originalHost = originalHostRaw.split(":")[0] ?? originalHostRaw;
  const server = SERVERS[pickServerId(originalHost)];
  const proto = getProto(req);

  const upstreamUrl = new URL(`${proto}://${server}.tdn.gtranslate.net/${gurl.replace(/^\//, "")}`);
  sp.forEach((value, key) => {
    if (key === "glang" || key === "gurl") return;
    upstreamUrl.searchParams.append(key, value);
  });

  const tdnHost = `${glang}.${originalHost.replace(/^www\./i, "")}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (
      k === "host" ||
      k === "connection" ||
      k === "content-length" ||
      k === "accept-encoding" ||
      k === "x-forwarded-host" ||
      k === "x-forwarded-proto"
    ) {
      return;
    }
    headers.set(key, value);
  });

  headers.set("Host", tdnHost);
  headers.set("accept-encoding", "identity");

  const viewerIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-sucuri-clientip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  if (viewerIp) {
    headers.set("X-GT-Viewer-IP", viewerIp);
  }

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      method,
      headers,
      body: hasBody ? req.body : undefined,
      redirect: "manual",
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  const resHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "content-length" || k === "transfer-encoding" || k === "content-encoding" || k === "connection" || k === "link") {
      return;
    }

    if (k === "location" || k === "refresh") {
      resHeaders.set(key, rewriteHeaderLocation(value, glang, originalHost, tdnHost));
      return;
    }

    resHeaders.set(key, value);
  });

  const contentType = upstreamRes.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("text/html")) {
    const html = await upstreamRes.text();
    const rewritten = rewriteHtml(html, glang, originalHost, tdnHost);
    resHeaders.set("content-type", contentType);
    return new NextResponse(rewritten, {
      status: upstreamRes.status,
      headers: resHeaders,
    });
  }

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}

export async function PUT(req: NextRequest) {
  return proxy(req);
}

export async function PATCH(req: NextRequest) {
  return proxy(req);
}

export async function DELETE(req: NextRequest) {
  return proxy(req);
}

export async function HEAD(req: NextRequest) {
  return proxy(req);
}
