import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skus = String(searchParams.get("skus") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!skus.length) {
    return NextResponse.json({ ok: false, error: "skus required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServer();

    const { data: extras, error: extrasError } = await supabase
      .from("produto_extra")
      .select("sku,cod_fornecedor,fora_de_linha,observacoes")
      .in("sku", skus);

    if (extrasError) throw extrasError;

    const { data: relations, error: relError } = await supabase
      .from("produto_fornecedor")
      .select("sku,fornecedor_id");

    if (relError) throw relError;

    const fornecedorIds = Array.from(
      new Set((relations || []).map((r: any) => r.fornecedor_id))
    );

    const { data: fornecedores, error: fornError } = await supabase
      .from("fornecedores")
      .select("id,nome")
      .in("id", fornecedorIds);

    if (fornError) throw fornError;

    const fornecedorMap = new Map(
      (fornecedores || []).map((f: any) => [f.id, f.nome])
    );

    const fornecedoresBySku = new Map<string, string[]>();
    for (const rel of relations || []) {
      if (!skus.includes(rel.sku)) continue;
      const nome = fornecedorMap.get(rel.fornecedor_id);
      if (!nome) continue;
      const list = fornecedoresBySku.get(rel.sku) || [];
      list.push(nome);
      fornecedoresBySku.set(rel.sku, list);
    }

    const out = (extras || []).map((row: any) => ({
      sku: row.sku,
      codFornecedor: row.cod_fornecedor || "",
      foraDeLinha: Boolean(row.fora_de_linha),
      observacoes: row.observacoes || "",
      fornecedores: fornecedoresBySku.get(row.sku) || [],
    }));

    return NextResponse.json({ ok: true, extras: out });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
