# Segurança, instalação e testes — Huddle HRPP

## Limites da arquitetura

O frontend permanece público no GitHub Pages e a API do Apps Script é
tecnicamente acessível pela internet. A proteção é feita por PIN individual,
sessões temporárias, autorização por perfil e validação obrigatória no servidor.

O sistema deve conter somente informações operacionais. Não informe nomes,
prontuários ou qualquer dado identificável de pacientes.

## Estrutura da planilha

### Config_Usuarios

```text
id_usuario | nome | cargo | perfil | ativo | ordem
```

Perfis: `ADMIN` e `COORDENADOR`. PIN, salt e verificador ficam somente nas
propriedades privadas do Apps Script.

### Demais abas

```text
Config_Setores
id_setor | nome_setor | classificacao | descricao | ativo | ordem

Config_Huddles
id_huddle | nome_huddle | descricao | ativo | ordem

Huddle_Setores
id_vinculo | id_huddle | id_setor | ordem | ativo

Config_Perguntas
id_pergunta | id_setor | ordem | pergunta | tipo | obrigatoria | permite_comentario | gera_pendencia | resposta_gera_pendencia | ativo

Config_Categorias
id_categoria | nome_categoria | ativo | ordem

Config_Sugestoes
id_sugestao | tipo | valor | id_categoria | ativo | ordem

Reunioes
id_reuniao | data | hora_inicio | hora_fim | id_usuario | status | total_setores | total_respondidos

Presencas_Setor
id_presenca | id_reuniao | id_huddle | id_setor | presente | observacao

Execucoes_Setor
id_execucao | id_reuniao | id_huddle | id_setor | id_usuario_resposta | data | hora | status

Respostas
id_resposta | id_execucao | id_reuniao | id_setor | id_pergunta | resposta | comentario

Pendencias
id_pendencia | id_reuniao | id_execucao | id_huddle | id_setor_origem | id_pergunta | titulo | descricao | id_categoria | status | data_abertura | hora_abertura | data_resolucao | hora_resolucao | resultado_resolucao | concluida_dentro_prazo | houve_problemas | apoios_cumpriram | motivo_nao_resolucao | observacao_resolucao

Pendencia_Apoios
id_apoio | id_pendencia | id_setor_apoio | status_acordo | observacao

Historico_Pendencias
id_historico | id_pendencia | data_hora | id_usuario | acao | observacao

Auditoria
id_evento | data_hora | id_usuario | acao | entidade | id_entidade | resultado | detalhes
```

Não existe prazo cadastrado na abertura de uma pendência.

## Instalação

1. Faça uma cópia de segurança da planilha antiga.
2. Use uma planilha vazia para homologação.
3. Abra **Extensões → Apps Script**.
4. Substitua o conteúdo pelo `apps-script/Code.gs`.
5. Em **Configurações do projeto → Propriedades do script**, crie:

```text
ID_PLANILHA=<ID da planilha de homologação>
MODO_INSTALACAO=SIM
```

6. Execute `gerarSegredosInstalacao()`.
7. Execute `configurarPlanilha()`.
8. Confirme a criação de todas as abas, inclusive `Auditoria`.
9. Adicione temporariamente:

```text
ADMIN_INICIAL_NOME=<nome>
ADMIN_INICIAL_CARGO=<cargo>
ADMIN_INICIAL_PIN=<PIN de 8 a 12 dígitos>
```

10. Execute `criarAdministradorInicial()`.
11. Confirme que as três propriedades `ADMIN_INICIAL_*` foram removidas.
12. Altere `MODO_INSTALACAO` para `NAO`.
13. Implante como aplicativo da Web:
    - executar como: **Eu**;
    - acesso: **Qualquer pessoa**.
14. Copie a nova URL `/exec` e atualize a constante `API` em `js/app.js`.
15. Não revogue a implantação antiga até concluir os testes locais.

## Executar localmente

```powershell
cd "F:\CUSTOS\4 - Análises e Cálculos\Huddle - Projeto\huddle_hrpp"
python -m http.server 8000
```

Abra `http://localhost:8000`.

## Testes de autenticação

1. Sem login, confirme que reuniões e configurações não carregam.
2. Abra `URL_DA_API?action=bootstrap`; deve retornar `NAO_AUTORIZADO`.
3. Entre com o administrador inicial.
4. Atualize a página; a sessão deve continuar na mesma aba.
5. Abra outra aba digitando novamente a URL; deve solicitar login.
6. Use PIN incorreto cinco vezes; o usuário deve ser bloqueado por 15 minutos.
7. Execute logout; o token deve deixar de funcionar.
8. Aguarde ou simule expiração e confirme novo login.

## Testes de autorização

### Administrador

- cadastrar e editar usuários;
- definir ou redefinir PIN;
- cadastrar setores;
- cadastrar, editar, reordenar e desativar perguntas;
- criar e editar Huddles;
- visualizar reuniões e resolver pendências.

### Coordenador

- iniciar e finalizar reunião;
- responder setores;
- criar e resolver pendências;
- não visualizar o botão Configurações;
- receber `SEM_PERMISSAO` ao chamar rota administrativa diretamente.

## Teste funcional completo

1. Cadastre um coordenador com PIN.
2. Cadastre três setores.
3. Cadastre perguntas `SIM_NAO`, `NUMERO` e `TEXTO`.
4. Configure uma pergunta obrigatória, uma com comentário e uma que gere pendência.
5. Crie um Huddle com dois setores.
6. Inicie uma reunião e marque somente um setor presente.
7. Confirme que os dois setores permanecem disponíveis.
8. Responda a pergunta gatilho e adicione duas pendências.
9. Adicione vários setores de apoio.
10. Confirme que não existe campo ou coluna de prazo.
11. Salve o setor e tente salvá-lo novamente.
12. Conclua todos os setores e finalize a reunião.
13. Resolva uma pendência com `Concluída dentro do prazo = SIM`.
14. Finalize outra como `Sem Solucao`; o motivo deve ser obrigatório.

## Testes de abuso

- envie IDs inexistentes;
- envie pergunta de outro setor;
- tente resolver pendência já encerrada;
- envie textos acima dos limites;
- envie `=IMPORTXML(...)`, `+1`, `-1` e `@valor`;
- clique duas vezes rapidamente em salvar;
- tente salvar o mesmo setor em duas abas;
- altere `id_usuario` no payload;
- use token expirado;
- confirme que nenhuma resposta contém PIN, verificador, desafio ou token.

## Conferência final

- planilha compartilhada apenas com administradores;
- nenhuma informação de paciente;
- autoria obtida da sessão;
- registros na aba `Auditoria`;
- valores perigosos armazenados como texto, não como fórmula;
- implantação antiga revogada após homologação;
- commit e push feitos somente após todos os testes.
