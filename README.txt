HUDDLE HRPP - Versão Local / PWA

Estrutura principal:
- index.html
- manifest.json
- sw.js
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
- images/icon-192.png
- images/icon-512.png
- images/icon-maskable-192.png
- images/icon-maskable-512.png

Como testar no Codespace/local:
python -m http.server 8000

Depois abra a porta 8000 no navegador.

Como instalar no tablet Android:
1. Publique no GitHub Pages.
2. Abra o link no Chrome do tablet.
3. Toque no menu de três pontos.
4. Escolha "Instalar app" ou "Adicionar à tela inicial".
5. Abra pelo ícone Huddle HRPP criado na tela inicial.

Observações importantes:
- O sistema salva os dados no IndexedDB do navegador/dispositivo.
- O PWA melhora a instalação e o uso offline, mas não sincroniza dados entre dispositivos.
- Use Exportar/Importar backup nas configurações para levar dados de um dispositivo a outro.
- Para deixar o cabeçalho mais clean, remova a linha da logo em index.html dentro de .header-logos.
