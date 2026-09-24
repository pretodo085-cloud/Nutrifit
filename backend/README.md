# NutriFit Premium — configuração do servidor

O GitHub Pages hospeda o aplicativo, mas não executa o Webhook da Hotmart. Por isso, o arquivo `backend/hotmart-worker.js` deve ser publicado em um serviço de servidor, como um Cloudflare Worker.

## Configuração

1. Crie um Worker.
2. Cole o conteúdo de `backend/hotmart-worker.js`.
3. Crie um namespace KV e vincule-o ao Worker com o nome `PREMIUM_KV`.
4. Crie a variável secreta `HOTMART_TOKEN` com o token secreto usado na configuração do Webhook da Hotmart.
5. Publique o Worker.
6. Na Hotmart, em Ferramentas > Webhook (API e notificações), cadastre:
   - URL: `https://SEU-WORKER/hotmart-webhook`
   - Produto específico: NutriFit (ID 8588373)
   - Eventos: compra aprovada, compra completa, reembolso, chargeback, cancelamento e compra expirada.
7. Teste o Webhook pela própria Hotmart.
8. Depois que o Worker estiver publicado, o aplicativo precisa receber a URL `https://SEU-WORKER/premium-status` na constante `PREMIUM_API` do `index.html`.

A Hotmart documenta que o Webhook envia notificações quando o status da transação muda e permite testar os envios e acompanhar o histórico. Os status de vendas incluem APPROVED, COMPLETE, REFUNDED, CHARGEBACK, CANCELLED e outros. 

Importante: não coloque o `HOTMART_TOKEN` dentro do `index.html` ou de qualquer arquivo público do GitHub.
