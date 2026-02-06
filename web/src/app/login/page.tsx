"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string>("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setStatus("loading");

    if (!supabaseClient) {
      setError("Supabase nao configurado. Verifique as variaveis no Vercel.");
      setStatus("idle");
      return;
    }

    const { error: authError } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setStatus("idle");
      return;
    }

    window.location.href = "/estoque";
  };

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="brand">
          <div className="brand-badge" />
          <div className="brand-text">
            <span>Catalogozord</span>
            <span>Entrada segura</span>
          </div>
        </div>

        <h2>Entrar no painel</h2>
        <p className="helper">
          Use o e-mail e senha cadastrados no Supabase.
        </p>

        {!supabaseClient ? (
          <div className="error">
            Supabase nao configurado. Configure as variaveis
            NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </div>
        ) : null}

        <label className="field">
          Email
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="field">
          Senha
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? <div className="error">{error}</div> : null}

        <div className="auth-actions">
          <button className="btn" type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Entrando..." : "Entrar"}
          </button>
          <a className="btn secondary" href="/">
            Voltar
          </a>
        </div>
      </form>
    </main>
  );
}
