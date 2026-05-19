# MyOwnFintrack — Context
## Stack
- React/TSX, single-file components
- Supabase (auth + DB)
- Vercel (deploy automático via GitHub push)
- Sora font, dark theme

## URLs
- Site: myownfintrack.app / www.myownfintrack.app
- GitHub: github.com/Tagarrinha/finan-as
- Supabase: aiifzqmwnnfnrwmacyxq.supabase.co

## Credenciais
- SUPA_KEY: sb_publishable_GaZqBKcZGXJagV9mLnM1Zw_3Dq3wm6g
- Resend: re_CDJr9QBs_CMnD4n7aNtXJLVdyypxKJSSD
- Stripe Publishable: pk_live_51TYUtgDTJaEAWlCFSRws6jEHtv810WTmKe80ndHcHsz7GXHG1mYWkV6NhbjPMZSYkoE8Cc42e7047vEehwrH2vNw00DkHQNYJo
- Stripe Price Individual: price_1TYVKGDTJaEAWlCFCVPIU7a0
- Stripe Price Premium: price_1TYVLwDTJaEAWlCFMU8ZNasn
- Stripe Payment Link Individual: https://buy.stripe.com/bJe14nbSabh0cCW2vd2cg00
- Stripe Payment Link Premium: https://buy.stripe.com/3cI7sL9K2acW6eyc5N2cg01

## Ficheiros src/
- App.tsx (principal) — app principal
- CoupleMode.tsx — modo casal
- CoupleRecurring.tsx — recorrentes casal
- RecurringExpenses.tsx — recorrentes pessoal
- SavingsGoals.tsx — objetivos poupança
- MonthComparison.tsx — comparação mensal
- WorldEditor.tsx — editor mundos
- ExportData.tsx — export PDF/Excel
- SubscriptionModal.tsx — modal de planos/pagamento
- usePlan.ts — hook de gestão de planos

## Ficheiros public/
- landing.html — landing page premium (tema azul/roxo)
- favicon.svg — ícone gráfico ascendente azul/roxo
- icon-192.png — ícone PWA 192px
- icon-512.png — ícone PWA 512px
- manifest.json — PWA manifest
- sw.js — service worker

## Edge Functions (Supabase)
- couple-expense-sync — sync despesa casal → pessoal
- welcome-email — email boas-vindas
- stripe-webhook — webhook automático Stripe → atualiza plano

## Tabelas Supabase
expenses, incomes, accounts, transfers, recurring_expenses,
savings_goals, monthly_revenue, user_settings, profiles,
couples, couple_expenses, couple_account, couple_settlements,
couple_recurring_expenses, subscriptions, net_worth_snapshots

## Design
- Background: #0A0D14
- Accent: #5DA9FF (azul) + #8B6DFF (roxo)
- Positive: #57E3A0
- Negative: #FF7D7D
- Temas: Original/Aurora/Ocean/Nebula/Verde/Premium (default)
- Limite por ficheiro: ~2200 linhas

## Stripe / Planos
- Planos: free / individual (4,99€/mês) / premium (7,99€/mês)
- Webhook automático via Supabase Edge Function stripe-webhook
- Payment Links com prefilled_email + client_reference_id
- is_beta = true em profiles → acesso Premium gratuito
- Modo casal bloqueado para plano free
- Parceiro convidado por Premium herda acesso completo (hasFullAccess)

## Features implementadas
- Landing page premium (public/landing.html, iframe no WelcomeScreen)
- Domínio próprio: myownfintrack.app (Porkbun + Vercel DNS)
- Ícone gráfico ascendente (favicon.svg, icon-192/512.png)
- 2 mundos (Pessoal + Clínica)
- Despesas/rendimentos + edição ✏️
- Recorrentes pessoais + edição
- Objetivos poupança + edição
- Contas bancárias + transferências
- Net Worth + snapshots mensais
- Comparação mensal
- Modo casal (convite, liquidado/por liquidar, sync pessoal)
- Recorrentes casal
- Export PDF + Excel
- PWA
- Tour onboarding
- 6 temas (Premium default)
- Bottom nav + left nav drawer
- Hide values toggle
- Filtro mês/ano
- Stripe integrado (modal + webhook automático)
- Lógica de planos (free/individual/premium + is_beta)

## Roadmap pendente
- [ ] Edição rendimentos (✏️ no tab Rendimentos)
- [ ] PT/EN toggle (i18n.ts já criado)
- [ ] Email relatório mensal
- [ ] Dar acesso beta a 2 amigos (UPDATE profiles SET is_beta=true WHERE id IN (SELECT id FROM auth.users WHERE email IN ('email1','email2')))

## Deploy
cd ~/Desktop/finan-as
git add . && git commit -m "msg" && git push

## Supabase Edge Function deploy
supabase functions deploy stripe-webhook --project-ref aiifzqmwnnfnrwmacyxq

## Workflow preferido
Nova conversa → colar CONTEXT.md → snippet relevante → uma tarefa de cada vez → deploy