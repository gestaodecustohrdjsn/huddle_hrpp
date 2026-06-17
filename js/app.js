const API =
  "https://script.google.com/macros/s/AKfycbzHbLxUDw8zJFhb5feWAqdjB8c14lBbHtjugMG9VbtP8wkW1RxB-XG-YI-kNUyIeOWH5Q/exec";

const estado = {
  usuario: null,
  huddle: null,
  setor: null,
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

  await executarComLoading("Carregando Huddles...", carregarHuddles);
}

/* =========================
   HUDDLES
========================= */

async function carregarHuddles() {
  mostrarTela("tela-huddle");

  $("lista-huddles").innerHTML = "";
  $("lista-setores").innerHTML = "";
  $("area-resposta").innerHTML = "";

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

  estado.huddle = huddle;
  estado.setor = null;
  estado.perguntas = [];
  estado.respostas = [];
  estado.indice = 0;

  $("lista-setores").innerHTML = "";
  $("lista-perguntas") && ($("lista-perguntas").innerHTML = "");

  await executarComLoading(
    "Carregando setores...",
    () => carregarSetores(huddle.id_huddle)
  );
}

/* =========================
   SETORES
========================= */

async function carregarSetores(idHuddle) {
  const tokenAtual = ++tokenRequisicao;

  mostrarTela("tela-setor");

  const lista = $("lista-setores");
  lista.innerHTML = "";

  const setores = await apiGet({
    action: "setores",
    id_huddle: idHuddle
  });

  if (tokenAtual !== tokenRequisicao) return;

  lista.innerHTML = "";

  setores.forEach(setor => {
    const btn = document.createElement("button");

    btn.innerText = setor.nome_setor;

    btn.onclick = () => selecionarSetor(setor);

    lista.appendChild(btn);
  });
}

async function selecionarSetor(setor) {
  if (carregando) return;

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

  if (
    pergunta.tipo === "SIM_NAO" ||
    pergunta.tipo === "SIM_NAO_OBS" ||
    pergunta.tipo === "PENDENCIA"
  ) {
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

    return;
  }

  area.innerHTML = `
    <label>Resposta</label>
    <textarea
      id="campo-resposta"
      placeholder="Digite a resposta"
    >${respostaSalva ? respostaSalva.resposta : ""}</textarea>

    ${htmlObservacao(respostaSalva)}
  `;
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
    finalizarHuddle();
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

  else if (
    pergunta.tipo === "SIM_NAO" ||
    pergunta.tipo === "SIM_NAO_OBS" ||
    pergunta.tipo === "PENDENCIA"
  ) {
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

  else {
    resposta = $("campo-resposta")?.value.trim() || "";
    observacao = $("campo-observacao")?.value.trim() || "";
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

  const pergunta = estado.perguntas[estado.indice];

  if (pergunta) {
    const resposta = montarRespostaAtual(pergunta);

    if (resposta) {
      salvarRespostaLocal(resposta);
    }
  }

  if (estado.indice === 0) {
    mostrarTela("tela-setor");
    return;
  }

  estado.indice--;
  mostrarPergunta();
}

/* =========================
   SALVAR
========================= */

async function finalizarHuddle() {
  if (carregando) return;

  const payload = {
    action: "salvar",
    id_usuario: estado.usuario.id_usuario,
    usuario: estado.usuario.nome,
    cargo: estado.usuario.cargo,
    id_huddle: estado.huddle.id_huddle,
    huddle: estado.huddle.nome_huddle,
    id_setor: estado.setor.id_setor,
    setor: estado.setor.nome_setor,
    respostas: estado.respostas
  };

  await executarComLoading("Salvando Huddle...", async () => {
    try {
      await fetch(API, {
        method: "POST",
        body: JSON.stringify(payload),
        mode: "no-cors"
      });

      mostrarTela("tela-final");

    } catch (erro) {
      salvarOffline(payload);
      mostrarTela("tela-final");
    }
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
  estado.setor = null;
  estado.perguntas = [];
  estado.indice = 0;
  estado.respostas = [];

  executarComLoading("Carregando Huddles...", carregarHuddles);
}
