# Nomerys Premium Form

## Installation GitHub Pages

1. Dézippe le dossier.
2. Mets ces fichiers dans ton repo GitHub Pages :
   - `start.html`
   - `start.css`
   - `start.js`
3. Va sur :
   - `https://nomerys.com/start.html`

## Webhook utilisé

Le formulaire envoie vers :

`https://baptistepaixao2.app.n8n.cloud/webhook/voyage-form`

## Réponse attendue côté n8n

Ton workflow n8n doit répondre au navigateur avec :

```json
{
  "checkout_url": "https://checkout.stripe.com/..."
}
```

Le formulaire vérifie que l’URL commence par `https://checkout.stripe.com/` avant de rediriger le client.

## Champs envoyés à n8n

Le formulaire garde les clés compatibles Jotform :

- `q3_nom.first`
- `q3_nom.last`
- `q4_email`
- `q36_avezvousDeja`
- `q54_nombreDe`
- `q65_ageDe`
- `q37_q_arrive_city`
- `q38_q_date_start`
- `q39_q_date_end`
- `q53_lieuPrecis`
- `q41_q_climate`
- `q47_q_regions`
- `q48_q_style`
- `q56_typeDe`
- `q51_activitesA51`
- `q64_already_paid`

## Important

GitHub Pages ne peut pas créer Stripe Checkout directement, car il ne faut jamais mettre la clé secrète Stripe dans du code public.

La bonne logique :

Formulaire GitHub Pages → n8n → Stripe Checkout → paiement → n8n lance le workflow.
