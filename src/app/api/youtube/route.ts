import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório." }, { status: 400 });
  }

  try {
    const { default: ytSearch } = await import("yt-search");
    const result = await ytSearch(q);
    const items = result.videos.slice(0, 5).map((v) => ({
      titulo: v.title,
      url: v.url,
      duracao: v.timestamp || String(v.duration),
      thumbnail: v.thumbnail || v.image || "",
      id: v.videoId,
    }));
    return NextResponse.json({ results: items });
  } catch (error) {
    console.error("Erro na busca do YouTube:", error);
    return NextResponse.json({ error: "Falha na busca" }, { status: 500 });
  }
}
