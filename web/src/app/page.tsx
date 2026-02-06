export default function Home() {
  return (
    <main className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <div className="brand-badge" />
            <div className="brand-text">
              <span>Catalogozord</span>
              <span>Central interna de operacoes</span>
            </div>
          </div>
          <div className="actions">
            <span className="pill">Magazord + Supabase</span>
            <a className="btn secondary" href="/login">
              Entrar
            </a>
          </div>
        </nav>

        <section className="hero">
          <div>
            <h1>Catalogo vivo, estoque instantaneo e operacoes em tempo real.</h1>
            <p>
              Base centralizada para fornecedores e observacoes, com consultas
              diretas no Magazord para estoque, custo e preco. Sem planilha,
              sem latencia desnecessaria.
            </p>
            <div className="actions" style={{ marginTop: 20 }}>
              <a className="btn" href="/login">
                Acessar painel
              </a>
              <a className="btn secondary" href="#roadmap">
                Ver roadmap
              </a>
            </div>
          </div>
          <div className="hero-card">
            <h3>O que muda neste novo sistema</h3>
            <ul>
              <li>Busca rapida no catalogo central + dados extras locais.</li>
              <li>Estoque e custo sempre ao vivo, por SKU.</li>
              <li>Movimentacao individual e feedback imediato.</li>
              <li>Interface estilo planilha, feita para operacao diaria.</li>
            </ul>
          </div>
        </section>

        <section className="grid" id="roadmap">
          <div className="card">
            <h4>Catalogo + Extras</h4>
            <p>Fornecedores, cod fornecedor, fora de linha e observacoes.</p>
          </div>
          <div className="card">
            <h4>Busca dinamica</h4>
            <p>Resultados instantaneos com refresh de estoque em background.</p>
          </div>
          <div className="card">
            <h4>Movimentacao rapida</h4>
            <p>Atualize cada SKU direto no Magazord, sem lote.</p>
          </div>
          <div className="card">
            <h4>Controle interno</h4>
            <p>Auth simples com Supabase e telas para fornecedores.</p>
          </div>
        </section>

        <footer className="footer">
          Catalogozord • Deploy automatico via Vercel
        </footer>
      </div>
    </main>
  );
}
