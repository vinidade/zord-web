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

export default function EstoquePage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [filters, setFilters] = useState({
    sku: "",
    nome: "",
    fornecedor: "",
    codFornecedor: "",
  });
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const loadCatalogo = async (targetPage: number) => {
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`/api/catalogo?page=${targetPage}&limit=100`);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Falha ao buscar catalogo.");
      }

      const baseItems: EstoqueItem[] = (json.catalogo || []).map((it: any) => ({
        sku: String(it.codigo || ""),
        nome: String(it.nomeDerivacao || ""),
        fornecedor: "",
        codFornecedor: "",
        ativo: it.ativo !== false,
        foraDeLinha: false,
        observacoes: "",
        imagem: it.urlImagem || "",
        preco: Number(it.preco ?? 0),
        custo: undefined,
        estoque: undefined,
        reservado: undefined,
      }));

      setItems(baseItems);

      const skus = baseItems.map((it) => it.sku).filter(Boolean);
      if (skus.length) {
        void fetchExtras(skus);
        void fetchEstoqueLive(skus);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  type ExtraRow = {
    codFornecedor: string;
    foraDeLinha: boolean;
    observacoes: string;
    fornecedores: string[];
  };

  const fetchExtras = async (skus: string[]) => {
    try {
      const res = await fetch(`/api/extras?skus=${encodeURIComponent(skus.join(","))}`);
      const json = await res.json();
      if (!json.ok) return;

      const map = new Map<string, ExtraRow>(
        (json.extras || []).map((row: any) => [
          row.sku,
          {
            codFornecedor: row.codFornecedor || "",
            foraDeLinha: Boolean(row.foraDeLinha),
            observacoes: row.observacoes || "",
            fornecedores: Array.isArray(row.fornecedores) ? row.fornecedores : [],
          },
        ])
      );

      setItems((prev) =>
        prev.map((item) => {
          const extra = map.get(item.sku);
          if (!extra) return item;
          return {
            ...item,
            codFornecedor: extra.codFornecedor,
            foraDeLinha: extra.foraDeLinha,
            observacoes: extra.observacoes,
            fornecedor: extra.fornecedores.join("; "),
          };
        })
      );
    } catch {
      // Silencioso por enquanto.
    }
  };

  const fetchEstoqueLive = async (skus: string[]) => {
    const limit = 4;
    const delayMs = 120;
    let index = 0;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const worker = async () => {
      while (index < skus.length) {
        const current = skus[index];
        index += 1;
        try {
          const res = await fetch(`/api/estoque?sku=${encodeURIComponent(current)}`);
          if (res.status === 429) {
            await sleep(800);
            continue;
          }
          const json = await res.json();
          if (!json.ok || !Array.isArray(json.items)) continue;
          const row = json.items.find((r: any) => r.sku === current) || json.items[0];
          if (!row) continue;
          setItems((prev) =>
            prev.map((item) =>
              item.sku === current
                ? {
                    ...item,
                    custo: Number(row.custoMedio ?? item.custo),
                    estoque: Number(row.estoqueAtual ?? item.estoque),
                    reservado: Number(row.estoqueReservado ?? item.reservado),
                  }
                : item
            )
          );
        } catch {
          // ignora
        } finally {
          await sleep(delayMs);
        }
      }
    };

    await Promise.all(Array.from({ length: limit }, () => worker()));
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

  useEffect(() => {
    if (!loading && session) {
      void loadCatalogo(page);
    }
  }, [loading, session, page]);

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
              <button
                className="btn"
                type="button"
                onClick={() => loadCatalogo(page)}
                disabled={busy}
              >
                {busy ? "Buscando..." : "Buscar"}
              </button>
              <button className="btn secondary" type="button" onClick={handleClear}>
                Limpar
              </button>
            </div>
          </div>

          {error ? <div className="error">{error}</div> : null}

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
              <div className="panel-actions">
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || busy}
                >
                  Pagina anterior
                </button>
                <span className="pill">Pagina {page}</span>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={busy}
                >
                  Proxima pagina
                </button>
              </div>
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
