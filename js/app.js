const API =
  "https://script.google.com/macros/s/AKfycbzLPlX-taC1U5qDZuFCvTbeVc6xH01SUuADW80dG1Bm9aTk3ueMRMN08rsu_RuS3yvztQ/exec";

const estado = {
  usuario: null,
  huddle: null,
  setor: null,
  perguntas: [],
  indice: 0,
  respostas: []
};

let respostaTemporaria = null;

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
  try {
    mostrarTela("tela-login");
    await carregarUsuarios();
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
  const valor = $("select-usuario").value;

  if (!valor) {
    alert("Selecione um usuário para continuar.");
    return;
  }

  estado.usuario = JSON.parse(valor);

  $("info-usuario").innerText =
    `${estado.usuario.nome} | ${estado.usuario.cargo}`;

  await carregarHuddles();
}

/* =========================
   HUDDLES
========================= */

async function carregarHuddles() {
  mostrarTela("tela-huddle");

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
  estado.huddle = huddle;
  estado.setor = null;
  estado.perguntas = [];
  estado.respostas = [];
  estado.indice = 0;

  await carregarSetores(huddle.id_huddle);
}

/* =========================
   SETORES
========================= */

async function carregarSetores(idHuddle) {
  mostrarTela("tela-setor");

  const setores = await apiGet({
    action: "setores",
    id_huddle: idHuddle
  });

  const lista = $("lista-setores");
  lista.innerHTML = "";

  setores.forEach(setor => {
    const btn = document.createElement("button");

    btn.innerText = setor.nome_setor;

    btn.onclick = () => selecionarSetor(setor);

    lista.appendChild(btn);
  });
}

async function selecionarSetor(setor) {
  estado.setor = setor;
  estado.indice = 0;
  estado.respostas = [];

  await carregarPerguntas(setor.id_setor);
}

/* =========================
   PERGUNTAS
========================= */

async function carregarPerguntas(idSetor) {
  const perguntas = await apiGet({
    action: "perguntas",
    id_setor: idSetor
  });

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
      <input
        type="number"
        id="campo-resposta"
        placeholder="Digite o número"
        value="${respostaSalva ? respostaSalva.resposta : ""}"
      >
    `;
    return;
  }

  if (pergunta.tipo === "TEXTO") {
    area.innerHTML = `
      <textarea
        id="campo-resposta"
        placeholder="Digite a resposta"
      >${respostaSalva ? respostaSalva.resposta : ""}</textarea>
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

      <div id="area-condicional"></div>
    `;

    if (respostaSalva) {
      selecionarResposta(respostaSalva.resposta, respostaSalva);
    }

    return;
  }

  area.innerHTML = `
    <textarea
      id="campo-resposta"
      placeholder="Digite a resposta"
    >${respostaSalva ? respostaSalva.resposta : ""}</textarea>
  `;
}

function selecionarResposta(valor, respostaSalva = null) {
  respostaTemporaria = valor;

  $("btn-sim").classList.toggle("selecionado", valor === "SIM");
  $("btn-nao").classList.toggle("selecionado", valor === "NÃO");

  const pergunta = estado.perguntas[estado.indice];
  const area = $("area-condicional");

  area.innerHTML = "";

  if (pergunta.tipo === "SIM_NAO_OBS" && valor === "NÃO") {
    area.innerHTML = `
      <div class="bloco-detalhe">
        <label>Observação</label>
        <textarea
          id="campo-observacao"
          placeholder="Descreva a situação"
        >${respostaSalva ? respostaSalva.observacao || "" : ""}</textarea>
      </div>
    `;
  }

  if (pergunta.tipo === "PENDENCIA" && valor === "SIM") {
    area.innerHTML = `
      <div class="bloco-detalhe">
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

function continuarPergunta() {
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
  }

  else if (pergunta.tipo === "TEXTO") {
    resposta = $("campo-resposta").value.trim();

    if (pergunta.obrigatoria === "SIM" && !resposta) {
      alert("Preencha a resposta.");
      return null;
    }
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

    if (pergunta.tipo === "SIM_NAO_OBS" && resposta === "NÃO") {
      observacao = $("campo-observacao")?.value.trim() || "";

      if (!observacao) {
        alert("Descreva a observação.");
        return null;
      }
    }

    if (pergunta.tipo === "PENDENCIA" && resposta === "SIM") {
      descricao = $("campo-descricao")?.value.trim() || "";
      responsavel = $("campo-responsavel")?.value.trim() || "";
      prazo = $("campo-prazo")?.value || "";

      if (!descricao) {
        alert("Descreva a pendência.");
        return null;
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
  estado.huddle = null;
  estado.setor = null;
  estado.perguntas = [];
  estado.indice = 0;
  estado.respostas = [];

  carregarHuddles();
}
