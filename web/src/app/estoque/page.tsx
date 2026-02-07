"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/sessionStore";
import { supabaseClient } from "@/lib/supabaseClient";

type EstoqueItem = {
  sku: string;
  nome: string;
  fornecedor: string;
  fornecedores?: string[];
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
  const [fornecedores, setFornecedores] = useState<{ id: number; nome: string }[]>(
    []
  );
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        codFornecedor: string;
        foraDeLinha: boolean;
        observacoes: string;
        fornecedores: number[];
      }
    >
  >({});
  const [appliedFilters, setAppliedFilters] = useState({
    sku: "",
    nome: "",
    fornecedor: "",
    codFornecedor: "",
  });
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loadingSku, setLoadingSku] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [modal, setModal] = useState<{
    sku: string;
    type: "preco" | "estoque" | "fornecedor" | "cod" | "obs";
  } | null>(null);
  const [draftPreco, setDraftPreco] = useState("");
  const [draftMov, setDraftMov] = useState({ quantidade: "", custo: "", motivo: "1" });
  const [keepMotivo, setKeepMotivo] = useState(true);
  const [keepCusto, setKeepCusto] = useState(false);

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

  const loadCatalogo = async (
    targetPage: number,
    filterOverride?: typeof appliedFilters
  ) => {
    setBusy(true);
    setError("");
    const activeFilters = filterOverride ?? appliedFilters;

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "100",
      });
      if (activeFilters.sku) params.set("sku", activeFilters.sku);
      if (activeFilters.nome) params.set("nome", activeFilters.nome);
      if (activeFilters.fornecedor) params.set("fornecedor", activeFilters.fornecedor);
      if (activeFilters.codFornecedor) {
        params.set("codFornecedor", activeFilters.codFornecedor);
      }

      const res = await fetch(`/api/catalogo?${params.toString()}`);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Falha ao buscar catalogo.");
      }

      const baseItems: EstoqueItem[] = (json.items || [])
        .map((it: any) => ({
          sku: String(it.codigo || ""),
          nome: String(it.nomeDerivacao || ""),
          fornecedor: "",
          fornecedores: [],
          codFornecedor: "",
          ativo: it.ativo !== false,
          foraDeLinha: false,
          observacoes: "",
          imagem: it.urlImagem || "",
          preco: undefined,
          custo: undefined,
          estoque: undefined,
          reservado: undefined,
        }))
        .sort((a: EstoqueItem, b: EstoqueItem) => a.sku.localeCompare(b.sku));

      setItems(baseItems);

      const skus = baseItems.map((it) => it.sku).filter(Boolean);
      if (skus.length) {
        void fetchExtras(skus);
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
            fornecedores: extra.fornecedores,
          };
        })
      );
    } catch {
      // Silencioso por enquanto.
    }
  };

  const loadFornecedores = async () => {
    if (!supabaseClient) return;
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/fornecedores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.ok) return;
      setFornecedores(json.fornecedores || []);
    } catch {
      // ignore
    }
  };

  const fetchEstoqueSingle = async (sku: string) => {
    if (loadingSku.has(sku)) return;
    setLoadingSku((prev) => new Set(prev).add(sku));
    try {
      const res = await fetch(`/api/estoque?sku=${encodeURIComponent(sku)}`);
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.items)) return;
      const row = json.items.find((r: any) => r.sku === sku) || json.items[0];
      if (!row) return;
      setItems((prev) =>
        prev.map((item) =>
          item.sku === sku
            ? {
                ...item,
                custo: Number(row.custoMedio ?? item.custo),
                estoque: Number(row.estoqueAtual ?? item.estoque),
                reservado: Number(row.estoqueReservado ?? item.reservado),
                preco: item.preco,
              }
            : item
        )
      );
    } finally {
      setLoadingSku((prev) => {
        const next = new Set(prev);
        next.delete(sku);
        return next;
      });
    }
  };

  const fetchPrecoSingle = async (sku: string) => {
    try {
      const res = await fetch(`/api/preco?sku=${encodeURIComponent(sku)}`);
      const json = await res.json();
      if (!json.ok) return;
      if (json.preco === undefined || json.preco === null) return;
      setItems((prev) =>
        prev.map((item) =>
          item.sku === sku ? { ...item, preco: Number(json.preco) } : item
        )
      );
    } catch {
      // ignore
    }
  };

  const visibleItems = useMemo(() => items, [items]);

  const handleClear = () => {
    setFilters({ sku: "", nome: "", fornecedor: "", codFornecedor: "" });
    setAppliedFilters({ sku: "", nome: "", fornecedor: "", codFornecedor: "" });
    setItems([]);
  };

  const handleBuscar = () => {
    const nextFilters = {
      sku: filters.sku,
      nome: filters.nome,
      fornecedor: filters.fornecedor,
      codFornecedor: filters.codFornecedor,
    };
    setPage(1);
    setAppliedFilters(nextFilters);
    void loadCatalogo(1, nextFilters);
  };

  const handleSync = async () => {
    if (!supabaseClient) return;
    setSyncing(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const res = await fetch("/api/catalogo/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Falha ao sincronizar.");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (!loading && session) {
      void loadFornecedores();
    }
  }, [loading, session]);

  const getDraft = (item: EstoqueItem) => {
    if (drafts[item.sku]) return drafts[item.sku];
    const mapByName = new Map(fornecedores.map((f) => [f.nome, f.id]));
    const list = (item.fornecedores || item.fornecedor.split(";").map((s) => s.trim()))
      .filter(Boolean)
      .map((name) => mapByName.get(name))
      .filter((id): id is number => typeof id === "number");
    return {
      codFornecedor: item.codFornecedor || "",
      foraDeLinha: item.foraDeLinha || false,
      observacoes: item.observacoes || "",
      fornecedores: list,
    };
  };

  const updateDraft = (sku: string, patch: Partial<(typeof drafts)[string]>) => {
    setDrafts((prev) => ({
      ...prev,
      [sku]: {
        ...(prev[sku] || {
          codFornecedor: "",
          foraDeLinha: false,
          observacoes: "",
          fornecedores: [],
        }),
        ...patch,
      },
    }));
  };

  const handleSaveExtras = async (item: EstoqueItem) => {
    if (!supabaseClient) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const draft = getDraft(item);
      const res = await fetch(`/api/extras/${encodeURIComponent(item.sku)}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          codFornecedor: draft.codFornecedor,
          foraDeLinha: draft.foraDeLinha,
          observacoes: draft.observacoes,
          fornecedores: draft.fornecedores,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao salvar.");
      setItems((prev) =>
        prev.map((it) =>
          it.sku === item.sku
            ? {
                ...it,
                codFornecedor: draft.codFornecedor,
                foraDeLinha: draft.foraDeLinha,
                observacoes: draft.observacoes,
                fornecedor: draft.fornecedores
                  .map((id) => fornecedores.find((f) => f.id === id)?.nome)
                  .filter(Boolean)
                  .join("; "),
                fornecedores: draft.fornecedores
                  .map((id) => fornecedores.find((f) => f.id === id)?.nome)
                  .filter(Boolean) as string[],
              }
            : it
        )
      );
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const openModal = (
    item: EstoqueItem,
    type: "preco" | "estoque" | "fornecedor" | "cod" | "obs"
  ) => {
    setModal({ sku: item.sku, type });
    if (type === "preco") {
      setDraftPreco(item.preco !== undefined ? String(item.preco.toFixed(2)) : "");
    }
    if (type === "estoque") {
      setDraftMov((prev) => ({
        quantidade: "",
        custo: keepCusto ? prev.custo : "",
        motivo: keepMotivo ? prev.motivo : "1",
      }));
    }
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
            <a className="btn secondary" href="/fornecedores">
              Fornecedores
            </a>
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
              <button className="btn" type="button" onClick={handleBuscar} disabled={busy}>
                {busy ? "Buscando..." : "Buscar"}
              </button>
              <button className="btn secondary" type="button" onClick={handleClear}>
                Limpar
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? "Sincronizando..." : "Sincronizar catalogo"}
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
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                    void loadCatalogo(next);
                  }}
                  disabled={page === 1 || busy}
                >
                  Pagina anterior
                </button>
                <span className="pill">Pagina {page}</span>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    void loadCatalogo(next);
                  }}
                  disabled={busy}
                >
                  Proxima pagina
                </button>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="sheet">
              <colgroup>
                <col style={{ width: "150px" }} />
                <col style={{ width: "280px" }} />
                <col style={{ width: "170px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "170px" }} />
                <col style={{ width: "260px" }} />
                <col style={{ width: "160px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Imagem / SKU</th>
                  <th>Nome</th>
                  <th>Preco</th>
                  <th>Estoque</th>
                  <th>Custo</th>
                  <th>Fornecedor</th>
                  <th>Cod Forn</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        Nenhum resultado. Preencha a busca e clique em Buscar.
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleItems.map((item) => (
                    <tr
                      key={item.sku}
                      className={`${item.ativo ? "" : "row-muted"} row-click`}
                      onClick={() => {
                        void fetchEstoqueSingle(item.sku);
                        void fetchPrecoSingle(item.sku);
                      }}
                    >
                      <td>
                        <div className="sku-stack">
                          <div className="img-cell img-hover">
                            {item.imagem ? (
                              <img src={item.imagem} alt={item.nome} />
                            ) : (
                              <div className="img-placeholder" />
                            )}
                            {item.imagem ? (
                              <div className="img-zoom">
                                <img src={item.imagem} alt={item.nome} />
                              </div>
                            ) : null}
                          </div>
                          <span>{item.sku}</span>
                        </div>
                      </td>
                      <td>
                        <div className="info-cell">
                          <strong>{item.nome}</strong>
                          <div className="inline-row">
                            <span className="obs-text">
                              <strong>OBS:</strong> {item.observacoes || "-"}
                            </span>
                            <button
                              className="icon-btn"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(item, "obs");
                              }}
                              aria-label="Editar observacoes"
                            >
                              ✎
                            </button>
                          </div>
                          <label className="checkbox subtle">
                            <input
                              type="checkbox"
                              checked={getDraft(item).foraDeLinha}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                updateDraft(item.sku, { foraDeLinha: e.target.checked });
                                void handleSaveExtras({
                                  ...item,
                                  foraDeLinha: e.target.checked,
                                });
                              }}
                            />
                            Fora de linha
                          </label>
                          {!item.ativo ? <span>Desativado</span> : null}
                        </div>
                      </td>
                      <td>
                        <div className="metric-cell">
                          <span className="value-big">
                            {item.preco !== undefined ? `R$ ${item.preco.toFixed(2)}` : "--"}
                          </span>
                          <button
                            className="icon-btn inline-icon"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(item, "preco");
                            }}
                            aria-label="Editar preco"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="metric-cell">
                          <span className="value-big">
                            {item.estoque !== undefined ? item.estoque : "--"}
                          </span>
                          <span className="value-sub">
                            / {item.reservado !== undefined ? item.reservado : "--"}
                          </span>
                          {loadingSku.has(item.sku) ? <span>Atualizando...</span> : null}
                          <button
                            className="icon-btn inline-icon"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(item, "estoque");
                            }}
                            aria-label="Movimentar estoque"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="metric-cell">
                          <span className="value-big">
                            {item.custo !== undefined ? `R$ ${item.custo.toFixed(2)}` : "--"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="metric-cell">
                          {(item.fornecedor || "-")
                            .split(";")
                            .map((f) => f.trim())
                            .filter(Boolean)
                            .map((f) => (
                              <span key={f} className="chip">
                                {f}
                              </span>
                            ))}
                          <button
                            className="icon-btn inline-icon"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(item, "fornecedor");
                            }}
                            aria-label="Editar fornecedores"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="metric-cell">
                          <span>{item.codFornecedor || "--"}</span>
                          <button
                            className="icon-btn inline-icon"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(item, "cod");
                            }}
                            aria-label="Editar codigo fornecedor"
                          >
                            ✎
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {modal ? (
        <div className="modal" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modal.type === "preco" && "Atualizar preco"}
                {modal.type === "estoque" && "Movimentar estoque"}
                {modal.type === "fornecedor" && "Editar fornecedores"}
                {modal.type === "cod" && "Editar codigo fornecedor"}
                {modal.type === "obs" && "Editar observacoes"}
              </h3>
              <button className="icon-btn" type="button" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>

            {modal.type === "preco" ? (
              <div className="modal-body">
                <label className="field">
                  Novo preco
                  <input
                    className="input"
                    value={draftPreco}
                    onChange={(e) => setDraftPreco(e.target.value)}
                  />
                </label>
                <div className="inline-actions">
                  <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button className="btn" type="button">
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}

            {modal.type === "estoque" ? (
              <div className="modal-body">
                <label className="field">
                  Movimentacao (+/-)
                  <input
                    className="input"
                    value={draftMov.quantidade}
                    onChange={(e) =>
                      setDraftMov((prev) => ({ ...prev, quantidade: e.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  Novo custo (opcional)
                  <input
                    className="input"
                    value={draftMov.custo}
                    onChange={(e) => setDraftMov((prev) => ({ ...prev, custo: e.target.value }))}
                  />
                </label>
                <label className="field">
                  Motivo
                  <select
                    className="input"
                    value={draftMov.motivo}
                    onChange={(e) =>
                      setDraftMov((prev) => ({ ...prev, motivo: e.target.value }))
                    }
                  >
                    <option value="1">1 - Reposicao +</option>
                    <option value="2">2 - Cadastro +</option>
                    <option value="3">3 - Devolucao +</option>
                    <option value="4">4 - Troca de Produto + ou -</option>
                    <option value="5">5 - Conferencia + ou -</option>
                    <option value="6">6 - Fracionamento -</option>
                    <option value="7">7 - Uso interno -</option>
                    <option value="8">8 - Marketing -</option>
                    <option value="9">9 - Usado na Fabricacao -</option>
                  </select>
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={keepMotivo}
                    onChange={(e) => setKeepMotivo(e.target.checked)}
                  />
                  Manter motivo para proximas movimentacoes
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={keepCusto}
                    onChange={(e) => setKeepCusto(e.target.checked)}
                  />
                  Manter custo para proximas movimentacoes
                </label>
                <div className="inline-actions">
                  <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button className="btn" type="button">
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}

            {modal.type === "fornecedor" ? (
              <div className="modal-body">
                <select
                  className="input full-width"
                  multiple
                  value={getDraft(
                    items.find((it) => it.sku === modal.sku) || {
                      sku: modal.sku,
                      nome: "",
                      fornecedor: "",
                      codFornecedor: "",
                      ativo: true,
                      foraDeLinha: false,
                    }
                  ).fornecedores.map(String)}
                  onChange={(e) =>
                    updateDraft(modal.sku, {
                      fornecedores: Array.from(e.target.selectedOptions).map((opt) =>
                        Number(opt.value)
                      ),
                    })
                  }
                >
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <div className="inline-actions">
                  <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      const item = items.find((it) => it.sku === modal.sku);
                      if (item) handleSaveExtras(item);
                      setModal(null);
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}

            {modal.type === "cod" ? (
              <div className="modal-body">
                <input
                  className="input"
                  value={getDraft(
                    items.find((it) => it.sku === modal.sku) || {
                      sku: modal.sku,
                      nome: "",
                      fornecedor: "",
                      codFornecedor: "",
                      ativo: true,
                      foraDeLinha: false,
                    }
                  ).codFornecedor}
                  onChange={(e) => updateDraft(modal.sku, { codFornecedor: e.target.value })}
                />
                <div className="inline-actions">
                  <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      const item = items.find((it) => it.sku === modal.sku);
                      if (item) handleSaveExtras(item);
                      setModal(null);
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}

            {modal.type === "obs" ? (
              <div className="modal-body">
                <input
                  className="input"
                  value={getDraft(
                    items.find((it) => it.sku === modal.sku) || {
                      sku: modal.sku,
                      nome: "",
                      fornecedor: "",
                      codFornecedor: "",
                      ativo: true,
                      foraDeLinha: false,
                    }
                  ).observacoes}
                  onChange={(e) => updateDraft(modal.sku, { observacoes: e.target.value })}
                />
                <div className="inline-actions">
                  <button className="btn secondary" type="button" onClick={() => setModal(null)}>
                    Cancelar
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      const item = items.find((it) => it.sku === modal.sku);
                      if (item) handleSaveExtras(item);
                      setModal(null);
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
