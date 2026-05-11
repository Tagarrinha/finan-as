import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { couple_expense_id, force_resync, delete_only } = await req.json();

    if (!couple_expense_id) {
      return new Response(JSON.stringify({ error: "Missing couple_expense_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (delete_only) {
      await supabase.from("expenses").delete().eq("couple_expense_id", couple_expense_id);
      return new Response(JSON.stringify({ success: true, deleted: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (force_resync) {
      await supabase.from("expenses").delete().eq("couple_expense_id", couple_expense_id);
    }

    const { data: expense, error: expError } = await supabase
      .from("couple_expenses")
      .select("*")
      .eq("id", couple_expense_id)
      .single();

    if (expError || !expense) {
      return new Response(JSON.stringify({ error: "Expense not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: couple, error: coupleError } = await supabase
      .from("couples")
      .select("*")
      .eq("id", expense.couple_id)
      .single();

    if (coupleError || !couple) {
      return new Response(JSON.stringify({ error: "Couple not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!force_resync) {
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("couple_expense_id", couple_expense_id);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const rows = [
      {
        user_id: couple.user1_id,
        descricao: expense.descricao,
        valor: expense.split_user1,
        cat: expense.cat,
        subcat: "👫 Casal",
        data: expense.data,
        tipo: expense.tipo || "necessidade",
        world: "pessoal",
        from_couple: true,
        couple_expense_id: expense.id,
      },
      ...(couple.user2_id ? [{
        user_id: couple.user2_id,
        descricao: expense.descricao,
        valor: expense.split_user2,
        cat: expense.cat,
        subcat: "👫 Casal",
        data: expense.data,
        tipo: expense.tipo || "necessidade",
        world: "pessoal",
        from_couple: true,
        couple_expense_id: expense.id,
      }] : []),
    ];

    const { error: insertError } = await supabase.from("expenses").insert(rows);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});