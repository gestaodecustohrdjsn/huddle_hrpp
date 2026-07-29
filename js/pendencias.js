window.Huddle = window.Huddle || {};

Huddle.Pendencias = {
  async obterTodasAbertas() {
    const pendencias = await Huddle.DB.getAll("pendencias");

    return this.ordenarPendencias(
      pendencias.filter(pendencia =>
        pendencia.status === "Aberta" &&
        pendencia.removida !== true
      )
    );
  },

  async obterAbertasDoSetor(idSetor) {
    const abertas = await this.obterTodasAbertas();

    return abertas.filter(pendencia => pendencia.id_setor === idSetor);
  },

  async obterGeradasNaReuniao(idReuniao) {
    const pendencias = await Huddle.DB.getAll("pendencias");

    return pendencias
      .filter(pendencia =>
        pendencia.id_reuniao_origem === idReuniao &&
        pendencia.removida !== true
      )
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  },

  ordenarPendencias(pendencias) {
    return [...pendencias].sort((a, b) => {
      const scoreA = this.scoreCriticidade(a);
      const scoreB = this.scoreCriticidade(b);

      if (scoreA !== scoreB) return scoreA - scoreB;

      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  },

  scoreCriticidade(pendencia) {
    if (!pendencia.prazo_data) return 9000000000000;

    const agora = new Date();
    const prazo = new Date(pendencia.prazo_data);
    const diferenca = prazo.getTime() - agora.getTime();
    const umDia = 24 * 60 * 60 * 1000;

    if (diferenca < 0) return 0;
    if (diferenca <= umDia) return 1000000000000 + diferenca;

    return 2000000000000 + diferenca;
  },

  async enriquecer(pendencias) {
    const setores = await Huddle.DB.getAll("setores");
    const perguntas = await Huddle.DB.getAll("perguntas");
    const reunioes = await Huddle.DB.getAll("reunioes");

    return pendencias.map(pendencia => {
      const setor = setores.find(item => item.id === pendencia.id_setor);
      const pergunta = perguntas.find(item => item.id === pendencia.id_pergunta);
      const reuniao = reunioes.find(item => item.id === pendencia.id_reuniao_origem);

      return {
        ...pendencia,
        setor_nome: setor?.nome || pendencia.id_setor || "Setor não informado",
        pergunta_texto: pergunta?.texto || pendencia.pergunta_contexto || pendencia.id_pergunta || "Pergunta não informada",
        reuniao_data: reuniao?.data || "",
        reuniao_hora: reuniao?.hora_inicio || "",
        reuniao_origem: reuniao || null
      };
    });
  },

  async htmlPendenciasHome(pendencias) {
    if (!pendencias.length) return "";

    const enriquecidas = await this.enriquecer(pendencias);

    return `
      <details class="bloco-home bloco-pendencias-home" open>
        <summary>
          <span>Pendências em aberto</span>
          <span class="tag tag-pendencias">${enriquecidas.length}</span>
        </summary>

        <div class="lista-home-pendencias">
          ${enriquecidas.map(pendencia => `
            <div class="item-home-pendencia">
              <strong>${Huddle.Utils.escapeHtml(pendencia.descricao || "Sem descrição")}</strong>
              <span>${Huddle.Utils.escapeHtml(pendencia.setor_nome)}</span>
              <small>${Huddle.Utils.escapeHtml(pendencia.pergunta_texto)}</small>
            </div>
          `).join("")}
        </div>
      </details>
    `;
  },

  async htmlPendenciasGeradasReuniao(idReuniao) {
    const pendencias = await this.obterGeradasNaReuniao(idReuniao);

    if (!pendencias.length) {
      return `
        <div class="card card-pendencias-reuniao">
          <div class="card-titulo-linha">
            <h3>Pendências geradas</h3>
            <span class="tag tag-respondido">Nenhuma</span>
          </div>
          <p class="texto-apoio sem-margem">Nenhuma pendência foi gerada nesta reunião.</p>
        </div>
      `;
    }

    const enriquecidas = await this.enriquecer(pendencias);

    return `
      <div class="card card-pendencias-reuniao">
        <div class="card-titulo-linha">
          <h3>Pendências geradas</h3>
          <span class="tag tag-pendencias">${enriquecidas.length}</span>
        </div>

        <div class="lista-pendencias-geradas">
          ${enriquecidas.map(pendencia => `
            <div class="item-pendencia-gerada">
              <strong>${Huddle.Utils.escapeHtml(pendencia.descricao || "Sem descrição")}</strong>
              <span>${Huddle.Utils.escapeHtml(pendencia.setor_nome)}</span>
              <small>${Huddle.Utils.escapeHtml(pendencia.pergunta_texto)}</small>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  },

  async htmlPendenciasSetorComAcoes(pendencias, idReuniaoAtual, idSetor, indicePergunta = null) {
    if (!pendencias.length) {
      return `
        <div class="sem-pendencias">
          Sem Pendências
        </div>
      `;
    }

    const enriquecidas = await this.enriquecer(pendencias);

    return `
      <div class="lista-pendencias-setor">
        ${enriquecidas.map(pendencia => {
          const textoReuniao = pendencia.reuniao_origem
            ? `Reunião do dia ${pendencia.reuniao_data} às ${pendencia.reuniao_hora}`
            : "Reunião não localizada";

          if (pendencia.id_reuniao_origem === idReuniaoAtual) {
            return `
              <div class="pendencia-setor-item pendencia-sem-acao">
                <div class="pendencia-setor-topo">
                  <strong>${Huddle.Utils.escapeHtml(pendencia.descricao || "Sem descrição")}</strong>
                  <span class="tag tag-gerada-agora">Gerada nesta reunião</span>
                </div>
                <span>${Huddle.Utils.escapeHtml(textoReuniao)}</span>
                <small>${Huddle.Utils.escapeHtml(pendencia.pergunta_texto)}</small>
              </div>
            `;
          }

          return `
            <button
              class="pendencia-setor-item pendencia-clicavel"
              onclick="Huddle.Pendencias.abrirDetalhe('${pendencia.id}', '${idReuniaoAtual}', '${idSetor}', ${indicePergunta === null ? "null" : indicePergunta})"
            >
              <strong>${Huddle.Utils.escapeHtml(pendencia.descricao || "Sem descrição")}</strong>
              <span>${Huddle.Utils.escapeHtml(textoReuniao)}</span>
              <small>${Huddle.Utils.escapeHtml(pendencia.pergunta_texto)}</small>
            </button>
          `;
        }).join("")}
      </div>
    `;
  },

  async htmlPendenciasDurantePerguntas(pendencias, idReuniaoAtual, idSetor, indicePergunta) {
    if (!pendencias.length) return "";

    const lista = await this.htmlPendenciasSetorComAcoes(pendencias, idReuniaoAtual, idSetor, indicePergunta);

    return `
      <details class="card card-pendencias-durante-perguntas" open>
        <summary>
          <span>Pendências abertas do setor</span>
          <span class="tag tag-pendencias">${pendencias.length}</span>
        </summary>

        <div class="conteudo-pendencias-durante-perguntas">
          ${lista}
        </div>
      </details>
    `;
  },

  fecharDetalhe() {
    const modal = document.getElementById("modal_detalhe_pendencia");

    if (modal) modal.remove();
  },

  async abrirDetalhe(idPendencia, idReuniaoAtual, idSetorAtual, indicePergunta = null) {
    this.fecharDetalhe();

    const pendencia = await Huddle.DB.get("pendencias", idPendencia);

    if (!pendencia) {
      Huddle.Utils.toast("Pendência não encontrada.");
      return;
    }

    const [enriquecida] = await this.enriquecer([pendencia]);
    const reunioesSemResolver = await this.calcularReunioesSemResolver(pendencia);
    const tempoAberta = this.tempoDesde(pendencia.created_at);
    const textoReuniao = enriquecida.reuniao_origem
      ? `Reunião do dia ${enriquecida.reuniao_data} às ${enriquecida.reuniao_hora}`
      : "Reunião não localizada";

    const indiceSeguro = indicePergunta === null || indicePergunta === undefined ? "null" : Number(indicePergunta);

    document.body.insertAdjacentHTML("beforeend", `
      <div id="modal_detalhe_pendencia" class="modal-pendencia">
        <div class="modal-pendencia-card modal-pendencia-card-grande">
          <div class="modal-pendencia-topo">
            <div>
              <h3>Detalhe da pendência</h3>
              <p class="texto-apoio sem-margem">${Huddle.Utils.escapeHtml(textoReuniao)}</p>
            </div>
            <button type="button" class="btn-fechar-modal" onclick="Huddle.Pendencias.fecharDetalhe()">×</button>
          </div>

          <div class="detalhe-pendencia-grid">
            <div class="detalhe-pendencia-bloco destaque">
              <span>Descrição</span>
              <strong>${Huddle.Utils.escapeHtml(enriquecida.descricao || "Sem descrição")}</strong>
            </div>

            ${enriquecida.observacao ? `
              <div class="detalhe-pendencia-bloco">
                <span>Observação</span>
                <strong>${Huddle.Utils.escapeHtml(enriquecida.observacao)}</strong>
              </div>
            ` : ""}

            <div class="detalhe-pendencia-bloco">
              <span>Setor</span>
              <strong>${Huddle.Utils.escapeHtml(enriquecida.setor_nome)}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Pergunta</span>
              <strong>${Huddle.Utils.escapeHtml(enriquecida.pergunta_texto)}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Resposta registrada</span>
              <strong>${Huddle.Utils.escapeHtml(enriquecida.resposta_contexto || "-")}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Data e hora da reunião</span>
              <strong>${Huddle.Utils.escapeHtml(textoReuniao)}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Tempo definido</span>
              <strong>${Huddle.Utils.escapeHtml(enriquecida.prazo_texto || "Sem prazo definido")}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Tempo sem resolver</span>
              <strong>${Huddle.Utils.escapeHtml(tempoAberta)}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Reuniões sem resolver</span>
              <strong>${reunioesSemResolver}</strong>
            </div>

            <div class="detalhe-pendencia-bloco">
              <span>Prorrogações</span>
              <strong>${Number(enriquecida.prorrogacoes || 0)}</strong>
            </div>
          </div>

          <div id="form_prorrogar_pendencia" class="form-prorrogar-pendencia hidden">
            <h3>Prorrogar pendência</h3>

            <form onsubmit="Huddle.Pendencias.prorrogar(event, '${idPendencia}', '${idReuniaoAtual}', '${idSetorAtual}', ${indiceSeguro})">
              <div class="form-linha">
                <label for="acao_prazo_tipo">Novo prazo</label>
                <select id="acao_prazo_tipo" onchange="Huddle.Pendencias.atualizarCamposPrazoAcao()">
                  <option value="24H">24 horas</option>
                  <option value="DIAS">Quantidade de dias</option>
                  <option value="DATA">Data final</option>
                  <option value="SEM_PRAZO">Sem prazo definido</option>
                </select>
              </div>

              <div id="acao_campo_prazo_dias" class="form-linha hidden">
                <label for="acao_prazo_dias">Quantidade de dias</label>
                <input id="acao_prazo_dias" type="number" min="1" step="1" placeholder="Ex.: 3">
              </div>

              <div id="acao_campo_prazo_data" class="form-linha hidden">
                <label for="acao_prazo_data">Data final</label>
                <input id="acao_prazo_data" type="date">
              </div>

              <div class="form-linha">
                <label for="acao_observacao_prorrogacao">Observação da prorrogação</label>
                <textarea id="acao_observacao_prorrogacao" rows="3" placeholder="Motivo ou observação, se necessário..."></textarea>
              </div>

              <div class="acoes acoes-modal">
                <button type="button" class="btn-secundario" onclick="Huddle.Pendencias.cancelarProrrogacao()">
                  Cancelar
                </button>
                <button type="submit" class="btn-principal">
                  Salvar prorrogação
                </button>
              </div>
            </form>
          </div>

          <div class="acoes acoes-modal acoes-pendencia">
            <button class="btn-secundario" onclick="Huddle.Pendencias.mostrarProrrogacao()">
              Prorrogar
            </button>

            <button class="btn-principal" onclick="Huddle.Pendencias.resolver('${idPendencia}', '${idReuniaoAtual}', '${idSetorAtual}', ${indiceSeguro})">
              Resolver
            </button>

            <button class="btn-remover-discreto" onclick="Huddle.Pendencias.removerSemResolver('${idPendencia}', '${idReuniaoAtual}', '${idSetorAtual}', ${indiceSeguro})">
              Remover sem resolver
            </button>
          </div>
        </div>
      </div>
    `);
  },

  mostrarProrrogacao() {
    const form = Huddle.Utils.$("form_prorrogar_pendencia");

    if (form) form.classList.remove("hidden");
  },

  cancelarProrrogacao() {
    const form = Huddle.Utils.$("form_prorrogar_pendencia");

    if (form) form.classList.add("hidden");
  },

  atualizarCamposPrazoAcao() {
    const tipo = Huddle.Utils.$("acao_prazo_tipo")?.value || "24H";

    Huddle.Utils.$("acao_campo_prazo_dias")?.classList.toggle("hidden", tipo !== "DIAS");
    Huddle.Utils.$("acao_campo_prazo_data")?.classList.toggle("hidden", tipo !== "DATA");
  },

  calcularPrazoAcao() {
    const tipo = Huddle.Utils.$("acao_prazo_tipo")?.value || "24H";
    const agora = new Date();

    if (tipo === "24H") {
      const prazo = new Date(agora.getTime() + 24 * 60 * 60 * 1000);
      return { tipo, valor: "24", data: prazo.toISOString(), texto: "24 horas" };
    }

    if (tipo === "DIAS") {
      const dias = Number(Huddle.Utils.$("acao_prazo_dias")?.value || 0);

      if (!dias || dias < 1) {
        Huddle.Utils.toast("Informe a quantidade de dias para prorrogar.");
        return null;
      }

      const prazo = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
      return { tipo, valor: String(dias), data: prazo.toISOString(), texto: `${dias} dia(s)` };
    }

    if (tipo === "DATA") {
      const dataInformada = Huddle.Utils.$("acao_prazo_data")?.value;

      if (!dataInformada) {
        Huddle.Utils.toast("Informe a data final da prorrogação.");
        return null;
      }

      const prazo = new Date(`${dataInformada}T23:59:59`);
      return { tipo, valor: dataInformada, data: prazo.toISOString(), texto: `até ${prazo.toLocaleDateString("pt-BR")}` };
    }

    return { tipo: "SEM_PRAZO", valor: "", data: "", texto: "Sem prazo definido" };
  },

  async resolver(idPendencia, idReuniaoAtual, idSetorAtual, indicePergunta = null) {
    const confirmar = confirm("Deseja marcar esta pendência como resolvida?");
    if (!confirmar) return;

    const pendencia = await Huddle.DB.get("pendencias", idPendencia);
    if (!pendencia) return;

    const agora = Huddle.Utils.agoraISO();
    const reuniao = await Huddle.DB.get("reunioes", idReuniaoAtual);

    pendencia.status = "Resolvida";
    pendencia.resolved_at = agora;
    pendencia.updated_at = agora;

    await Huddle.DB.put("pendencias", pendencia);

    await this.registrarLogPendencia({
      idPendencia,
      idReuniao: idReuniaoAtual,
      acao: "Resolvida",
      descricao: "Pendência marcada como resolvida.",
      usuario: reuniao?.responsavel_nome || ""
    });

    Huddle.Utils.toast("Pendência resolvida.");
    await this.atualizarTelaAposAcao(idReuniaoAtual, idSetorAtual, indicePergunta);
  },

  async prorrogar(event, idPendencia, idReuniaoAtual, idSetorAtual, indicePergunta = null) {
    event.preventDefault();

    const pendencia = await Huddle.DB.get("pendencias", idPendencia);
    if (!pendencia) return;

    const prazo = this.calcularPrazoAcao();
    if (!prazo) return;

    const observacao = Huddle.Utils.$("acao_observacao_prorrogacao")?.value.trim() || "";
    const agora = Huddle.Utils.agoraISO();
    const reuniao = await Huddle.DB.get("reunioes", idReuniaoAtual);

    pendencia.prazo_tipo = prazo.tipo;
    pendencia.prazo_valor = prazo.valor;
    pendencia.prazo_data = prazo.data;
    pendencia.prazo_texto = prazo.texto;
    pendencia.prorrogacoes = Number(pendencia.prorrogacoes || 0) + 1;
    pendencia.updated_at = agora;

    await Huddle.DB.put("pendencias", pendencia);

    await this.registrarLogPendencia({
      idPendencia,
      idReuniao: idReuniaoAtual,
      acao: "Prorrogada",
      descricao: `Novo prazo: ${prazo.texto}.${observacao ? " " + observacao : ""}`,
      usuario: reuniao?.responsavel_nome || ""
    });

    Huddle.Utils.toast("Pendência prorrogada.");
    await this.atualizarTelaAposAcao(idReuniaoAtual, idSetorAtual, indicePergunta);
  },

  async removerSemResolver(idPendencia, idReuniaoAtual, idSetorAtual, indicePergunta = null) {
    const confirmar = confirm("Remover esta pendência sem marcar como resolvida? Essa ação ficará registrada em log.");
    if (!confirmar) return;

    const pendencia = await Huddle.DB.get("pendencias", idPendencia);
    if (!pendencia) return;

    const agora = Huddle.Utils.agoraISO();
    const reuniao = await Huddle.DB.get("reunioes", idReuniaoAtual);

    pendencia.status = "Removida";
    pendencia.removida = true;
    pendencia.removed_at = agora;
    pendencia.updated_at = agora;

    await Huddle.DB.put("pendencias", pendencia);

    await this.registrarLogPendencia({
      idPendencia,
      idReuniao: idReuniaoAtual,
      acao: "Removida sem resolver",
      descricao: "Pendência removida sem ser marcada como resolvida.",
      usuario: reuniao?.responsavel_nome || ""
    });

    Huddle.Utils.toast("Pendência removida.");
    await this.atualizarTelaAposAcao(idReuniaoAtual, idSetorAtual, indicePergunta);
  },

  async registrarLogPendencia({ idPendencia, idReuniao, acao, descricao, usuario }) {
    await Huddle.DB.add("pendencia_logs", {
      id: Huddle.Utils.id("PLOG"),
      id_pendencia: idPendencia,
      id_reuniao: idReuniao,
      acao,
      descricao,
      created_at: Huddle.Utils.agoraISO(),
      usuario
    });

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "pendencia",
      acao,
      detalhe: descricao,
      usuario
    });
  },

  async atualizarTelaAposAcao(idReuniaoAtual, idSetorAtual, indicePergunta = null) {
    this.fecharDetalhe();

    if (indicePergunta === null || indicePergunta === undefined || Number.isNaN(Number(indicePergunta))) {
      await Huddle.Reunioes.renderSetor(idReuniaoAtual, idSetorAtual);
      return;
    }

    await Huddle.Perguntas.renderPergunta(idReuniaoAtual, idSetorAtual, Number(indicePergunta));
  },

  tempoDesde(valorData) {
    if (!valorData) return "Não informado";

    const inicio = new Date(valorData);
    const agora = new Date();
    const diff = Math.max(0, agora.getTime() - inicio.getTime());
    const minutos = Math.floor(diff / (60 * 1000));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
      const restoHoras = horas % 24;
      return `${dias} dia(s)${restoHoras ? ` e ${restoHoras} hora(s)` : ""}`;
    }

    if (horas > 0) return `${horas} hora(s)`;

    return `${Math.max(minutos, 1)} minuto(s)`;
  },

  async calcularReunioesSemResolver(pendencia) {
    const reunioes = await Huddle.DB.getAll("reunioes");
    const origem = pendencia.created_at ? new Date(pendencia.created_at) : null;

    if (!origem) return 0;

    return reunioes.filter(reuniao => {
      if (reuniao.status === "Cancelada") return false;

      const dataReuniao = new Date(reuniao.created_at || 0);
      return dataReuniao > origem;
    }).length;
  }
};
