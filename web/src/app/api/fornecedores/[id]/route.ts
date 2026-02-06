import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { requireUserFromRequest } from "@/lib/authServer";

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(context.params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const payload: Record<string, any> = {};
  if (body?.nome !== undefined) payload.nome = String(body.nome).trim();
  if (body?.ativo !== undefined) payload.ativo = Boolean(body.ativo);

  if (!Object.keys(payload).length) {
    return NextResponse.json({ ok: false, error: "no fields" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("fornecedores")
    .update(payload)
    .eq("id", id)
    .select("id,nome,ativo,created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fornecedor: data });
}

export async function DELETE(request: Request, context: { params: { id: string } }) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(context.params.id);
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("fornecedores").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
