window.Huddle = window.Huddle || {};

Huddle.Configuracoes = {
  tiposPergunta: [
    { valor: "NUMERO", texto: "Número" },
    { valor: "SIM_NAO", texto: "Sim e Não" },
    { valor: "TEXTO", texto: "Texto" },
    { valor: "LISTA", texto: "Lista" },
    { valor: "MULTIPLA_ESCOLHA", texto: "Múltipla escolha" }
  ],

  async renderHome() {
    const setores = await Huddle.DB.getAll("setores");
    const perguntas = await Huddle.DB.getAll("perguntas");
    const setoresAtivos = setores.filter(setor => setor.ativo !== false).length;
    const perguntasAtivas = perguntas.filter(pergunta => pergunta.ativo !== false).length;

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela tela-configuracoes">
        <div class="tela-topo">
          <div>
            <h2>Configurações</h2>
            <p class="texto-apoio">
              Cadastre, edite ou inative setores e perguntas usadas nas reuniões.
            </p>
          </div>
        </div>

        <div class="grid-cards grid-configuracoes">
          <button class="card card-configuracao" onclick="Huddle.Configuracoes.renderSetores()">
            <span class="icone-config-card">🏥</span>
            <strong>Setores</strong>
            <small>${setoresAtivos} ativo(s)</small>
          </button>

          <button class="card card-configuracao" onclick="Huddle.Configuracoes.renderPerguntas()">
            <span class="icone-config-card">❓</span>
            <strong>Perguntas</strong>
            <small>${perguntasAtivas} ativa(s)</small>
          </button>
        </div>

        <div class="card card-aviso-config">
          <h3>Importante</h3>
          <p class="texto-apoio sem-margem">
            A inativação é mais segura que exclusão definitiva, porque mantém o histórico das reuniões antigas íntegro.
          </p>
        </div>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderHome()">
            Voltar ao início
          </button>
        </div>
      </div>
    `;
  },

  async renderSetores() {
    const setores = await Huddle.DB.getAll("setores");

    const lista = setores
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
      .map(setor => `
        <div class="item-config-lista ${setor.ativo === false ? "inativo" : ""}">
          <div>
            <strong>${Huddle.Utils.escapeHtml(setor.nome)}</strong><br>
            <small>${Huddle.Utils.escapeHtml(setor.grupo || "Sem grupo")} · Ordem ${Huddle.Utils.escapeHtml(setor.ordem || "-")}</small>
          </div>

          <div class="acoes-item-config">
            <span class="tag ${setor.ativo === false ? "tag-inativo" : "tag-respondido"}">
              ${setor.ativo === false ? "Inativo" : "Ativo"}
            </span>

            <button class="btn-mini btn-claro" onclick="Huddle.Configuracoes.renderFormSetor('${setor.id}')">
              Editar
            </button>

            <button class="btn-mini ${setor.ativo === false ? "btn-claro" : "btn-remover-discreto"}" onclick="Huddle.Configuracoes.alternarSetor('${setor.id}')">
              ${setor.ativo === false ? "Ativar" : "Inativar"}
            </button>
          </div>
        </div>
      `).join("");

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">
        <div class="tela-topo">
          <div>
            <h2>Setores</h2>
            <p class="texto-apoio">Gerencie os setores que podem participar das reuniões.</p>
          </div>
        </div>

        <div class="acoes acoes-topo-config">
          <button class="btn-principal" onclick="Huddle.Configuracoes.renderFormSetor()">
            Novo setor
          </button>
          <button class="btn-secundario" onclick="Huddle.Configuracoes.renderHome()">
            Voltar
          </button>
        </div>

        <div class="lista-config">
          ${lista || `<div class="card"><p class="texto-apoio sem-margem">Nenhum setor cadastrado.</p></div>`}
        </div>
      </div>
    `;
  },

  async renderFormSetor(idSetor = "") {
    const setor = idSetor ? await Huddle.DB.get("setores", idSetor) : null;

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">
        <div class="tela-topo">
          <div>
            <h2>${setor ? "Editar setor" : "Novo setor"}</h2>
            <p class="texto-apoio">Preencha os dados do setor.</p>
          </div>
        </div>

        <form class="card form-grid" onsubmit="Huddle.Configuracoes.salvarSetor(event, '${idSetor}')">
          <div class="form-linha">
            <label for="config_setor_nome">Nome do setor</label>
            <input id="config_setor_nome" type="text" required value="${Huddle.Utils.escapeHtml(setor?.nome || "")}" placeholder="Ex.: UTI A">
          </div>

          <div class="form-linha">
            <label for="config_setor_grupo">Grupo</label>
            <select id="config_setor_grupo" required>
              <option value="Assistencial" ${(setor?.grupo || "Assistencial") === "Assistencial" ? "selected" : ""}>Assistencial</option>
              <option value="Apoio" ${setor?.grupo === "Apoio" ? "selected" : ""}>Apoio</option>
              <option value="Outro" ${setor?.grupo === "Outro" ? "selected" : ""}>Outro</option>
            </select>
          </div>

          <div class="form-linha">
            <label for="config_setor_ordem">Ordem</label>
            <input id="config_setor_ordem" type="number" min="1" step="1" required value="${Huddle.Utils.escapeHtml(setor?.ordem || "1")}">
          </div>

          <div class="form-linha linha-checkbox-config">
            <label>
              <input id="config_setor_ativo" type="checkbox" ${setor?.ativo === false ? "" : "checked"}>
              Setor ativo
            </label>
          </div>

          <div class="acoes">
            <button type="button" class="btn-secundario" onclick="Huddle.Configuracoes.renderSetores()">
              Cancelar
            </button>
            <button type="submit" class="btn-principal">
              Salvar setor
            </button>
          </div>
        </form>
      </div>
    `;
  },

  async salvarSetor(event, idSetor = "") {
    event.preventDefault();

    const agora = Huddle.Utils.agoraISO();
    const existente = idSetor ? await Huddle.DB.get("setores", idSetor) : null;

    const setor = {
      id: existente?.id || Huddle.Utils.id("SET"),
      nome: Huddle.Utils.$("config_setor_nome").value.trim(),
      grupo: Huddle.Utils.$("config_setor_grupo").value,
      ordem: Number(Huddle.Utils.$("config_setor_ordem").value || 1),
      ativo: Huddle.Utils.$("config_setor_ativo").checked,
      created_at: existente?.created_at || agora,
      updated_at: agora
    };

    if (!setor.nome) {
      Huddle.Utils.toast("Informe o nome do setor.");
      return;
    }

    await Huddle.DB.put("setores", setor);
    await Huddle.DB.addLog({
      tipo: "configuracao",
      acao: existente ? "Setor editado" : "Setor criado",
      detalhe: setor.nome,
      usuario: "Configuração"
    });

    Huddle.Utils.toast("Setor salvo.");
    await this.renderSetores();
  },

  async alternarSetor(idSetor) {
    const setor = await Huddle.DB.get("setores", idSetor);
    if (!setor) return;

    setor.ativo = setor.ativo === false;
    setor.updated_at = Huddle.Utils.agoraISO();

    await Huddle.DB.put("setores", setor);
    await Huddle.DB.addLog({
      tipo: "configuracao",
      acao: setor.ativo ? "Setor ativado" : "Setor inativado",
      detalhe: setor.nome,
      usuario: "Configuração"
    });

    Huddle.Utils.toast(setor.ativo ? "Setor ativado." : "Setor inativado.");
    await this.renderSetores();
  },

  async renderPerguntas(idSetorSelecionado = "") {
    const setores = await Huddle.DB.getAll("setores");
    const perguntas = await Huddle.DB.getAll("perguntas");

    const setoresOrdenados = setores
      .filter(setor => setor.ativo !== false)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const idSetor = idSetorSelecionado || setoresOrdenados[0]?.id || "";
    const setorAtual = setores.find(setor => setor.id === idSetor);

    const perguntasSetor = perguntas
      .filter(pergunta => pergunta.id_setor === idSetor)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const htmlPerguntas = perguntasSetor.length
      ? perguntasSetor.map(pergunta => `
        <div class="item-config-lista ${pergunta.ativo === false ? "inativo" : ""}">
          <div>
            <strong>${Huddle.Utils.escapeHtml(pergunta.ordem || "-")}. ${Huddle.Utils.escapeHtml(pergunta.texto)}</strong><br>
            <small>
              ${this.nomeTipo(pergunta.tipo)} ·
              ${pergunta.obrigatoria ? "Obrigatória" : "Opcional"} ·
              ${pergunta.gera_pendencia ? `Gera pendência se resposta for ${Huddle.Utils.escapeHtml(pergunta.resposta_gera_pendencia || "definida")}` : "Não gera pendência automática"}
            </small>
          </div>

          <div class="acoes-item-config">
            <span class="tag ${pergunta.ativo === false ? "tag-inativo" : "tag-respondido"}">
              ${pergunta.ativo === false ? "Inativa" : "Ativa"}
            </span>

            <button class="btn-mini btn-claro" onclick="Huddle.Configuracoes.renderFormPergunta('${pergunta.id}', '${idSetor}')">
              Editar
            </button>

            <button class="btn-mini ${pergunta.ativo === false ? "btn-claro" : "btn-remover-discreto"}" onclick="Huddle.Configuracoes.alternarPergunta('${pergunta.id}', '${idSetor}')">
              ${pergunta.ativo === false ? "Ativar" : "Inativar"}
            </button>
          </div>
        </div>
      `).join("")
      : `<div class="card"><p class="texto-apoio sem-margem">Nenhuma pergunta cadastrada para este setor.</p></div>`;

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">
        <div class="tela-topo">
          <div>
            <h2>Perguntas</h2>
            <p class="texto-apoio">Gerencie as perguntas específicas de cada setor.</p>
          </div>
        </div>

        <div class="card filtro-config-perguntas">
          <div class="form-linha">
            <label for="config_filtro_setor">Setor</label>
            <select id="config_filtro_setor" onchange="Huddle.Configuracoes.renderPerguntas(this.value)">
              ${setoresOrdenados.map(setor => `
                <option value="${Huddle.Utils.escapeHtml(setor.id)}" ${setor.id === idSetor ? "selected" : ""}>
                  ${Huddle.Utils.escapeHtml(setor.nome)}
                </option>
              `).join("")}
            </select>
          </div>
        </div>

        <div class="acoes acoes-topo-config">
          <button class="btn-principal" onclick="Huddle.Configuracoes.renderFormPergunta('', '${idSetor}')" ${idSetor ? "" : "disabled"}>
            Nova pergunta
          </button>
          <button class="btn-secundario" onclick="Huddle.Configuracoes.renderHome()">
            Voltar
          </button>
        </div>

        <h3 class="titulo-lista-config">${Huddle.Utils.escapeHtml(setorAtual?.nome || "Setor")}</h3>

        <div class="lista-config">
          ${htmlPerguntas}
        </div>
      </div>
    `;
  },

  async renderFormPergunta(idPergunta = "", idSetorPadrao = "") {
    const setores = await Huddle.DB.getAll("setores");
    const pergunta = idPergunta ? await Huddle.DB.get("perguntas", idPergunta) : null;
    const opcoes = pergunta ? await Huddle.DB.getAll("opcoes_pergunta") : [];
    const opcoesPergunta = opcoes
      .filter(opcao => opcao.id_pergunta === pergunta?.id && opcao.ativo !== false)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
      .map(opcao => opcao.texto || opcao.valor || "")
      .join("\n");

    const setoresOrdenados = setores
      .filter(setor => setor.ativo !== false || setor.id === pergunta?.id_setor)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));

    const idSetorSelecionado = pergunta?.id_setor || idSetorPadrao || setoresOrdenados[0]?.id || "";
    const tipoSelecionado = pergunta?.tipo || "SIM_NAO";

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">
        <div class="tela-topo">
          <div>
            <h2>${pergunta ? "Editar pergunta" : "Nova pergunta"}</h2>
            <p class="texto-apoio">Configure o texto, tipo de resposta e regra de pendência.</p>
          </div>
        </div>

        <form class="card form-grid" onsubmit="Huddle.Configuracoes.salvarPergunta(event, '${idPergunta}', '${idSetorPadrao}')">
          <div class="form-linha">
            <label for="config_pergunta_setor">Setor</label>
            <select id="config_pergunta_setor" required>
              ${setoresOrdenados.map(setor => `
                <option value="${Huddle.Utils.escapeHtml(setor.id)}" ${setor.id === idSetorSelecionado ? "selected" : ""}>
                  ${Huddle.Utils.escapeHtml(setor.nome)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-linha">
            <label for="config_pergunta_ordem">Ordem</label>
            <input id="config_pergunta_ordem" type="number" min="1" step="1" required value="${Huddle.Utils.escapeHtml(pergunta?.ordem || "1")}">
          </div>

          <div class="form-linha">
            <label for="config_pergunta_texto">Pergunta</label>
            <textarea id="config_pergunta_texto" rows="4" required placeholder="Digite o texto da pergunta">${Huddle.Utils.escapeHtml(pergunta?.texto || "")}</textarea>
          </div>

          <div class="form-linha">
            <label for="config_pergunta_tipo">Tipo de resposta</label>
            <select id="config_pergunta_tipo" required onchange="Huddle.Configuracoes.atualizarCamposTipoPergunta()">
              ${this.tiposPergunta.map(tipo => `
                <option value="${tipo.valor}" ${tipo.valor === tipoSelecionado ? "selected" : ""}>${tipo.texto}</option>
              `).join("")}
            </select>
          </div>

          <div id="config_bloco_opcoes" class="form-linha ${["LISTA", "MULTIPLA_ESCOLHA"].includes(tipoSelecionado) ? "" : "hidden"}">
            <label for="config_pergunta_opcoes">Opções de resposta</label>
            <textarea id="config_pergunta_opcoes" rows="5" placeholder="Digite uma opção por linha">${Huddle.Utils.escapeHtml(opcoesPergunta)}</textarea>
            <small class="texto-apoio sem-margem">Use uma opção por linha. Ex.: Baixo, Moderado, Alto.</small>
          </div>

          <div class="grade-checks-config">
            <label>
              <input id="config_pergunta_obrigatoria" type="checkbox" ${pergunta?.obrigatoria === false ? "" : "checked"}>
              Obrigatória
            </label>

            <label>
              <input id="config_pergunta_gera_pendencia" type="checkbox" ${pergunta?.gera_pendencia ? "checked" : ""} onchange="Huddle.Configuracoes.atualizarCamposPendenciaPergunta()">
              Pode gerar pendência automática
            </label>

            <label>
              <input id="config_pergunta_ativo" type="checkbox" ${pergunta?.ativo === false ? "" : "checked"}>
              Pergunta ativa
            </label>
          </div>

          <div id="config_bloco_resposta_pendencia" class="form-linha ${pergunta?.gera_pendencia ? "" : "hidden"}">
            <label for="config_pergunta_resposta_pendencia">Resposta que gera pendência</label>
            <input id="config_pergunta_resposta_pendencia" type="text" value="${Huddle.Utils.escapeHtml(pergunta?.resposta_gera_pendencia || "")}" placeholder="Ex.: SIM ou NÃO">
          </div>

          <div class="acoes">
            <button type="button" class="btn-secundario" onclick="Huddle.Configuracoes.renderPerguntas('${idSetorSelecionado}')">
              Cancelar
            </button>
            <button type="submit" class="btn-principal">
              Salvar pergunta
            </button>
          </div>
        </form>
      </div>
    `;
  },

  atualizarCamposTipoPergunta() {
    const tipo = Huddle.Utils.$("config_pergunta_tipo")?.value || "SIM_NAO";
    const blocoOpcoes = Huddle.Utils.$("config_bloco_opcoes");

    if (blocoOpcoes) {
      blocoOpcoes.classList.toggle("hidden", !["LISTA", "MULTIPLA_ESCOLHA"].includes(tipo));
    }
  },

  atualizarCamposPendenciaPergunta() {
    const gera = Huddle.Utils.$("config_pergunta_gera_pendencia")?.checked || false;
    const bloco = Huddle.Utils.$("config_bloco_resposta_pendencia");

    if (bloco) bloco.classList.toggle("hidden", !gera);
  },

  async salvarPergunta(event, idPergunta = "", idSetorRetorno = "") {
    event.preventDefault();

    const agora = Huddle.Utils.agoraISO();
    const existente = idPergunta ? await Huddle.DB.get("perguntas", idPergunta) : null;
    const id = existente?.id || Huddle.Utils.id("PER");
    const tipo = Huddle.Utils.$("config_pergunta_tipo").value;
    const geraPendencia = Huddle.Utils.$("config_pergunta_gera_pendencia").checked;

    const pergunta = {
      id,
      id_setor: Huddle.Utils.$("config_pergunta_setor").value,
      ordem: Number(Huddle.Utils.$("config_pergunta_ordem").value || 1),
      texto: Huddle.Utils.$("config_pergunta_texto").value.trim(),
      tipo,
      obrigatoria: Huddle.Utils.$("config_pergunta_obrigatoria").checked,
      gera_pendencia: geraPendencia,
      resposta_gera_pendencia: geraPendencia ? Huddle.Utils.$("config_pergunta_resposta_pendencia").value.trim() : "",
      ativo: Huddle.Utils.$("config_pergunta_ativo").checked,
      created_at: existente?.created_at || agora,
      updated_at: agora
    };

    if (!pergunta.texto) {
      Huddle.Utils.toast("Informe o texto da pergunta.");
      return;
    }

    await Huddle.DB.put("perguntas", pergunta);
    await this.salvarOpcoesPergunta(pergunta.id, tipo);

    await Huddle.DB.addLog({
      tipo: "configuracao",
      acao: existente ? "Pergunta editada" : "Pergunta criada",
      detalhe: pergunta.texto,
      usuario: "Configuração"
    });

    Huddle.Utils.toast("Pergunta salva.");
    await this.renderPerguntas(pergunta.id_setor || idSetorRetorno);
  },

  async salvarOpcoesPergunta(idPergunta, tipo) {
    const todasOpcoes = await Huddle.DB.getAll("opcoes_pergunta");
    const antigas = todasOpcoes.filter(opcao => opcao.id_pergunta === idPergunta);

    for (const opcao of antigas) {
      await Huddle.DB.delete("opcoes_pergunta", opcao.id);
    }

    if (!["LISTA", "MULTIPLA_ESCOLHA"].includes(tipo)) return;

    const textoOpcoes = Huddle.Utils.$("config_pergunta_opcoes")?.value || "";
    const linhas = textoOpcoes
      .split("\n")
      .map(linha => linha.trim())
      .filter(Boolean);

    for (let i = 0; i < linhas.length; i++) {
      await Huddle.DB.put("opcoes_pergunta", {
        id: Huddle.Utils.id("OPC"),
        id_pergunta: idPergunta,
        texto: linhas[i],
        valor: linhas[i],
        ordem: i + 1,
        ativo: true,
        created_at: Huddle.Utils.agoraISO(),
        updated_at: Huddle.Utils.agoraISO()
      });
    }
  },

  async alternarPergunta(idPergunta, idSetorRetorno = "") {
    const pergunta = await Huddle.DB.get("perguntas", idPergunta);
    if (!pergunta) return;

    pergunta.ativo = pergunta.ativo === false;
    pergunta.updated_at = Huddle.Utils.agoraISO();

    await Huddle.DB.put("perguntas", pergunta);
    await Huddle.DB.addLog({
      tipo: "configuracao",
      acao: pergunta.ativo ? "Pergunta ativada" : "Pergunta inativada",
      detalhe: pergunta.texto,
      usuario: "Configuração"
    });

    Huddle.Utils.toast(pergunta.ativo ? "Pergunta ativada." : "Pergunta inativada.");
    await this.renderPerguntas(idSetorRetorno || pergunta.id_setor);
  },

  nomeTipo(tipo) {
    const encontrado = this.tiposPergunta.find(item => item.valor === tipo);
    return encontrado ? encontrado.texto : tipo || "Não informado";
  }
};
