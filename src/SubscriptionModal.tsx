// ============================================================
// SubscriptionModal.tsx
// Coloca em src/SubscriptionModal.tsx
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

interface Plan {
  id: "free" | "individual" | "premium";
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  link?: string;
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Grátis",
    price: "0€",
    period: "para sempre",
    cta: "Plano atual",
    features: [
      "Registo manual de despesas",
      "Dashboard básico",
      "1 meta financeira",
    ],
  },
  {
    id: "individual",
    name: "Individual",
    price: "4,99€",
    period: "por mês",
    cta: "Subscrever Individual",
    link: "https://buy.stripe.com/bJe14nbSabh0cCW2vd2cg00",
    features: [
      "Tudo do plano Grátis",
      "Metas ilimitadas",
      "Insights inteligentes",
      "Despesas recorrentes",
      "Histórico completo",
      "Estatísticas avançadas",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "7,99€",
    period: "por mês",
    cta: "Subscrever Premium",
    link: "https://buy.stripe.com/3cI7sL9K2acW6eyc5N2cg01",
    featured: true,
    features: [
      "Tudo do Individual",
      "Modo casal completo",
      "Acertos automáticos",
      "Conta conjunta",
      "Sincronização a dois",
      "Export PDF + Excel",
      "Suporte prioritário",
    ],
  },
];

interface SubscriptionModalProps {
  userId: string;
  userEmail: string;
  currentPlan: string;
  isBeta: boolean;
  accent: string;
  accent2: string;
  cardBg: string;
  cardBorder: string;
  subtext: string;
  onClose: () => void;
  onPlanUpdate: (plan: string) => void;
}

export default function SubscriptionModal({
  userId,
  userEmail,
  currentPlan,
  isBeta,
  accent,
  accent2,
  cardBg,
  cardBorder,
  subtext,
  onClose,
  onPlanUpdate,
}: SubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Detecta retorno do Stripe via URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setSuccess(true);
      // Limpa o URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleManualUpgrade(plan: "individual" | "premium") {
    setLoading(true);
    await supabase.from("subscriptions").upsert(
      { user_id: userId, plan, status: "active", updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    onPlanUpdate(plan);
    setLoading(false);
    onClose();
  }

  function openStripe(link: string, plan: "individual" | "premium") {
    // Adiciona email e client_reference_id ao link para identificar o utilizador
    const url = `${link}?prefilled_email=${encodeURIComponent(userEmail)}&client_reference_id=${userId}`;
    window.open(url, "_blank");
  }

  const worldBtn = `linear-gradient(135deg,${accent},${accent2})`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          zIndex: 200, backdropFilter: "blur(6px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 201,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }}>
        <div style={{
          background: "#0A0D14", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24, padding: "32px 24px", width: "100%", maxWidth: 480,
          fontFamily: "'Sora',sans-serif", position: "relative",
        }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, width: 32, height: 32, color: "#64748b",
              cursor: "pointer", fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >✕</button>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            {isBeta && (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(87,227,160,0.12)", border: "1px solid rgba(87,227,160,0.3)",
                borderRadius: 99, padding: "4px 14px", marginBottom: 14,
                fontSize: 12, fontWeight: 700, color: "#57E3A0",
              }}>
                ⭐ Conta Beta — Acesso Premium gratuito
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.5px" }}>
              {isBeta ? "O teu plano especial" : "Escolhe o teu plano"}
            </div>
            <div style={{ fontSize: 13, color: subtext, marginTop: 6 }}>
              {isBeta
                ? "Tens acesso Premium como utilizador beta. Obrigado por testares!"
                : "Cancela quando quiseres. Sem compromissos."}
            </div>
          </div>

          {/* Success message */}
          {success && (
            <div style={{
              background: "rgba(87,227,160,0.1)", border: "1px solid rgba(87,227,160,0.3)",
              borderRadius: 12, padding: "14px 16px", marginBottom: 20,
              fontSize: 13, color: "#57E3A0", fontWeight: 600, textAlign: "center",
            }}>
              ✅ Pagamento confirmado! Clica em "Ativar plano" abaixo para atualizar o teu acesso.
            </div>
          )}

          {/* Plans */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PLANS.map((plan) => {
              const isCurrentPlan = currentPlan === plan.id || (isBeta && plan.id === "premium");
              const isFeatured = plan.featured;

              return (
                <div
                  key={plan.id}
                  style={{
                    background: isFeatured
                      ? "linear-gradient(135deg,rgba(139,109,255,0.1),rgba(93,169,255,0.06))"
                      : cardBg,
                    border: `${isFeatured ? "1.5px" : "1px"} solid ${isFeatured ? accent : cardBorder}`,
                    borderRadius: 16, padding: "18px 20px",
                    position: "relative",
                    boxShadow: isFeatured ? `0 0 40px rgba(93,169,255,0.1)` : "none",
                  }}
                >
                  {isFeatured && (
                    <div style={{
                      position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                      background: worldBtn, color: "white", fontSize: 11, fontWeight: 700,
                      padding: "3px 16px", borderRadius: 99, whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(93,169,255,0.3)",
                    }}>⭐ Mais popular</div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>{plan.name}</div>
                      <div style={{ fontSize: 11, color: subtext, marginTop: 2 }}>{plan.period}</div>
                    </div>
                    <div style={{
                      fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-1px",
                    }}>{plan.price}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8" }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          background: worldBtn, display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 9, color: "white", fontWeight: 700,
                          flexShrink: 0,
                        }}>✓</div>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {isCurrentPlan ? (
                    <div style={{
                      width: "100%", padding: "11px 0", borderRadius: 10,
                      background: "rgba(87,227,160,0.1)", border: "1px solid rgba(87,227,160,0.3)",
                      color: "#57E3A0", fontSize: 13, fontWeight: 700, textAlign: "center",
                    }}>
                      ✓ Plano atual
                    </div>
                  ) : plan.id === "free" ? null : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Botão principal — abre Stripe */}
                      <button
                        onClick={() => openStripe(plan.link!, plan.id as "individual" | "premium")}
                        style={{
                          width: "100%", padding: "12px 0", borderRadius: 10,
                          background: isFeatured ? worldBtn : "rgba(93,169,255,0.15)",
                          border: isFeatured ? "none" : `1px solid ${accent}`,
                          color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'Sora',sans-serif",
                          boxShadow: isFeatured ? "0 4px 16px rgba(93,169,255,0.3)" : "none",
                        }}
                      >
                        {plan.cta} →
                      </button>

                      {/* Botão secundário — após pagar, ativa manualmente */}
                      {success && (
                        <button
                          onClick={() => handleManualUpgrade(plan.id as "individual" | "premium")}
                          disabled={loading}
                          style={{
                            width: "100%", padding: "10px 0", borderRadius: 10,
                            background: "rgba(87,227,160,0.1)", border: "1px solid rgba(87,227,160,0.3)",
                            color: "#57E3A0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                            fontFamily: "'Sora',sans-serif",
                          }}
                        >
                          {loading ? "A ativar..." : "✓ Já paguei — Ativar plano"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#334155" }}>
            🔒 Pagamento seguro via Stripe · Cancela quando quiseres
          </div>
        </div>
      </div>
    </>
  );
}
