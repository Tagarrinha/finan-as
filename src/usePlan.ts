import { useState, useEffect } from "react";
import { supabase } from "./supabase";
export type PlanType = "free" | "individual" | "premium";
export interface PlanState {
  plan: PlanType;
  isBeta: boolean;
  isPremium: boolean;
  isIndividual: boolean;
  hasFullAccess: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  loading: boolean;
}
export function usePlan(userId: string): PlanState & { setPlan: (p: PlanType) => void } {
  const [plan, setPlanState] = useState<PlanType>("free");
  const [isBeta, setIsBeta] = useState(false);
  const [partnerHasPremium, setPartnerHasPremium] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    loadPlan();
  }, [userId]);

  async function loadPlan() {
    setLoading(true);
    const [profileRes, subRes] = await Promise.all([
      supabase.from("profiles").select("is_beta").eq("id", userId).single(),
      supabase.from("subscriptions").select("plan,status,trial_ends_at").eq("user_id", userId).single(),
    ]);
    const beta = profileRes.data?.is_beta || false;
    setIsBeta(beta);

    let myPlan: PlanType = "free";
    let trial = false;
    let daysLeft = 0;

    if (beta) {
      myPlan = "premium";
    } else if (subRes.data?.status === "active") {
      myPlan = subRes.data.plan as PlanType;
    } else if (subRes.data?.status === "trial" && subRes.data?.trial_ends_at) {
      const trialEnd = new Date(subRes.data.trial_ends_at);
      const now = new Date();
      if (trialEnd > now) {
        myPlan = "premium";
        trial = true;
        daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    setIsTrial(trial);
    setTrialDaysLeft(daysLeft);
    setPlanState(myPlan);

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
        const [partnerSubRes, partnerProfileRes] = await Promise.all([
          supabase.from("subscriptions").select("plan,status,trial_ends_at").eq("user_id", partnerId).single(),
          supabase.from("profiles").select("is_beta").eq("id", partnerId).single(),
        ]);
        const partnerBeta = partnerProfileRes.data?.is_beta || false;
        let partnerPlan = "free";
        if (partnerBeta) {
          partnerPlan = "premium";
        } else if (partnerSubRes.data?.status === "active") {
          partnerPlan = partnerSubRes.data.plan;
        } else if (partnerSubRes.data?.status === "trial" && partnerSubRes.data?.trial_ends_at) {
          const trialEnd = new Date(partnerSubRes.data.trial_ends_at);
          if (trialEnd > new Date()) partnerPlan = "premium";
        }
        setPartnerHasPremium(partnerPlan === "premium");
      }
    }
    setLoading(false);
  }

  function setPlan(p: PlanType) { setPlanState(p); }

  const effectivePlan = isBeta ? "premium" : plan;
  const hasFullAccess = effectivePlan === "premium" || partnerHasPremium;

  return {
    plan: effectivePlan,
    isBeta,
    isPremium: effectivePlan === "premium",
    isIndividual: effectivePlan === "individual" || hasFullAccess,
    hasFullAccess,
    isTrial,
    trialDaysLeft,
    loading,
    setPlan,
  };
}