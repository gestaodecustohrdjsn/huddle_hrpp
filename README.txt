HUDDLE HRPP - versão com Dashboard

Estrutura:
- index.html
- css/style.css
- js/utils.js
- js/db.js
- data/seed.js
- js/perguntas.js
- js/pendencias.js
- js/configuracoes.js
- js/dashboard.js
- js/reunioes.js
- js/main.js
- images/Logo_Hospital.svg
- images/Logo_Empresa.svg

Principais recursos desta versão:
- Fluxo local de reuniões no IndexedDB.
- Setores presentes com Coordenador/Representante.
- Perguntas por setor com observação em qualquer resposta.
- Pendências acumulativas, prorrogação, resolução e remoção sem resolver.
- Painel geral de pendências com abertas e últimas resolvidas.
- Configurações de setores, perguntas e opções.
- Backup local em JSON.
- Dashboard gerencial com indicadores de reuniões, conformidade, não conformidades, pendências e engajamento por setor.

Como testar localmente:
python -m http.server 8000

Depois abra a porta 8000 no navegador.

Observação:
Os dados ficam salvos no navegador/dispositivo usado. Use o backup local para exportar/importar dados entre dispositivos ou antes de limpar o navegador.
