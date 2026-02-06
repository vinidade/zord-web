import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { requireUserFromRequest } from "@/lib/authServer";

const LIMIT = 100;

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

export async function POST(request: Request) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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

  const authHeader = "Basic " + Buffer.from(`${token}:${secret}`).toString("base64");
  const supabase = getSupabaseServer();

  let page = 1;
  let total = 0;
  let hasMore = true;
  const upserts: any[] = [];

  while (hasMore && page < 5000) {
    const url = `${baseUrl}/api/v2/site/frontend/produto/${lojaId}?limit=${LIMIT}&page=${page}`;
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

    for (const it of derivs) {
      const midia0 = it?.midias?.[0];
      const urlImagem = midia0
        ? buildCdnUrl({ path: midia0.path, arquivo_nome: midia0.arquivo_nome })
        : "";
      const sku = String(it?.codigo || "").trim();
      if (!sku) continue;
      upserts.push({
        sku,
        nome_derivacao:
          it?.derivacao_nome && it?.nome ? `${it.nome} - ${it.derivacao_nome}` : it?.nome || "",
        codigo_pai: it?.codigo_pai ?? it?.codigoPai ?? it?.produto_codigo_pai ?? "",
        id_derivacao: it?.derivacao_id ?? it?.id_derivacao ?? it?.id ?? null,
        url_imagem: urlImagem,
        ativo: it?.ativo !== false,
        preco: it?.valor ?? null,
      });
    }

    total += derivs.length;
    hasMore = Boolean(json?.data?.has_more);
    page += 1;
  }

  if (upserts.length) {
    const { error } = await supabase
      .from("catalogo")
      .upsert(upserts, { onConflict: "sku" });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, total });
}
