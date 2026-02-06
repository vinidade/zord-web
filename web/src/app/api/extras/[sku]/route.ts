import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { requireUserFromRequest } from "@/lib/authServer";

export async function PUT(
  request: Request,
  context: { params: Promise<{ sku: string }> }
) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const sku = String(params.sku || "").trim();
  if (!sku) {
    return NextResponse.json({ ok: false, error: "invalid sku" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const codFornecedor = String(body?.codFornecedor || "").trim();
  const foraDeLinha = Boolean(body?.foraDeLinha);
  const observacoes = String(body?.observacoes || "").trim();
  const fornecedores = Array.isArray(body?.fornecedores)
    ? body.fornecedores.map((v: any) => Number(v)).filter((v: any) => v)
    : [];

  const supabase = getSupabaseServer();

  const { error: upsertError } = await supabase
    .from("produto_extra")
    .upsert({
      sku,
      cod_fornecedor: codFornecedor,
      fora_de_linha: foraDeLinha,
      observacoes,
    });

  if (upsertError) {
    return NextResponse.json({ ok: false, error: upsertError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("produto_fornecedor")
    .delete()
    .eq("sku", sku);

  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  if (fornecedores.length) {
    const rows = fornecedores.map((id: number) => ({ sku, fornecedor_id: id }));
    const { error: insertError } = await supabase.from("produto_fornecedor").insert(rows);
    if (insertError) {
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
