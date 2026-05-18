// ============================================================
// usePlan.ts
// Coloca em src/usePlan.ts
// ============================================================

import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export type PlanType = "free" | "individual" | "premium";

export interface PlanState {
  plan: PlanType;
  isBeta: boolean;
  isPremium: boolean;
  isIndividual: boolean;
  hasFullAccess: boolean; // true se tem premium próprio OU parceiro tem premium
  loading: boolean;
}

export function usePlan(userId: string): PlanState & { setPlan: (p: PlanType) => void } {
  const [plan, setPlanState] = useState<PlanType>("free");
  const [isBeta, setIsBeta] = useState(false);
  const [partnerHasPremium, setPartnerHasPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadPlan();
  }, [userId]);

  async function loadPlan() {
    setLoading(true);

    // 1. Carrega perfil (is_beta) e subscrição própria
    const [profileRes, subRes] = await Promise.all([
      supabase.from("profiles").select("is_beta").eq("id", userId).single(),
      supabase.from("subscriptions").select("plan,status").eq("user_id", userId).single(),
    ]);

    const beta = profileRes.data?.is_beta || false;
    setIsBeta(beta);

    let myPlan: PlanType = "free";
    if (beta) {
      myPlan = "premium";
    } else if (subRes.data?.status === "active") {
      myPlan = subRes.data.plan as PlanType;
    }
    setPlanState(myPlan);

    // 2. Verifica se está num casal ativo onde o parceiro tem Premium
    if (myPlan !== "premium") {
      const { data: coupleData } = await supabase
        .from("couples")
        .select("user1_id, user2_id, status")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq("status", "active")
        .single();

      if (coupleData) {
        const partnerId = coupleData.user1_id === userId
          ? coupleData.user2_id
          : coupleData.user1_id;

        // Verifica plano do parceiro
        const [partnerSubRes, partnerProfileRes] = await Promise.all([
          supabase.from("subscriptions").select("plan,status").eq("user_id", partnerId).single(),
          supabase.from("profiles").select("is_beta").eq("id", partnerId).single(),
        ]);

        const partnerBeta = partnerProfileRes.data?.is_beta || false;
        const partnerPlan = partnerBeta ? "premium" : (partnerSubRes.data?.status === "active" ? partnerSubRes.data.plan : "free");

        setPartnerHasPremium(partnerPlan === "premium");
      }
    }

    setLoading(false);
  }

  function setPlan(p: PlanType) {
    setPlanState(p);
  }

  const effectivePlan = isBeta ? "premium" : plan;

  // hasFullAccess = tem premium próprio OU parceiro tem premium
  const hasFullAccess = effectivePlan === "premium" || partnerHasPremium;

  return {
    plan: effectivePlan,
    isBeta,
    isPremium: effectivePlan === "premium",
    isIndividual: effectivePlan === "individual" || hasFullAccess,
    hasFullAccess,
    loading,
    setPlan,
  };
}
