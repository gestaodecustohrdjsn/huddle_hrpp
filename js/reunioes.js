window.Huddle = window.Huddle || {};

Huddle.Reunioes = {
  async renderHome() {
  const reunioes = await Huddle.DB.getAll("reunioes");

  const emAndamento = reunioes
    .filter(r => r.status === "Em andamento")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const app = Huddle.Utils.$("app");

  app.innerHTML = `
    <div class="tela">

      <div class="tela-topo">
        <div>
          <h2>Início</h2>
          <p class="texto-apoio">
            Inicie uma nova reunião ou continue uma reunião em andamento neste dispositivo.
          </p>
        </div>
      </div>

      <div class="grid-cards">

        <div class="card card-destaque">
          <h3>Nova reunião</h3>
          <p>
            Criar uma reunião, definir responsável e selecionar os setores presentes.
          </p>

          <div class="acoes">
            <button class="btn-principal" onclick="Huddle.Reunioes.renderNovaReuniao()">
              Iniciar Reunião
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Reunião em andamento</h3>
          ${
            emAndamento.length
              ? `
                <p>
                  Existe uma reunião aberta neste dispositivo.
                </p>

                <p>
                  <strong>${Huddle.Utils.escapeHtml(emAndamento[0].responsavel_nome)}</strong><br>
                  ${Huddle.Utils.escapeHtml(emAndamento[0].data)} às ${Huddle.Utils.escapeHtml(emAndamento[0].hora_inicio)}
                </p>

                <div class="acoes">
                  <button class="btn-principal" onclick="Huddle.Reunioes.renderReuniao('${emAndamento[0].id}')">
                    Continuar
                  </button>
                </div>
              `
              : `
                <p>Nenhuma reunião em andamento neste navegador.</p>
              `
          }
        </div>

        <div class="card">
          <h3>Pendências</h3>
          <p>
            Painel geral de pendências abertas, resolvidas, prorrogadas e removidas.
          </p>

          <div class="acoes">
            <button class="btn-secundario" disabled>
              Em breve
            </button>
          </div>
        </div>

        <div class="card">
          <h3>Configurações</h3>
          <p>
            Cadastro e edição de setores, perguntas e opções de resposta.
          </p>

          <div class="acoes">
            <button class="btn-secundario" disabled>
              Em breve
            </button>
          </div>
        </div>

      </div>

    </div>
  `;
},

  async renderNovaReuniao() {
  const setores = await Huddle.DB.getAll("setores");

  const setoresAtivos = setores
    .filter(s => s.ativo)
    .sort((a, b) => Number(a.ordem) - Number(b.ordem));

  const grupos = {};

  setoresAtivos.forEach(setor => {
    if (!grupos[setor.grupo]) grupos[setor.grupo] = [];
    grupos[setor.grupo].push(setor);
  });

  const htmlGrupos = Object.entries(grupos)
    .map(([grupo, lista]) => {
      const grupoSeguro = Huddle.Utils.escapeHtml(grupo);

      return `
        <div class="grupo-setores">
          <div class="grupo-setores-cabecalho">
            <h3>${grupoSeguro}</h3>

            <div>
              <button type="button" class="btn-mini btn-claro" onclick="Huddle.Reunioes.marcarGrupo('${grupoSeguro}', true)">
                Marcar todos
              </button>

              <button type="button" class="btn-mini btn-claro" onclick="Huddle.Reunioes.marcarGrupo('${grupoSeguro}', false)">
                Limpar
              </button>
            </div>
          </div>

          <div class="lista-checkbox">
            ${
              lista.map(setor => {
                const idSetor = Huddle.Utils.escapeHtml(setor.id);
                const nomeSetor = Huddle.Utils.escapeHtml(setor.nome);
                const grupoSetor = Huddle.Utils.escapeHtml(setor.grupo);

                return `
                  <div class="item-setor-presenca nao-selecionado" data-id-setor="${idSetor}">
                    
                    <input
                      type="checkbox"
                      class="check-setor"
                      data-grupo="${grupoSetor}"
                      value="${idSetor}"
                      onchange="Huddle.Reunioes.atualizarTipoPresenca('${idSetor}')"
                    >

                    <span class="nome-setor-presenca">${nomeSetor}</span>

                    <select
                      class="select-tipo-presenca"
                      data-id-setor="${idSetor}"
                      disabled
                    >
                      <option value="Coordenador" selected>Coordenador</option>
                      <option value="Representante">Representante</option>
                    </select>

                  </div>
                `;
              }).join("")
            }
          </div>
        </div>
      `;
    })
    .join("");

  Huddle.Utils.$("app").innerHTML = `
    <div class="tela">

      <div class="tela-topo">
        <div>
          <h2>Iniciar reunião</h2>
          <p class="texto-apoio">
            Informe quem está registrando a reunião e selecione os setores presentes.
            Por padrão, todo setor presente entra como Coordenador. Altere para Representante quando necessário.
          </p>
        </div>
      </div>

      <form id="form-reuniao" class="form-grid" onsubmit="Huddle.Reunioes.criarReuniao(event)">

        <div class="card">

          <div class="form-linha">
            <label for="responsavel_nome">Nome de quem está registrando a reunião</label>
            <input
              id="responsavel_nome"
              type="text"
              placeholder="Digite o nome"
              autocomplete="off"
              required
            >
          </div>

        </div>

        <div>
          <h3>Setores presentes</h3>
          <p class="texto-apoio">
            Marque os setores presentes. O tipo de presença fica como Coordenador por padrão,
            podendo ser alterado para Representante.
          </p>

          ${htmlGrupos}
        </div>

        <div class="acoes">
          <button type="button" class="btn-secundario" onclick="Huddle.Reunioes.renderHome()">
            Cancelar
          </button>

          <button type="submit" class="btn-principal">
            Criar reunião
          </button>
        </div>

      </form>

    </div>
  `;
},

 marcarGrupo(grupo, marcado) {
  document
    .querySelectorAll(`.check-setor[data-grupo="${grupo}"]`)
    .forEach(input => {
      input.checked = marcado;
      this.atualizarTipoPresenca(input.value);
    });
},

atualizarTipoPresenca(idSetor) {
  const check = document.querySelector(`.check-setor[value="${idSetor}"]`);
  const linha = document.querySelector(`.item-setor-presenca[data-id-setor="${idSetor}"]`);
  const select = document.querySelector(`.select-tipo-presenca[data-id-setor="${idSetor}"]`);

  if (!check || !linha || !select) return;

  select.disabled = !check.checked;

  if (check.checked) {
    linha.classList.add("selecionado");
    linha.classList.remove("nao-selecionado");

    if (!select.value) {
      select.value = "Coordenador";
    }
  } else {
    linha.classList.remove("selecionado");
    linha.classList.add("nao-selecionado");

    select.value = "Coordenador";
  }
},
  
  async criarReuniao(event) {
  event.preventDefault();

  const nome = Huddle.Utils.$("responsavel_nome").value.trim();

  const setoresSelecionados = Array
    .from(document.querySelectorAll(".check-setor:checked"))
    .map(input => {
      const idSetor = input.value;

      const tipoPresenca =
        document.querySelector(`.select-tipo-presenca[data-id-setor="${idSetor}"]`)?.value
        || "Coordenador";

      return {
        id_setor: idSetor,
        tipo_presenca: tipoPresenca
      };
    });

  if (!nome) {
    Huddle.Utils.toast("Informe o nome de quem está registrando a reunião.");
    return;
  }

  if (!setoresSelecionados.length) {
    Huddle.Utils.toast("Selecione pelo menos um setor presente.");
    return;
  }

  const agora = new Date();
  const agoraISO = Huddle.Utils.agoraISO();

  const reuniao = {
    id: Huddle.Utils.id("REU"),
    data: Huddle.Utils.dataBR(agora),
    hora_inicio: Huddle.Utils.horaBR(agora),
    hora_fim: "",
    responsavel_nome: nome,
    status: "Em andamento",
    created_at: agoraISO,
    updated_at: agoraISO
  };

  await Huddle.DB.add("reunioes", reuniao);

  for (let i = 0; i < setoresSelecionados.length; i++) {
    await Huddle.DB.add("reuniao_setores", {
      id: Huddle.Utils.id("RSET"),
      id_reuniao: reuniao.id,
      id_setor: setoresSelecionados[i].id_setor,
      tipo_presenca: setoresSelecionados[i].tipo_presenca,
      respondido: false,
      ordem: i + 1,
      created_at: agoraISO,
      updated_at: agoraISO
    });
  }

  await Huddle.DB.addLog({
    id_reuniao: reuniao.id,
    tipo: "reuniao",
    acao: "Reunião criada",
    detalhe: `Registro por: ${nome}. Setores presentes: ${setoresSelecionados.length}.`,
    usuario: nome
  });

  Huddle.Utils.toast("Reunião criada com sucesso.");

  await this.renderReuniao(reuniao.id);
},

  async renderSetor(idReuniao, idSetor) {
  const reuniao = await Huddle.DB.get("reunioes", idReuniao);
  const setor = await Huddle.DB.get("setores", idSetor);

  if (!reuniao || !setor) {
    Huddle.Utils.toast("Reunião ou setor não encontrado.");
    await this.renderReuniao(idReuniao);
    return;
  }

  const relacoes = await Huddle.DB.getAll("reuniao_setores");

  const relacao = relacoes.find(r =>
    r.id_reuniao === idReuniao &&
    r.id_setor === idSetor
  );

  const tipoPresenca = relacao?.tipo_presenca || "Coordenador";

  Huddle.Utils.$("app").innerHTML = `
    <div class="tela">

      <div class="tela-topo">
        <div>
          <h2>${Huddle.Utils.escapeHtml(setor.nome)}</h2>
          <p class="texto-apoio">
            Esta é a tela inicial do setor. Na próxima etapa entram as pendências abertas
            e o carrossel de perguntas.
          </p>
        </div>
      </div>

      <div class="info-reuniao">
        <div><strong>Reunião:</strong> ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}</div>
        <div><strong>Registro por:</strong> ${Huddle.Utils.escapeHtml(reuniao.responsavel_nome)}</div>
        <div><strong>Presença do setor:</strong> ${Huddle.Utils.escapeHtml(tipoPresenca)}</div>
        <div><strong>Status do setor:</strong> ${relacao?.respondido ? "Respondido" : "Aguardando"}</div>
      </div>

      <div class="card card-destaque">
        <h3>Fluxo do setor</h3>

        <p>
          Depois, esta tela terá:
        </p>

        <p>
          1. Pendências abertas acumuladas deste setor<br>
          2. Opções de resolver, prorrogar ou remover pendência<br>
          3. Botão para iniciar perguntas<br>
          4. Carrossel de perguntas com observação em qualquer resposta<br>
          5. Botão para adicionar quantas pendências forem necessárias
        </p>
      </div>

      <div class="acoes">
        <button class="btn-secundario" onclick="Huddle.Reunioes.renderReuniao('${idReuniao}')">
          Voltar para setores
        </button>

        ${
          relacao?.respondido
            ? `
              <button class="btn-principal" onclick="Huddle.Reunioes.marcarSetorComoAguardando('${idReuniao}', '${idSetor}')">
                Editar setor
              </button>
            `
            : `
              <button class="btn-principal" onclick="Huddle.Reunioes.finalizarSetorTemporario('${idReuniao}', '${idSetor}')">
                Finalizar setor temporariamente
              </button>
            `
        }
      </div>

    </div>
  `;
},

  async finalizarSetorTemporario(idReuniao, idSetor) {
    const relacoes = await Huddle.DB.getAll("reuniao_setores");

    const relacao = relacoes.find(r =>
      r.id_reuniao === idReuniao &&
      r.id_setor === idSetor
    );

    if (!relacao) {
      Huddle.Utils.toast("Vínculo do setor não encontrado.");
      return;
    }

    relacao.respondido = true;
    relacao.respondido_em = Huddle.Utils.agoraISO();
    relacao.updated_at = Huddle.Utils.agoraISO();

    await Huddle.DB.put("reuniao_setores", relacao);

    const setor = await Huddle.DB.get("setores", idSetor);
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "setor",
      acao: "Setor finalizado temporariamente",
      detalhe: setor ? setor.nome : idSetor,
      usuario: reuniao ? reuniao.responsavel_nome : ""
    });

    Huddle.Utils.toast("Setor marcado como respondido.");

    await this.renderReuniao(idReuniao);
  },

  async marcarSetorComoAguardando(idReuniao, idSetor) {
    const confirmar = confirm(
      "Deseja editar este setor? Ele voltará para o status Aguardando."
    );

    if (!confirmar) return;

    const relacoes = await Huddle.DB.getAll("reuniao_setores");

    const relacao = relacoes.find(r =>
      r.id_reuniao === idReuniao &&
      r.id_setor === idSetor
    );

    if (!relacao) return;

    relacao.respondido = false;
    relacao.updated_at = Huddle.Utils.agoraISO();

    await Huddle.DB.put("reuniao_setores", relacao);

    const setor = await Huddle.DB.get("setores", idSetor);
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "setor",
      acao: "Setor reaberto para edição",
      detalhe: setor ? setor.nome : idSetor,
      usuario: reuniao ? reuniao.responsavel_nome : ""
    });

    Huddle.Utils.toast("Setor reaberto para edição.");

    await this.renderReuniao(idReuniao);
  },

  async concluirReuniao(idReuniao) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    if (!reuniao) {
      Huddle.Utils.toast("Reunião não encontrada.");
      return;
    }

    const relacoes = await Huddle.DB.getAll("reuniao_setores");

    const setoresDaReuniao = relacoes.filter(r =>
      r.id_reuniao === idReuniao
    );

    const todosRespondidos =
      setoresDaReuniao.length > 0 &&
      setoresDaReuniao.every(s => s.respondido);

    if (!todosRespondidos) {
      Huddle.Utils.toast("Ainda existem setores aguardando resposta.");
      return;
    }

    const confirmar = confirm("Deseja concluir esta reunião?");

    if (!confirmar) return;

    const agora = new Date();

    reuniao.hora_fim = Huddle.Utils.horaBR(agora);
    reuniao.status = "Concluída";
    reuniao.updated_at = Huddle.Utils.agoraISO();

    await Huddle.DB.put("reunioes", reuniao);

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "reuniao",
      acao: "Reunião concluída",
      detalhe: `Reunião concluída às ${reuniao.hora_fim}.`,
      usuario: reuniao.responsavel_nome
    });

    Huddle.Utils.toast("Reunião concluída com sucesso.");

    await this.renderHome();
  }
};
