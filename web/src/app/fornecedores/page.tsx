"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/sessionStore";
import { supabaseClient } from "@/lib/supabaseClient";

type Fornecedor = {
  id: number;
  nome: string;
  ativo: boolean;
  created_at: string;
};

export default function FornecedoresPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [items, setItems] = useState<Fornecedor[]>([]);
  const [novo, setNovo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  const load = async () => {
    if (!supabaseClient) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const res = await fetch("/api/fornecedores", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao carregar.");
      setItems(json.fornecedores || []);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && session) {
      void load();
    }
  }, [loading, session]);

  const handleAdd = async () => {
    if (!novo.trim() || !supabaseClient) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const res = await fetch("/api/fornecedores", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: novo }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao criar.");
      setNovo("");
      setItems((prev) => [...prev, json.fornecedor].sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (item: Fornecedor) => {
    if (!supabaseClient) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const res = await fetch(`/api/fornecedores/${item.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ativo: !item.ativo }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao atualizar.");
      setItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, ativo: !item.ativo } : f))
      );
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (item: Fornecedor, nome: string) => {
    if (!supabaseClient) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const res = await fetch(`/api/fornecedores/${item.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao renomear.");
      setItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, nome } : f)).sort((a, b) => a.nome.localeCompare(b.nome))
      );
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item: Fornecedor) => {
    if (!supabaseClient) return;
    if (!confirm(`Remover fornecedor "${item.nome}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await supabaseClient.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessao expirada.");
      const res = await fetch(`/api/fornecedores/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Falha ao remover.");
      setItems((prev) => prev.filter((f) => f.id !== item.id));
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="auth">
        <div className="auth-card">
          <h2>Carregando sessao...</h2>
          <p className="helper">Validando acesso.</p>
        </div>
      </main>
    );
  }

  if (!session) return null;

  return (
    <main className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <div className="brand-badge" />
            <div className="brand-text">
              <span>Fornecedores</span>
              <span>Cadastro central</span>
            </div>
          </div>
          <div className="actions">
            <a className="btn secondary" href="/estoque">
              Voltar ao estoque
            </a>
          </div>
        </nav>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Lista de fornecedores</h2>
              <p>Crie, edite ou desative fornecedores usados no catalogo.</p>
            </div>
            <div className="panel-actions">
              <button className="btn secondary" type="button" onClick={load} disabled={busy}>
                Atualizar
              </button>
            </div>
          </div>

          {error ? <div className="error">{error}</div> : null}

          <div className="filters">
            <label className="field">
              Novo fornecedor
              <input
                className="input"
                value={novo}
                onChange={(e) => setNovo(e.target.value)}
                placeholder="Nome do fornecedor"
              />
            </label>
            <div className="panel-actions">
              <button className="btn" type="button" onClick={handleAdd} disabled={busy}>
                Adicionar
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">Nenhum fornecedor cadastrado.</div>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="input input-tight"
                          defaultValue={item.nome}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== item.nome) {
                              void handleRename(item, next);
                            }
                          }}
                        />
                      </td>
                      <td>
                        <span className="pill">{item.ativo ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td>
                        <div className="panel-actions">
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => handleToggle(item)}
                            disabled={busy}
                          >
                            {item.ativo ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            className="btn secondary"
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={busy}
                          >
                            Remover
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
    </main>
  );
}
