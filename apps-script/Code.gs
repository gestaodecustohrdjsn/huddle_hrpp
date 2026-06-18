const ID_PLANILHA = "15MfCby4qOZkJCGuauxC2Mk_zYZyoLw4lv8N3ey1z1O8";
const TZ = "America/Sao_Paulo";

function doGet(e) {
  const acao = e.parameter.action || "";

  try {
    switch (acao) {
      case "huddles":
        return jsonOutput(buscarHuddles());

      case "setores":
        return jsonOutput(buscarSetores(e.parameter.id_huddle));

      case "usuarios":
        return jsonOutput(buscarUsuarios());

      case "perguntas":
        return jsonOutput(buscarPerguntas(e.parameter.id_setor));

      case "criarSessao":
        return jsonOutput(criarSessao(e.parameter));

      case "finalizarSessao":
        return jsonOutput(finalizarSessaoHuddle(e.parameter.id_sessao));

      default:
        return jsonOutput({
          status: "ok",
          sistema: "Huddle HRPP API"
        });
    }
  } catch (erro) {
    return jsonOutput({
      sucesso: false,
      erro: erro.toString()
    });
  }
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    if (dados.action === "salvarSetor" || dados.action === "salvar") {
      const resultado = salvarSetorHuddle(dados);
      return jsonOutput(resultado);
    }

    return jsonOutput({
      sucesso: false,
      erro: "Ação inválida."
    });

  } catch (erro) {
    return jsonOutput({
      sucesso: false,
      erro: erro.toString()
    });
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================
   LEITURA
========================= */

function lerObjetos(nomeAba) {
  const planilha = SpreadsheetApp.openById(ID_PLANILHA);
  const aba = planilha.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error("Aba não encontrada: " + nomeAba);
  }

  const valores = aba.getDataRange().getValues();

  if (valores.length < 2) return [];

  const cabecalhos = valores.shift().map(c => String(c).trim());

  return valores.map(linha => {
    const obj = {};

    cabecalhos.forEach((cabecalho, i) => {
      obj[cabecalho] = linha[i];
    });

    return obj;
  });
}

function estaAtivo(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase() === "SIM";
}

function buscarHuddles() {
  return lerObjetos("Config_Huddles")
    .filter(l => estaAtivo(l.ativo))
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map(l => ({
      id_huddle: l.id_huddle,
      nome_huddle: l.nome_huddle,
      descricao: l.descricao
    }));
}

function buscarSetores(idHuddle) {
  return lerObjetos("Config_Setores")
    .filter(l =>
      String(l.id_huddle) === String(idHuddle) &&
      estaAtivo(l.ativo)
    )
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map(l => ({
      id_setor: l.id_setor,
      id_huddle: l.id_huddle,
      nome_setor: l.nome_setor,
      descricao: l.descricao
    }));
}

function buscarUsuarios() {
  return lerObjetos("Config_Usuarios")
    .filter(l => estaAtivo(l.ativo))
    .map(l => ({
      id_usuario: l.id_usuario,
      nome: l.nome,
      cargo: l.cargo,
      setor: l.setor
    }));
}

function buscarPerguntas(idSetor) {
  return lerObjetos("Config_Perguntas")
    .filter(l =>
      String(l.id_setor) === String(idSetor) &&
      estaAtivo(l.ativo)
    )
    .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    .map(l => ({
      id_pergunta: l.id_pergunta,
      id_setor: l.id_setor,
      ordem: l.ordem,
      pergunta: l.pergunta,
      tipo: l.tipo,
      obrigatoria: l.obrigatoria,
      gera_pendencia: l.gera_pendencia,
      resposta_gera_pendencia: l.resposta_gera_pendencia,
      categoria: l.categoria_pendencia,
      responsavel: l.responsavel_padrao
    }));
}

/* =========================
   SESSÃO
========================= */

function criarSessao(parametros) {
  const agora = new Date();

  const data = Utilities.formatDate(agora, TZ, "dd/MM/yyyy");
  const hora = Utilities.formatDate(agora, TZ, "HH:mm:ss");

  const idSessao = gerarId("SES");

  appendPorCabecalho("Sessoes_Huddle", {
    id_sessao: idSessao,
    data: data,
    hora_inicio: hora,
    hora_fim: "",
    id_huddle: parametros.id_huddle,
    id_usuario_abertura: parametros.id_usuario,
    status: "Em Andamento"
  });

  return {
    sucesso: true,
    id_sessao: idSessao,
    data: data,
    hora_inicio: hora
  };
}

function finalizarSessaoHuddle(idSessao) {
  const agora = new Date();
  const hora = Utilities.formatDate(agora, TZ, "HH:mm:ss");

  atualizarPorId("Sessoes_Huddle", "id_sessao", idSessao, {
    hora_fim: hora,
    status: "Finalizado"
  });

  return {
    sucesso: true,
    id_sessao: idSessao,
    hora_fim: hora
  };
}

/* =========================
   GRAVAÇÃO DO SETOR
========================= */

function salvarSetorHuddle(dados) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const existente = buscarExecucaoExistente(
      dados.id_sessao,
      dados.id_setor
    );

    if (existente) {
      return {
        sucesso: true,
        duplicado: true,
        id_execucao: existente
      };
    }

    const agora = new Date();

    const data = Utilities.formatDate(agora, TZ, "dd/MM/yyyy");
    const hora = Utilities.formatDate(agora, TZ, "HH:mm:ss");

    const idExecucao = gerarId("HUD");

    appendPorCabecalho("Huddles", {
      id_execucao: idExecucao,
      id_sessao: dados.id_sessao,
      data: data,
      hora: hora,
      id_huddle: dados.id_huddle,
      id_setor: dados.id_setor,
      id_usuario: dados.id_usuario,
      status_execucao: "Finalizado"
    });

    dados.respostas.forEach(resposta => {
      appendPorCabecalho("Respostas", {
        id_resposta: gerarId("RESP"),
        id_execucao: idExecucao,
        id_pergunta: resposta.id_pergunta,
        resposta: resposta.resposta,
        observacao: resposta.observacao || ""
      });

      const deveGerarPendencia =
        String(resposta.gera_pendencia || "").trim().toUpperCase() === "SIM" &&
        String(resposta.resposta || "").trim().toUpperCase() ===
        String(resposta.resposta_gera_pendencia || "SIM").trim().toUpperCase();

      if (deveGerarPendencia) {
        const idPendencia = gerarId("PEN");

        appendPorCabecalho("Pendencias", {
          id_pendencia: idPendencia,
          id_execucao: idExecucao,
          data_abertura: data,
          hora_abertura: hora,
          id_setor: dados.id_setor,
          id_pergunta: resposta.id_pergunta,
          categoria: resposta.categoria || "",
          descricao: resposta.descricao || resposta.observacao || "",
          responsavel: resposta.responsavel || "",
          prazo: resposta.prazo || "",
          status: "Aberta",
          data_fechamento: "",
          hora_fechamento: "",
          observacao_fechamento: ""
        });

        appendPorCabecalho("Historico_Pendencias", {
          id_historico: gerarId("HIST"),
          id_pendencia: idPendencia,
          data_hora: data + " " + hora,
          usuario: dados.usuario,
          acao: "Criação",
          observacao: "Pendência criada durante o Huddle."
        });
      }
    });

    return {
      sucesso: true,
      id_execucao: idExecucao
    };

  } finally {
    lock.releaseLock();
  }
}

function buscarExecucaoExistente(idSessao, idSetor) {
  const registros = lerObjetos("Huddles");

  const encontrado = registros.find(r =>
    String(r.id_sessao) === String(idSessao) &&
    String(r.id_setor) === String(idSetor)
  );

  return encontrado ? encontrado.id_execucao : null;
}

/* =========================
   UTILITÁRIAS
========================= */

function appendPorCabecalho(nomeAba, objeto) {
  const planilha = SpreadsheetApp.openById(ID_PLANILHA);
  const aba = planilha.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error("Aba não encontrada: " + nomeAba);
  }

  const cabecalhos =
    aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0]
      .map(c => String(c).trim());

  const linha = cabecalhos.map(cabecalho => {
    return objeto[cabecalho] !== undefined ? objeto[cabecalho] : "";
  });

  aba.appendRow(linha);
}

function atualizarPorId(nomeAba, colunaId, valorId, objetoAtualizacao) {
  const planilha = SpreadsheetApp.openById(ID_PLANILHA);
  const aba = planilha.getSheetByName(nomeAba);

  if (!aba) {
    throw new Error("Aba não encontrada: " + nomeAba);
  }

  const valores = aba.getDataRange().getValues();
  const cabecalhos = valores[0].map(c => String(c).trim());

  const indiceId = cabecalhos.indexOf(colunaId);

  if (indiceId === -1) {
    throw new Error("Coluna ID não encontrada: " + colunaId);
  }

  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][indiceId]) === String(valorId)) {
      Object.keys(objetoAtualizacao).forEach(campo => {
        const indiceCampo = cabecalhos.indexOf(campo);

        if (indiceCampo !== -1) {
          aba.getRange(i + 1, indiceCampo + 1).setValue(objetoAtualizacao[campo]);
        }
      });

      return true;
    }
  }

  throw new Error("Registro não encontrado: " + valorId);
}

function gerarId(prefixo) {
  const agora = new Date();

  const dataHora =
    Utilities.formatDate(agora, TZ, "yyyyMMddHHmmss");

  const aleatorio =
    Math.floor(Math.random() * 10000);

  return `${prefixo}-${dataHora}-${aleatorio}`;
}


function buscarSessao(idSessao) {
  if (!idSessao) {
    return {
      sucesso: false,
      erro: "ID da sessão não informado."
    };
  }

  const sessoes = lerObjetos("Sessoes_Huddle");

  const sessao = sessoes.find(s =>
    String(s.id_sessao || "").trim() === String(idSessao || "").trim()
  );

  if (!sessao) {
    return {
      sucesso: false,
      erro: "Sessão não encontrada na aba Sessoes_Huddle."
    };
  }

  return {
    sucesso: true,
    id_sessao: sessao.id_sessao,
    data: formatarValorPlanilha(sessao.data),
    hora_inicio: formatarValorPlanilha(sessao.hora_inicio),
    hora_fim: formatarValorPlanilha(sessao.hora_fim),
    id_huddle: sessao.id_huddle,
    id_usuario_abertura: sessao.id_usuario_abertura,
    status: sessao.status
  };
}

function formatarValorPlanilha(valor) {
  if (!valor) return "";

  if (Object.prototype.toString.call(valor) === "[object Date]") {
    return Utilities.formatDate(valor, TZ, "dd/MM/yyyy HH:mm:ss");
  }

  return String(valor);
}
