# NutriFit — checklist de comercialização

## Antes de colocar à venda

1. Confirmar nome comercial, preço e checkout na Hotmart.
2. Preencher responsável, contato e demais informações jurídicas nas páginas privacidade.html e termos.html.
3. Confirmar a origem/licença dos dados nutricionais e de todas as imagens utilizadas na oferta.
4. Publicar o Cloudflare Worker e testar /health.
5. Configurar na Hotmart o webhook para:
https://nutrifit-premium.do302354.workers.dev/webhook/hotmart
6. Usar o token secreto da Hotmart somente como secret do Worker.
7. Testar uma transação aprovada em ambiente real antes de anunciar.
8. Testar também cancelamento, reembolso e chargeback para confirmar o bloqueio do Premium.
9. Abrir o aplicativo no Android, instalar na tela inicial e testar novamente.
10. Confirmar que a página de Privacidade e os Termos abrem no celular.
11. Conferir a descrição, preço, imagem/capa e promessa comercial da página da Hotmart.

## Estrutura pública

- index.html — aplicativo.
- manifest.webmanifest — instalação PWA.
- sw.js — cache/offline.
- icon-192.svg e icon-512.svg — ícones.
- privacidade.html — privacidade.
- termos.html — termos.
- cloudflare-worker-hotmart.js — servidor Premium.

## Importante

O checkout e os dados de pagamento são tratados pela Hotmart. O aplicativo não deve armazenar dados de cartão ou credenciais de pagamento.

O material jurídico desta pasta é um ponto de partida técnico e deve ser revisado conforme a situação real do vendedor e do produto.