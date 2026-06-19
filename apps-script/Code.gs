const TZ = "America/Cuiaba";
const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const CHALLENGE_TTL_SECONDS = 300;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_MUTATIONS = 60;

const PERFIS = ["ADMIN", "COORDENADOR"];
const TIPOS_PERGUNTA = ["SIM_NAO", "NUMERO", "TEXTO"];
const SIM_NAO = ["SIM", "NAO"];
const STATUS_REUNIAO = ["Em Andamento", "Concluida", "Cancelada"];
const STATUS_PENDENCIA = ["Aberta", "Resolvida", "Sem Solucao"];

const ABAS = {
  Config_Usuarios: ["id_usuario", "nome", "cargo", "perfil", "ativo", "ordem"],
  Config_Setores: ["id_setor", "nome_setor", "classificacao", "descricao", "ativo", "ordem"],
  Config_Huddles: ["id_huddle", "nome_huddle", "descricao", "ativo", "ordem"],
  Huddle_Setores: ["id_vinculo", "id_huddle", "id_setor", "ordem", "ativo"],
  Config_Perguntas: ["id_pergunta", "id_setor", "ordem", "pergunta", "tipo", "obrigatoria", "permite_comentario", "gera_pendencia", "resposta_gera_pendencia", "ativo"],
  Config_Categorias: ["id_categoria", "nome_categoria", "ativo", "ordem"],
  Config_Sugestoes: ["id_sugestao", "tipo", "valor", "id_categoria", "ativo", "ordem"],
  Reunioes: ["id_reuniao", "id_huddle", "data", "hora_inicio", "hora_fim", "id_usuario", "status", "total_setores", "total_respondidos"],
  Presencas_Setor: ["id_presenca", "id_reuniao", "id_setor", "presente", "observacao"],
  Execucoes_Setor: ["id_execucao", "id_reuniao", "id_setor", "id_usuario_resposta", "data", "hora", "status"],
  Respostas: ["id_resposta", "id_execucao", "id_reuniao", "id_setor", "id_pergunta", "resposta", "comentario"],
  Pendencias: ["id_pendencia", "id_reuniao", "id_execucao", "id_setor_origem", "id_pergunta", "titulo", "descricao", "id_categoria", "status", "data_abertura", "hora_abertura", "data_resolucao", "hora_resolucao", "resultado_resolucao", "concluida_dentro_prazo", "houve_problemas", "apoios_cumpriram", "motivo_nao_resolucao", "observacao_resolucao"],
  Pendencia_Apoios: ["id_apoio", "id_pendencia", "id_setor_apoio", "status_acordo", "observacao"],
  Historico_Pendencias: ["id_historico", "id_pendencia", "data_hora", "id_usuario", "acao", "observacao"],
  Auditoria: ["id_evento", "data_hora", "id_usuario", "acao", "entidade", "id_entidade", "resultado", "detalhes"]
};

function doGet(e) {
  const p = e.parameter || {};
  try {
    const publicas = {
      usuariosLogin: () => usuariosLogin(),
      authChallenge: () => authChallenge(p),
      authLogin: () => authLogin(p)
    };
    if (publicas[p.action]) return jsonOutput(publicas[p.action]());

    const sessao = exigirSessao(p.session_token);
    const rotas = {
      bootstrap: () => bootstrap(sessao),
      reunioes: () => buscarReunioes(),
      reuniao: () => buscarReuniao(p.id_reuniao),
      usuarios: () => buscarUsuariosPrivados(sessao),
      setores: () => buscarSetores(),
      huddles: () => buscarHuddles(),
      perguntas: () => buscarPerguntas(p.id_setor),
      confirmarSetor: () => confirmarSetor(p.id_reuniao, p.id_setor),
      operationStatus: () => obterStatusOperacao(p.request_id, sessao),
      authMe: () => ({ sucesso: true, usuario: sessao.usuario })
    };
    if (!rotas[p.action]) throw erroApi("ACAO_INVALIDA", "Ação inválida.");
    return jsonOutput(rotas[p.action]());
  } catch (erro) {
    return jsonOutput(respostaErro(erro));
  }
}

function doPost(e) {
  let dados = null;
  let sessao = null;
  try {
    dados = lerPayload(e);
    if (dados.action === "authLogout") {
      return jsonOutput(authLogout(dados.session_token));
    }

    sessao = exigirSessao(dados.session_token);
    limitarMutacoes(sessao.usuario.id_usuario);

    const operacionais = {
      criarReuniao: () => criarReuniao(dados, sessao),
      salvarSetor: () => salvarSetor(dados, sessao),
      finalizarReuniao: () => finalizarReuniao(dados.id_reuniao, sessao),
      resolverPendencia: () => resolverPendencia(dados, sessao)
    };
    const administrativas = {
      salvarUsuario: () => salvarUsuarioSeguro(dados, sessao),
      salvarConfiguracao: () => salvarConfiguracao(dados, sessao),
      excluirConfiguracao: () => excluirConfiguracao(dados, sessao),
      salvarHuddle: () => salvarHuddle(dados, sessao)
    };

    let resultado;
    if (operacionais[dados.action]) {
      resultado = operacionais[dados.action]();
    } else if (administrativas[dados.action]) {
      exigirPerfil(sessao, ["ADMIN"]);
      resultado = administrativas[dados.action]();
    } else {
      throw erroApi("ACAO_INVALIDA", "Ação inválida.");
    }
    registrarStatusOperacao(dados.request_id, sessao, resultado);
    return jsonOutput(resultado);
  } catch (erro) {
    const resposta = respostaErro(erro);
    if (dados && sessao) {
      registrarStatusOperacao(dados.request_id, sessao, resposta);
      auditoria(
        sessao.usuario.id_usuario,
        "REJEITADO",
        "operacao",
        dados.action || "",
        "FALHA",
        resposta.codigo
      );
    }
    return jsonOutput(resposta);
  }
}

/* INSTALAÇÃO */

function gerarSegredosInstalacao() {
  exigirModoInstalacao();
  const props = propriedades();
  if (!props.getProperty("AUTH_SECRET")) {
    props.setProperty("AUTH_SECRET", tokenAleatorio());
  }
}

function configurarPlanilha() {
  exigirModoInstalacao();
  const planilha = planilhaAtual();
  const comDados = Object.keys(ABAS).filter(nome => {
    const aba = planilha.getSheetByName(nome);
    return aba && aba.getLastRow() > 1;
  });
  if (comDados.length) {
    throw new Error("Abas com dados: " + comDados.join(", ") + ". Limpe-as antes de instalar.");
  }
  Object.keys(ABAS).forEach(nome => {
    let aba = planilha.getSheetByName(nome);
    if (!aba) aba = planilha.insertSheet(nome);
    aba.clear();
    aba.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, ABAS[nome].length)
      .setFontWeight("bold").setBackground("#0b4776").setFontColor("#ffffff");
  });
  popularPadroes();
}

function criarAdministradorInicial() {
  exigirModoInstalacao();
  const props = propriedades();
  const nome = texto(props.getProperty("ADMIN_INICIAL_NOME"), 120, true, "Nome");
  const cargo = texto(props.getProperty("ADMIN_INICIAL_CARGO"), 120, false, "Cargo");
  const pin = validarPin(props.getProperty("ADMIN_INICIAL_PIN"));
  if (buscarUsuarios().length) throw new Error("Já existem usuários cadastrados.");

  const id = gerarId("USU");
  const salt = tokenAleatorio().slice(0, 24);
  const verifier = sha256Hex(salt + ":" + pin);
  appendPorCabecalho("Config_Usuarios", {
    id_usuario: id, nome: nome, cargo: cargo, perfil: "ADMIN", ativo: "SIM", ordem: 1
  });
  salvarCredencial(id, salt, verifier);
  auditoria("", "CRIAR_ADMIN_INICIAL", "usuario", id, "SUCESSO", "");
  props.deleteProperty("ADMIN_INICIAL_NOME");
  props.deleteProperty("ADMIN_INICIAL_CARGO");
  props.deleteProperty("ADMIN_INICIAL_PIN");
}

function popularPadroes() {
  [
    ["CAT-EQUIP", "Equipamentos", 1], ["CAT-ESTR", "Estrutura", 2],
    ["CAT-PESS", "Pessoas", 3], ["CAT-INSU", "Insumos", 4],
    ["CAT-PROC", "Processo", 5], ["CAT-TECN", "Tecnologia", 6]
  ].forEach(x => appendPorCabecalho("Config_Categorias", {
    id_categoria: x[0], nome_categoria: x[1], ativo: "SIM", ordem: x[2]
  }));
  [
    ["SUG-1", "MOTIVO_NAO_RESOLUCAO", "Falta de equipamento", 1],
    ["SUG-2", "MOTIVO_NAO_RESOLUCAO", "Dependência externa", 2],
    ["SUG-3", "MOTIVO_NAO_RESOLUCAO", "Ação tornou-se inviável", 3]
  ].forEach(x => appendPorCabecalho("Config_Sugestoes", {
    id_sugestao: x[0], tipo: x[1], valor: x[2], ativo: "SIM", ordem: x[3]
  }));
}

function registrarStatusOperacao(requestId, sessao, resultado) {
  if (!requestId || !sessao) return;
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(requestId))) return;
  CacheService.getScriptCache().put(
    chaveStatusOperacao(requestId, sessao.usuario.id_usuario),
    JSON.stringify(resultado),
    180
  );
}

function obterStatusOperacao(requestId, sessao) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(String(requestId || ""))) {
    throw erroApi("REQUEST_ID_INVALIDO", "Identificador de operação inválido.");
  }
  const cache = CacheService.getScriptCache();
  const chave = chaveStatusOperacao(requestId, sessao.usuario.id_usuario);
  const bruto = cache.get(chave);
  if (!bruto) return { sucesso: true, pendente: true };
  cache.remove(chave);
  return { sucesso: true, pendente: false, resultado: JSON.parse(bruto) };
}

function chaveStatusOperacao(requestId, idUsuario) {
  return "OP_" + sha256Hex(idUsuario + ":" + requestId);
}

/* AUTENTICAÇÃO */

function usuariosLogin() {
  return {
    sucesso: true,
    usuarios: buscarUsuarios().map(u => ({
      id_usuario: u.id_usuario, nome: u.nome, cargo: u.cargo
    }))
  };
}

function authChallenge(p) {
  const idUsuario = String(p.id_usuario || "");
  const usuario = usuarioAtivo(idUsuario);
  limitarDesafiosLogin(idUsuario);
  verificarBloqueioLogin(idUsuario);
  const credencial = obterCredencial(idUsuario);
  if (!credencial) throw erroApi("CREDENCIAL_AUSENTE", "Usuário sem PIN configurado.");

  const challengeId = tokenAleatorio();
  const nonce = tokenAleatorio();
  CacheService.getScriptCache().put(
    "CHALLENGE_" + challengeId,
    JSON.stringify({ id_usuario: usuario.id_usuario, nonce: nonce, criado_em: Date.now() }),
    CHALLENGE_TTL_SECONDS
  );
  return {
    sucesso: true,
    challenge_id: challengeId,
    nonce: nonce,
    salt: credencial.salt
  };
}

function authLogin(p) {
  const challengeId = String(p.challenge_id || "");
  const proof = String(p.proof || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(proof)) throw erroApi("LOGIN_INVALIDO", "Credenciais inválidas.");

  const cache = CacheService.getScriptCache();
  const chave = "CHALLENGE_" + challengeId;
  const bruto = cache.get(chave);
  cache.remove(chave);
  if (!bruto) throw erroApi("DESAFIO_EXPIRADO", "Desafio expirado. Tente novamente.");

  const desafio = JSON.parse(bruto);
  verificarBloqueioLogin(desafio.id_usuario);
  const usuario = usuarioAtivo(desafio.id_usuario);
  const credencial = obterCredencial(usuario.id_usuario);
  const esperado = hmacHex(desafio.nonce, hexParaBytes(credencial.verifier));

  if (!comparacaoConstante(proof, esperado)) {
    registrarFalhaLogin(usuario.id_usuario);
    auditoria(usuario.id_usuario, "LOGIN", "sessao", "", "FALHA", "PIN inválido");
    throw erroApi("LOGIN_INVALIDO", "PIN inválido.");
  }

  limparFalhasLogin(usuario.id_usuario);
  const token = tokenAleatorio();
  const agora = Date.now();
  const sessao = {
    usuario: usuarioPublico(usuario),
    criado_em: agora,
    expira_em: agora + SESSION_TTL_MS
  };
  propriedades().setProperty(chaveSessao(token), JSON.stringify(sessao));
  auditoria(usuario.id_usuario, "LOGIN", "sessao", "", "SUCESSO", "");
  return { sucesso: true, session_token: token, expira_em: sessao.expira_em, usuario: sessao.usuario };
}

function authLogout(token) {
  const sessao = obterSessao(token, false);
  propriedades().deleteProperty(chaveSessao(token));
  if (sessao) auditoria(sessao.usuario.id_usuario, "LOGOUT", "sessao", "", "SUCESSO", "");
  return { sucesso: true };
}

function exigirSessao(token) {
  const sessao = obterSessao(token, true);
  if (!sessao) throw erroApi("NAO_AUTORIZADO", "Sessão inválida ou expirada.");
  return sessao;
}

function obterSessao(token, removerExpirada) {
  if (!/^[A-Za-z0-9_-]{40,}$/.test(String(token || ""))) return null;
  const props = propriedades();
  const chave = chaveSessao(token);
  const bruto = props.getProperty(chave);
  if (!bruto) return null;
  const sessao = JSON.parse(bruto);
  if (Number(sessao.expira_em) <= Date.now()) {
    if (removerExpirada !== false) props.deleteProperty(chave);
    return null;
  }
  const usuario = usuarioAtivo(sessao.usuario.id_usuario);
  sessao.usuario = usuarioPublico(usuario);
  return sessao;
}

function exigirPerfil(sessao, perfis) {
  if (!perfis.includes(sessao.usuario.perfil)) {
    throw erroApi("SEM_PERMISSAO", "Seu perfil não permite esta operação.");
  }
}

function limitarDesafiosLogin(idUsuario) {
  executarComLock(() => {
    const props = propriedades();
    const chave = "CHALLENGE_RATE_" + idUsuario;
    const agora = Date.now();
    const atual = JSON.parse(props.getProperty(chave) || '{"inicio":0,"total":0}');
    if (agora - Number(atual.inicio) >= RATE_WINDOW_MS) {
      atual.inicio = agora;
      atual.total = 0;
    }
    atual.total += 1;
    props.setProperty(chave, JSON.stringify(atual));
    if (atual.total > 20) {
      throw erroApi("LIMITE_EXCEDIDO", "Muitas tentativas de acesso. Aguarde um minuto.");
    }
  });
}

function registrarFalhaLogin(idUsuario) {
  executarComLock(() => {
    const props = propriedades();
    const chave = "LOGIN_FAIL_" + idUsuario;
    const atual = JSON.parse(props.getProperty(chave) || '{"tentativas":0,"bloqueado_ate":0}');
    atual.tentativas += 1;
    if (atual.tentativas >= MAX_LOGIN_FAILURES) {
      atual.bloqueado_ate = Date.now() + LOGIN_BLOCK_MS;
      atual.tentativas = 0;
    }
    props.setProperty(chave, JSON.stringify(atual));
  });
}

function verificarBloqueioLogin(idUsuario) {
  const atual = JSON.parse(propriedades().getProperty("LOGIN_FAIL_" + idUsuario) || '{"bloqueado_ate":0}');
  if (Number(atual.bloqueado_ate) > Date.now()) {
    throw erroApi("USUARIO_BLOQUEADO", "Muitas tentativas. Aguarde 15 minutos.");
  }
}

function limparFalhasLogin(idUsuario) {
  propriedades().deleteProperty("LOGIN_FAIL_" + idUsuario);
}

function limitarMutacoes(idUsuario) {
  executarComLock(() => {
    const props = propriedades();
    const chave = "RATE_" + idUsuario;
    const agora = Date.now();
    const atual = JSON.parse(props.getProperty(chave) || '{"inicio":0,"total":0}');
    if (agora - Number(atual.inicio) >= RATE_WINDOW_MS) {
      atual.inicio = agora;
      atual.total = 0;
    }
    atual.total += 1;
    props.setProperty(chave, JSON.stringify(atual));
    if (atual.total > RATE_MAX_MUTATIONS) {
      throw erroApi("LIMITE_EXCEDIDO", "Muitas operações. Aguarde um minuto.");
    }
  });
}

/* LEITURA */

function bootstrap(sessao) {
  const admin = sessao.usuario.perfil === "ADMIN";
  return {
    sucesso: true,
    usuario: sessao.usuario,
    reunioes: buscarReunioes(),
    usuarios: admin ? buscarUsuarios().map(usuarioPublico) : [],
    setores: buscarSetores(),
    huddles: buscarHuddles(),
    categorias: lerAtivos("Config_Categorias"),
    sugestoes: lerAtivos("Config_Sugestoes")
  };
}

function buscarUsuariosPrivados(sessao) {
  exigirPerfil(sessao, ["ADMIN"]);
  return { sucesso: true, usuarios: buscarUsuarios().map(usuarioPublico) };
}

function buscarUsuarios() {
  return lerAtivos("Config_Usuarios").sort(ordenar).map(x => ({
    id_usuario: x.id_usuario,
    nome: limparSaida(x.nome),
    cargo: limparSaida(x.cargo),
    perfil: String(x.perfil || "COORDENADOR").toUpperCase(),
    ativo: x.ativo,
    ordem: x.ordem
  }));
}

function buscarSetores() {
  return lerAtivos("Config_Setores").sort(ordenar).map(x => ({
    id_setor: x.id_setor, nome_setor: limparSaida(x.nome_setor),
    classificacao: limparSaida(x.classificacao), descricao: limparSaida(x.descricao),
    ativo: x.ativo, ordem: x.ordem
  }));
}

function buscarHuddles() {
  const setores = indexar(buscarSetores(), "id_setor");
  const vinculos = lerAtivos("Huddle_Setores");
  return lerAtivos("Config_Huddles").sort(ordenar).map(h => ({
    id_huddle: h.id_huddle, nome_huddle: limparSaida(h.nome_huddle),
    descricao: limparSaida(h.descricao), ativo: h.ativo, ordem: h.ordem,
    setores: vinculos.filter(v => String(v.id_huddle) === String(h.id_huddle))
      .sort(ordenar).map(v => setores[String(v.id_setor)]).filter(Boolean)
  }));
}

function buscarPerguntas(idSetor) {
  setorAtivo(idSetor);
  return lerAtivos("Config_Perguntas")
    .filter(x => String(x.id_setor) === String(idSetor)).sort(ordenar)
    .map(x => ({
      id_pergunta: x.id_pergunta, id_setor: x.id_setor, ordem: x.ordem,
      pergunta: limparSaida(x.pergunta), tipo: String(x.tipo || "SIM_NAO").toUpperCase(),
      obrigatoria: x.obrigatoria, permite_comentario: x.permite_comentario,
      gera_pendencia: x.gera_pendencia, resposta_gera_pendencia: x.resposta_gera_pendencia
    }));
}

function buscarReunioes() {
  const usuarios = indexar(buscarUsuarios(), "id_usuario");
  const huddles = indexar(buscarHuddles(), "id_huddle");
  const pendencias = lerObjetos("Pendencias");
  return lerObjetos("Reunioes").sort((a, b) => chaveData(b).localeCompare(chaveData(a))).map(r => {
    const relacionadas = pendencias.filter(p => String(p.id_reuniao) === String(r.id_reuniao));
    return {
      id_reuniao: r.id_reuniao, id_huddle: r.id_huddle,
      huddle: huddles[String(r.id_huddle)] || null,
      data: formato(r.data, "dd/MM/yyyy"), hora_inicio: formato(r.hora_inicio, "HH:mm:ss"),
      hora_fim: formato(r.hora_fim, "HH:mm:ss"), id_usuario: r.id_usuario,
      usuario: usuarios[String(r.id_usuario)] || null, status: r.status,
      total_setores: Number(r.total_setores || 0), total_respondidos: Number(r.total_respondidos || 0),
      total_pendencias: relacionadas.length,
      pendencias_abertas: relacionadas.filter(p => p.status === "Aberta").length
    };
  });
}

function buscarReuniao(id) {
  const reuniao = reuniaoExistente(id);
  const setores = indexar(buscarSetores(), "id_setor");
  const apoios = lerObjetos("Pendencia_Apoios");
  reuniao.presencas = lerObjetos("Presencas_Setor")
    .filter(x => String(x.id_reuniao) === String(id))
    .map(x => ({ ...normalizar(x), setor: setores[String(x.id_setor)] || null }));
  reuniao.pendencias = lerObjetos("Pendencias")
    .filter(x => String(x.id_reuniao) === String(id))
    .map(x => ({
      ...normalizar(x), setor_origem: setores[String(x.id_setor_origem)] || null,
      apoios: apoios.filter(a => String(a.id_pendencia) === String(x.id_pendencia))
        .map(a => ({ ...normalizar(a), setor: setores[String(a.id_setor_apoio)] || null }))
    }));
  reuniao.setores_respondidos = buscarSetoresRespondidos(id);
  return { sucesso: true, reuniao: reuniao };
}

/* OPERAÇÕES */

function criarReuniao(dados, sessao) {
  return executarComLock(() => {
    const huddle = huddleAtivo(dados.id_huddle);
    if (!huddle.setores.length) throw erroApi("HUDDLE_SEM_SETORES", "O Huddle não possui setores.");
    const presentes = (dados.setores_presentes || []).map(String);
    presentes.forEach(id => {
      if (!huddle.setores.some(s => String(s.id_setor) === id)) {
        throw erroApi("SETOR_FORA_DO_HUDDLE", "Presença contém setor fora do Huddle.");
      }
    });

    const agora = new Date();
    const id = validarIdCliente(dados.id_reuniao, "REU") || gerarId("REU");
    if (buscarLinha("Reunioes", "id_reuniao", id)) throw erroApi("DUPLICADO", "Reunião já cadastrada.");
    appendPorCabecalho("Reunioes", {
      id_reuniao: id, id_huddle: huddle.id_huddle,
      data: Utilities.formatDate(agora, TZ, "dd/MM/yyyy"),
      hora_inicio: Utilities.formatDate(agora, TZ, "HH:mm:ss"),
      hora_fim: "", id_usuario: sessao.usuario.id_usuario, status: "Em Andamento",
      total_setores: huddle.setores.length, total_respondidos: 0
    });
    huddle.setores.forEach(setor => appendPorCabecalho("Presencas_Setor", {
      id_presenca: gerarId("PRE"), id_reuniao: id, id_setor: setor.id_setor,
      presente: presentes.includes(String(setor.id_setor)) ? "SIM" : "NAO", observacao: ""
    }));
    auditoria(sessao.usuario.id_usuario, "CRIAR", "reuniao", id, "SUCESSO", "");
    return { sucesso: true, id_reuniao: id };
  });
}

function finalizarReuniao(id, sessao) {
  return executarComLock(() => {
    const reuniao = reuniaoExistente(id);
    if (reuniao.status !== "Em Andamento") throw erroApi("TRANSICAO_INVALIDA", "A reunião não está em andamento.");
    const total = buscarSetoresRespondidos(id).length;
    if (total < reuniao.total_setores) throw erroApi("SETORES_PENDENTES", "Ainda existem setores aguardando resposta.");
    atualizarPorId("Reunioes", "id_reuniao", id, {
      hora_fim: Utilities.formatDate(new Date(), TZ, "HH:mm:ss"),
      status: "Concluida", total_respondidos: total
    });
    auditoria(sessao.usuario.id_usuario, "FINALIZAR", "reuniao", id, "SUCESSO", "");
    return { sucesso: true };
  });
}

function salvarSetor(dados, sessao) {
  return executarComLock(() => {
    const reuniao = reuniaoExistente(dados.id_reuniao);
    if (reuniao.status !== "Em Andamento") throw erroApi("REUNIAO_ENCERRADA", "A reunião não está em andamento.");
    const setor = setorAtivo(dados.id_setor);
    const huddle = huddleAtivo(reuniao.id_huddle);
    if (!huddle.setores.some(s => String(s.id_setor) === String(setor.id_setor))) {
      throw erroApi("SETOR_FORA_DO_HUDDLE", "Setor não pertence ao Huddle.");
    }
    const existente = buscarExecucao(reuniao.id_reuniao, setor.id_setor);
    if (existente) return { sucesso: true, duplicado: true, id_execucao: existente };

    const perguntas = indexar(buscarPerguntas(setor.id_setor), "id_pergunta");
    const respostas = Array.isArray(dados.respostas) ? dados.respostas : [];
    validarRespostas(respostas, perguntas);

    const agora = new Date();
    const data = Utilities.formatDate(agora, TZ, "dd/MM/yyyy");
    const hora = Utilities.formatDate(agora, TZ, "HH:mm:ss");
    const idExecucao = gerarId("EXE");
    appendPorCabecalho("Execucoes_Setor", {
      id_execucao: idExecucao, id_reuniao: reuniao.id_reuniao, id_setor: setor.id_setor,
      id_usuario_resposta: sessao.usuario.id_usuario, data: data, hora: hora, status: "Finalizado"
    });

    respostas.forEach(r => {
      const pergunta = perguntas[String(r.id_pergunta)];
      appendPorCabecalho("Respostas", {
        id_resposta: gerarId("RES"), id_execucao: idExecucao,
        id_reuniao: reuniao.id_reuniao, id_setor: setor.id_setor,
        id_pergunta: pergunta.id_pergunta,
        resposta: validarResposta(r.resposta, pergunta),
        comentario: texto(r.comentario, 2000, false, "Comentário")
      });
      (r.pendencias || []).forEach(p => salvarPendenciaInterna({
        ...p, id_reuniao: reuniao.id_reuniao, id_execucao: idExecucao,
        id_setor_origem: setor.id_setor, id_pergunta: pergunta.id_pergunta
      }, data, hora, sessao));
    });

    atualizarPorId("Reunioes", "id_reuniao", reuniao.id_reuniao, {
      total_respondidos: buscarSetoresRespondidos(reuniao.id_reuniao).length
    });
    auditoria(sessao.usuario.id_usuario, "SALVAR", "setor_reuniao", idExecucao, "SUCESSO", setor.id_setor);
    return { sucesso: true, id_execucao: idExecucao };
  });
}

function salvarPendenciaInterna(dados, data, hora, sessao) {
  const id = gerarId("PEN");
  const titulo = texto(dados.titulo, 160, true, "Título");
  const descricao = texto(dados.descricao, 2000, false, "Descrição");
  if (dados.id_categoria && !buscarLinhaAtiva("Config_Categorias", "id_categoria", dados.id_categoria)) {
    throw erroApi("CATEGORIA_INVALIDA", "Categoria inválida.");
  }
  const apoios = Array.isArray(dados.setores_apoio) ? [...new Set(dados.setores_apoio.map(String))] : [];
  apoios.forEach(setorAtivo);

  appendPorCabecalho("Pendencias", {
    id_pendencia: id, id_reuniao: dados.id_reuniao, id_execucao: dados.id_execucao,
    id_setor_origem: dados.id_setor_origem, id_pergunta: dados.id_pergunta,
    titulo: titulo, descricao: descricao, id_categoria: dados.id_categoria || "",
    status: "Aberta", data_abertura: data, hora_abertura: hora,
    data_resolucao: "", hora_resolucao: "", resultado_resolucao: "",
    concluida_dentro_prazo: "", houve_problemas: "", apoios_cumpriram: "",
    motivo_nao_resolucao: "", observacao_resolucao: ""
  });
  apoios.forEach(idSetor => appendPorCabecalho("Pendencia_Apoios", {
    id_apoio: gerarId("APO"), id_pendencia: id, id_setor_apoio: idSetor,
    status_acordo: "Pendente", observacao: ""
  }));
  historico(id, sessao.usuario.id_usuario, "Criacao", "Pendência criada durante a reunião.");
}

function resolverPendencia(dados, sessao) {
  return executarComLock(() => {
    const pendencia = buscarLinha("Pendencias", "id_pendencia", dados.id_pendencia);
    if (!pendencia) throw erroApi("PENDENCIA_NAO_ENCONTRADA", "Pendência não encontrada.");
    if (pendencia.status !== "Aberta") throw erroApi("TRANSICAO_INVALIDA", "Pendência já encerrada.");
    const resultado = String(dados.resultado_resolucao || "");
    if (!["Resolvida", "Aberta", "Sem Solucao"].includes(resultado)) {
      throw erroApi("RESULTADO_INVALIDO", "Resultado inválido.");
    }
    const motivo = texto(dados.motivo_nao_resolucao, 500, false, "Motivo");
    if (resultado === "Sem Solucao" && !motivo) {
      throw erroApi("MOTIVO_OBRIGATORIO", "Informe o motivo.");
    }
    const encerrada = ["Resolvida", "Sem Solucao"].includes(resultado);
    const agora = new Date();
    atualizarPorId("Pendencias", "id_pendencia", pendencia.id_pendencia, {
      status: resultado === "Resolvida" ? "Resolvida" : resultado === "Sem Solucao" ? "Sem Solucao" : "Aberta",
      data_resolucao: encerrada ? Utilities.formatDate(agora, TZ, "dd/MM/yyyy") : "",
      hora_resolucao: encerrada ? Utilities.formatDate(agora, TZ, "HH:mm:ss") : "",
      resultado_resolucao: resultado,
      concluida_dentro_prazo: resultado === "Resolvida" ? enumValor(dados.concluida_dentro_prazo, SIM_NAO, "Prazo") : "",
      houve_problemas: resultado === "Resolvida" ? enumValor(dados.houve_problemas, SIM_NAO, "Problemas") : "",
      apoios_cumpriram: resultado === "Resolvida"
        ? enumValor(dados.apoios_cumpriram, ["SIM", "NAO", "NAO SE APLICA"], "Apoios") : "",
      motivo_nao_resolucao: motivo,
      observacao_resolucao: texto(dados.observacao_resolucao, 2000, false, "Observação")
    });
    historico(pendencia.id_pendencia, sessao.usuario.id_usuario, resultado,
      dados.observacao_resolucao || dados.motivo_nao_resolucao || "");
    auditoria(sessao.usuario.id_usuario, "RESOLVER", "pendencia", pendencia.id_pendencia, "SUCESSO", resultado);
    return { sucesso: true };
  });
}

/* ADMINISTRAÇÃO */

function salvarUsuarioSeguro(dados, sessao) {
  return executarComLock(() => {
    const r = dados.registro || {};
    const perfil = enumValor(r.perfil, PERFIS, "Perfil");
    const nome = texto(r.nome, 120, true, "Nome");
    const cargo = texto(r.cargo, 120, false, "Cargo");
    const id = r.id_usuario || gerarId("USU");
    const existente = buscarLinha("Config_Usuarios", "id_usuario", id);
    const registro = {
      id_usuario: id, nome: nome, cargo: cargo, perfil: perfil,
      ativo: r.ativo === "NAO" ? "NAO" : "SIM", ordem: numeroOrdem(r.ordem)
    };
    const alteraCredencial = Boolean(dados.pin_salt || dados.pin_verifier);
    if (alteraCredencial) {
      validarCredencialRecebida(dados.pin_salt, dados.pin_verifier);
    } else if (!existente) {
      throw erroApi("PIN_OBRIGATORIO", "Defina o PIN do novo usuário.");
    }
    if (existente && existente.perfil === "ADMIN" &&
        (registro.perfil !== "ADMIN" || registro.ativo !== "SIM") &&
        totalAdministradoresAtivos() <= 1) {
      throw erroApi("ULTIMO_ADMIN", "O último administrador não pode ser desativado ou rebaixado.");
    }

    if (existente) atualizarPorId("Config_Usuarios", "id_usuario", id, registro);
    else appendPorCabecalho("Config_Usuarios", registro);
    if (alteraCredencial) salvarCredencial(id, dados.pin_salt, dados.pin_verifier);
    auditoria(sessao.usuario.id_usuario, existente ? "EDITAR" : "CRIAR", "usuario", id, "SUCESSO", perfil);
    return { sucesso: true, id: id };
  });
}

function salvarConfiguracao(dados, sessao) {
  return executarComLock(() => {
    const mapa = {
      setor: ["Config_Setores", "id_setor", "SET"],
      pergunta: ["Config_Perguntas", "id_pergunta", "PER"]
    };
    const config = mapa[dados.entidade];
    if (!config) throw erroApi("ENTIDADE_INVALIDA", "Entidade inválida.");
    const r = dados.registro || {};
    if (!r[config[1]]) r[config[1]] = gerarId(config[2]);
    r.ativo = r.ativo === "NAO" ? "NAO" : "SIM";

    if (dados.entidade === "setor") validarRegistroSetor(r);
    if (dados.entidade === "pergunta") validarRegistroPergunta(r);

    const existente = buscarLinha(config[0], config[1], r[config[1]]);
    if (existente) atualizarPorId(config[0], config[1], r[config[1]], r);
    else appendPorCabecalho(config[0], r);
    auditoria(sessao.usuario.id_usuario, existente ? "EDITAR" : "CRIAR", dados.entidade, r[config[1]], "SUCESSO", "");
    return { sucesso: true, id: r[config[1]] };
  });
}

function salvarHuddle(dados, sessao) {
  return executarComLock(() => {
    const r = dados.registro || {};
    if (!r.id_huddle) r.id_huddle = gerarId("HUD");
    r.nome_huddle = texto(r.nome_huddle, 120, true, "Nome do Huddle");
    r.descricao = texto(r.descricao, 1000, false, "Descrição");
    r.ativo = r.ativo === "NAO" ? "NAO" : "SIM";
    r.ordem = numeroOrdem(r.ordem);
    const setores = [...new Set((dados.setores || []).map(String))];
    if (!setores.length) throw erroApi("SETORES_OBRIGATORIOS", "Selecione ao menos um setor.");
    setores.forEach(setorAtivo);

    const existente = buscarLinha("Config_Huddles", "id_huddle", r.id_huddle);
    if (existente) {
      atualizarPorId("Config_Huddles", "id_huddle", r.id_huddle, r);
      lerObjetos("Huddle_Setores")
        .filter(v => String(v.id_huddle) === String(r.id_huddle) && estaAtivo(v.ativo))
        .forEach(v => atualizarPorId("Huddle_Setores", "id_vinculo", v.id_vinculo, { ativo: "NAO" }));
    } else appendPorCabecalho("Config_Huddles", r);

    setores.forEach((idSetor, i) => appendPorCabecalho("Huddle_Setores", {
      id_vinculo: gerarId("VIN"), id_huddle: r.id_huddle,
      id_setor: idSetor, ordem: i + 1, ativo: "SIM"
    }));
    auditoria(sessao.usuario.id_usuario, existente ? "EDITAR" : "CRIAR", "huddle", r.id_huddle, "SUCESSO", "");
    return { sucesso: true, id: r.id_huddle };
  });
}

function excluirConfiguracao(dados, sessao) {
  return executarComLock(() => {
    const mapa = {
      usuario: ["Config_Usuarios", "id_usuario"],
      setor: ["Config_Setores", "id_setor"],
      pergunta: ["Config_Perguntas", "id_pergunta"],
      huddle: ["Config_Huddles", "id_huddle"]
    };
    const config = mapa[dados.entidade];
    if (!config) throw erroApi("ENTIDADE_INVALIDA", "Entidade inválida.");
    if (!buscarLinha(config[0], config[1], dados.id)) throw erroApi("NAO_ENCONTRADO", "Registro não encontrado.");
    if (dados.entidade === "usuario") {
      if (String(dados.id) === String(sessao.usuario.id_usuario)) {
        throw erroApi("OPERACAO_NEGADA", "Você não pode desativar seu próprio usuário.");
      }
      const alvo = buscarLinha("Config_Usuarios", "id_usuario", dados.id);
      if (alvo.perfil === "ADMIN" && totalAdministradoresAtivos() <= 1) {
        throw erroApi("ULTIMO_ADMIN", "O último administrador não pode ser desativado.");
      }
    }
    atualizarPorId(config[0], config[1], dados.id, { ativo: "NAO" });
    auditoria(sessao.usuario.id_usuario, "DESATIVAR", dados.entidade, dados.id, "SUCESSO", "");
    return { sucesso: true };
  });
}

/* VALIDAÇÕES */

function validarRegistroSetor(r) {
  r.nome_setor = texto(r.nome_setor, 120, true, "Nome do setor");
  r.classificacao = texto(r.classificacao, 80, false, "Classificação");
  r.descricao = texto(r.descricao, 1000, false, "Descrição");
  r.ordem = numeroOrdem(r.ordem);
}

function validarRegistroPergunta(r) {
  setorAtivo(r.id_setor);
  r.pergunta = texto(r.pergunta, 500, true, "Pergunta");
  r.tipo = enumValor(r.tipo, TIPOS_PERGUNTA, "Tipo");
  r.obrigatoria = enumValor(r.obrigatoria, SIM_NAO, "Obrigatória");
  r.permite_comentario = enumValor(r.permite_comentario, SIM_NAO, "Comentário");
  r.gera_pendencia = enumValor(r.gera_pendencia, SIM_NAO, "Pendência");
  r.resposta_gera_pendencia = enumValor(r.resposta_gera_pendencia, SIM_NAO, "Gatilho");
  r.ordem = numeroOrdem(r.ordem);
}

function validarRespostas(respostas, perguntas) {
  const recebidas = {};
  respostas.forEach(r => {
    const pergunta = perguntas[String(r.id_pergunta)];
    if (!pergunta) throw erroApi("PERGUNTA_INVALIDA", "Pergunta não pertence ao setor.");
    if (recebidas[pergunta.id_pergunta]) throw erroApi("RESPOSTA_DUPLICADA", "Pergunta respondida mais de uma vez.");
    recebidas[pergunta.id_pergunta] = true;
    validarResposta(r.resposta, pergunta);
    if (!Array.isArray(r.pendencias || [])) throw erroApi("PENDENCIA_INVALIDA", "Pendências inválidas.");
    if ((r.pendencias || []).length > 20) throw erroApi("LIMITE_EXCEDIDO", "Muitas pendências na mesma pergunta.");
  });
  Object.keys(perguntas).forEach(id => {
    if (estaAtivo(perguntas[id].obrigatoria) && !recebidas[id]) {
      throw erroApi("RESPOSTA_OBRIGATORIA", "Existem perguntas obrigatórias sem resposta.");
    }
  });
}

function validarResposta(valor, pergunta) {
  if (pergunta.tipo === "SIM_NAO") {
    if (!valor && !estaAtivo(pergunta.obrigatoria)) return "";
    return enumValor(valor, SIM_NAO, "Resposta");
  }
  if (pergunta.tipo === "NUMERO") {
    if (valor === "" && !estaAtivo(pergunta.obrigatoria)) return "";
    const numero = Number(valor);
    if (!Number.isFinite(numero) || Math.abs(numero) > 1000000000) {
      throw erroApi("RESPOSTA_INVALIDA", "Número inválido.");
    }
    return numero;
  }
  return texto(valor, 2000, estaAtivo(pergunta.obrigatoria), "Resposta");
}

function validarCredencialRecebida(salt, verifier) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(salt || ""))) {
    throw erroApi("CREDENCIAL_INVALIDA", "Salt inválido.");
  }
  if (!/^[a-f0-9]{64}$/.test(String(verifier || "").toLowerCase())) {
    throw erroApi("CREDENCIAL_INVALIDA", "Verificador inválido.");
  }
}

function validarPin(pin) {
  const valor = String(pin || "");
  if (!/^\d{8,12}$/.test(valor)) throw new Error("O PIN deve possuir entre 8 e 12 dígitos.");
  return valor;
}

function texto(valor, maximo, obrigatorio, campo) {
  const limpo = String(valor == null ? "" : valor).trim();
  if (obrigatorio && !limpo) throw erroApi("CAMPO_OBRIGATORIO", campo + " é obrigatório.");
  if (limpo.length > maximo) throw erroApi("TEXTO_MUITO_LONGO", campo + " excede " + maximo + " caracteres.");
  return protegerFormula(limpo);
}

function enumValor(valor, permitidos, campo) {
  const normalizado = String(valor || "").trim().toUpperCase();
  if (!permitidos.includes(normalizado)) throw erroApi("VALOR_INVALIDO", campo + " inválido.");
  return normalizado;
}

function numeroOrdem(valor) {
  const numero = Number(valor || 0);
  if (!Number.isFinite(numero) || numero < 0 || numero > 100000) {
    throw erroApi("ORDEM_INVALIDA", "Ordem inválida.");
  }
  return Math.floor(numero);
}

/* CONSULTAS AUXILIARES */

function totalAdministradoresAtivos() {
  return buscarUsuarios().filter(u => u.perfil === "ADMIN").length;
}

function usuarioAtivo(id) {
  const usuario = buscarUsuarios().find(x => String(x.id_usuario) === String(id));
  if (!usuario) throw erroApi("USUARIO_INVALIDO", "Usuário inválido ou inativo.");
  return usuario;
}

function setorAtivo(id) {
  const setor = buscarSetores().find(x => String(x.id_setor) === String(id));
  if (!setor) throw erroApi("SETOR_INVALIDO", "Setor inválido ou inativo.");
  return setor;
}

function huddleAtivo(id) {
  const huddle = buscarHuddles().find(x => String(x.id_huddle) === String(id));
  if (!huddle) throw erroApi("HUDDLE_INVALIDO", "Huddle inválido ou inativo.");
  return huddle;
}

function reuniaoExistente(id) {
  const reuniao = buscarReunioes().find(x => String(x.id_reuniao) === String(id));
  if (!reuniao) throw erroApi("REUNIAO_INVALIDA", "Reunião não encontrada.");
  if (!STATUS_REUNIAO.includes(reuniao.status)) throw erroApi("STATUS_INVALIDO", "Status de reunião inválido.");
  return reuniao;
}

function buscarSetoresRespondidos(id) {
  return [...new Set(lerObjetos("Execucoes_Setor")
    .filter(x => String(x.id_reuniao) === String(id)).map(x => String(x.id_setor)))];
}

function confirmarSetor(idReuniao, idSetor) {
  reuniaoExistente(idReuniao);
  setorAtivo(idSetor);
  const id = buscarExecucao(idReuniao, idSetor);
  return { sucesso: true, confirmado: Boolean(id), id_execucao: id || "" };
}

function buscarExecucao(idReuniao, idSetor) {
  const x = lerObjetos("Execucoes_Setor").find(r =>
    String(r.id_reuniao) === String(idReuniao) && String(r.id_setor) === String(idSetor));
  return x ? x.id_execucao : null;
}

function validarIdCliente(id, prefixo) {
  if (!id) return "";
  const valor = String(id);
  if (!new RegExp("^" + prefixo + "-\\d{14}-\\d{4}$").test(valor)) {
    throw erroApi("ID_INVALIDO", "Identificador inválido.");
  }
  return valor;
}

/* PLANILHA E AUDITORIA */

function planilhaAtual() {
  const id = propriedades().getProperty("ID_PLANILHA");
  if (!id) throw new Error("Propriedade ID_PLANILHA não configurada.");
  return SpreadsheetApp.openById(id);
}

function lerAtivos(aba) {
  return lerObjetos(aba).filter(x => estaAtivo(x.ativo));
}

function lerObjetos(nome) {
  const aba = planilhaAtual().getSheetByName(nome);
  if (!aba) throw new Error("Aba não encontrada: " + nome);
  if (aba.getLastRow() < 2) return [];
  const dados = aba.getDataRange().getValues();
  const cab = dados.shift().map(x => String(x).trim());
  return dados.filter(l => l.some(v => String(v).trim())).map(l => {
    const o = {};
    cab.forEach((c, i) => o[c] = limparSaida(l[i]));
    return o;
  });
}

function appendPorCabecalho(nome, objeto) {
  const aba = planilhaAtual().getSheetByName(nome);
  if (!aba) throw new Error("Aba não encontrada: " + nome);
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(x => String(x).trim());
  const linha = cab.map(c => valorSeguroCelula(objeto[c] !== undefined ? objeto[c] : ""));
  aba.getRange(aba.getLastRow() + 1, 1, 1, linha.length).setValues([linha]);
}

function atualizarPorId(nome, coluna, id, dados) {
  const aba = planilhaAtual().getSheetByName(nome);
  const valores = aba.getDataRange().getValues();
  const cab = valores[0].map(x => String(x).trim());
  const idx = cab.indexOf(coluna);
  for (let i = 1; i < valores.length; i++) {
    if (String(limparSaida(valores[i][idx])) !== String(id)) continue;
    Object.keys(dados).forEach(c => {
      const j = cab.indexOf(c);
      if (j >= 0) aba.getRange(i + 1, j + 1).setValue(valorSeguroCelula(dados[c]));
    });
    return;
  }
  throw erroApi("NAO_ENCONTRADO", "Registro não encontrado.");
}

function buscarLinha(aba, coluna, id) {
  return lerObjetos(aba).find(x => String(x[coluna]) === String(id)) || null;
}

function buscarLinhaAtiva(aba, coluna, id) {
  return lerAtivos(aba).find(x => String(x[coluna]) === String(id)) || null;
}

function historico(idPendencia, idUsuario, acao, observacao) {
  appendPorCabecalho("Historico_Pendencias", {
    id_historico: gerarId("HIS"), id_pendencia: idPendencia,
    data_hora: Utilities.formatDate(new Date(), TZ, "dd/MM/yyyy HH:mm:ss"),
    id_usuario: idUsuario || "", acao: acao,
    observacao: texto(observacao, 2000, false, "Observação")
  });
}

function auditoria(idUsuario, acao, entidade, idEntidade, resultado, detalhes) {
  try {
    appendPorCabecalho("Auditoria", {
      id_evento: gerarId("AUD"),
      data_hora: Utilities.formatDate(new Date(), TZ, "dd/MM/yyyy HH:mm:ss"),
      id_usuario: idUsuario || "", acao: acao, entidade: entidade,
      id_entidade: idEntidade || "", resultado: resultado,
      detalhes: texto(detalhes, 1000, false, "Detalhes")
    });
  } catch (erro) {
    console.error("Falha de auditoria: " + erro.message);
  }
}

/* CRIPTOGRAFIA E PROPRIEDADES */

function propriedades() {
  return PropertiesService.getScriptProperties();
}

function salvarCredencial(idUsuario, salt, verifier) {
  propriedades().setProperties({
    ["PIN_SALT_" + idUsuario]: String(salt),
    ["PIN_VERIFIER_" + idUsuario]: String(verifier).toLowerCase()
  });
}

function obterCredencial(idUsuario) {
  const props = propriedades();
  const salt = props.getProperty("PIN_SALT_" + idUsuario);
  const verifier = props.getProperty("PIN_VERIFIER_" + idUsuario);
  return salt && verifier ? { salt: salt, verifier: verifier } : null;
}

function chaveSessao(token) {
  const segredo = propriedades().getProperty("AUTH_SECRET");
  if (!segredo) throw new Error("AUTH_SECRET não configurado.");
  return "SESSION_" + sha256Hex(segredo + ":" + token);
}

function tokenAleatorio() {
  const bruto = Utilities.getUuid() + Utilities.getUuid() + Date.now() + Math.random();
  return Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bruto, Utilities.Charset.UTF_8)
  ).replace(/=+$/g, "");
}

function sha256Hex(valor) {
  return bytesParaHex(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(valor), Utilities.Charset.UTF_8)
  );
}

function hmacHex(valor, chaveBytes) {
  const valorBytes = Utilities.newBlob(String(valor)).getBytes();
  return bytesParaHex(Utilities.computeHmacSha256Signature(valorBytes, chaveBytes));
}

function bytesParaHex(bytes) {
  return bytes.map(b => ("0" + ((b < 0 ? b + 256 : b) & 255).toString(16)).slice(-2)).join("");
}

function hexParaBytes(hex) {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    const valor = parseInt(hex.slice(i, i + 2), 16);
    bytes.push(valor > 127 ? valor - 256 : valor);
  }
  return bytes;
}

function comparacaoConstante(a, b) {
  if (a.length !== b.length) return false;
  let resultado = 0;
  for (let i = 0; i < a.length; i++) resultado |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return resultado === 0;
}

/* UTILITÁRIAS */

function lerPayload(e) {
  if (Number(e.contentLength || 0) > 100000) {
    throw erroApi("PAYLOAD_MUITO_GRANDE", "Requisição excede o tamanho permitido.");
  }
  if (e.parameter && e.parameter.payload) return JSON.parse(e.parameter.payload);
  if (e.postData && e.postData.contents) return JSON.parse(e.postData.contents);
  throw erroApi("PAYLOAD_AUSENTE", "Nenhum dado recebido.");
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function executarComLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function protegerFormula(valor) {
  return /^[=+\-@]/.test(valor) ? "\u200B" + valor : valor;
}

function valorSeguroCelula(valor) {
  return typeof valor === "string" ? protegerFormula(valor) : valor;
}

function limparSaida(valor) {
  return typeof valor === "string" ? valor.replace(/^\u200B/, "") : valor;
}

function usuarioPublico(u) {
  return { id_usuario: u.id_usuario, nome: u.nome, cargo: u.cargo, perfil: u.perfil };
}

function estaAtivo(v) {
  return String(v || "").trim().toUpperCase() === "SIM";
}

function ordenar(a, b) {
  return Number(a.ordem || 0) - Number(b.ordem || 0);
}

function indexar(lista, campo) {
  return lista.reduce((m, x) => (m[String(x[campo])] = x, m), {});
}

function normalizar(o) {
  const r = {};
  Object.keys(o).forEach(k => r[k] = limparSaida(formato(o[k])));
  return r;
}

function formato(v, f) {
  if (!v) return "";
  return Object.prototype.toString.call(v) === "[object Date]"
    ? Utilities.formatDate(v, TZ, f || "dd/MM/yyyy HH:mm:ss") : String(v);
}

function chaveData(x) {
  const d = formato(x.data, "yyyyMMdd"), h = formato(x.hora_inicio, "HHmmss");
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
    const p = d.split("/");
    return p[2] + p[1] + p[0] + h.replace(/\D/g, "");
  }
  return d + h;
}

function gerarId(p) {
  return p + "-" + Utilities.formatDate(new Date(), TZ, "yyyyMMddHHmmss") +
    "-" + (Math.floor(Math.random() * 9000) + 1000);
}

function exigirModoInstalacao() {
  if (propriedades().getProperty("MODO_INSTALACAO") !== "SIM") {
    throw new Error("MODO_INSTALACAO deve estar definido como SIM.");
  }
}

function erroApi(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.codigo = codigo;
  return erro;
}

function respostaErro(erro) {
  return { sucesso: false, codigo: erro.codigo || "ERRO_INTERNO", erro: erro.message || String(erro) };
}
