import { CSSProperties, useState } from "react";

// Premium FinTech color scheme matching dashboard
const COLORS = {
  bg: "#0a0f14",
  cardBg: "rgba(255,255,255,0.03)",
  cardBorder: "rgba(255,255,255,0.08)",
  accent: "#10b981",
  accentDark: "#059669",
  text: "#e5e7eb",
  subtext: "#6b7280",
  positive: "#10b981",
  negative: "#f87171",
};

// Inline SVG Icons for features
const Icons = {
  tracking: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
      <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 8.5l-5 5-3-3-4 4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18.5" cy="8.5" r="2" fill="#10b981"/>
    </svg>
  ),
  alerts: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="4" r="3" fill="#10b981" stroke="none"/>
    </svg>
  ),
  goals: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="#10b981"/>
    </svg>
  ),
  shield: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  database: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  lock: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
      <circle cx="12" cy="16" r="1" fill="#10b981"/>
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  x: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
    </svg>
  ),
};

// Dashboard mockup component
function DashboardMockup() {
  return (
    <div style={{
      background: COLORS.bg,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 20,
      padding: "20px",
      maxWidth: 340,
      margin: "0 auto",
      boxShadow: "0 25px 80px rgba(16,185,129,0.15), 0 10px 30px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: "#6b7280", fontSize: 18 }}>&#9776;</span>
        <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>Dashboard</span>
        <span style={{ color: "#6b7280", fontSize: 16 }}>&#128276;</span>
      </div>

      {/* Monthly Result Card */}
      <div style={{
        background: "linear-gradient(145deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: 16,
        padding: "18px 20px",
        marginBottom: 14,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute",
          right: -20,
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.15,
        }}>
          <svg width="100" height="60" viewBox="0 0 100 60">
            <path d="M0,50 Q25,30 50,35 T100,20" fill="none" stroke="#10b981" strokeWidth="2"/>
            <path d="M0,55 Q25,40 50,42 T100,30" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.5"/>
          </svg>
        </div>
        <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Resultado do Mes
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.positive, letterSpacing: "-1px", marginBottom: 4 }}>
          2.184,21 &euro;
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: COLORS.positive, fontSize: 12 }}>&#8599;</span>
          <span style={{ fontSize: 12, color: COLORS.positive, fontWeight: 600 }}>+18,6% vs mes anterior</span>
        </div>
      </div>

      {/* Income/Expense Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>&#128179;</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Rendimento</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>2.318,66 &euro;</div>
        </div>
        <div style={{
          background: COLORS.cardBg,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>&#128179;</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>Despesas</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.text }}>134,45 &euro;</div>
        </div>
      </div>

      {/* Distribution bars */}
      <div style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}>
        <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Distribuicao por Tipo
        </div>
        {[
          { label: "Necessidade", pct: 51, color: "#10b981" },
          { label: "Desejo", pct: 49, color: "#f59e0b" },
          { label: "Investimento", pct: 0, color: "#a78bfa" },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: i < 2 ? 10 : 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: COLORS.text }}>{item.label}</span>
              <span style={{ fontSize: 12, color: item.color, fontWeight: 600 }}>{item.pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 99 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{
      background: COLORS.cardBg,
      border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 16,
      padding: "28px 24px",
      textAlign: "center",
      transition: "all 0.3s ease",
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: "rgba(16,185,129,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 18px",
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text, margin: "0 0 10px" }}>{title}</h3>
      <p style={{ fontSize: 14, color: COLORS.subtext, lineHeight: 1.6, margin: 0 }}>{description}</p>
    </div>
  );
}

// Pricing Tier Component
function PricingTier({ 
  name, 
  price, 
  period, 
  features, 
  highlighted = false,
  buttonText,
}: { 
  name: string; 
  price: string; 
  period: string; 
  features: { text: string; included: boolean }[];
  highlighted?: boolean;
  buttonText: string;
}) {
  return (
    <div style={{
      background: highlighted 
        ? "linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)"
        : COLORS.cardBg,
      border: `1px solid ${highlighted ? "rgba(16,185,129,0.3)" : COLORS.cardBorder}`,
      borderRadius: 20,
      padding: "32px 28px",
      position: "relative",
      overflow: "hidden",
    }}>
      {highlighted && (
        <div style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: COLORS.accent,
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          padding: "4px 10px",
          borderRadius: 99,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          Popular
        </div>
      )}
      <div style={{ fontSize: 14, color: COLORS.subtext, marginBottom: 8, fontWeight: 600 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: COLORS.text, letterSpacing: "-1px" }}>{price}</span>
        {period && <span style={{ fontSize: 14, color: COLORS.subtext }}>/{period}</span>}
      </div>
      <div style={{ height: 1, background: COLORS.cardBorder, margin: "20px 0" }} />
      <div style={{ marginBottom: 24 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            {f.included ? Icons.check : Icons.x}
            <span style={{ fontSize: 14, color: f.included ? COLORS.text : COLORS.subtext }}>{f.text}</span>
          </div>
        ))}
      </div>
      <button style={{
        width: "100%",
        padding: "14px 0",
        border: highlighted ? "none" : `1px solid ${COLORS.cardBorder}`,
        borderRadius: 12,
        background: highlighted ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
        color: highlighted ? "#fff" : COLORS.text,
        fontSize: 14,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "'Sora', sans-serif",
        transition: "all 0.2s ease",
      }}>
        {buttonText}
      </button>
    </div>
  );
}

// Trust Item Component
function TrustItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        background: "rgba(16,185,129,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: COLORS.text, margin: "0 0 6px" }}>{title}</h4>
        <p style={{ fontSize: 14, color: COLORS.subtext, margin: 0, lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
  );
}

interface LandingPageProps {
  onGetStarted?: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showApp, setShowApp] = useState(false);

  const S: Record<string, CSSProperties> = {
    root: {
      minHeight: "100vh",
      background: COLORS.bg,
      color: COLORS.text,
      fontFamily: "'Sora', sans-serif",
      overflowX: "hidden",
    },
    container: {
      maxWidth: 1100,
      margin: "0 auto",
      padding: "0 24px",
    },
    nav: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "20px 0",
      borderBottom: `1px solid ${COLORS.cardBorder}`,
    },
    section: {
      padding: "80px 0",
    },
    sectionTitle: {
      fontSize: 32,
      fontWeight: 800,
      color: COLORS.text,
      textAlign: "center" as const,
      marginBottom: 16,
      letterSpacing: "-0.5px",
    },
    sectionSubtitle: {
      fontSize: 16,
      color: COLORS.subtext,
      textAlign: "center" as const,
      maxWidth: 500,
      margin: "0 auto 48px",
      lineHeight: 1.6,
    },
  };

  if (showApp) {
    return null; // App component will handle this
  }

  return (
    <div style={S.root}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet" />
      
      {/* Ambient glow effects */}
      <div style={{
        position: "fixed",
        top: -150,
        right: -150,
        width: 500,
        height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed",
        bottom: -100,
        left: -100,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Navigation */}
      <div style={{ ...S.container, position: "relative", zIndex: 1 }}>
        <nav style={S.nav}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}>
              &#128176;
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>MyOwnFinTrack</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#features" style={{ color: COLORS.subtext, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Funcionalidades</a>
            <a href="#security" style={{ color: COLORS.subtext, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Seguranca</a>
            <a href="#pricing" style={{ color: COLORS.subtext, textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Precos</a>
            <button 
              onClick={onGetStarted}
              style={{
                padding: "10px 20px",
                border: "none",
                borderRadius: 10,
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Sora', sans-serif",
              }}
            >
              Entrar
            </button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section style={{ ...S.section, paddingTop: 60, paddingBottom: 40, position: "relative", zIndex: 1 }}>
        <div style={S.container}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 99,
                padding: "6px 14px",
                marginBottom: 24,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent }} />
                <span style={{ fontSize: 12, color: COLORS.accent, fontWeight: 600 }}>100% Gratuito para comecar</span>
              </div>
              <h1 style={{
                fontSize: 48,
                fontWeight: 800,
                color: COLORS.text,
                lineHeight: 1.1,
                letterSpacing: "-1.5px",
                margin: "0 0 20px",
              }}>
                Toma o controlo total das tuas{" "}
                <span style={{ color: COLORS.accent }}>financas</span>
              </h1>
              <p style={{
                fontSize: 18,
                color: COLORS.subtext,
                lineHeight: 1.6,
                marginBottom: 32,
                maxWidth: 460,
              }}>
                Acompanhamento inteligente de despesas, alertas de orcamento e metas de investimento. 
                Tudo o que precisas para gerir o teu dinheiro de forma eficiente.
              </p>
              <div style={{ display: "flex", gap: 14 }}>
                <button 
                  onClick={onGetStarted}
                  style={{
                    padding: "16px 32px",
                    border: "none",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "'Sora', sans-serif",
                    boxShadow: "0 8px 30px rgba(16,185,129,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Comecar Agora
                  <span style={{ fontSize: 18 }}>&#8594;</span>
                </button>
                <button style={{
                  padding: "16px 28px",
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 14,
                  background: "transparent",
                  color: COLORS.text,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Sora', sans-serif",
                }}>
                  Saber Mais
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 40 }}>
                <div style={{ display: "flex" }}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg, hsl(${160 + i * 20}, 70%, ${40 + i * 5}%), hsl(${160 + i * 20}, 70%, ${30 + i * 5}%))`,
                      border: "2px solid #0a0f14",
                      marginLeft: i > 1 ? -10 : 0,
                    }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.text }}>+2.500 utilizadores</div>
                  <div style={{ fontSize: 12, color: COLORS.subtext }}>ja gerem as suas financas connosco</div>
                </div>
              </div>
            </div>
            <div>
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ ...S.section, background: "rgba(255,255,255,0.01)", position: "relative", zIndex: 1 }}>
        <div style={S.container}>
          <h2 style={S.sectionTitle}>Funcionalidades Poderosas</h2>
          <p style={S.sectionSubtitle}>
            Ferramentas inteligentes para te ajudar a poupar mais e gastar melhor.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <FeatureCard
              icon={Icons.tracking}
              title="Registo Automatico"
              description="Regista despesas rapidamente com categorias inteligentes e subcategorias personalizaveis."
            />
            <FeatureCard
              icon={Icons.alerts}
              title="Alertas de Orcamento"
              description="Recebe notificacoes quando estiveres perto de exceder os limites definidos para cada categoria."
            />
            <FeatureCard
              icon={Icons.goals}
              title="Metas de Investimento"
              description="Define objetivos de poupanca e acompanha o teu progresso com visualizacoes claras."
            />
          </div>
        </div>
      </section>

      {/* Security/Trust Section */}
      <section id="security" style={{ ...S.section, position: "relative", zIndex: 1 }}>
        <div style={S.container}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <div>
              <h2 style={{ ...S.sectionTitle, textAlign: "left" as const, marginBottom: 20 }}>
                Os teus dados estao{" "}
                <span style={{ color: COLORS.accent }}>seguros</span>
              </h2>
              <p style={{ fontSize: 16, color: COLORS.subtext, lineHeight: 1.7, marginBottom: 40 }}>
                Utilizamos as melhores praticas de seguranca e infraestrutura de nivel empresarial 
                para garantir que as tuas informacoes financeiras estao sempre protegidas.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                <TrustItem
                  icon={Icons.shield}
                  title="Encriptacao de Ponta a Ponta"
                  description="Todos os dados sao encriptados em transito e em repouso com AES-256."
                />
                <TrustItem
                  icon={Icons.database}
                  title="Supabase Database"
                  description="Infraestrutura PostgreSQL de nivel empresarial com backups automaticos."
                />
                <TrustItem
                  icon={Icons.lock}
                  title="Autenticacao Segura"
                  description="Login seguro com autenticacao de dois fatores opcional."
                />
              </div>
            </div>
            <div style={{
              background: COLORS.cardBg,
              border: `1px solid ${COLORS.cardBorder}`,
              borderRadius: 24,
              padding: "48px 40px",
              textAlign: "center" as const,
            }}>
              <div style={{
                width: 100,
                height: 100,
                borderRadius: 24,
                background: "linear-gradient(145deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: COLORS.text, margin: "0 0 12px" }}>
                Privacidade em Primeiro
              </h3>
              <p style={{ fontSize: 15, color: COLORS.subtext, lineHeight: 1.6, margin: 0 }}>
                Nunca vendemos os teus dados. Tu es o unico dono das tuas informacoes financeiras.
              </p>
              <div style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                marginTop: 32,
                paddingTop: 24,
                borderTop: `1px solid ${COLORS.cardBorder}`,
              }}>
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.accent }}>99.9%</div>
                  <div style={{ fontSize: 12, color: COLORS.subtext }}>Uptime</div>
                </div>
                <div style={{ width: 1, background: COLORS.cardBorder }} />
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.accent }}>SOC 2</div>
                  <div style={{ fontSize: 12, color: COLORS.subtext }}>Compliance</div>
                </div>
                <div style={{ width: 1, background: COLORS.cardBorder }} />
                <div style={{ textAlign: "center" as const }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.accent }}>RGPD</div>
                  <div style={{ fontSize: 12, color: COLORS.subtext }}>Conforme</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ ...S.section, background: "rgba(255,255,255,0.01)", position: "relative", zIndex: 1 }}>
        <div style={S.container}>
          <h2 style={S.sectionTitle}>Planos Simples e Transparentes</h2>
          <p style={S.sectionSubtitle}>
            Comeca gratis e faz upgrade quando precisares de mais funcionalidades.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 700, margin: "0 auto" }}>
            <PricingTier
              name="Gratuito"
              price="0"
              period="sempre"
              buttonText="Comecar Gratis"
              features={[
                { text: "Despesas ilimitadas", included: true },
                { text: "Categorias personalizadas", included: true },
                { text: "Metas de poupanca", included: true },
                { text: "Alertas basicos", included: true },
                { text: "Relatorios avancados", included: false },
                { text: "Exportar dados", included: false },
              ]}
            />
            <PricingTier
              name="Pro"
              price="4.99"
              period="mes"
              highlighted
              buttonText="Experimentar Pro"
              features={[
                { text: "Tudo do plano Gratuito", included: true },
                { text: "Relatorios avancados", included: true },
                { text: "Exportar CSV/PDF", included: true },
                { text: "Modo Casal", included: true },
                { text: "Multi-contas bancarias", included: true },
                { text: "Suporte prioritario", included: true },
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ ...S.section, paddingBottom: 100, position: "relative", zIndex: 1 }}>
        <div style={S.container}>
          <div style={{
            background: "linear-gradient(145deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 24,
            padding: "60px 40px",
            textAlign: "center" as const,
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
            }} />
            <h2 style={{ fontSize: 36, fontWeight: 800, color: COLORS.text, margin: "0 0 16px", letterSpacing: "-0.5px" }}>
              Pronto para comecar?
            </h2>
            <p style={{ fontSize: 18, color: COLORS.subtext, marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
              Junta-te a milhares de utilizadores que ja controlam as suas financas de forma inteligente.
            </p>
            <button 
              onClick={onGetStarted}
              style={{
                padding: "18px 40px",
                border: "none",
                borderRadius: 14,
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'Sora', sans-serif",
                boxShadow: "0 8px 30px rgba(16,185,129,0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Comecar Agora - e Gratis
              <span style={{ fontSize: 20 }}>&#8594;</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid ${COLORS.cardBorder}`,
        padding: "40px 0",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{ ...S.container, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}>
              &#128176;
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>MyOwnFinTrack</span>
          </div>
          <div style={{ fontSize: 13, color: COLORS.subtext }}>
            &copy; 2026 MyOwnFinTrack. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
