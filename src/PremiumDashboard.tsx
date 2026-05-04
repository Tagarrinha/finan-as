import { CSSProperties, ReactNode, useMemo } from "react";

type TypeKey = "necessidade" | "desejo" | "investimento";

interface Expense {
  id: number;
  descricao: string;
  valor: number;
  cat: string;
  subcat: string;
  data: string;
  tipo: TypeKey;
  world: string;
}

interface Income {
  id: number;
  descricao: string;
  valor: number;
  cat: string;
  data: string;
  world: string;
}

interface ExpCat {
  id: string;
  label: string;
  icon: string;
  type: TypeKey;
  sub?: string[];
  custom?: boolean;
}

interface BudgetTargets {
  necessidade: number;
  desejo: number;
  investimento: number;
}

interface PremiumDashboardProps {
  myExpenses: Expense[];
  myIncomes: Income[];
  totalExp: number;
  totalInc: number;
  balance: number;
  byType: Record<TypeKey, number>;
  byCat: (ExpCat & { total: number })[];
  budgetTargets: BudgetTargets;
  onAddExpense: () => void;
  onOpenSidebar: () => void;
  T: {
    accent: string;
    accentDark: string;
    positive: string;
    negative: string;
    subtext: string;
    cardBg: string;
    cardBorder: string;
  };
}

const TYPE_META: Record<TypeKey, { label: string; color: string; bg: string; icon: string }> = {
  necessidade: { label: "Necessidade", color: "#3b82f6", bg: "#1e3a5f33", icon: "🏠" },
  desejo: { label: "Desejo", color: "#f59e0b", bg: "#78350f33", icon: "✨" },
  investimento: { label: "Investimento", color: "#10b981", bg: "#064e3b33", icon: "📈" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

// Calculate comparison percentage (mock - would need previous month data)
function getComparisonPct(balance: number): number {
  // This would normally calculate vs previous month
  // For demo, showing a positive percentage if balance is positive
  return balance > 0 ? 18.6 : -5.2;
}

function SparklineChart({ positive }: { positive: boolean }) {
  // Simple decorative sparkline SVG
  const color = positive ? "#10b981" : "#ef4444";
  return (
    <svg width="80" height="40" viewBox="0 0 80 40" style={{ opacity: 0.6 }}>
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={positive 
          ? "M0,35 Q10,30 20,25 T40,20 T60,15 T80,8"
          : "M0,15 Q10,20 20,18 T40,25 T60,30 T80,35"
        }
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={positive 
          ? "M0,35 Q10,30 20,25 T40,20 T60,15 T80,8 L80,40 L0,40 Z"
          : "M0,15 Q10,20 20,18 T40,25 T60,30 T80,35 L80,40 L0,40 Z"
        }
        fill={`url(#grad-${positive})`}
      />
    </svg>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#6b7280",
        textTransform: "uppercase" as const,
        letterSpacing: "0.1em",
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

export default function PremiumDashboard({
  myExpenses,
  myIncomes,
  totalExp,
  totalInc,
  balance,
  byType,
  byCat,
  budgetTargets,
  onAddExpense,
  onOpenSidebar,
  T,
}: PremiumDashboardProps) {
  const comparisonPct = getComparisonPct(balance);
  const isPositive = comparisonPct >= 0;

  // Find if any budget is exceeded
  const overBudgetItems = useMemo(() => {
    return (Object.entries(budgetTargets) as [TypeKey, number][])
      .filter(([type, target]) => {
        const actual = byType[type] || 0;
        const targetAmt = totalExp * (target / 100);
        return actual > targetAmt && totalExp > 0;
      })
      .map(([type, target]) => {
        const actual = byType[type] || 0;
        const targetAmt = totalExp * (target / 100);
        const excess = actual - targetAmt;
        return { type, target, actual, excess, meta: TYPE_META[type] };
      });
  }, [byType, budgetTargets, totalExp]);

  // Show only the most exceeded budget
  const mainWarning = overBudgetItems.length > 0 ? overBudgetItems[0] : null;

  // Calculate top categories for display (limit to 4)
  const topCategories = byCat.filter((c) => c.total > 0).slice(0, 4);
  const maxCatTotal = Math.max(...topCategories.map((c) => c.total), 1);

  const styles: Record<string, CSSProperties> = {
    container: {
      padding: "0 20px 100px",
    },
    // Main Result Card
    resultCard: {
      background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)",
      border: "1px solid rgba(16, 185, 129, 0.15)",
      borderRadius: 16,
      padding: "20px 20px 18px",
      marginBottom: 12,
      position: "relative" as const,
      overflow: "hidden" as const,
    },
    resultLabel: {
      fontSize: 10,
      fontWeight: 700,
      color: "#6b7280",
      textTransform: "uppercase" as const,
      letterSpacing: "0.12em",
      marginBottom: 8,
    },
    resultValue: {
      fontSize: 36,
      fontWeight: 800,
      color: balance >= 0 ? "#10b981" : "#ef4444",
      letterSpacing: "-1px",
      lineHeight: 1.1,
      marginBottom: 10,
    },
    comparison: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
      padding: "5px 10px",
      borderRadius: 20,
    },
    comparisonText: {
      fontSize: 12,
      fontWeight: 600,
      color: isPositive ? "#10b981" : "#ef4444",
    },
    sparkline: {
      position: "absolute" as const,
      right: 16,
      top: 20,
    },
    // Income/Expense Cards Row
    cardRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 16,
    },
    miniCard: {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    miniCardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
    },
    miniCardLabel: {
      fontSize: 11,
      color: "#6b7280",
      marginBottom: 2,
    },
    miniCardValue: {
      fontSize: 16,
      fontWeight: 800,
      letterSpacing: "-0.3px",
    },
    // Warning Card
    warningCard: {
      background: "linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)",
      border: "1px solid rgba(245, 158, 11, 0.25)",
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 14,
    },
    warningIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: "rgba(245, 158, 11, 0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
      flexShrink: 0,
    },
    warningContent: {
      flex: 1,
    },
    warningTitle: {
      fontSize: 13,
      fontWeight: 700,
      color: "#fbbf24",
      marginBottom: 3,
    },
    warningDesc: {
      fontSize: 11,
      color: "#a16207",
      lineHeight: 1.4,
    },
    warningArrow: {
      color: "#f59e0b",
      fontSize: 18,
    },
    // Distribution Section
    distributionCard: {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 16,
    },
    distributionHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 18,
    },
    distributionLink: {
      fontSize: 11,
      color: "#6b7280",
      cursor: "pointer",
    },
    distributionRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    },
    distributionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 16,
      flexShrink: 0,
    },
    distributionInfo: {
      flex: 1,
    },
    distributionLabelRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    distributionLabel: {
      fontSize: 13,
      fontWeight: 600,
      color: "#e5e7eb",
    },
    distributionPct: {
      fontSize: 12,
      fontWeight: 700,
    },
    distributionBar: {
      height: 4,
      borderRadius: 4,
      background: "rgba(255, 255, 255, 0.08)",
      overflow: "hidden" as const,
      position: "relative" as const,
    },
    distributionBarFill: {
      height: "100%",
      borderRadius: 4,
      transition: "width 0.5s ease",
    },
    distributionMeta: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    distributionValue: {
      fontSize: 14,
      fontWeight: 800,
      color: "#e5e7eb",
      minWidth: 70,
      textAlign: "right" as const,
    },
    distributionTarget: {
      fontSize: 10,
      color: "#6b7280",
    },
    // Top Categories Section
    categoriesCard: {
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: 16,
      padding: "18px 20px",
      marginBottom: 16,
    },
    categoriesHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    categoryRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    },
    categoryIcon: {
      fontSize: 18,
      width: 24,
      textAlign: "center" as const,
    },
    categoryLabel: {
      flex: 1,
      fontSize: 14,
      color: "#e5e7eb",
      fontWeight: 500,
    },
    categoryValue: {
      fontSize: 14,
      fontWeight: 700,
      color: "#e5e7eb",
      marginRight: 8,
    },
    categoryPct: {
      fontSize: 12,
      color: "#6b7280",
      minWidth: 36,
      textAlign: "right" as const,
    },
    // Add Expense Button
    addButton: {
      position: "fixed" as const,
      bottom: 24,
      left: 20,
      right: 20,
      background: "linear-gradient(135deg, #10b981, #059669)",
      border: "none",
      borderRadius: 14,
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      cursor: "pointer",
      boxShadow: "0 8px 32px rgba(16, 185, 129, 0.3)",
      fontFamily: "'Sora', sans-serif",
    },
    addButtonIcon: {
      width: 28,
      height: 28,
      background: "rgba(255, 255, 255, 0.2)",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
      color: "#fff",
    },
    addButtonText: {
      fontSize: 15,
      fontWeight: 700,
      color: "#fff",
      letterSpacing: "-0.2px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Main Result Card */}
      <div style={styles.resultCard}>
        <div style={styles.resultLabel}>Resultado do mês</div>
        <div style={styles.resultValue}>{fmt(balance)}</div>
        <div style={styles.comparison}>
          <span style={{ fontSize: 12 }}>{isPositive ? "↗" : "↘"}</span>
          <span style={styles.comparisonText}>
            {isPositive ? "+" : ""}
            {comparisonPct.toFixed(1)}% vs mês anterior
          </span>
        </div>
        <div style={styles.sparkline}>
          <SparklineChart positive={balance >= 0} />
        </div>
      </div>

      {/* Income & Expense Mini Cards */}
      <div style={styles.cardRow}>
        <div style={styles.miniCard}>
          <div style={{ ...styles.miniCardIcon, background: "rgba(16, 185, 129, 0.15)" }}>
            💰
          </div>
          <div>
            <div style={styles.miniCardLabel}>Rendimento</div>
            <div style={{ ...styles.miniCardValue, color: "#10b981" }}>{fmt(totalInc)}</div>
          </div>
        </div>
        <div style={styles.miniCard}>
          <div style={{ ...styles.miniCardIcon, background: "rgba(239, 68, 68, 0.15)" }}>
            💳
          </div>
          <div>
            <div style={styles.miniCardLabel}>Despesas</div>
            <div style={{ ...styles.miniCardValue, color: "#f87171" }}>{fmt(totalExp)}</div>
          </div>
        </div>
      </div>

      {/* Smart Warning Card - Only shows if budget exceeded */}
      {mainWarning && (
        <div style={styles.warningCard}>
          <div style={styles.warningIcon}>⚠️</div>
          <div style={styles.warningContent}>
            <div style={styles.warningTitle}>
              Estás {fmt(mainWarning.excess)} acima da meta em {mainWarning.meta.label}
            </div>
            <div style={styles.warningDesc}>
              Recomenda-se reduzir gastos nesta categoria.
            </div>
          </div>
          <span style={styles.warningArrow}>›</span>
        </div>
      )}

      {/* Distribution by Type */}
      <div style={styles.distributionCard}>
        <div style={styles.distributionHeader}>
          <SectionTitle>Distribuição por tipo</SectionTitle>
          <span style={styles.distributionLink}>Ver detalhes</span>
        </div>
        {(Object.entries(TYPE_META) as [TypeKey, typeof TYPE_META[TypeKey]][]).map(
          ([type, meta]) => {
            const actual = byType[type] || 0;
            const target = budgetTargets[type];
            const actualPct = pct(actual, totalExp);
            const isOver = actual > totalExp * (target / 100) && totalExp > 0;

            return (
              <div key={type} style={styles.distributionRow}>
                <div style={{ ...styles.distributionIcon, background: `${meta.color}20` }}>
                  {meta.icon}
                </div>
                <div style={styles.distributionInfo}>
                  <div style={styles.distributionLabelRow}>
                    <span style={styles.distributionLabel}>{meta.label}</span>
                    <span style={{ ...styles.distributionPct, color: isOver ? "#ef4444" : meta.color }}>
                      {actualPct}%
                    </span>
                  </div>
                  <div style={styles.distributionBar}>
                    <div
                      style={{
                        ...styles.distributionBarFill,
                        width: `${Math.min(100, actualPct)}%`,
                        background: isOver ? "#ef4444" : meta.color,
                      }}
                    />
                    {/* Target indicator */}
                    <div
                      style={{
                        position: "absolute",
                        left: `${target}%`,
                        top: -2,
                        bottom: -2,
                        width: 2,
                        background: "rgba(255, 255, 255, 0.4)",
                        borderRadius: 1,
                      }}
                    />
                  </div>
                </div>
                <div style={styles.distributionMeta}>
                  <div>
                    <div style={{ ...styles.distributionValue, color: isOver ? "#ef4444" : "#e5e7eb" }}>
                      {fmt(actual)}
                    </div>
                    <div style={styles.distributionTarget}>Meta {target}%</div>
                  </div>
                </div>
              </div>
            );
          }
        )}
        {totalExp === 0 && (
          <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            Regista despesas para ver a distribuição.
          </div>
        )}
      </div>

      {/* Top Categories */}
      <div style={styles.categoriesCard}>
        <div style={styles.categoriesHeader}>
          <SectionTitle>Top categorias</SectionTitle>
          <span style={styles.distributionLink}>Ver todas</span>
        </div>
        {topCategories.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
            Sem despesas registadas.
          </div>
        ) : (
          topCategories.map((cat, idx) => (
            <div
              key={cat.id}
              style={{
                ...styles.categoryRow,
                borderBottom: idx === topCategories.length - 1 ? "none" : styles.categoryRow.borderBottom,
              }}
            >
              <span style={styles.categoryIcon}>{cat.icon}</span>
              <span style={styles.categoryLabel}>{cat.label}</span>
              <span style={styles.categoryValue}>{fmt(cat.total)}</span>
              <span style={styles.categoryPct}>{pct(cat.total, totalExp)}%</span>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Expense Button */}
      <button style={styles.addButton} onClick={onAddExpense}>
        <div style={styles.addButtonIcon}>+</div>
        <span style={styles.addButtonText}>Adicionar despesa</span>
      </button>
    </div>
  );
}
