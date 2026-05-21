// ============================================================
// supabase/functions/stripe-webhook/index.ts
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.3.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TYVKGDTJaEAWlCFCVPIU7a0": "individual",
  "price_1TYVLwDTJaEAWlCFMU8ZNasn": "premium",
};

async function sendSubscriptionEmail(userId: string, plan: string) {
  try {
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/subscription-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ user_id: userId, plan }),
    });
    console.log(`Subscription email sent for user ${userId}: ${plan}`);
  } catch (err) {
    console.error("Error sending subscription email:", err);
  }
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  console.log("Stripe event received:", event.type);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price.id;
        const status = subscription.status;

        const plan = PRICE_TO_PLAN[priceId] || "free";
        const isActive = status === "active" || status === "trialing";

        // Encontra o user pelo stripe_customer_id
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (subData?.user_id) {
          await supabase.from("subscriptions").upsert({
            user_id: subData.user_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            plan: isActive ? plan : "free",
            status: isActive ? "active" : "inactive",
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          console.log(`Updated plan for user ${subData.user_id}: ${plan}`);

          // Envia email de confirmação apenas quando subscrição é criada
          if (event.type === "customer.subscription.created" && isActive) {
            await sendSubscriptionEmail(subData.user_id, plan);
          }

        } else {
          // Tenta encontrar pelo client_reference_id
          const sessions = await stripe.checkout.sessions.list({
            customer: customerId,
            limit: 1,
          });

          const userId = sessions.data[0]?.client_reference_id;

          if (userId) {
            await supabase.from("subscriptions").upsert({
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              plan: isActive ? plan : "free",
              status: isActive ? "active" : "inactive",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

            console.log(`Created plan for user ${userId}: ${plan}`);

            // Envia email de confirmação
            if (isActive) {
              await sendSubscriptionEmail(userId, plan);
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase.from("subscriptions")
          .update({
            plan: "free",
            status: "inactive",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        console.log(`Subscription deleted for customer ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
    return new Response(`Processing Error: ${err}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});