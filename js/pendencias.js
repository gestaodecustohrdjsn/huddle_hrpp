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

  async obterResolvidasRecentes(limite = 8) {
    const pendencias = await Huddle.DB.getAll("pendencias");

    return pendencias
      .filter(pendencia =>
        pendencia.status === "Resolvida" &&
        pendencia.removida !== true
      )
      .sort((a, b) => new Date(b.resolved_at || b.updated_at || 0) - new Date(a.resolved_at || a.updated_at || 0))
      .slice(0, limite);
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

  formatarTextoReuniao(pendencia) {
    if (!pendencia.reuniao_origem) return "Reunião não localizada";
    return `Reunião do dia ${pendencia.reuniao_data} às ${pendencia.reuniao_hora}`;
  },

  formatarSituacaoPrazo(pendencia) {
    if (!pendencia.prazo_data) {
      return {
        situacao: "Sem prazo definido",
        detalhe: "Sem vencimento informado",
        classe: "neutro"
      };
    }

    const agora = new Date();
    const prazo = new Date(pendencia.prazo_data);
    const diff = prazo.getTime() - agora.getTime();
    const umDia = 24 * 60 * 60 * 1000;
    const umaHora = 60 * 60 * 1000;

    if (diff < 0) {
      const atraso = Math.abs(diff);
      const dias = Math.floor(atraso / umDia);
      const horas = Math.floor((atraso % umDia) / umaHora);

      if (dias > 0) {
        return {
          situacao: "Prazo vencido",
          detalhe: `${dias} dia(s) em atraso`,
          classe: "vencido"
        };
      }

      return {
        situacao: "Prazo vencido",
        detalhe: `${Math.max(horas, 1)} hora(s) em atraso`,
        classe: "vencido"
      };
    }

    if (diff <= umDia) {
      const horas = Math.ceil(diff / umaHora);
      return {
        situacao: "Dentro do prazo",
        detalhe: horas <= 1 ? "menos de 1 hora restante" : `${horas} hora(s) restantes`,
        classe: "atencao"
      };
    }

    const dias = Math.ceil(diff / umDia);

    return {
      situacao: "Dentro do prazo",
      detalhe: `${dias} dia(s) restantes`,
      classe: "ok"
    };
  },

  htmlResumoPendencia(pendencia, opcoes = {}) {
    const textoReuniao = this.formatarTextoReuniao(pendencia);
    const prazo = this.formatarSituacaoPrazo(pendencia);
    const prorrogacoes = Number(pendencia.prorrogacoes || 0);
    const tagExtra = opcoes.tagExtra || "";
    const classePrazo = `resumo-pendencia-prazo-${prazo.classe}`;

    return `
      <div class="resumo-pendencia ${classePrazo} ${opcoes.classeExtra || ""}">
        <div class="resumo-pendencia-pergunta">
          ${Huddle.Utils.escapeHtml(pendencia.pergunta_texto || "Pergunta não informada")}
        </div>

        <strong class="resumo-pendencia-descricao">
          ${Huddle.Utils.escapeHtml(pendencia.descricao || "Sem descrição")}
        </strong>

        <div class="resumo-pendencia-info">
          <span><strong>Setor:</strong> ${Huddle.Utils.escapeHtml(pendencia.setor_nome || "Setor não informado")}</span>
          <span><strong>Reunião:</strong> ${Huddle.Utils.escapeHtml(textoReuniao)}</span>
        </div>

        <div class="resumo-pendencia-rodape">
          <span class="status-prazo status-prazo-${prazo.classe}">${Huddle.Utils.escapeHtml(prazo.situacao)}</span>
          <span>${Huddle.Utils.escapeHtml(prazo.detalhe)}</span>
          ${prorrogacoes > 0 ? `<span>${prorrogacoes} prorrogação(ões)</span>` : ""}
          ${tagExtra}
        </div>
      </div>
    `;
  },

  classePainelPendencia(pendencia) {
    const prazo = this.formatarSituacaoPrazo(pendencia);

    if (["vencido", "atencao"].includes(prazo.classe)) {
      return "pendencia-painel-critica";
    }

    if (prazo.classe === "ok") {
      return "pendencia-painel-aberta";
    }

    return "pendencia-painel-neutra";
  },

  htmlResumoPendenciaResolvida(pendencia) {
    const textoReuniao = this.formatarTextoReuniao(pendencia);
    const dataResolucao = pendencia.resolved_at
      ? Huddle.Utils.dataHoraBR(pendencia.resolved_at)
      : "Data de resolução não informada";
    const prorrogacoes = Number(pendencia.prorrogacoes || 0);

    return `
      <div class="resumo-pendencia resumo-pendencia-resolvida">
        <div class="resumo-pendencia-pergunta">
          ${Huddle.Utils.escapeHtml(pendencia.pergunta_texto || "Pergunta não informada")}
        </div>

        <strong class="resumo-pendencia-descricao">
          ${Huddle.Utils.escapeHtml(pendencia.descricao || "Sem descrição")}
        </strong>

        <div class="resumo-pendencia-info">
          <span><strong>Setor:</strong> ${Huddle.Utils.escapeHtml(pendencia.setor_nome || "Setor não informado")}</span>
          <span><strong>Reunião:</strong> ${Huddle.Utils.escapeHtml(textoReuniao)}</span>
        </div>

        <div class="resumo-pendencia-rodape">
          <span class="status-prazo status-prazo-resolvida">Resolvida</span>
          <span>${Huddle.Utils.escapeHtml(dataResolucao)}</span>
          ${prorrogacoes > 0 ? `<span>${prorrogacoes} prorrogação(ões)</span>` : ""}
        </div>
      </div>
    `;
  },

  async htmlPendenciasHome(pendencias) {
    if (!pendencias.length) return "";

    const enriquecidas = await this.enriquecer(pendencias);

    return `
      <section class="secao-pendencias-home">
        <div class="secao-cabecalho secao-cabecalho-limpo">
          <h2>Pendências em aberto</h2>

          <button class="btn-claro" onclick="Huddle.Pendencias.renderPainelGeral()">
            Painel de Pendências
          </button>
        </div>

        <div class="lista-reunioes-resumo lista-pendencias-home-resumo">
          ${enriquecidas.map(pendencia => `
            <div class="item-reuniao-resumo item-pendencia-home-resumo ${this.classePainelPendencia(pendencia)}">
              ${this.htmlResumoPendencia(pendencia)}
            </div>
          `).join("")}
        </div>
      </section>
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
              ${this.htmlResumoPendencia(pendencia)}
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
          if (pendencia.id_reuniao_origem === idReuniaoAtual) {
            return `
              <div class="pendencia-setor-item pendencia-sem-acao">
                ${this.htmlResumoPendencia(pendencia, {
                  tagExtra: `<span class="tag tag-gerada-agora">Gerada nesta reunião</span>`
                })}
              </div>
            `;
          }

          return `
            <button
              class="pendencia-setor-item pendencia-clicavel"
              onclick="Huddle.Pendencias.abrirDetalhe('${pendencia.id}', '${idReuniaoAtual}', '${idSetor}', ${indicePergunta === null ? "null" : indicePergunta})"
            >
              ${this.htmlResumoPendencia(pendencia)}
            </button>
          `;
        }).join("")}
      </div>
    `;
  },

  async htmlPendenciasPerguntaCarrossel(pendencias, idReuniaoAtual, idSetor, indicePergunta) {
    if (!pendencias.length) return "";

    const lista = await this.htmlPendenciasSetorComAcoes(pendencias, idReuniaoAtual, idSetor, indicePergunta);

    return `
      <div class="pendencias-pergunta-vinculadas">
        <div class="pendencias-pergunta-titulo">
          <strong>Pendências vinculadas a esta pergunta</strong>
          <span class="tag tag-pendencias">${pendencias.length}</span>
        </div>

        ${lista}
      </div>
    `;
  },

  async htmlPendenciasDurantePerguntas(pendencias, idReuniaoAtual, idSetor, indicePergunta) {
    return await this.htmlPendenciasPerguntaCarrossel(pendencias, idReuniaoAtual, idSetor, indicePergunta);
  },

  async renderPainelGeral() {
    const abertas = await this.obterTodasAbertas();
    const resolvidasRecentes = await this.obterResolvidasRecentes(8);

    const abertasEnriquecidas = await this.enriquecer(abertas);
    const resolvidasEnriquecidas = await this.enriquecer(resolvidasRecentes);

    const htmlAbertas = abertasEnriquecidas.length
      ? abertasEnriquecidas.map(pendencia => `
        <button
          class="pendencia-painel-item pendencia-clicavel ${this.classePainelPendencia(pendencia)}"
          onclick="Huddle.Pendencias.abrirDetalhe('${pendencia.id}', '', '__PAINEL__', null)"
        >
          ${this.htmlResumoPendencia(pendencia)}
        </button>
      `).join("")
      : `
        <div class="card">
          <p class="texto-apoio sem-margem">Não há pendências abertas neste dispositivo.</p>
        </div>
      `;

    const htmlResolvidas = resolvidasEnriquecidas.length
      ? `
        <section class="secao-pendencias-resolvidas">
          <div class="secao-cabecalho secao-cabecalho-limpo">
            <h2>Últimas pendências resolvidas</h2>
            <span class="tag tag-resolvida">${resolvidasEnriquecidas.length}</span>
          </div>

          <div class="lista-painel-pendencias lista-painel-resolvidas">
            ${resolvidasEnriquecidas.map(pendencia => `
              <div class="pendencia-painel-item pendencia-resolvida-item pendencia-painel-resolvida">
                ${this.htmlResumoPendenciaResolvida(pendencia)}
              </div>
            `).join("")}
          </div>
        </section>
      `
      : "";

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">
        <div class="tela-topo">
          <div>
            <h2>Painel de pendências</h2>
            <p class="texto-apoio">
              Pendências abertas em todos os setores, ordenadas automaticamente por prazo.
            </p>
          </div>
        </div>

        <section class="secao-pendencias-abertas">
          <div class="secao-cabecalho secao-cabecalho-limpo">
            <h2>Pendências abertas</h2>
            <span class="tag tag-pendencias">${abertasEnriquecidas.length}</span>
          </div>

          <div class="lista-painel-pendencias">
            ${htmlAbertas}
          </div>
        </section>

        ${htmlResolvidas}

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderHome()">
            Voltar ao início
          </button>
        </div>
      </div>
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
    const textoReuniao = this.formatarTextoReuniao(enriquecida);
    const prazo = this.formatarSituacaoPrazo(enriquecida);
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
              <span>Situação do prazo</span>
              <strong>${Huddle.Utils.escapeHtml(prazo.situacao)} | ${Huddle.Utils.escapeHtml(prazo.detalhe)}</strong>
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
    const reuniao = idReuniaoAtual ? await Huddle.DB.get("reunioes", idReuniaoAtual) : null;

    pendencia.status = "Resolvida";
    pendencia.resolved_at = agora;
    pendencia.updated_at = agora;

    await Huddle.DB.put("pendencias", pendencia);

    await this.registrarLogPendencia({
      idPendencia,
      idReuniao: idReuniaoAtual || "",
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
    const reuniao = idReuniaoAtual ? await Huddle.DB.get("reunioes", idReuniaoAtual) : null;

    pendencia.prazo_tipo = prazo.tipo;
    pendencia.prazo_valor = prazo.valor;
    pendencia.prazo_data = prazo.data;
    pendencia.prazo_texto = prazo.texto;
    pendencia.prorrogacoes = Number(pendencia.prorrogacoes || 0) + 1;
    pendencia.updated_at = agora;

    await Huddle.DB.put("pendencias", pendencia);

    await this.registrarLogPendencia({
      idPendencia,
      idReuniao: idReuniaoAtual || "",
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
    const reuniao = idReuniaoAtual ? await Huddle.DB.get("reunioes", idReuniaoAtual) : null;

    pendencia.status = "Removida";
    pendencia.removida = true;
    pendencia.removed_at = agora;
    pendencia.updated_at = agora;

    await Huddle.DB.put("pendencias", pendencia);

    await this.registrarLogPendencia({
      idPendencia,
      idReuniao: idReuniaoAtual || "",
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

    if (!idReuniaoAtual || idSetorAtual === "__PAINEL__") {
      await this.renderPainelGeral();
      return;
    }

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
