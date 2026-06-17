const API =
  "https://script.google.com/macros/s/AKfycbx9_lyTqriYZYmgsVTxDfFFV_qPAgp_9mhxTaWlYm7nkW6hFN-dMnnb_DRcZED2JNgzjw/exec";

const estado = {
  usuario: null,
  huddle: null,
  sessao: null,
  setor: null,
  setores: [],
  setoresRespondidos: new Set(),
  perguntas: [],
  indice: 0,
  respostas: []
};

let respostaTemporaria = null;
let carregando = false;
let tokenRequisicao = 0;

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  try {
    mostrarTela("tela-login");
    await executarComLoading("Carregando usuários...", carregarUsuarios);
  } catch (erro) {
    mostrarErro("Erro ao iniciar o sistema: " + erro.message);
  }
}

function $(id) {
  return document.getElementById(id);
}

function mostrarTela(idTela) {
  document.querySelectorAll(".tela").forEach(tela => {
    tela.classList.add("hidden");
  });

  $(idTela).classList.remove("hidden");
}

function mostrarErro(mensagem) {
  $("mensagem-erro").innerText = mensagem;
  mostrarTela("tela-erro");
}

function setCarregando(valor, texto = "Carregando...") {
  carregando = valor;

  $("loading-texto").innerText = texto;

  if (valor) {
    $("loading").classList.remove("hidden");
  } else {
    $("loading").classList.add("hidden");
  }

  document.querySelectorAll("button, select, input, textarea").forEach(el => {
    el.disabled = valor;
  });
}

async function executarComLoading(texto, funcao) {
  if (carregando) return;

  setCarregando(true, texto);

  const inicio = Date.now();

  try {
    return await funcao();
  } finally {
    const tempoPassado = Date.now() - inicio;
    const tempoMinimo = 700;

    if (tempoPassado < tempoMinimo) {
      await new Promise(resolve => setTimeout(resolve, tempoMinimo - tempoPassado));
    }

    setCarregando(false);
  }
}

async function apiGet(parametros) {
  const url = API + "?" + new URLSearchParams(parametros).toString();

  const resposta = await fetch(url);

  if (!resposta.ok) {
    throw new Error("Falha na API: " + resposta.status);
  }

  return await resposta.json();
}

/* =========================
   USUÁRIOS
========================= */

async function carregarUsuarios() {
  const usuarios = await apiGet({ action: "usuarios" });

  const select = $("select-usuario");
  select.innerHTML = `<option value="">Selecione seu nome</option>`;

  usuarios.forEach(usuario => {
    const option = document.createElement("option");

    option.value = JSON.stringify(usuario);
    option.textContent = `${usuario.nome} - ${usuario.cargo}`;

    select.appendChild(option);
  });
}

async function confirmarUsuario() {
  if (carregando) return;

  const valor = $("select-usuario").value;

  if (!valor) {
    alert("Selecione um usuário para continuar.");
    return;
  }

  estado.usuario = JSON.parse(valor);

  $("info-usuario").innerText =
    `${estado.usuario.nome} | ${estado.usuario.cargo}`;

  $("info-usuario-setor").innerText =
    `${estado.usuario.nome} | ${estado.usuario.cargo}`;

  await executarComLoading("Carregando Huddles...", carregarHuddles);
}

/* =========================
   HUDDLES
========================= */

async function carregarHuddles() {
  mostrarTela("tela-huddle");

  estado.huddle = null;
  estado.sessao = null;
  estado.setor = null;
  estado.setores = [];
  estado.setoresRespondidos = new Set();
  estado.perguntas = [];
  estado.respostas = [];

  const huddles = await apiGet({ action: "huddles" });

  const lista = $("lista-huddles");
  lista.innerHTML = "";

  huddles.forEach(huddle => {
    const btn = document.createElement("button");

    btn.innerText = huddle.nome_huddle;

    btn.onclick = () => selecionarHuddle(huddle);

    lista.appendChild(btn);
  });
}

async function selecionarHuddle(huddle) {
  if (carregando) return;

  await executarComLoading("Abrindo sessão do Huddle...", async () => {
    estado.huddle = huddle;
    estado.setor = null;
    estado.perguntas = [];
    estado.respostas = [];
    estado.indice = 0;
    estado.setoresRespondidos = new Set();

    const sessao = await apiGet({
      action: "criarSessao",
      id_huddle: huddle.id_huddle,
      id_usuario: estado.usuario.id_usuario
    });

    if (!sessao.sucesso) {
      throw new Error(sessao.erro || "Não foi possível criar a sessão.");
    }

    estado.sessao = sessao;

    await carregarSetores(huddle.id_huddle);

    mostrarTelaSetores();
  });
}

function voltarParaHuddles() {
  if (carregando) return;

  const confirmar = confirm(
    "Deseja trocar o Huddle? A sessão atual não será finalizada."
  );

  if (!confirmar) return;

  executarComLoading("Carregando Huddles...", carregarHuddles);
}

/* =========================
   SETORES
========================= */

async function carregarSetores(idHuddle) {
  const tokenAtual = ++tokenRequisicao;

  const setores = await apiGet({
    action: "setores",
    id_huddle: idHuddle
  });

  if (tokenAtual !== tokenRequisicao) return;

  estado.setores = setores;
}

function mostrarTelaSetores() {
  $("info-sessao").innerText =
    `${estado.huddle.nome_huddle} | Sessão: ${estado.sessao.id_sessao}`;

  $("info-usuario-setor").innerText =
    `${estado.usuario.nome} | ${estado.usuario.cargo}`;

  renderizarSetores();

  mostrarTela("tela-setor");
}

function renderizarSetores() {
  const lista = $("lista-setores");
  lista.innerHTML = "";

  estado.setores.forEach(setor => {
    const respondido =
      estado.setoresRespondidos.has(String(setor.id_setor));

    const card = document.createElement("button");
    card.className = "card-setor" + (respondido ? " respondido" : "");

    card.innerHTML = `
      <h3>${setor.nome_setor}</h3>
      <span class="tag-status ${respondido ? "tag-respondido" : "tag-aguardando"}">
        ${respondido ? "Respondido" : "Aguardando Resposta"}
      </span>
    `;

    if (respondido) {
      card.disabled = true;
    } else {
      card.onclick = () => selecionarSetor(setor);
    }

    lista.appendChild(card);
  });

  const total = estado.setores.length;
  const respondidos = estado.setoresRespondidos.size;

  if (total > 0 && respondidos === total) {
    $("btn-finalizar-sessao").classList.remove("hidden");
  } else {
    $("btn-finalizar-sessao").classList.add("hidden");
  }
}

async function selecionarSetor(setor) {
  if (carregando) return;

  if (estado.setoresRespondidos.has(String(setor.id_setor))) {
    return;
  }

  estado.setor = setor;
  estado.indice = 0;
  estado.respostas = [];

  await executarComLoading(
    "Carregando perguntas...",
    () => carregarPerguntas(setor.id_setor)
  );
}

/* =========================
   PERGUNTAS
========================= */

async function carregarPerguntas(idSetor) {
  const tokenAtual = ++tokenRequisicao;

  const perguntas = await apiGet({
    action: "perguntas",
    id_setor: idSetor
  });

  if (tokenAtual !== tokenRequisicao) return;

  estado.perguntas = perguntas;

  if (!estado.perguntas.length) {
    mostrarErro("Nenhuma pergunta encontrada para este setor.");
    return;
  }

  mostrarPergunta();
}

function mostrarPergunta() {
  respostaTemporaria = null;

  const pergunta = estado.perguntas[estado.indice];

  $("info-contexto").innerText =
    `${estado.huddle.nome_huddle} | ${estado.setor.nome_setor}`;

  $("contador-pergunta").innerText =
    `Pergunta ${estado.indice + 1} de ${estado.perguntas.length}`;

  $("texto-pergunta").innerText =
    pergunta.pergunta;

  montarCampoResposta(pergunta);

  mostrarTela("tela-pergunta");
}

function montarCampoResposta(pergunta) {
  const area = $("area-resposta");
  area.innerHTML = "";

  const respostaSalva = estado.respostas.find(
    r => String(r.id_pergunta) === String(pergunta.id_pergunta)
  );

  if (pergunta.tipo === "NUMERO") {
    area.innerHTML = `
      <label>Resposta</label>
      <input
        type="number"
        id="campo-resposta"
        placeholder="Digite o número"
        value="${respostaSalva ? respostaSalva.resposta : ""}"
      >

      ${htmlObservacao(respostaSalva)}
    `;
    return;
  }

  if (pergunta.tipo === "TEXTO") {
    area.innerHTML = `
      <label>Resposta</label>
      <textarea
        id="campo-resposta"
        placeholder="Digite a resposta"
      >${respostaSalva ? respostaSalva.resposta : ""}</textarea>

      ${htmlObservacao(respostaSalva)}
    `;
    return;
  }

  area.innerHTML = `
    <div class="opcoes-resposta">
      <button id="btn-sim" onclick="selecionarResposta('SIM')">SIM</button>
      <button id="btn-nao" onclick="selecionarResposta('NÃO')">NÃO</button>
    </div>

    ${htmlObservacao(respostaSalva)}

    <div id="area-condicional"></div>
  `;

  if (respostaSalva) {
    selecionarResposta(respostaSalva.resposta, respostaSalva);
  }
}

function htmlObservacao(respostaSalva) {
  return `
    <div class="bloco-observacao">
      <label>Observação</label>
      <textarea
        id="campo-observacao"
        placeholder="Observação opcional"
      >${respostaSalva ? respostaSalva.observacao || "" : ""}</textarea>
    </div>
  `;
}

function selecionarResposta(valor, respostaSalva = null) {
  respostaTemporaria = valor;

  $("btn-sim").classList.toggle("selecionado", valor === "SIM");
  $("btn-nao").classList.toggle("selecionado", valor === "NÃO");

  const pergunta = estado.perguntas[estado.indice];
  const area = $("area-condicional");

  area.innerHTML = "";

  const deveAbrirPendencia = verificarGatilhoPendencia(pergunta, valor);

  if (deveAbrirPendencia) {
    area.innerHTML = `
      <div class="bloco-pendencia">
        <label>Descrição da pendência</label>
        <textarea
          id="campo-descricao"
          placeholder="Descreva a situação identificada"
        >${respostaSalva ? respostaSalva.descricao || "" : ""}</textarea>

        <label>Responsável sugerido</label>
        <input
          type="text"
          id="campo-responsavel"
          value="${respostaSalva ? respostaSalva.responsavel || pergunta.responsavel || "" : pergunta.responsavel || ""}"
          placeholder="Responsável"
        >

        <label>Prazo</label>
        <input
          type="date"
          id="campo-prazo"
          value="${respostaSalva ? respostaSalva.prazo || "" : ""}"
        >
      </div>
    `;
  }
}

function verificarGatilhoPendencia(pergunta, resposta) {
  const geraPendencia =
    String(pergunta.gera_pendencia || "").trim().toUpperCase() === "SIM";

  const respostaGatilho =
    String(pergunta.resposta_gera_pendencia || "SIM").trim().toUpperCase();

  const respostaAtual =
    String(resposta || "").trim().toUpperCase();

  return geraPendencia && respostaAtual === respostaGatilho;
}

function continuarPergunta() {
  if (carregando) return;

  const pergunta = estado.perguntas[estado.indice];

  const resposta = montarRespostaAtual(pergunta);

  if (!resposta) return;

  salvarRespostaLocal(resposta);

  if (estado.indice < estado.perguntas.length - 1) {
    estado.indice++;
    mostrarPergunta();
  } else {
    finalizarSetor();
  }
}

function montarRespostaAtual(pergunta) {
  let resposta = "";
  let observacao = "";
  let descricao = "";
  let responsavel = pergunta.responsavel || "";
  let prazo = "";

  if (pergunta.tipo === "NUMERO") {
    resposta = $("campo-resposta").value;

    if (pergunta.obrigatoria === "SIM" && resposta === "") {
      alert("Preencha a resposta.");
      return null;
    }

    observacao = $("campo-observacao")?.value.trim() || "";
  }

  else if (pergunta.tipo === "TEXTO") {
    resposta = $("campo-resposta").value.trim();

    if (pergunta.obrigatoria === "SIM" && !resposta) {
      alert("Preencha a resposta.");
      return null;
    }

    observacao = $("campo-observacao")?.value.trim() || "";
  }

  else {
    resposta = respostaTemporaria;

    if (!resposta) {
      alert("Selecione SIM ou NÃO.");
      return null;
    }

    observacao = $("campo-observacao")?.value.trim() || "";

    const deveGerarPendencia = verificarGatilhoPendencia(pergunta, resposta);

    if (deveGerarPendencia) {
      descricao = $("campo-descricao")?.value.trim() || "";
      responsavel = $("campo-responsavel")?.value.trim() || "";
      prazo = $("campo-prazo")?.value || "";

      if (!descricao && !observacao) {
        alert("Descreva a situação para gerar a pendência.");
        return null;
      }

      if (!descricao) {
        descricao = observacao;
      }
    }
  }

  return {
    id_pergunta: pergunta.id_pergunta,
    pergunta: pergunta.pergunta,
    tipo: pergunta.tipo,
    resposta,
    observacao,
    gera_pendencia: pergunta.gera_pendencia,
    resposta_gera_pendencia: pergunta.resposta_gera_pendencia,
    categoria: pergunta.categoria,
    responsavel,
    prazo,
    descricao
  };
}

function salvarRespostaLocal(resposta) {
  const index = estado.respostas.findIndex(
    r => String(r.id_pergunta) === String(resposta.id_pergunta)
  );

  if (index >= 0) {
    estado.respostas[index] = resposta;
  } else {
    estado.respostas.push(resposta);
  }
}

function voltarPergunta() {
  if (carregando) return;

  if (estado.indice === 0) {
    mostrarTelaSetores();
    return;
  }

  const pergunta = estado.perguntas[estado.indice];
  const resposta = montarRespostaAtual(pergunta);

  if (resposta) {
    salvarRespostaLocal(resposta);
  }

  estado.indice--;
  mostrarPergunta();
}

/* =========================
   SALVAR SETOR
========================= */

async function finalizarSetor() {
  if (carregando) return;

  const payload = {
    action: "salvarSetor",
    id_sessao: estado.sessao.id_sessao,
    id_usuario: estado.usuario.id_usuario,
    usuario: estado.usuario.nome,
    cargo: estado.usuario.cargo,
    id_huddle: estado.huddle.id_huddle,
    huddle: estado.huddle.nome_huddle,
    id_setor: estado.setor.id_setor,
    setor: estado.setor.nome_setor,
    respostas: estado.respostas
  };

  await executarComLoading("Salvando respostas do setor...", async () => {
    try {
      await fetch(API, {
        method: "POST",
        body: JSON.stringify(payload),
        mode: "no-cors"
      });

      estado.setoresRespondidos.add(String(estado.setor.id_setor));
      estado.setor = null;
      estado.perguntas = [];
      estado.respostas = [];
      estado.indice = 0;

      mostrarTelaSetores();

    } catch (erro) {
      salvarOffline(payload);

      estado.setoresRespondidos.add(String(estado.setor.id_setor));
      mostrarTelaSetores();
    }
  });
}

/* =========================
   FINALIZAR SESSÃO
========================= */

async function finalizarSessao() {
  if (carregando) return;

  const confirmar = confirm("Finalizar este Huddle?");

  if (!confirmar) return;

  await executarComLoading("Finalizando Huddle...", async () => {
    await apiGet({
      action: "finalizarSessao",
      id_sessao: estado.sessao.id_sessao
    });

    mostrarTela("tela-final");
  });
}

function salvarOffline(payload) {
  const fila =
    JSON.parse(localStorage.getItem("huddle_fila_offline") || "[]");

  fila.push(payload);

  localStorage.setItem(
    "huddle_fila_offline",
    JSON.stringify(fila)
  );
}

function reiniciar() {
  if (carregando) return;

  estado.huddle = null;
  estado.sessao = null;
  estado.setor = null;
  estado.setores = [];
  estado.setoresRespondidos = new Set();
  estado.perguntas = [];
  estado.indice = 0;
  estado.respostas = [];

  executarComLoading("Carregando Huddles...", carregarHuddles);
}
