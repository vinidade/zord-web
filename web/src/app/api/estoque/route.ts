import { NextResponse } from "next/server";

const LIMIT_MAX = 100;

export async function GET(request: Request) {
  const baseUrl = String(process.env.MAGAZORD_BASE_URL || "").replace(/\/$/, "");
  const token = String(process.env.MAGAZORD_TOKEN || "").trim();
  const secret = String(process.env.MAGAZORD_SECRET || "").trim();
  const deposito = String(process.env.MAGAZORD_DEPOSITO_ID || "").trim();

  if (!baseUrl || !token || !secret) {
    return NextResponse.json(
      { ok: false, error: "MAGAZORD env vars missing" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const skuParam = String(searchParams.get("sku") || "").trim();
  const limit = Math.min(LIMIT_MAX, Math.max(1, Number(searchParams.get("limit") || 100)));

  if (!skuParam) {
    return NextResponse.json({ ok: false, error: "sku required" }, { status: 400 });
  }

  const authHeader = "Basic " + Buffer.from(`${token}:${secret}`).toString("base64");

  const url = new URL(`${baseUrl}/api/v1/listEstoque`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", "0");
  url.searchParams.set("produto", skuParam);
  if (deposito) url.searchParams.set("deposito", deposito);

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
  const items = Array.isArray(json?.data) ? json.data : [];
  const mapped = items.map((row: any) => ({
    sku: row?.produto ?? row?.codigo ?? row?.sku ?? "",
    estoqueAtual: Number(row?.quantidadeDisponivelVenda ?? 0),
    estoqueReservado: Number(row?.quantidadeReservadoSaida ?? 0),
    custoMedio: Number(row?.custoMedio ?? 0),
  }));

  return NextResponse.json({ ok: true, items: mapped });
}
