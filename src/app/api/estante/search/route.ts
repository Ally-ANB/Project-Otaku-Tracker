import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { EstanteItem, TipoObra } from "@/types/hunter_registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABELAS_MIDIA: { tabela: string; tipo_obra: TipoObra; select: string }[] = [
  { tabela: "mangas", tipo_obra: "manga", select: "id, titulo, capa, capitulo_atual" },
  { tabela: "animes", tipo_obra: "anime", select: "id, titulo, capa, capitulo_atual" },
  { tabela: "filmes", tipo_obra: "movie", select: "id, titulo, capa, capitulo_atual" },
  { tabela: "livros", tipo_obra: "book", select: "id, titulo, capa, capitulo_atual" },
  { tabela: "series", tipo_obra: "series", select: "id, titulo, capa, capitulo_atual" },
  { tabela: "jogos", tipo_obra: "game", select: "id, titulo, capa, capitulo_atual" },
  { tabela: "musicas", tipo_obra: "song", select: "id, titulo, capa, capitulo_atual, link_url" },
];

function getServiceClient() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) ou SUPABASE_SERVICE_ROLE_KEY ausentes.");
  }
  return createClient(url, key);
}

function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function intProgresso(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function rowToItem(
  row: Record<string, unknown>,
  tipo_obra: TipoObra
): EstanteItem | null {
  const tituloRaw = row.titulo;
  const titulo = typeof tituloRaw === "string" ? tituloRaw.trim() : "";
  if (!titulo) return null;

  const rawId = row.id;
  const id =
    typeof rawId === "number" || typeof rawId === "string" ? rawId : undefined;

  const capa = typeof row.capa === "string" ? row.capa : row.capa == null ? null : String(row.capa);

  const linkRaw = row.link_url;
  const link_url =
    typeof linkRaw === "string" && linkRaw.trim()
      ? linkRaw.trim()
      : linkRaw == null
        ? null
        : String(linkRaw).trim() || null;

  return {
    ...(id !== undefined ? { id } : {}),
    titulo,
    capa,
    capa_url: null,
    ...(link_url ? { link_url } : {}),
    progresso: intProgresso(row.capitulo_atual),
    tipo_obra,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: unknown; hunterId?: unknown };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const hunterId = typeof body.hunterId === "string" ? body.hunterId.trim() : "";

    if (!hunterId) {
      return NextResponse.json({ error: "hunterId obrigatório." }, { status: 400 });
    }
    if (query.length < 2) {
      return NextResponse.json({ error: "query deve ter pelo menos 2 caracteres." }, { status: 400 });
    }

    const admin = getServiceClient();
    const pattern = `%${escapeIlikePattern(query)}%`;

    const resultados = await Promise.all(
      TABELAS_MIDIA.map(async ({ tabela, tipo_obra, select }) => {
        const { data, error } = await admin
          .from(tabela)
          .select(select)
          .eq("usuario", hunterId)
          .ilike("titulo", pattern)
          .limit(40);

        if (error) {
          console.error(`[api/estante/search] ${tabela}:`, error);
          return [] as EstanteItem[];
        }

        const rows = Array.isArray(data) ? data : [];
        const items: EstanteItem[] = [];
        for (const r of rows) {
          if (r && typeof r === "object") {
            const item = rowToItem(r as Record<string, unknown>, tipo_obra);
            if (item) items.push(item);
          }
        }
        return items;
      })
    );

    const merged = resultados.flat();
    merged.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt", { sensitivity: "base" }));

    return NextResponse.json({ items: merged });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha na busca.";
    console.error("[api/estante/search]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
