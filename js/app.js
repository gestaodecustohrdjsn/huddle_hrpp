
const API =
"https://script.google.com/macros/s/AKfycbzK5alad7lCUe3lK913lCfgH7C8DlP1_7URg-l6VW_4kdgIWVkj3DRAxpGIjU0bVt9nig/exec";

const telaHuddle =
document.getElementById("tela-huddle");

const telaSetor =
document.getElementById("tela-setor");

const telaPerguntas =
document.getElementById("tela-perguntas");

const listaHuddles =
document.getElementById("lista-huddles");

const listaSetores =
document.getElementById("lista-setores");

const listaPerguntas =
document.getElementById("lista-perguntas");

carregarHuddles();


async function carregarHuddles(){

  const resposta =
  await fetch(
    API + "?action=huddles"
  );

  const huddles =
  await resposta.json();

  listaHuddles.innerHTML = "";

  huddles.forEach(huddle => {

    const btn =
    document.createElement("button");

    btn.innerText =
    huddle.nome_huddle;

    btn.onclick = () =>
      carregarSetores(
        huddle.id_huddle
      );

    listaHuddles.appendChild(btn);

  });

}


async function carregarSetores(idHuddle){

  telaSetor.classList.remove("hidden");

  const resposta =
  await fetch(
    API +
    "?action=setores&id_huddle=" +
    idHuddle
  );

  const setores =
  await resposta.json();

  listaSetores.innerHTML = "";

  setores.forEach(setor => {

    const btn =
    document.createElement("button");

    btn.innerText =
    setor.nome_setor;

    btn.onclick = () =>
      carregarPerguntas(
        setor.id_setor
      );

    listaSetores.appendChild(btn);

  });

}

async function carregarPerguntas(idSetor){

  telaPerguntas.classList.remove("hidden");

  const resposta =
  await fetch(
    API +
    "?action=perguntas&id_setor=" +
    idSetor
  );

  const perguntas =
  await resposta.json();

  listaPerguntas.innerHTML = "";

  perguntas.forEach(p => {

    const div =
    document.createElement("div");

    div.innerHTML = `
      <p>
        ${p.ordem} - ${p.pergunta}
      </p>
    `;

    listaPerguntas.appendChild(div);

  });

}


