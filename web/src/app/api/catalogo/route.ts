import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const LIMIT_MAX = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(LIMIT_MAX, Math.max(1, Number(searchParams.get("limit") || 100)));

  const sku = String(searchParams.get("sku") || "").trim();
  const nome = String(searchParams.get("nome") || "").trim();
  const fornecedor = String(searchParams.get("fornecedor") || "").trim();
  const codFornecedor = String(searchParams.get("codFornecedor") || "").trim();

  const supabase = getSupabaseServer();

  let skuFilterSet: Set<string> | null = null;

  if (codFornecedor) {
    const { data, error } = await supabase
      .from("produto_extra")
      .select("sku")
      .ilike("cod_fornecedor", `%${codFornecedor}%`);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    skuFilterSet = new Set((data || []).map((r: any) => r.sku));
  }

  if (fornecedor) {
    const { data: forn, error: fornError } = await supabase
      .from("fornecedores")
      .select("id")
      .ilike("nome", `%${fornecedor}%`);
    if (fornError) {
      return NextResponse.json({ ok: false, error: fornError.message }, { status: 500 });
    }
    const ids = (forn || []).map((r: any) => r.id);
    if (!ids.length) {
      return NextResponse.json({ ok: true, items: [], total: 0 });
    }
    const { data: rel, error: relError } = await supabase
      .from("produto_fornecedor")
      .select("sku")
      .in("fornecedor_id", ids);
    if (relError) {
      return NextResponse.json({ ok: false, error: relError.message }, { status: 500 });
    }
    const skuFromForn = new Set((rel || []).map((r: any) => r.sku));
    skuFilterSet = skuFilterSet
      ? new Set([...skuFilterSet].filter((s) => skuFromForn.has(s)))
      : skuFromForn;
  }

  let query = supabase
    .from("catalogo")
    .select(
      "sku,nome_derivacao,codigo_pai,id_derivacao,url_imagem,ativo,preco",
      { count: "exact" }
    );

  if (sku) {
    query = query.ilike("sku", `%${sku}%`);
  }
  if (nome) {
    query = query.ilike("nome_derivacao", `%${nome}%`);
  }
  if (skuFilterSet) {
    const list = Array.from(skuFilterSet);
    if (!list.length) {
      return NextResponse.json({ ok: true, items: [], total: 0 });
    }
    query = query.in("sku", list);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.order("sku", { ascending: true }).range(from, to);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row: any) => ({
    codigo: row.sku,
    nomeDerivacao: row.nome_derivacao,
    codigoPai: row.codigo_pai,
    idDerivacao: row.id_derivacao,
    urlImagem: row.url_imagem,
    ativo: row.ativo !== false,
    preco: row.preco ?? undefined,
  }));

  return NextResponse.json({
    ok: true,
    page,
    limit,
    total: count || 0,
    items,
  });
}
