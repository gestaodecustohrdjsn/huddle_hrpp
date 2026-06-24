# Estrutura da planilha — Huddle HRPP

O sistema separa quatro conceitos:

1. **Usuários**: coordenadores/diretoria que executam reuniões.
2. **Setores**: unidades que podem participar de um Huddle.
3. **Huddles**: modelos configuráveis compostos por setores.
4. **Reuniões**: execuções de um Huddle em determinada data e horário.

A presença registra somente quais setores estavam representados. Pendências
também recebem setores de apoio, sem vínculo com pessoas.

## Como preparar uma planilha vazia

1. Cole o novo `Code.gs` no Apps Script.
2. Salve.
3. Selecione `configurarPlanilha` na lista de funções.
4. Clique em **Executar** e autorize o acesso.
5. Publique uma nova versão da implantação.

`configurarPlanilha()` cria todas as abas e cabeçalhos abaixo.

## Abas de configuração

### Config_Usuarios

```text
id_usuario | nome | cargo | perfil | ativo | ordem
```

Somente pessoas autorizadas a iniciar/conduzir reuniões. Perfis: `ADMIN` e `COORDENADOR`. PINs ficam nas propriedades privadas do Apps Script.

### Config_Setores

```text
id_setor | nome_setor | classificacao | descricao | ativo | ordem
```

`classificacao` serve para relatórios: `Assistencial`, `Administrativo` ou `Apoio`.

### Config_Huddles

```text
id_huddle | nome_huddle | descricao | ativo | ordem
```

### Huddle_Setores

```text
id_vinculo | id_huddle | id_setor | ordem | ativo
```

Define quais setores pertencem a cada Huddle. É mantida pela tela de configuração.

### Config_Perguntas

```text
id_pergunta | id_setor | ordem | pergunta | tipo | obrigatoria | permite_comentario | gera_pendencia | resposta_gera_pendencia | ativo
```

Tipos iniciais: `SIM_NAO`, `NUMERO` e `TEXTO`.

### Config_Categorias

```text
id_categoria | nome_categoria | ativo | ordem
```

### Config_Sugestoes

```text
id_sugestao | tipo | valor | id_categoria | ativo | ordem
```

Tipos: `TITULO_PENDENCIA` e `MOTIVO_NAO_RESOLUCAO`.

## Abas operacionais

### Reunioes

```text
id_reuniao | data | hora_inicio | hora_fim | id_usuario | status | total_setores | total_respondidos
```

### Presencas_Setor

```text
id_presenca | id_reuniao | id_huddle | id_setor | presente | observacao
```

### Execucoes_Setor

```text
id_execucao | id_reuniao | id_huddle | id_setor | id_usuario_resposta | data | hora | status
```

### Respostas

```text
id_resposta | id_execucao | id_reuniao | id_setor | id_pergunta | resposta | comentario
```

### Pendencias

```text
id_pendencia | id_reuniao | id_execucao | id_huddle | id_setor_origem | id_pergunta | titulo | descricao | id_categoria | status | data_abertura | hora_abertura | data_resolucao | hora_resolucao | resultado_resolucao | concluida_dentro_prazo | houve_problemas | apoios_cumpriram | motivo_nao_resolucao | observacao_resolucao
```

### Pendencia_Apoios

```text
id_apoio | id_pendencia | id_setor_apoio | status_acordo | observacao
```

### Historico_Pendencias

```text
id_historico | id_pendencia | data_hora | id_usuario | acao | observacao
```

## Regras

- Um usuário não pertence obrigatoriamente a um setor.
- Um setor pode integrar vários Huddles.
- Uma pergunta pertence a um setor.
- Um Huddle só pode ser iniciado se possuir ao menos um setor.
- A ausência de um setor não o remove da pauta.
- Uma resposta gatilho permite adicionar várias pendências.
- Uma pendência pode possuir vários setores de apoio.
- Remover significa marcar `ativo = NAO`, preservando o histórico.


### Auditoria

```text
id_evento | data_hora | id_usuario | acao | entidade | id_entidade | resultado | detalhes
```
