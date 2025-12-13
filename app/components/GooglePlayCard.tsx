"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AppMetadata = {
  name: string;
  iconUrl?: string;
  url: string;
  author?: string;
  rating?: number | null;
  ratingCount?: number | null;
  downloads?: string | null;
  contentRating?: string;
  price?: string;
  platform?: string;
};

export function GooglePlayCard({ url }: { url: string }) {
  const [data, setData] = useState<AppMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/tools/google-play-metadata?url=${encodeURIComponent(url)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("failed");
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json as AppMetadata);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Marca erro, mas não reseta os dados já carregados
          setError("no-metadata");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return null;

  const name = data?.name ?? "Aplicativo recomendado";
  const iconUrl = data?.iconUrl;
  const rating = data?.rating ?? null;
  const ratingCount = data?.ratingCount ?? null;
  const downloads = data?.downloads ?? null;
  const price = data?.price ?? "Free";
  const author = data?.author ?? "";
  const platform = data?.platform ?? "Android";

  return (
    <div className="my-6 mx-auto w-full max-w-xl rounded-xl border border-emerald-700/40 bg-zinc-900/70 p-4 text-sm text-zinc-100 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        {iconUrl ? (
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconUrl}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-xs text-zinc-400">
            APP
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400">
            Aplicativo recomendado
          </p>
          <p className="truncate text-sm font-semibold text-zinc-50" title={name}>
            {name}
          </p>
        </div>
      </div>

      {/* Bloco de classificação */}
      {(rating !== null || loading) && (
        <div className="mb-4 rounded-md bg-zinc-800/80 px-3 py-2 text-center text-xs text-zinc-200">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-400">
            Classificação
          </p>
          {loading ? (
            <div className="mx-auto h-3 w-20 animate-pulse rounded bg-zinc-700" />
          ) : rating !== null ? (
            <p className="text-sm font-semibold">
              <span className="mr-1 text-yellow-300">★★★★★</span>
              <span>{rating.toFixed(2)}</span>
              {ratingCount ? (
                <span className="ml-1 text-[11px] text-zinc-400">
                  ({ratingCount.toLocaleString("en-US")})
                </span>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-zinc-400">Sem avaliações suficientes</p>
          )}
        </div>
      )}

      {/* Grade de informações */}
      <div className="mb-4 grid grid-cols-2 gap-y-2 text-[11px] sm:text-xs">
        <div>
          <p className="text-zinc-400">
            {downloads ? "Downloads:" : "Classificação média:"}
          </p>
          <p className="font-medium text-zinc-100">
            {downloads && downloads}
            {!downloads && rating !== null && `${rating.toFixed(2)} / 5`}
            {!downloads && rating === null && "-"}
          </p>
        </div>
        <div>
          <p className="text-zinc-400">Autor:</p>
          <p className="font-medium text-zinc-100">{author || "-"}</p>
        </div>
        <div>
          <p className="text-zinc-400">Plataforma:</p>
          <p className="font-medium text-zinc-100">{platform}</p>
        </div>
        <div>
          <p className="text-zinc-400">Preço:</p>
          <p className="font-medium text-zinc-100">{price}</p>
        </div>
      </div>

      <div className="mb-3 h-px w-full bg-zinc-800" />

      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-emerald-400"
      >
        <span>Baixar na Google Play</span>
      </Link>
    </div>
  );
}
