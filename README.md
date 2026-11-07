# DRT Creation · Central de clientes

Cadastro das empresas atendidas, carteirinha de cada cliente, mensalidades e o "interruptor" que tira o site do ar quando a mensalidade passa da carência.

- **/admin**: painel (senha `ADMIN_PASSWORD`).
- **/c/&lt;token&gt;**: carteirinha privada do cliente (link enviado por WhatsApp).
- **/api/status/&lt;chave&gt;**: `active` · `warning` (atrasado, ainda no ar) · `suspended`.
- **/api/stripe/webhook**: pagamentos automáticos (`checkout.session.completed`, `invoice.paid`).

Regras: vence no dia escolhido; aviso 3 dias antes; carência padrão de 3 dias; pagamento registrado libera na hora.
Se a central cair, os sites dos clientes ficam **no ar** (usam o último status conhecido).

Integrações: `agito` (branch `mensalidade`, variável `BILLING_STATUS_URL`) e `integrations/wordpress-snippet.php` (Code Snippets).

Testes: `npm test`.

## Automático

- **Monitoramento**: a cada 5 min testa o primeiro endereço de cada cliente; alerta você quando cai e quando volta. Na carteirinha: no ar/fora, disponibilidade 30 d, tempo de resposta, "no ar há N dias".
- **Lembretes**: 09:00 Bruxelas, N dias antes do vencimento, no dia, e no dia da suspensão (uma vez cada).
- **Relatório mensal**: dia 1 às 09:00, com visitantes, origem, tempo médio, disponibilidade, pedidos/faturamento e nota Google.
- **Plano anual**: 12 meses pagos = 14 meses de serviço (no painel, "Anual"; na carteirinha, bloco "Formule annuelle").
- **Números do negócio**: pedidos e faturamento por dia (Agito manda sozinho; WooCommerce manda pelo snippet).
- **Avaliações Google**: nota, total e novas no mês + link "Demander un avis".

### Canais de envio (variáveis no Render)

| Canal | Variáveis | Observações |
|---|---|---|
| E-mail | `RESEND_API_KEY`, `MAIL_FROM` | Conta grátis em resend.com (3 000 e-mails/mês); domínio drtcreation.com verificado por DNS. |
| WhatsApp | `WA_TOKEN`, `WA_PHONE_ID`, `WA_TPL_REMINDER`, `WA_TPL_REPORT`, `WA_TPL_ALERT`, `WA_TPL_LANG` | API oficial da Meta (WhatsApp Business Platform). Mensagens iniciadas pelo negócio exigem modelos aprovados; cada modelo tem o corpo com {{1}} {{2}} {{3}} ({{4}} no relatório). |
| Alertas para você | `ADMIN_EMAIL`, `ADMIN_PHONE` | Site fora do ar / voltou. |
| Google | `GOOGLE_PLACES_KEY` + Place ID em cada cliente | Places API (New), 1 consulta por cliente por dia. |

Modelos WhatsApp sugeridos (categoria *Utility*):
- `drt_rappel`: "Bonjour {{1}} ! {{2}} Votre carte et les moyens de paiement : {{3}} — DRT Creation"
- `drt_rapport`: "Bonjour {{1}} ! Votre site en {{2}} : {{3}}. Tous les détails : {{4}} — DRT Creation"
- `drt_alerte`: "{{1}}"
