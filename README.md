# NutriFit — versão comercial

NutriFit é uma Progressive Web App (PWA) de organização alimentar e educação nutricional geral.

## O que já está incluído

- Banco principal TACO com 597 alimentos incorporados no aplicativo.
- Catálogo complementar de alimentos marinhos e frutos do mar.
- Busca de alimentos.
- Busca de alimentos dentro de Montar prato.
- Cálculo nutricional proporcional às gramas informadas.
- Montagem de prato e soma de calorias/macronutrientes.
- Diário alimentar.
- Evolução de peso.
- Perfil e meta de peso.
- Exportação e exclusão dos dados locais.
- Funcionamento local no aparelho.
- PWA instalável no Android/Chrome.
- Página de privacidade e termos de uso.
- Área Premium integrada ao checkout da Hotmart.
- Validação de transação pelo servidor, sem colocar segredos da Hotmart no navegador.
- Acesso do proprietário por link privado.

## Publicação

O aplicativo público é servido pelo GitHub Pages:

https://pretodo085-cloud.github.io/Nutrifit/

O arquivo principal é index.html. Não substitua o index.html pelo arquivo NutriFit_FINAL_REVISADO.html sem antes validar a versão.

## Hotmart

Produto: Nutrifit — Alimentação inteligente
ID do produto: 8588373
Checkout: https://go.hotmart.com/Y107751464P

A validação Premium usa o endpoint configurado em PREMIUM_API no index.html.

### Cloudflare Worker

O arquivo canônico para o servidor atual é cloudflare-worker-hotmart.js.

Configure no Worker os secrets:
- HOTMART_CLIENT_ID
- HOTMART_CLIENT_SECRET
- HOTMART_HOTTOK
- NUTRIFIT_PRODUCT_ID (opcional; padrão 8588373)

Rotas:
- GET /health
- GET /?transaction=HP...
- POST /webhook/hotmart

Nunca publique Client Secret ou Hottok no GitHub nem dentro do index.html.

## Dados e LGPD

O diário, perfil e registros de peso são armazenados localmente no aparelho. A área Premium consulta o servidor somente para verificar a transação informada.

Antes da venda, preencha os dados reais do responsável/vendedor nas páginas de privacidade e termos, incluindo um canal de contato.

## Atualizações

Depois de alterar o aplicativo, aumente a versão do cache em sw.js (por exemplo, nutrifit-final-v9) para evitar que instalações antigas mantenham arquivos antigos.

## Licenciamento

O código deste repositório é destinado ao projeto NutriFit. A comercialização do produto deve ser feita pelo titular do projeto, observando os direitos das fontes de dados, marcas, textos, imagens e serviços de terceiros utilizados.

## Aviso nutricional

O NutriFit é ferramenta informativa e de organização alimentar. Não substitui diagnóstico, prescrição, tratamento ou acompanhamento de médico ou nutricionista.