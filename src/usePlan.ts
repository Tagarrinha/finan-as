import { useState, useEffect } from "react";
import { supabase } from "./supabase";
export type PlanType = "free" | "premium";
export interface PlanState {
  plan: PlanType;
  isBeta: boolean;
  isPremium: boolean;
  hasFullAccess: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  loading: boolean;
}
export function usePlan(userId: string): PlanState & { setPlan: (p: PlanType) => void } {
  const [plan, setPlanState] = useState<PlanType>("free");
  const [isBeta, setIsBeta] = useState(false);
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
      supabase.from("profiles").select("is_beta,created_at").eq("id", userId).single(),
      supabase.from("subscriptions").select("plan,status,trial_ends_at").eq("user_id", userId).single(),
    ]);
    const beta = profileRes.data?.is_beta || false;
    setIsBeta(beta);
    let myPlan: PlanType = "free";
    let trial = false;
    let daysLeft = 0;
    if (beta) {
      myPlan = "premium";
    } else if (subRes.data?.status === "active" && subRes.data?.plan === "premium") {
      myPlan = "premium";
    } else if (subRes.data?.status === "trial" && subRes.data?.trial_ends_at) {
      // Trial de 60 dias
      const trialEnd = new Date(subRes.data.trial_ends_at);
      const now = new Date();
      if (trialEnd > now) {
        myPlan = "premium";
        trial = true;
        daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }
    } else if (profileRes.data?.created_at) {
      // Fallback: se não há subscrição, verifica se conta tem menos de 60 dias
      const createdAt = new Date(profileRes.data.created_at);
      const trialEnd = new Date(createdAt.getTime() + 60 * 24 * 60 * 60 * 1000);
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
    setLoading(false);
  }
  function setPlan(p: PlanType) { setPlanState(p); }
  const effectivePlan = isBeta ? "premium" : plan;
  return {
    plan: effectivePlan,
    isBeta,
    isPremium: effectivePlan === "premium",
    hasFullAccess: effectivePlan === "premium",
    isTrial,
    trialDaysLeft,
    loading,
    setPlan,
  };
}