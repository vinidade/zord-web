"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/sessionStore";
import { supabaseClient } from "@/lib/supabaseClient";

type EstoqueItem = {
  sku: string;
  nome: string;
  fornecedor: string;
  codFornecedor: string;
  ativo: boolean;
  foraDeLinha: boolean;
  observacoes?: string;
  imagem?: string;
  preco?: number;
  custo?: number;
  estoque?: number;
  reservado?: number;
};

const MOCK_ITEMS: EstoqueItem[] = [
  {
    sku: "CH81001_AZ09",
    nome: "Camisa UV Dry Azul - G",
    fornecedor: "Extreme UV",
    codFornecedor: "EX-UV-009",
    ativo: true,
    foraDeLinha: false,
    observacoes: "Reposicao semanal na quarta.",
    imagem: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=300",
    preco: 189.9,
    custo: 72.4,
    estoque: 18,
    reservado: 2,
  },
  {
    sku: "BL22002_PR01",
    nome: "Blusa Termica Preta - M",
    fornecedor: "PolarPro",
    codFornecedor: "PP-TR-441",
    ativo: true,
    foraDeLinha: false,
    observacoes: "",
    imagem: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300",
    preco: 149.9,
    custo: 61,
    estoque: 6,
    reservado: 1,
  },
  {
    sku: "JA30001_CZ02",
    nome: "Jaqueta Corta Vento Cinza - P",
    fornecedor: "Artemis",
    codFornecedor: "ART-CV-02",
    ativo: false,
    foraDeLinha: true,
    observacoes: "Descontinuado pelo fornecedor.",
    imagem: "https://images.unsplash.com/photo-1484519332611-516457305ff6?w=300",
    preco: 299.9,
    custo: 130,
    estoque: 0,
    reservado: 0,
  },
];

export default function EstoquePage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [filters, setFilters] = useState({
    sku: "",
    nome: "",
    fornecedor: "",
    codFornecedor: "",
  });
  const [items, setItems] = useState<EstoqueItem[]>(MOCK_ITEMS);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  const handleSignOut = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    router.replace("/login");
  };

  const visibleItems = useMemo(() => {
    const sku = filters.sku.trim().toLowerCase();
    const nome = filters.nome.trim().toLowerCase();
    const fornecedor = filters.fornecedor.trim().toLowerCase();
    const codFornecedor = filters.codFornecedor.trim().toLowerCase();

    return items.filter((item) => {
      if (sku && !item.sku.toLowerCase().includes(sku)) return false;
      if (nome && !item.nome.toLowerCase().includes(nome)) return false;
      if (fornecedor && !item.fornecedor.toLowerCase().includes(fornecedor)) return false;
      if (codFornecedor && !item.codFornecedor.toLowerCase().includes(codFornecedor)) return false;
      return true;
    });
  }, [filters, items]);

  const handleClear = () => {
    setFilters({ sku: "", nome: "", fornecedor: "", codFornecedor: "" });
  };

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
            <button className="btn secondary" type="button" onClick={handleSignOut}>
              Sair
            </button>
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

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Busca rapida</h2>
              <p>Filtre por SKU, nome ou fornecedor. Resultado ao vivo.</p>
            </div>
            <div className="panel-actions">
              <button className="btn" type="button">
                Buscar
              </button>
              <button className="btn secondary" type="button" onClick={handleClear}>
                Limpar
              </button>
            </div>
          </div>

          <div className="filters">
            <label className="field">
              SKU
              <input
                className="input"
                value={filters.sku}
                onChange={(e) => setFilters((prev) => ({ ...prev, sku: e.target.value }))}
                placeholder="CH81001_AZ09"
              />
            </label>
            <label className="field">
              Nome
              <input
                className="input"
                value={filters.nome}
                onChange={(e) => setFilters((prev) => ({ ...prev, nome: e.target.value }))}
                placeholder="Camisa UV"
              />
            </label>
            <label className="field">
              Fornecedor
              <input
                className="input"
                value={filters.fornecedor}
                onChange={(e) => setFilters((prev) => ({ ...prev, fornecedor: e.target.value }))}
                placeholder="Extreme UV"
              />
            </label>
            <label className="field">
              Cod fornecedor
              <input
                className="input"
                value={filters.codFornecedor}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, codFornecedor: e.target.value }))
                }
                placeholder="EX-UV-009"
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Resultados</h2>
              <p>{visibleItems.length} itens encontrados</p>
            </div>
            <div className="panel-actions">
              <span className="pill">Modo leitura</span>
            </div>
          </div>

          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>Imagem</th>
                  <th>SKU</th>
                  <th>Informacoes</th>
                  <th>Preco / Estoque</th>
                  <th>Movimentar</th>
                  <th>Novo custo</th>
                  <th>Fornecedor</th>
                  <th>Cod Fornec</th>
                  <th>Observacoes</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.sku} className={item.ativo ? "" : "row-muted"}>
                    <td>
                      <div className="img-cell">
                        {item.imagem ? (
                          <img src={item.imagem} alt={item.nome} />
                        ) : (
                          <div className="img-placeholder" />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="sku-cell">
                        <strong>{item.sku}</strong>
                        {!item.ativo ? <span>Desativado</span> : null}
                        {item.foraDeLinha ? <span>Fora de linha</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="info-cell">
                        <strong>{item.nome}</strong>
                        <span>Fornecedor: {item.fornecedor}</span>
                        <span>Cod fornecedor: {item.codFornecedor}</span>
                      </div>
                    </td>
                    <td>
                      <div className="metric-cell">
                        <span>Preco: R$ {item.preco?.toFixed(2)}</span>
                        <span>Custo: R$ {item.custo?.toFixed(2)}</span>
                        <span>
                          Estoque: {item.estoque ?? 0} / {item.reservado ?? 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      <input className="input input-tight" placeholder="0" />
                    </td>
                    <td>
                      <input className="input input-tight" placeholder="0,00" />
                    </td>
                    <td>
                      <input className="input input-tight" defaultValue={item.fornecedor} />
                    </td>
                    <td>
                      <input className="input input-tight" defaultValue={item.codFornecedor} />
                    </td>
                    <td>
                      <input
                        className="input input-tight"
                        defaultValue={item.observacoes}
                        placeholder="-"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
