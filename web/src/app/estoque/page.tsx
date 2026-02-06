"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/sessionStore";

export default function EstoquePage() {
  const router = useRouter();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <main className="auth">
        <div className="auth-card">
          <h2>Carregando sessao...</h2>
          <p className="helper">Validando acesso ao painel.</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <div className="brand-badge" />
            <div className="brand-text">
              <span>Estoque</span>
              <span>Painel operacional</span>
            </div>
          </div>
          <div className="actions">
            <span className="pill">{session.user.email}</span>
          </div>
        </nav>

        <section className="hero">
          <div>
            <h1>Modulo de estoque</h1>
            <p>
              Aqui vamos montar a tabela estilo planilha e o fluxo de
              movimentacao individual por SKU.
            </p>
          </div>
          <div className="hero-card">
            <h3>Proximos passos</h3>
            <ul>
              <li>Busca no catalogo central + extras locais.</li>
              <li>Atualizacao live de estoque/custo/preco.</li>
              <li>Edicao inline de fornecedor e observacoes.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
