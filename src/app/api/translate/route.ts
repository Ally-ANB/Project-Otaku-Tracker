import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let originalText = "";

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ translatedText: "" }, { status: 400 });
    }

    originalText = text;

    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(text)}`
    );

    if (!response.ok) {
      throw new Error("Falha ao comunicar com a API de tradução");
    }

    const data: unknown = await response.json();

    let translatedText = "";
    if (Array.isArray(data) && Array.isArray(data[0])) {
      for (const segment of data[0] as unknown[]) {
        if (Array.isArray(segment) && typeof segment[0] === "string") {
          translatedText += segment[0];
        }
      }
    }

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Erro na rota de tradução:", error);
    return NextResponse.json({ translatedText: originalText }, { status: 500 });
  }
}
