import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { requireUserFromRequest } from "@/lib/authServer";

export async function GET(request: Request) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("fornecedores")
    .select("id,nome,ativo,created_at")
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fornecedores: data || [] });
}

export async function POST(request: Request) {
  const user = await requireUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const nome = String(body?.nome || "").trim();
  if (!nome) {
    return NextResponse.json({ ok: false, error: "nome required" }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("fornecedores")
    .insert({ nome })
    .select("id,nome,ativo,created_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fornecedor: data });
}
