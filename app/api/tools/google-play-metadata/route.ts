import { NextResponse } from "next/server";

function extractProductId(playUrl: string): string | null {
  try {
    const u = new URL(playUrl);
    const id = u.searchParams.get("id");
    return id || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SERPAPI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const productId = extractProductId(url) ?? url;

  try {
    const serpUrl = new URL("https://serpapi.com/search.json");
    // Usar Google Play Apps Store API (engine=google_play) e ler app_highlight
    serpUrl.searchParams.set("engine", "google_play");
    serpUrl.searchParams.set("store", "apps");
    serpUrl.searchParams.set("q", productId);
    serpUrl.searchParams.set("api_key", apiKey);
    serpUrl.searchParams.set("hl", "en");
    serpUrl.searchParams.set("gl", "us");

    const res = await fetch(serpUrl.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "SerpAPI request failed", status: res.status, body: text },
        { status: 502 },
      );
    }

    const json: any = await res.json();
    let app = json?.app_highlight as any | undefined;

    // Fallback: se não houver app_highlight, usar organic_results[0].items[x]
    if (!app) {
      const items: any[] = json?.organic_results?.[0]?.items ?? [];
      if (items.length > 0) {
        app =
          items.find((i) => i.product_id === productId) ||
          items[0];
      }
    }

    if (!app) {
      return NextResponse.json({ error: "App metadata not found" }, { status: 404 });
    }

    const ratingValue = typeof app.rating === "number" ? app.rating : null;
    const ratingCount = typeof app.reviews === "number" ? app.reviews : null;

    const payload = {
      name: app.title ?? "",
      iconUrl: app.thumbnail ?? "",
      url: app.link ?? url,
      author: app.author ?? "",
      rating: ratingValue,
      ratingCount,
      downloads: app.downloads ?? null,
      contentRating: app.content_rating?.text ?? "",
      price: app.offers?.[0]?.text ?? "Free",
      platform: "Android",
    };

    if (!payload.name || !payload.url) {
      return NextResponse.json({ error: "Incomplete app metadata" }, { status: 404 });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    console.error("google-play-metadata serpapi error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
