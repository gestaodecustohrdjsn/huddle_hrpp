const API = "https://script.google.com/macros/s/AKfycbyndvdgqzn7xz4ypf4elpmgYRO1T4I8hLYUgbl5n-5Qu3JsHNKXEKS3ddihGb5-b0p6xw/exec";
const CHAVE_SESSAO = "huddle_hrpp_session_token";

const estado = {
  token: sessionStorage.getItem(CHAVE_SESSAO) || "",
  usuario: null,
  usuariosLogin: [],
  dados: { reunioes: [], usuarios: [], setores: [], huddles: [], categorias: [], sugestoes: [] },
  reuniao: null,
  setor: null,
  perguntas: [],
  respostas: [],
  indice: 0,
  respostaTemporaria: "",
  resolucaoEdicao: null,
  abaConfig: "usuarios",
  edicao: null
};

let carregando = false;

if (window.top !== window.self) {
  window.top.location = window.self.location.href;
}

document.addEventListener("DOMContentLoaded", iniciar);
document.addEventListener("click", tratarClique);
document.addEventListener("submit", tratarSubmit);
document.addEventListener("change", tratarChange);

function $(id) {
  return document.getElementById(id);
}

async function iniciar() {
  try {
    await carregarUsuariosLogin();
    if (estado.token) {
      try {
        await carregarBootstrap();
        ativarInterface();
        abrirInicio();
        return;
      } catch (erro) {
        if (!["NAO_AUTORIZADO", "USUARIO_INVALIDO"].includes(erro.codigo)) throw erro;
        limparSessaoLocal();
      }
    }
    mostrarLogin();
  } catch (erro) {
    mostrarErro(erro.message);
  }
}

async function tratarClique(evento) {
  const elemento = evento.target.closest("[data-action]");
  if (!elemento) return;
  const action = elemento.dataset.action;
  const value = elemento.dataset.value;
  const id = elemento.dataset.id;

  try {
    const acoes = {
      "abrir-inicio": abrirInicio,
      "abrir-nova-reuniao": abrirNovaReuniao,
      "abrir-configuracoes": abrirConfiguracoes,
      "logout": logout,
      "iniciar-reuniao": iniciarReuniao,
      "abrir-reuniao": () => abrirDetalheReuniao(id),
      "retomar-reuniao": retomarReuniao,
      "selecionar-setor": () => selecionarSetor(id),
      "finalizar-reuniao": finalizarReuniao,
      "selecionar-resposta": () => selecionarResposta(value),
      "voltar-pergunta": voltarPergunta,
      "continuar-pergunta": continuarPergunta,
      "voltar-revisao": voltarDaRevisao,
      "salvar-setor": salvarSetor,
      "abrir-pendencia": abrirModalPendencia,
      "fechar-pendencia": fecharModalPendencia,
      "confirmar-pendencia": confirmarPendencia,
      "remover-pendencia": () => removerPendencia(Number(elemento.dataset.index)),
      "abrir-resolucao": () => abrirModalResolucao(id),
      "fechar-resolucao": fecharModalResolucao,
      "salvar-resolucao": salvarResolucao,
      "selecionar-config": () => selecionarAbaConfig(value),
      "editar-usuario": () => editarUsuario(id),
      "editar-setor": () => editarSetor(id),
      "editar-huddle": () => editarHuddle(id),
      "editar-pergunta": () => editarPergunta(id),
      "excluir-config": () => excluirConfig(elemento.dataset.entity, id),
      "recarregar": () => location.reload()
    };
    if (acoes[action]) await acoes[action]();
  } catch (erro) {
    tratarErro(erro);
  }
}

async function tratarSubmit(evento) {
  evento.preventDefault();
  try {
    if (evento.target.id === "form-login") await login();
    if (evento.target.id === "form-usuario") await salvarUsuario();
    if (evento.target.id === "form-setor") await salvarNovoSetor();
    if (evento.target.id === "form-huddle") await salvarNovoHuddle();
    if (evento.target.id === "form-pergunta") await salvarNovaPergunta();
  } catch (erro) {
    tratarErro(erro);
  }
}

function tratarChange(evento) {
  if (evento.target.id === "select-huddle") renderizarPresencaSetores();
  if (evento.target.id === "resolucao-resultado") atualizarCamposResolucao();
  if (evento.target.id === "cfg-pergunta-setor-filtro") carregarPerguntasConfig().catch(tratarErro);
}

/* API E SESSÃO */

async function apiGet(parametros, publico = false) {
  const payload = { ...parametros, _cache: Date.now() + "_" + Math.random() };
  if (!publico) payload.session_token = estado.token;
  const resposta = await fetch(API + "?" + new URLSearchParams(payload), {
    method: "GET",
    cache: "no-store",
    referrerPolicy: "no-referrer"
  });
  if (!resposta.ok) throw criarErro("HTTP_" + resposta.status, "Falha na API.");
  const dados = await resposta.json();
  if (dados.sucesso === false) throw criarErro(dados.codigo || "ERRO_API", dados.erro || "Erro na API.");
  return dados;
}

async function apiPost(payload, incluirSessao = true) {
  const requestId = base64UrlAleatorio(24);
  const corpo = new URLSearchParams();
  corpo.append("payload", JSON.stringify({
    ...payload,
    request_id: requestId,
    session_token: incluirSessao ? estado.token : payload.session_token
  }));
  await fetch(API, {
    method: "POST",
    mode: "no-cors",
    body: corpo,
    referrerPolicy: "no-referrer"
  });
  if (!incluirSessao) return { sucesso: true };

  for (let tentativa = 0; tentativa < 12; tentativa++) {
    await esperar(tentativa ? 350 : 150);
    const status = await apiGet({ action: "operationStatus", request_id: requestId });
    if (status.pendente) continue;
    const resultado = status.resultado || {};
    if (resultado.sucesso === false) {
      throw criarErro(resultado.codigo || "ERRO_API", resultado.erro || "Operação rejeitada.");
    }
    return resultado;
  }
  throw criarErro("CONFIRMACAO_FALHOU", "Não foi possível confirmar a operação.");
}

async function carregarUsuariosLogin() {
  const retorno = await apiGet({ action: "usuariosLogin" }, true);
  estado.usuariosLogin = retorno.usuarios || [];
  $("login-usuario").innerHTML = `<option value="">Selecione seu nome</option>` +
    estado.usuariosLogin.map(u =>
      `<option value="${atributo(u.id_usuario)}">${escapar(u.nome)} — ${escapar(u.cargo || "")}</option>`
    ).join("");
}

async function login() {
  const idUsuario = $("login-usuario").value;
  const pin = $("login-pin").value;
  esconderErroLogin();
  if (!idUsuario || !/^\d{8,12}$/.test(pin)) {
    return exibirErroLogin("Selecione o usuário e informe um PIN de 8 a 12 dígitos.");
  }

  await executarComLoading("Validando acesso...", async () => {
    const desafio = await apiGet({ action: "authChallenge", id_usuario: idUsuario }, true);
    const verifier = await sha256Hex(desafio.salt + ":" + pin);
    const proof = await hmacHex(desafio.nonce, hexParaBytes(verifier));
    const retorno = await apiGet({
      action: "authLogin",
      challenge_id: desafio.challenge_id,
      proof: proof
    }, true);
    estado.token = retorno.session_token;
    sessionStorage.setItem(CHAVE_SESSAO, estado.token);
    $("login-pin").value = "";
    await carregarBootstrap(false);
    ativarInterface();
    abrirInicio();
  }).catch(erro => {
    exibirErroLogin(erro.message);
  });
}

async function logout() {
  if (estado.token) {
    try {
      await apiPost({ action: "authLogout", session_token: estado.token }, false);
    } catch (_) {
      // A sessão local será removida mesmo se a rede falhar.
    }
  }
  limparSessaoLocal();
  await carregarUsuariosLogin();
  mostrarLogin();
}

function limparSessaoLocal() {
  sessionStorage.removeItem(CHAVE_SESSAO);
  estado.token = "";
  estado.usuario = null;
  estado.dados = { reunioes: [], usuarios: [], setores: [], huddles: [], categorias: [], sugestoes: [] };
  $("menu-autenticado").classList.add("hidden");
  $("usuario-logado").classList.add("hidden");
}

async function carregarBootstrap(comLoading = true) {
  const tarefa = async () => {
    const retorno = await apiGet({ action: "bootstrap" });
    estado.usuario = retorno.usuario;
    estado.dados = retorno;
  };
  return comLoading ? executarComLoading("Carregando dados...", tarefa) : tarefa();
}

function ativarInterface() {
  $("menu-autenticado").classList.remove("hidden");
  $("usuario-logado").classList.remove("hidden");
  $("usuario-logado").textContent = `${estado.usuario.nome} · ${estado.usuario.perfil}`;
  $("btn-configuracoes").classList.toggle("hidden", !ehAdmin());
}

function mostrarLogin() {
  esconderErroLogin();
  $("menu-autenticado").classList.add("hidden");
  $("usuario-logado").classList.add("hidden");
  mostrarTela("tela-login");
}

function ehAdmin() {
  return estado.usuario?.perfil === "ADMIN";
}

/* NAVEGAÇÃO */

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.add("hidden"));
  $(id).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirInicio() {
  exigirLoginLocal();
  renderizarReunioes();
  mostrarTela("tela-inicio");
}

function abrirConfiguracoes() {
  exigirAdminLocal();
  selecionarAbaConfig(estado.abaConfig);
  mostrarTela("tela-configuracoes");
}

function mostrarErro(mensagem) {
  $("mensagem-erro").textContent = mensagem;
  mostrarTela("tela-erro");
}

function tratarErro(erro) {
  if (["NAO_AUTORIZADO", "USUARIO_INVALIDO"].includes(erro.codigo)) {
    limparSessaoLocal();
    exibirErroLogin("Sua sessão expirou. Entre novamente.");
    mostrarLogin();
    return;
  }
  if (erro.codigo === "SEM_PERMISSAO") {
    alert("Seu perfil não permite esta operação.");
    return;
  }
  console.error(erro);
  alert(erro.message || "Ocorreu um erro.");
}

/* REUNIÕES */

function renderizarReunioes() {
  $("lista-reunioes").innerHTML = estado.dados.reunioes.length
    ? estado.dados.reunioes.map(r => `
      <article class="card-reuniao">
        <button class="card-botao" type="button" data-action="abrir-reuniao" data-id="${atributo(r.id_reuniao)}">
          <div class="card-cabecalho">
            <div>
              <span class="card-data">${escapar(r.data)} · ${escapar(r.hora_inicio)}</span>
              <h3>${escapar(r.huddle?.nome_huddle || "Huddle")} — ${escapar(r.usuario?.nome || "")}</h3>
            </div>
            <span class="tag-status ${r.status === "Em Andamento" ? "tag-andamento" : "tag-respondido"}">${escapar(r.status)}</span>
          </div>
          <div class="metricas-card">
            <span><strong>${Number(r.total_respondidos)}</strong>/${Number(r.total_setores)} setores</span>
            <span><strong>${Number(r.pendencias_abertas)}</strong> pendências abertas</span>
          </div>
        </button>
      </article>`).join("")
    : `<div class="estado-vazio"><h3>Nenhuma reunião</h3><p>Cadastre setores e um Huddle para começar.</p></div>`;
}

function abrirNovaReuniao() {
  if (!estado.dados.huddles.some(h => h.setores?.length)) {
    return alert("Nenhum Huddle possui setores cadastrados.");
  }
  $("select-huddle").innerHTML = `<option value="">Selecione</option>` +
    estado.dados.huddles.filter(h => h.setores?.length)
      .map(h => `<option value="${atributo(h.id_huddle)}">${escapar(h.nome_huddle)}</option>`).join("");
  $("lista-presenca").innerHTML = `<div class="estado-vazio"><p>Selecione um Huddle.</p></div>`;
  mostrarTela("tela-nova-reuniao");
}

function renderizarPresencaSetores() {
  const huddle = huddlePorId($("select-huddle").value);
  $("lista-presenca").innerHTML = huddle
    ? huddle.setores.map(s => `
      <label class="check-card">
        <input type="checkbox" name="presenca-setor" value="${atributo(s.id_setor)}">
        <span><strong>${escapar(s.nome_setor)}</strong><small>${escapar(s.classificacao || "")}</small></span>
      </label>`).join("")
    : `<div class="estado-vazio"><p>Selecione um Huddle.</p></div>`;
}

async function iniciarReuniao() {
  const idHuddle = $("select-huddle").value;
  if (!idHuddle) return alert("Selecione o Huddle.");
  const idReuniao = gerarIdCliente("REU");
  const presentes = [...document.querySelectorAll('input[name="presenca-setor"]:checked')].map(x => x.value);

  await executarComLoading("Iniciando reunião...", async () => {
    await apiPost({
      action: "criarReuniao",
      id_reuniao: idReuniao,
      id_huddle: idHuddle,
      setores_presentes: presentes
    });
    const reuniao = await aguardarReuniao(idReuniao);
    estado.reuniao = { ...reuniao, setores_respondidos: [] };
    await carregarBootstrap(false);
    mostrarSetores();
  });
}

async function aguardarReuniao(id) {
  for (let i = 0; i < 8; i++) {
    await esperar(i ? 800 : 1300);
    const retorno = await apiGet({ action: "reuniao", id_reuniao: id }).catch(() => null);
    if (retorno?.reuniao) return retorno.reuniao;
  }
  throw criarErro("CONFIRMACAO_FALHOU", "A reunião foi enviada, mas ainda não apareceu na planilha.");
}

async function abrirDetalheReuniao(id) {
  await executarComLoading("Carregando reunião...", async () => {
    const r = await apiGet({ action: "reuniao", id_reuniao: id });
    estado.reuniao = r.reuniao;
    renderizarDetalhe();
    mostrarTela("tela-detalhe-reuniao");
  });
}

function renderizarDetalhe() {
  const r = estado.reuniao;
  $("detalhe-titulo").textContent = `${r.huddle?.nome_huddle || "Huddle"} — ${r.data}`;
  $("detalhe-subtitulo").textContent =
    `${r.hora_inicio}${r.hora_fim ? " às " + r.hora_fim : ""} · ${r.usuario?.nome || ""} · ${r.status}`;
  $("btn-retomar-reuniao").classList.toggle("hidden", r.status !== "Em Andamento");
  const presentes = r.presencas.filter(p => estaSim(p.presente));
  $("detalhe-presencas").innerHTML = presentes.length
    ? presentes.map(p => `<span class="chip">${escapar(p.setor?.nome_setor || "")}</span>`).join("")
    : `<span class="texto-apoio">Nenhum setor marcado como presente.</span>`;
  $("detalhe-pendencias").innerHTML = r.pendencias.length
    ? r.pendencias.map(renderCardPendencia).join("")
    : `<div class="estado-vazio"><p>Nenhuma pendência.</p></div>`;
}

function renderCardPendencia(p) {
  const aberta = p.status === "Aberta";
  return `<article class="card-pendencia">
    <div class="card-cabecalho">
      <div><span class="card-data">${escapar(p.setor_origem?.nome_setor || "")}</span><h3>${escapar(p.titulo)}</h3></div>
      <span class="tag-status ${aberta ? "tag-pendencia" : "tag-respondido"}">${escapar(p.status)}</span>
    </div>
    ${p.descricao ? `<p>${escapar(p.descricao)}</p>` : ""}
    <p><strong>Apoios:</strong> ${escapar((p.apoios || []).map(a => a.setor?.nome_setor).filter(Boolean).join(", ") || "Nenhum")}</p>
    ${aberta ? `<button class="btn-principal btn-menor" type="button" data-action="abrir-resolucao" data-id="${atributo(p.id_pendencia)}">Resolver / atualizar</button>` : ""}
  </article>`;
}

function retomarReuniao() {
  mostrarSetores();
}

function mostrarSetores() {
  const setores = estado.reuniao.huddle?.setores || [];
  const respondidos = new Set((estado.reuniao.setores_respondidos || []).map(String));
  $("info-reuniao").textContent =
    `${estado.reuniao.huddle?.nome_huddle || ""} · ${estado.reuniao.data} · ${estado.reuniao.id_reuniao}`;
  $("info-usuario").textContent = estado.usuario.nome;
  $("progresso-setores").textContent = `${respondidos.size} de ${setores.length}`;
  $("lista-setores").innerHTML = setores.map(s => {
    const respondido = respondidos.has(String(s.id_setor));
    return `<button class="item-setor ${respondido ? "respondido" : ""}" type="button"
      data-action="selecionar-setor" data-id="${atributo(s.id_setor)}" ${respondido ? "disabled" : ""}>
      <span><strong>${escapar(s.nome_setor)}</strong><small>${escapar(s.classificacao || "")}</small></span>
      <span class="tag-status ${respondido ? "tag-respondido" : "tag-aguardando"}">${respondido ? "Respondido" : "Aguardando resposta"}</span>
    </button>`;
  }).join("");
  $("btn-finalizar-reuniao").classList.toggle("hidden",
    !setores.length || respondidos.size !== setores.length);
  mostrarTela("tela-setores");
}

async function finalizarReuniao() {
  if (!confirm("Finalizar esta reunião?")) return;
  await executarComLoading("Finalizando reunião...", async () => {
    await apiPost({ action: "finalizarReuniao", id_reuniao: estado.reuniao.id_reuniao });
    await esperar(1300);
    await carregarBootstrap(false);
    abrirInicio();
  });
}

/* PERGUNTAS E PENDÊNCIAS */

async function selecionarSetor(id) {
  estado.setor = setorPorId(id);
  estado.indice = 0;
  estado.respostas = [];
  await executarComLoading("Carregando perguntas...", async () => {
    estado.perguntas = await apiGet({ action: "perguntas", id_setor: id });
    if (!estado.perguntas.length) throw criarErro("SEM_PERGUNTAS", "Este setor não possui perguntas.");
    mostrarPergunta();
  });
}

function mostrarPergunta() {
  const p = estado.perguntas[estado.indice];
  const salva = estado.respostas.find(r => r.id_pergunta === p.id_pergunta);
  estado.respostaTemporaria = salva?.resposta || "";
  $("info-contexto").textContent = `${estado.setor.nome_setor} · ${estado.reuniao.id_reuniao}`;
  $("contador-pergunta").textContent = `Pergunta ${estado.indice + 1} de ${estado.perguntas.length}`;
  $("texto-pergunta").textContent = p.pergunta;
  $("btn-voltar-pergunta").textContent = estado.indice ? "Voltar" : "Voltar para setores";
  $("btn-continuar-pergunta").textContent =
    estado.indice === estado.perguntas.length - 1 ? "Revisar setor" : "Continuar";
  montarResposta(p, salva);
  renderPendenciasPergunta(p, salva);
  mostrarTela("tela-pergunta");
}

function montarResposta(p, salva) {
  const comentario = estaSim(p.permite_comentario)
    ? `<label for="campo-comentario">Comentário</label><textarea id="campo-comentario" maxlength="2000">${escapar(salva?.comentario || "")}</textarea>`
    : "";
  if (p.tipo === "NUMERO") {
    $("area-resposta").innerHTML =
      `<label for="campo-resposta">Resposta</label><input id="campo-resposta" type="number" value="${atributo(salva?.resposta || "")}">${comentario}`;
  } else if (p.tipo === "TEXTO") {
    $("area-resposta").innerHTML =
      `<label for="campo-resposta">Resposta</label><textarea id="campo-resposta" maxlength="2000">${escapar(salva?.resposta || "")}</textarea>${comentario}`;
  } else {
    $("area-resposta").innerHTML = `<div class="opcoes-resposta">
      <button id="btn-sim" type="button" data-action="selecionar-resposta" data-value="SIM">SIM</button>
      <button id="btn-nao" type="button" data-action="selecionar-resposta" data-value="NAO">NÃO</button>
    </div>${comentario}`;
    selecionarResposta(estado.respostaTemporaria, false);
  }
}

function selecionarResposta(valor, redesenhar = true) {
  estado.respostaTemporaria = valor;
  $("btn-sim")?.classList.toggle("selecionado", valor === "SIM");
  $("btn-nao")?.classList.toggle("selecionado", valor === "NAO");
  if (redesenhar) {
    const p = estado.perguntas[estado.indice];
    renderPendenciasPergunta(p, estado.respostas.find(r => r.id_pergunta === p.id_pergunta));
  }
}

function renderPendenciasPergunta(p, salva) {
  const lista = salva?.pendencias || [];
  $("area-pendencias").innerHTML =
    lista.map((x, i) => `<div class="mini-pendencia">
      <strong>${escapar(x.titulo)}</strong>
      <button class="btn-link texto-perigo" type="button" data-action="remover-pendencia" data-index="${i}">Remover</button>
    </div>`).join("") +
    (gatilhoPendencia(p, estado.respostaTemporaria)
      ? `<button class="btn-adicionar" type="button" data-action="abrir-pendencia">+ Adicionar pendência</button>`
      : "");
}

function gatilhoPendencia(p, resposta) {
  return estaSim(p.gera_pendencia) &&
    normalizar(resposta) === normalizar(p.resposta_gera_pendencia || "SIM");
}

function capturarResposta(validar) {
  const p = estado.perguntas[estado.indice];
  const existente = estado.respostas.find(r => r.id_pergunta === p.id_pergunta);
  const resposta = p.tipo === "SIM_NAO"
    ? estado.respostaTemporaria
    : ($("campo-resposta")?.value || "").trim();
  if (validar && estaSim(p.obrigatoria) && !resposta) {
    alert("Preencha a resposta.");
    return null;
  }
  return {
    id_pergunta: p.id_pergunta,
    pergunta: p.pergunta,
    resposta: resposta,
    comentario: ($("campo-comentario")?.value || "").trim(),
    pendencias: existente?.pendencias || []
  };
}

function salvarRespostaLocal(r) {
  const indice = estado.respostas.findIndex(x => x.id_pergunta === r.id_pergunta);
  if (indice >= 0) estado.respostas[indice] = r;
  else estado.respostas.push(r);
}

function continuarPergunta() {
  const r = capturarResposta(true);
  if (!r) return;
  salvarRespostaLocal(r);
  if (estado.indice < estado.perguntas.length - 1) {
    estado.indice += 1;
    mostrarPergunta();
  } else {
    mostrarRevisao();
  }
}

function voltarPergunta() {
  const r = capturarResposta(false);
  if (r && (r.resposta || r.comentario || r.pendencias.length)) salvarRespostaLocal(r);
  if (!estado.indice) {
    if (!estado.respostas.length || confirm("O progresso não foi salvo. Voltar?")) mostrarSetores();
    return;
  }
  estado.indice -= 1;
  mostrarPergunta();
}

function mostrarRevisao() {
  $("resumo-respostas").innerHTML = estado.respostas.map((r, i) => `
    <article class="card-resumo">
      <h3>${i + 1}. ${escapar(r.pergunta)}</h3>
      <p><strong>Resposta:</strong> ${escapar(r.resposta || "-")}</p>
      ${r.comentario ? `<p>${escapar(r.comentario)}</p>` : ""}
      ${r.pendencias.map(p => `<div class="mini-pendencia"><strong>${escapar(p.titulo)}</strong><span class="tag-status tag-pendencia">Pendência</span></div>`).join("")}
    </article>`).join("");
  mostrarTela("tela-revisao");
}

function voltarDaRevisao() {
  estado.indice = estado.perguntas.length - 1;
  mostrarPergunta();
}

async function salvarSetor() {
  const id = estado.setor.id_setor;
  await executarComLoading("Salvando setor...", async () => {
    await apiPost({
      action: "salvarSetor",
      id_reuniao: estado.reuniao.id_reuniao,
      id_setor: id,
      respostas: estado.respostas
    });
    let confirmado = false;
    for (let i = 0; i < 8 && !confirmado; i++) {
      await esperar(i ? 800 : 1300);
      const retorno = await apiGet({
        action: "confirmarSetor",
        id_reuniao: estado.reuniao.id_reuniao,
        id_setor: id
      });
      confirmado = retorno.confirmado;
    }
    if (!confirmado) throw criarErro("CONFIRMACAO_FALHOU", "Não foi possível confirmar a gravação.");
    estado.reuniao.setores_respondidos.push(String(id));
    await carregarBootstrap(false);
    mostrarSetores();
  });
}

function abrirModalPendencia() {
  $("pendencia-titulo").value = "";
  $("pendencia-descricao").value = "";
  $("pendencia-categoria").innerHTML =
    `<option value="">Sem âmbito</option>` +
    estado.dados.categorias.map(c =>
      `<option value="${atributo(c.id_categoria)}">${escapar(c.nome_categoria)}</option>`
    ).join("");
  $("sugestoes-titulo").innerHTML = sugestoes("TITULO_PENDENCIA");
  $("pendencia-apoios").innerHTML = estado.dados.setores
    .filter(s => s.id_setor !== estado.setor.id_setor)
    .map(s => `<label class="check-card">
      <input type="checkbox" name="apoio" value="${atributo(s.id_setor)}">
      <span><strong>${escapar(s.nome_setor)}</strong></span>
    </label>`).join("");
  $("modal-pendencia").classList.remove("hidden");
}

function fecharModalPendencia() {
  $("modal-pendencia").classList.add("hidden");
}

function confirmarPendencia() {
  const titulo = $("pendencia-titulo").value.trim();
  if (!titulo) return alert("Informe o título.");
  const r = capturarResposta(false) || {
    id_pergunta: estado.perguntas[estado.indice].id_pergunta,
    pergunta: estado.perguntas[estado.indice].pergunta,
    resposta: estado.respostaTemporaria,
    comentario: "",
    pendencias: []
  };
  r.pendencias.push({
    titulo: titulo,
    descricao: $("pendencia-descricao").value.trim(),
    id_categoria: $("pendencia-categoria").value,
    setores_apoio: [...document.querySelectorAll('input[name="apoio"]:checked')].map(x => x.value)
  });
  salvarRespostaLocal(r);
  fecharModalPendencia();
  renderPendenciasPergunta(estado.perguntas[estado.indice], r);
}

function removerPendencia(indice) {
  const p = estado.perguntas[estado.indice];
  const r = estado.respostas.find(x => x.id_pergunta === p.id_pergunta);
  if (!r) return;
  r.pendencias.splice(indice, 1);
  renderPendenciasPergunta(p, r);
}

function abrirModalResolucao(id) {
  estado.resolucaoEdicao = estado.reuniao.pendencias.find(p => p.id_pendencia === id);
  $("resolucao-titulo").textContent = estado.resolucaoEdicao.titulo;
  $("resolucao-resultado").value = "Resolvida";
  $("resolucao-motivo").value = "";
  $("resolucao-observacao").value = "";
  $("sugestoes-motivo").innerHTML = sugestoes("MOTIVO_NAO_RESOLUCAO");
  atualizarCamposResolucao();
  $("modal-resolucao").classList.remove("hidden");
}

function fecharModalResolucao() {
  $("modal-resolucao").classList.add("hidden");
}

function atualizarCamposResolucao() {
  const valor = $("resolucao-resultado").value;
  $("campos-resolvida").classList.toggle("hidden", valor !== "Resolvida");
  $("campos-sem-solucao").classList.toggle("hidden", valor !== "Sem Solucao");
}

async function salvarResolucao() {
  const resultado = $("resolucao-resultado").value;
  if (resultado === "Sem Solucao" && !$("resolucao-motivo").value.trim()) {
    return alert("Informe o motivo.");
  }
  await executarComLoading("Atualizando pendência...", async () => {
    await apiPost({
      action: "resolverPendencia",
      id_pendencia: estado.resolucaoEdicao.id_pendencia,
      resultado_resolucao: resultado,
      concluida_dentro_prazo: resultado === "Resolvida" ? $("resolucao-dentro-prazo").value : "",
      houve_problemas: resultado === "Resolvida" ? $("resolucao-problemas").value : "",
      apoios_cumpriram: resultado === "Resolvida" ? $("resolucao-apoios").value : "",
      motivo_nao_resolucao: $("resolucao-motivo").value.trim(),
      observacao_resolucao: $("resolucao-observacao").value.trim()
    });
    await esperar(1200);
    fecharModalResolucao();
    const detalhe = await apiGet({ action: "reuniao", id_reuniao: estado.reuniao.id_reuniao });
    estado.reuniao = detalhe.reuniao;
    renderizarDetalhe();
    await carregarBootstrap(false);
  });
}

/* CONFIGURAÇÕES */

function selecionarAbaConfig(aba) {
  exigirAdminLocal();
  estado.abaConfig = aba;
  estado.edicao = null;
  document.querySelectorAll(".aba").forEach(b =>
    b.classList.toggle("ativa", b.dataset.value === aba)
  );
  if (aba === "usuarios") renderUsuarios();
  if (aba === "setores") renderSetoresConfig();
  if (aba === "huddles") renderHuddlesConfig();
  if (aba === "perguntas") renderPerguntasConfig();
}

function renderUsuarios() {
  $("config-conteudo").innerHTML = `<div class="config-layout">
    <form id="form-usuario" class="card-form">
      <h3>${estado.edicao?.tipo === "usuario" ? "Editar" : "Novo"} usuário</h3>
      <input id="cfg-usuario-nome" maxlength="120" placeholder="Nome" required>
      <input id="cfg-usuario-cargo" maxlength="120" placeholder="Cargo">
      <select id="cfg-usuario-perfil">
        <option value="COORDENADOR">Coordenador</option>
        <option value="ADMIN">Administrador</option>
      </select>
      <input id="cfg-usuario-pin" type="password" inputmode="numeric" pattern="[0-9]{8,12}" minlength="8" maxlength="12"
        placeholder="${estado.edicao?.tipo === "usuario" ? "Novo PIN (opcional)" : "PIN de 8 a 12 dígitos"}">
      <button class="btn-principal" type="submit">Salvar</button>
    </form>
    <div class="lista-cards">${estado.dados.usuarios.map(u =>
      cardConfig(u.nome, `${u.cargo || ""} · ${u.perfil}`, "usuario", u.id_usuario)
    ).join("")}</div>
  </div>`;
  if (estado.edicao?.tipo === "usuario") preencherUsuarioEdicao();
}

function renderSetoresConfig() {
  $("config-conteudo").innerHTML = `<div class="config-layout">
    <form id="form-setor" class="card-form">
      <h3>${estado.edicao?.tipo === "setor" ? "Editar" : "Novo"} setor</h3>
      <input id="cfg-setor-nome" maxlength="120" placeholder="Nome" required>
      <input id="cfg-setor-classificacao" maxlength="80" placeholder="Classificação">
      <textarea id="cfg-setor-descricao" maxlength="1000" placeholder="Descrição"></textarea>
      <button class="btn-principal" type="submit">Salvar</button>
    </form>
    <div class="lista-cards">${estado.dados.setores.map(s =>
      cardConfig(s.nome_setor, s.classificacao, "setor", s.id_setor)
    ).join("")}</div>
  </div>`;
  if (estado.edicao?.tipo === "setor") preencherSetorEdicao();
}

function renderHuddlesConfig() {
  $("config-conteudo").innerHTML = `<div class="config-layout">
    <form id="form-huddle" class="card-form">
      <h3>${estado.edicao?.tipo === "huddle" ? "Editar" : "Novo"} Huddle</h3>
      <input id="cfg-huddle-nome" maxlength="120" placeholder="Nome" required>
      <textarea id="cfg-huddle-descricao" maxlength="1000" placeholder="Descrição"></textarea>
      <label>Setores participantes</label>
      <div class="lista-checks compacta">${estado.dados.setores.map(s => `
        <label class="check-card">
          <input type="checkbox" name="cfg-huddle-setor" value="${atributo(s.id_setor)}">
          <span>${escapar(s.nome_setor)}</span>
        </label>`).join("")}</div>
      <button class="btn-principal" type="submit">Salvar Huddle</button>
    </form>
    <div class="lista-cards">${estado.dados.huddles.map(h =>
      cardConfig(h.nome_huddle, `${h.setores.length} setores`, "huddle", h.id_huddle)
    ).join("")}</div>
  </div>`;
  if (estado.edicao?.tipo === "huddle") preencherHuddleEdicao();
}

function renderPerguntasConfig() {
  $("config-conteudo").innerHTML = `
    <label for="cfg-pergunta-setor-filtro">Setor</label>
    <select id="cfg-pergunta-setor-filtro">${opcoesSetores()}</select>
    <div id="cfg-perguntas-lista"></div>`;
  carregarPerguntasConfig().catch(tratarErro);
}

async function carregarPerguntasConfig() {
  const idSetor = $("cfg-pergunta-setor-filtro")?.value;
  if (!idSetor) return;
  const perguntas = await apiGet({ action: "perguntas", id_setor: idSetor });
  estado.perguntasConfig = perguntas;
  $("cfg-perguntas-lista").innerHTML = `
    <form id="form-pergunta" class="card-form">
      <h3>${estado.edicao?.tipo === "pergunta" ? "Editar" : "Adicionar"} pergunta</h3>
      <textarea id="cfg-pergunta-texto" maxlength="500" required></textarea>
      <div class="grid-form">
        <select id="cfg-pergunta-tipo"><option>SIM_NAO</option><option>NUMERO</option><option>TEXTO</option></select>
        <select id="cfg-pergunta-obrigatoria"><option value="SIM">Obrigatória</option><option value="NAO">Opcional</option></select>
        <select id="cfg-pergunta-comentario"><option value="SIM">Com comentário</option><option value="NAO">Sem comentário</option></select>
        <select id="cfg-pergunta-pendencia"><option value="SIM">Pode gerar pendência</option><option value="NAO">Não gera</option></select>
        <select id="cfg-pergunta-gatilho"><option value="SIM">Gatilho SIM</option><option value="NAO">Gatilho NÃO</option></select>
      </div>
      <button class="btn-principal" type="submit">Salvar</button>
    </form>
    <div class="lista-ordenavel">${perguntas.map((p, i) => `
      <article class="card-pergunta" draggable="true" data-id="${atributo(p.id_pergunta)}">
        <span class="alca">⋮⋮</span>
        <div><strong>${i + 1}. ${escapar(p.pergunta)}</strong><small>${escapar(p.tipo)}</small></div>
        <div class="acoes-card">
          <button class="btn-link" type="button" data-action="editar-pergunta" data-id="${atributo(p.id_pergunta)}">Editar</button>
          <button class="btn-link texto-perigo" type="button" data-action="excluir-config" data-entity="pergunta" data-id="${atributo(p.id_pergunta)}">Remover</button>
        </div>
      </article>`).join("")}</div>`;
  if (estado.edicao?.tipo === "pergunta") preencherPerguntaEdicao();
  ativarOrdenacao();
}

function cardConfig(titulo, subtitulo, entidade, id) {
  return `<article class="card-resumo">
    <h3>${escapar(titulo)}</h3><p>${escapar(subtitulo || "")}</p>
    <div class="acoes-card">
      <button class="btn-link" type="button" data-action="editar-${entidade}" data-id="${atributo(id)}">Editar</button>
      <button class="btn-link texto-perigo" type="button" data-action="excluir-config" data-entity="${entidade}" data-id="${atributo(id)}">Remover</button>
    </div>
  </article>`;
}

async function salvarUsuario() {
  const pin = $("cfg-usuario-pin").value;
  if (!estado.edicao && !/^\d{8,12}$/.test(pin)) {
    return alert("Defina um PIN de 8 a 12 dígitos.");
  }
  if (pin && !/^\d{8,12}$/.test(pin)) return alert("PIN inválido.");
  const registroAtual = estado.edicao?.registro || {};
  const payload = {
    action: "salvarUsuario",
    registro: {
      ...registroAtual,
      nome: $("cfg-usuario-nome").value.trim(),
      cargo: $("cfg-usuario-cargo").value.trim(),
      perfil: $("cfg-usuario-perfil").value,
      ordem: registroAtual.ordem || estado.dados.usuarios.length + 1,
      ativo: "SIM"
    }
  };
  if (pin) {
    payload.pin_salt = base64UrlAleatorio(18);
    payload.pin_verifier = await sha256Hex(payload.pin_salt + ":" + pin);
  }
  await salvarERecarregar(payload, "usuarios");
}

async function salvarNovoSetor() {
  const atual = estado.edicao?.registro || {};
  await salvarERecarregar({
    action: "salvarConfiguracao",
    entidade: "setor",
    registro: {
      ...atual,
      nome_setor: $("cfg-setor-nome").value.trim(),
      classificacao: $("cfg-setor-classificacao").value.trim(),
      descricao: $("cfg-setor-descricao").value.trim(),
      ordem: atual.ordem || estado.dados.setores.length + 1,
      ativo: "SIM"
    }
  }, "setores");
}

async function salvarNovoHuddle() {
  const setores = [...document.querySelectorAll('input[name="cfg-huddle-setor"]:checked')].map(x => x.value);
  if (!setores.length) return alert("Selecione ao menos um setor.");
  const atual = estado.edicao?.registro || {};
  await salvarERecarregar({
    action: "salvarHuddle",
    registro: {
      ...atual,
      nome_huddle: $("cfg-huddle-nome").value.trim(),
      descricao: $("cfg-huddle-descricao").value.trim(),
      ordem: atual.ordem || estado.dados.huddles.length + 1,
      ativo: "SIM"
    },
    setores: setores
  }, "huddles");
}

async function salvarNovaPergunta() {
  const idSetor = $("cfg-pergunta-setor-filtro").value;
  const atual = estado.edicao?.registro || {};
  await salvarERecarregar({
    action: "salvarConfiguracao",
    entidade: "pergunta",
    registro: {
      ...atual,
      id_setor: idSetor,
      ordem: atual.ordem || (estado.perguntasConfig?.length || 0) + 1,
      pergunta: $("cfg-pergunta-texto").value.trim(),
      tipo: $("cfg-pergunta-tipo").value,
      obrigatoria: $("cfg-pergunta-obrigatoria").value,
      permite_comentario: $("cfg-pergunta-comentario").value,
      gera_pendencia: $("cfg-pergunta-pendencia").value,
      resposta_gera_pendencia: $("cfg-pergunta-gatilho").value,
      ativo: "SIM"
    }
  }, "perguntas");
}

async function salvarERecarregar(payload, aba) {
  await executarComLoading("Salvando configuração...", async () => {
    await apiPost(payload);
    await esperar(1200);
    await carregarBootstrap(false);
    estado.edicao = null;
    selecionarAbaConfig(aba);
  });
}

function editarUsuario(id) {
  estado.edicao = { tipo: "usuario", registro: estado.dados.usuarios.find(x => x.id_usuario === id) };
  renderUsuarios();
}

function editarSetor(id) {
  estado.edicao = { tipo: "setor", registro: setorPorId(id) };
  renderSetoresConfig();
}

function editarHuddle(id) {
  estado.edicao = { tipo: "huddle", registro: huddlePorId(id) };
  renderHuddlesConfig();
}

function editarPergunta(id) {
  estado.edicao = { tipo: "pergunta", registro: estado.perguntasConfig.find(x => x.id_pergunta === id) };
  carregarPerguntasConfig().catch(tratarErro);
}

function preencherUsuarioEdicao() {
  const u = estado.edicao.registro;
  $("cfg-usuario-nome").value = u.nome || "";
  $("cfg-usuario-cargo").value = u.cargo || "";
  $("cfg-usuario-perfil").value = u.perfil || "COORDENADOR";
}

function preencherSetorEdicao() {
  const s = estado.edicao.registro;
  $("cfg-setor-nome").value = s.nome_setor || "";
  $("cfg-setor-classificacao").value = s.classificacao || "";
  $("cfg-setor-descricao").value = s.descricao || "";
}

function preencherHuddleEdicao() {
  const h = estado.edicao.registro;
  $("cfg-huddle-nome").value = h.nome_huddle || "";
  $("cfg-huddle-descricao").value = h.descricao || "";
  document.querySelectorAll('input[name="cfg-huddle-setor"]').forEach(input => {
    input.checked = h.setores.some(s => String(s.id_setor) === String(input.value));
  });
}

function preencherPerguntaEdicao() {
  const p = estado.edicao.registro;
  $("cfg-pergunta-texto").value = p.pergunta || "";
  $("cfg-pergunta-tipo").value = p.tipo || "SIM_NAO";
  $("cfg-pergunta-obrigatoria").value = p.obrigatoria || "NAO";
  $("cfg-pergunta-comentario").value = p.permite_comentario || "NAO";
  $("cfg-pergunta-pendencia").value = p.gera_pendencia || "NAO";
  $("cfg-pergunta-gatilho").value = p.resposta_gera_pendencia || "SIM";
}

async function excluirConfig(entidade, id) {
  exigirAdminLocal();
  if (!confirm("Remover? O registro será apenas desativado.")) return;
  await executarComLoading("Removendo...", async () => {
    await apiPost({ action: "excluirConfiguracao", entidade: entidade, id: id });
    await esperar(1100);
    await carregarBootstrap(false);
    selecionarAbaConfig(estado.abaConfig);
  });
}

function ativarOrdenacao() {
  const lista = document.querySelector(".lista-ordenavel");
  if (!lista) return;
  let arrastado = null;
  lista.querySelectorAll(".card-pergunta").forEach(card => {
    card.addEventListener("dragstart", () => {
      arrastado = card;
      card.classList.add("arrastando");
    });
    card.addEventListener("dragover", evento => {
      evento.preventDefault();
      if (!arrastado || arrastado === card) return;
      const caixa = card.getBoundingClientRect();
      lista.insertBefore(arrastado,
        evento.clientY < caixa.top + caixa.height / 2 ? card : card.nextSibling);
    });
    card.addEventListener("dragend", async () => {
      card.classList.remove("arrastando");
      try {
        for (const [i, item] of [...lista.children].entries()) {
          const pergunta = estado.perguntasConfig.find(p => p.id_pergunta === item.dataset.id);
          await apiPost({
            action: "salvarConfiguracao",
            entidade: "pergunta",
            registro: { ...pergunta, ordem: i + 1, ativo: "SIM" }
          });
        }
      } catch (erro) {
        tratarErro(erro);
      }
    });
  });
}

/* HELPERS */

async function executarComLoading(texto, funcao) {
  if (carregando) return;
  carregando = true;
  $("loading-texto").textContent = texto;
  $("loading").classList.remove("hidden");
  document.querySelectorAll("button, input, select, textarea").forEach(el => el.disabled = true);
  try {
    return await funcao();
  } finally {
    carregando = false;
    $("loading").classList.add("hidden");
    document.querySelectorAll("button, input, select, textarea").forEach(el => el.disabled = false);
  }
}

function exigirLoginLocal() {
  if (!estado.usuario || !estado.token) throw criarErro("NAO_AUTORIZADO", "Entre novamente.");
}

function exigirAdminLocal() {
  exigirLoginLocal();
  if (!ehAdmin()) throw criarErro("SEM_PERMISSAO", "Acesso exclusivo de administradores.");
}

function setorPorId(id) {
  return estado.dados.setores.find(x => String(x.id_setor) === String(id));
}

function huddlePorId(id) {
  return estado.dados.huddles.find(x => String(x.id_huddle) === String(id));
}

function opcoesSetores() {
  return estado.dados.setores
    .map(s => `<option value="${atributo(s.id_setor)}">${escapar(s.nome_setor)}</option>`)
    .join("");
}

function sugestoes(tipo) {
  return estado.dados.sugestoes
    .filter(s => normalizar(s.tipo) === normalizar(tipo))
    .map(s => `<option value="${atributo(s.valor)}"></option>`).join("");
}

function escapar(valor) {
  const div = document.createElement("div");
  div.textContent = valor == null ? "" : String(valor);
  return div.innerHTML;
}

function atributo(valor) {
  return escapar(valor).replace(/"/g, "&quot;");
}

function normalizar(valor) {
  return String(valor || "").trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function estaSim(valor) {
  return normalizar(valor) === "SIM";
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function gerarIdCliente(prefixo) {
  return prefixo + "-" + new Date().toISOString().replace(/\D/g, "").slice(0, 14) +
    "-" + Math.floor(Math.random() * 9000 + 1000);
}

function criarErro(codigo, mensagem) {
  const erro = new Error(mensagem);
  erro.codigo = codigo;
  return erro;
}

function exibirErroLogin(mensagem) {
  $("login-erro").textContent = mensagem;
  $("login-erro").classList.remove("hidden");
}

function esconderErroLogin() {
  $("login-erro").textContent = "";
  $("login-erro").classList.add("hidden");
}

async function sha256Hex(texto) {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesParaHex(new Uint8Array(digest));
}

async function hmacHex(texto, chaveBytes) {
  const chave = await crypto.subtle.importKey(
    "raw", chaveBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return bytesParaHex(new Uint8Array(assinatura));
}

function bytesParaHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexParaBytes(hex) {
  const resultado = new Uint8Array(hex.length / 2);
  for (let i = 0; i < resultado.length; i++) {
    resultado[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return resultado;
}

function base64UrlAleatorio(tamanho) {
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  let binario = "";
  bytes.forEach(b => binario += String.fromCharCode(b));
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
