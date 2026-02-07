import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const baseUrl = String(process.env.MAGAZORD_BASE_URL || "").replace(/\/$/, "");
  const token = String(process.env.MAGAZORD_TOKEN || "").trim();
  const secret = String(process.env.MAGAZORD_SECRET || "").trim();
  const tabelaPreco = String(process.env.MAGAZORD_TABELA_PRECO_ID || "").trim();

  if (!baseUrl || !token || !secret || !tabelaPreco) {
    return NextResponse.json(
      { ok: false, error: "MAGAZORD env vars missing" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const sku = String(searchParams.get("sku") || "").trim();
  if (!sku) {
    return NextResponse.json({ ok: false, error: "sku required" }, { status: 400 });
  }

  const authHeader = "Basic " + Buffer.from(`${token}:${secret}`).toString("base64");
  const url = new URL(`${baseUrl}/api/v1/listPreco`);
  url.searchParams.set("tabelaPreco", tabelaPreco);
  url.searchParams.set("produto", sku);
  url.searchParams.set("limit", "1");
  url.searchParams.set("offset", "0");

  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: authHeader, Accept: "application/json" },
    cache: "no-store",
  });

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json(
      { ok: false, error: text.slice(0, 500) },
      { status: resp.status }
    );
  }

  const json = JSON.parse(text);
  const data = Array.isArray(json?.data) ? json.data : [];
  const row = data[0];
  const preco = row?.precoVenda ?? row?.preco_venda ?? null;

  return NextResponse.json({ ok: true, preco });
}
