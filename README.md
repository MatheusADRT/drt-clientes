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
