import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/authServer";

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

export async function POST(request: Request) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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

  const body = await request.json().catch(() => ({}));
  const sku = String(body?.sku || "").trim();
  const precoVenda = Number(body?.preco || 0);

  if (!sku || !precoVenda) {
    return NextResponse.json({ ok: false, error: "sku/preco required" }, { status: 400 });
  }

  const authHeader = "Basic " + Buffer.from(`${token}:${secret}`).toString("base64");
  const url = `${baseUrl}/api/v1/preco`;

  const payload = [
    {
      produto: sku,
      tabelaPreco: Number(tabelaPreco),
      precoVenda,
    },
  ];

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  if (!resp.ok) {
    return NextResponse.json(
      { ok: false, error: text.slice(0, 500) },
      { status: resp.status }
    );
  }

  return NextResponse.json({ ok: true });
}
