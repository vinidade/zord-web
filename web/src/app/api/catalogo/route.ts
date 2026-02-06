import { NextResponse } from "next/server";

const LIMIT_MAX = 100;

function buildCdnUrl(midia: { path?: string; arquivo_nome?: string }) {
  const cdnBase = (process.env.MAGAZORD_CDN_BASE_URL || "").replace(/\/$/, "");
  const path = String(midia.path || "").trim();
  const arquivo = String(midia.arquivo_nome || "").trim();
  if (!path || !arquivo) return "";
  if (/^https?:\/\//i.test(path)) {
    return `${path.replace(/\/$/, "")}/${arquivo}`;
  }
  if (!cdnBase) return "";
  return `${cdnBase}/${path.replace(/^\//, "").replace(/\/$/, "")}/${arquivo}`;
}

export async function GET(request: Request) {
  const baseUrl = String(process.env.MAGAZORD_BASE_URL || "").replace(/\/$/, "");
  const token = String(process.env.MAGAZORD_TOKEN || "").trim();
  const secret = String(process.env.MAGAZORD_SECRET || "").trim();
  const lojaId = Number(process.env.MAGAZORD_LOJA_ID || 1);

  if (!baseUrl || !token || !secret) {
    return NextResponse.json(
      { ok: false, error: "MAGAZORD env vars missing" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(LIMIT_MAX, Math.max(1, Number(searchParams.get("limit") || 100)));

  const url = `${baseUrl}/api/v2/site/frontend/produto/${lojaId}?limit=${limit}&page=${page}`;
  const authHeader = "Basic " + Buffer.from(`${token}:${secret}`).toString("base64");

  const resp = await fetch(url, {
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
  const items = Array.isArray(json?.data?.items) ? json.data.items : [];
  const derivs = items.filter((it: any) => it?.tipo_registro === 2);

  const catalogo = derivs.map((it: any) => {
    const midia0 = it?.midias?.[0];
    const urlImagem = midia0
      ? buildCdnUrl({ path: midia0.path, arquivo_nome: midia0.arquivo_nome })
      : "";
    return {
      idDerivacao: it?.derivacao_id ?? it?.id_derivacao ?? it?.id,
      codigoPai: it?.codigo_pai ?? it?.codigoPai ?? it?.produto_codigo_pai ?? "",
      codigo: it?.codigo ?? "",
      nomeDerivacao:
        it?.derivacao_nome && it?.nome ? `${it.nome} - ${it.derivacao_nome}` : it?.nome || "",
      urlImagem,
      preco: it?.valor ?? 0,
      ativo: it?.ativo !== false,
    };
  });

  return NextResponse.json({
    ok: true,
    page,
    limit,
    total: Number(json?.data?.total || catalogo.length),
    hasMore: Boolean(json?.data?.has_more),
    catalogo,
  });
}
