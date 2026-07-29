window.Huddle = window.Huddle || {};

Huddle.Dashboard = {
  periodoAtual: "TODOS",

  async render(periodo = this.periodoAtual || "TODOS") {
    this.periodoAtual = periodo;

    const dados = await this.carregarDados(periodo);
    const metricas = this.calcularMetricas(dados);

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela tela-dashboard">
        <section class="dashboard-hero">
          <div>
            <span class="dashboard-eyebrow">Indicadores locais</span>
            <h2>Dashboard do Huddle</h2>
            <p>
              Visão gerencial de reuniões, conformidades, não conformidades, pendências e engajamento dos setores.
            </p>
          </div>

          <div class="dashboard-filtros">
            <label for="dashboard_periodo">Período</label>
            <select id="dashboard_periodo" onchange="Huddle.Dashboard.render(this.value)">
              ${this.optionPeriodo("TODOS", "Todos os registros")}
              ${this.optionPeriodo("HOJE", "Hoje")}
              ${this.optionPeriodo("7", "Últimos 7 dias")}
              ${this.optionPeriodo("30", "Últimos 30 dias")}
              ${this.optionPeriodo("90", "Últimos 90 dias")}
            </select>
          </div>
        </section>

        ${this.htmlAvisoSemDados(metricas)}

        <section class="dashboard-secao">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Visão geral</h3>
              <p>Resumo operacional das reuniões concluídas no período selecionado.</p>
            </div>
          </div>

          <div class="dashboard-kpis">
            ${this.cardKpi("Reuniões realizadas", metricas.totalReunioes, "Concluídas no período", "azul")}
            ${this.cardKpi("Participações de setores", metricas.totalParticipacoes, "Setores presentes nas reuniões", "turquesa")}
            ${this.cardKpi("Perguntas respondidas", metricas.totalRespostas, "Base da conformidade", "neutro")}
            ${this.cardKpi("Conformidade geral", this.formatarPercentual(metricas.conformidadeGeral), `${metricas.respostasConformes} conforme(s) de ${metricas.totalRespostas}`, "verde")}
          </div>
        </section>

        <section class="dashboard-secao">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Não conformidades e pendências</h3>
              <p>
                Nesta versão simples, cada pendência gerada representa uma não conformidade registrada.
              </p>
            </div>
          </div>

          <div class="dashboard-kpis dashboard-kpis-alerta">
            ${this.cardKpi("NC geradas", metricas.ncGeradas, "Total de pendências criadas", "laranja")}
            ${this.cardKpi("NC abertas", metricas.ncAbertas, "Ainda sem resolução", "laranja")}
            ${this.cardKpi("NC vencidas", metricas.ncVencidas, "Abertas e fora do prazo", "vermelho")}
            ${this.cardKpi("Resolvidas", metricas.ncResolvidas, "Pendências solucionadas", "verde")}
          </div>
        </section>

        <section class="dashboard-secao dashboard-card-destaque">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Leitura de conformidade</h3>
              <p>
                Perguntas sem pendência contam como conformes. Perguntas que geraram uma ou mais pendências contam como não conformes.
              </p>
            </div>

            <span class="dashboard-percentual-grande">${this.formatarPercentual(metricas.conformidadeGeral)}</span>
          </div>

          ${this.barraPercentual(metricas.conformidadeGeral, "Conformidade")}

          <div class="dashboard-mini-grid">
            <div>
              <strong>${metricas.respostasConformes}</strong>
              <span>respostas conformes</span>
            </div>
            <div>
              <strong>${metricas.respostasNaoConformes}</strong>
              <span>respostas com pendência</span>
            </div>
            <div>
              <strong>${this.formatarPercentual(metricas.naoConformidadeGeral)}</strong>
              <span>não conformidade</span>
            </div>
          </div>
        </section>

        <section class="dashboard-secao">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Conformidade por setor</h3>
              <p>Comparativo entre respostas registradas e pendências geradas por setor.</p>
            </div>
          </div>

          ${this.tabelaConformidadeSetor(metricas.setoresResumo)}
        </section>

        <section class="dashboard-secao">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Pendências por setor</h3>
              <p>Setores com maior volume de pendências geradas, abertas, resolvidas e vencidas.</p>
            </div>
          </div>

          ${this.tabelaPendenciasSetor(metricas.setoresResumo)}
        </section>

        <section class="dashboard-secao">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Perguntas que mais geraram pendência</h3>
              <p>Ranking dos pontos de maior atenção no Huddle.</p>
            </div>
          </div>

          ${this.tabelaPerguntasCriticas(metricas.perguntasResumo)}
        </section>

        <section class="dashboard-secao">
          <div class="dashboard-secao-topo">
            <div>
              <h3>Engajamento por setor</h3>
              <p>
                Participação considera presença na reunião. O índice simples valoriza presença e presença do coordenador.
              </p>
            </div>
          </div>

          ${this.tabelaEngajamento(metricas.engajamentoSetores)}
        </section>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderHome()">
            Voltar ao início
          </button>
        </div>
      </div>
    `;
  },

  optionPeriodo(valor, texto) {
    return `<option value="${valor}" ${this.periodoAtual === valor ? "selected" : ""}>${texto}</option>`;
  },

  async carregarDados(periodo) {
    const [reunioes, relacoes, setores, perguntas, respostas, pendencias] = await Promise.all([
      Huddle.DB.getAll("reunioes"),
      Huddle.DB.getAll("reuniao_setores"),
      Huddle.DB.getAll("setores"),
      Huddle.DB.getAll("perguntas"),
      Huddle.DB.getAll("respostas"),
      Huddle.DB.getAll("pendencias")
    ]);

    const inicio = this.obterInicioPeriodo(periodo);

    const reunioesConcluidas = reunioes
      .filter(reuniao => reuniao.status === "Concluída")
      .filter(reuniao => !inicio || this.dataDoRegistro(reuniao) >= inicio);

    const idsReunioes = new Set(reunioesConcluidas.map(reuniao => reuniao.id));

    const relacoesPeriodo = relacoes.filter(item => idsReunioes.has(item.id_reuniao));
    const respostasPeriodo = respostas.filter(item => idsReunioes.has(item.id_reuniao));

    const pendenciasPeriodo = pendencias
      .filter(item => idsReunioes.has(item.id_reuniao_origem))
      .filter(item => item.removida !== true && item.status !== "Removida");

    return {
      periodo,
      reunioesTodas: reunioes,
      reunioes: reunioesConcluidas,
      relacoes: relacoesPeriodo,
      setores,
      perguntas,
      respostas: respostasPeriodo,
      pendencias: pendenciasPeriodo
    };
  },

  obterInicioPeriodo(periodo) {
    if (!periodo || periodo === "TODOS") return null;

    const agora = new Date();

    if (periodo === "HOJE") {
      const hoje = new Date(agora);
      hoje.setHours(0, 0, 0, 0);
      return hoje;
    }

    const dias = Number(periodo);

    if (!dias) return null;

    return new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
  },

  dataDoRegistro(registro) {
    const valor = registro.updated_at || registro.created_at || registro.resolved_at || "";
    const data = valor ? new Date(valor) : new Date(0);

    if (Number.isNaN(data.getTime())) return new Date(0);

    return data;
  },

  calcularMetricas(dados) {
    const mapaSetores = new Map(dados.setores.map(setor => [setor.id, setor]));
    const mapaPerguntas = new Map(dados.perguntas.map(pergunta => [pergunta.id, pergunta]));

    const pendenciasPorPerguntaResposta = new Set(
      dados.pendencias.map(p => `${p.id_reuniao_origem}|${p.id_setor}|${p.id_pergunta}`)
    );

    const respostasNaoConformes = dados.respostas.filter(resposta =>
      pendenciasPorPerguntaResposta.has(`${resposta.id_reuniao}|${resposta.id_setor}|${resposta.id_pergunta}`)
    ).length;

    const respostasConformes = Math.max(0, dados.respostas.length - respostasNaoConformes);
    const conformidadeGeral = dados.respostas.length
      ? (respostasConformes / dados.respostas.length) * 100
      : 0;

    const abertas = dados.pendencias.filter(p => p.status === "Aberta");
    const resolvidas = dados.pendencias.filter(p => p.status === "Resolvida");
    const vencidas = abertas.filter(p => this.estaVencida(p));

    const setoresResumo = this.calcularSetoresResumo(dados, mapaSetores, pendenciasPorPerguntaResposta);
    const perguntasResumo = this.calcularPerguntasResumo(dados, mapaPerguntas, mapaSetores);
    const engajamentoSetores = this.calcularEngajamentoSetores(dados, mapaSetores);

    return {
      totalReunioes: dados.reunioes.length,
      totalParticipacoes: dados.relacoes.length,
      totalRespostas: dados.respostas.length,
      respostasConformes,
      respostasNaoConformes,
      conformidadeGeral,
      naoConformidadeGeral: dados.respostas.length ? (respostasNaoConformes / dados.respostas.length) * 100 : 0,
      ncGeradas: dados.pendencias.length,
      ncAbertas: abertas.length,
      ncResolvidas: resolvidas.length,
      ncVencidas: vencidas.length,
      setoresResumo,
      perguntasResumo,
      engajamentoSetores
    };
  },

  calcularSetoresResumo(dados, mapaSetores, pendenciasPorPerguntaResposta) {
    const ids = new Set([
      ...dados.setores.map(s => s.id),
      ...dados.relacoes.map(r => r.id_setor),
      ...dados.respostas.map(r => r.id_setor),
      ...dados.pendencias.map(p => p.id_setor)
    ]);

    return Array.from(ids).map(idSetor => {
      const setor = mapaSetores.get(idSetor);
      const relacoes = dados.relacoes.filter(item => item.id_setor === idSetor);
      const respostas = dados.respostas.filter(item => item.id_setor === idSetor);
      const pendencias = dados.pendencias.filter(item => item.id_setor === idSetor);
      const abertas = pendencias.filter(item => item.status === "Aberta");
      const resolvidas = pendencias.filter(item => item.status === "Resolvida");
      const vencidas = abertas.filter(item => this.estaVencida(item));
      const respostasComPendencia = respostas.filter(resposta =>
        pendenciasPorPerguntaResposta.has(`${resposta.id_reuniao}|${resposta.id_setor}|${resposta.id_pergunta}`)
      ).length;
      const conformes = Math.max(0, respostas.length - respostasComPendencia);

      return {
        id_setor: idSetor,
        nome: setor?.nome || idSetor,
        grupo: setor?.grupo || "",
        participacoes: relacoes.length,
        coordenador: relacoes.filter(r => (r.tipo_presenca || "Coordenador") === "Coordenador").length,
        representante: relacoes.filter(r => (r.tipo_presenca || "Coordenador") === "Representante").length,
        respostas: respostas.length,
        pendencias: pendencias.length,
        abertas: abertas.length,
        resolvidas: resolvidas.length,
        vencidas: vencidas.length,
        prorrogacoes: pendencias.reduce((acc, item) => acc + Number(item.prorrogacoes || 0), 0),
        respostasComPendencia,
        conformes,
        conformidade: respostas.length ? (conformes / respostas.length) * 100 : null
      };
    });
  },

  calcularPerguntasResumo(dados, mapaPerguntas, mapaSetores) {
    const ids = new Set([
      ...dados.respostas.map(r => r.id_pergunta),
      ...dados.pendencias.map(p => p.id_pergunta)
    ]);

    return Array.from(ids).map(idPergunta => {
      const pergunta = mapaPerguntas.get(idPergunta);
      const setor = pergunta ? mapaSetores.get(pergunta.id_setor) : null;
      const respostas = dados.respostas.filter(item => item.id_pergunta === idPergunta);
      const pendencias = dados.pendencias.filter(item => item.id_pergunta === idPergunta);
      const chavesComPendencia = new Set(
        pendencias.map(item => `${item.id_reuniao_origem}|${item.id_setor}|${item.id_pergunta}`)
      );
      const respostasComPendencia = respostas.filter(resposta =>
        chavesComPendencia.has(`${resposta.id_reuniao}|${resposta.id_setor}|${resposta.id_pergunta}`)
      ).length;

      return {
        id_pergunta: idPergunta,
        pergunta: pergunta?.texto || pendencias[0]?.pergunta_contexto || idPergunta,
        setor: setor?.nome || mapaSetores.get(pendencias[0]?.id_setor)?.nome || "Setor não informado",
        respostas: respostas.length,
        pendencias: pendencias.length,
        respostasComPendencia,
        naoConformidade: respostas.length ? (respostasComPendencia / respostas.length) * 100 : 0
      };
    });
  },

  calcularEngajamentoSetores(dados, mapaSetores) {
    const totalReunioes = dados.reunioes.length;
    const ids = new Set([
      ...dados.setores.map(s => s.id),
      ...dados.relacoes.map(r => r.id_setor)
    ]);

    return Array.from(ids).map(idSetor => {
      const setor = mapaSetores.get(idSetor);
      const relacoes = dados.relacoes.filter(item => item.id_setor === idSetor);
      const coordenador = relacoes.filter(r => (r.tipo_presenca || "Coordenador") === "Coordenador").length;
      const representante = relacoes.filter(r => (r.tipo_presenca || "Coordenador") === "Representante").length;
      const ausencias = Math.max(0, totalReunioes - relacoes.length);
      const taxaParticipacao = totalReunioes ? (relacoes.length / totalReunioes) * 100 : 0;
      const taxaCoordenador = totalReunioes ? (coordenador / totalReunioes) * 100 : 0;
      const indice = (taxaParticipacao * 0.7) + (taxaCoordenador * 0.3);

      return {
        id_setor: idSetor,
        nome: setor?.nome || idSetor,
        grupo: setor?.grupo || "",
        presentes: relacoes.length,
        ausencias,
        coordenador,
        representante,
        taxaParticipacao,
        taxaCoordenador,
        indice
      };
    });
  },

  estaVencida(pendencia) {
    if (pendencia.status !== "Aberta" || !pendencia.prazo_data) return false;

    const prazo = new Date(pendencia.prazo_data);

    if (Number.isNaN(prazo.getTime())) return false;

    return prazo.getTime() < Date.now();
  },

  htmlAvisoSemDados(metricas) {
    if (metricas.totalReunioes > 0) return "";

    return `
      <div class="card dashboard-aviso-sem-dados">
        <strong>Ainda não há reuniões concluídas no período selecionado.</strong>
        <p class="texto-apoio sem-margem">
          O dashboard começa a ficar completo conforme as reuniões forem concluídas e os setores forem respondidos.
        </p>
      </div>
    `;
  },

  cardKpi(titulo, valor, legenda, tipo = "neutro") {
    return `
      <div class="dashboard-kpi dashboard-kpi-${tipo}">
        <span>${Huddle.Utils.escapeHtml(titulo)}</span>
        <strong>${Huddle.Utils.escapeHtml(valor)}</strong>
        <small>${Huddle.Utils.escapeHtml(legenda)}</small>
      </div>
    `;
  },

  barraPercentual(valor, rotulo = "") {
    const pct = this.limitarPercentual(valor);

    return `
      <div class="dashboard-barra-completa" aria-label="${Huddle.Utils.escapeHtml(rotulo)}">
        <div style="width: ${pct}%"></div>
      </div>
    `;
  },

  barraMini(valor) {
    const pct = this.limitarPercentual(valor);

    return `
      <div class="dashboard-barra-mini">
        <div style="width: ${pct}%"></div>
      </div>
    `;
  },

  limitarPercentual(valor) {
    const numero = Number(valor || 0);

    if (Number.isNaN(numero)) return 0;

    return Math.max(0, Math.min(100, numero));
  },

  formatarPercentual(valor) {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) return "-";

    return `${Number(valor).toFixed(1).replace(".", ",")}%`;
  },

  tabela(headers, rows, vazio = "Sem dados para exibir.") {
    if (!rows.length) {
      return `
        <div class="card">
          <p class="texto-apoio sem-margem">${Huddle.Utils.escapeHtml(vazio)}</p>
        </div>
      `;
    }

    return `
      <div class="dashboard-tabela-wrap">
        <table class="dashboard-tabela">
          <thead>
            <tr>
              ${headers.map(header => `<th>${Huddle.Utils.escapeHtml(header)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  },

  tabelaConformidadeSetor(setoresResumo) {
    const linhas = setoresResumo
      .filter(item => item.respostas || item.pendencias || item.participacoes)
      .sort((a, b) => (a.conformidade ?? -1) - (b.conformidade ?? -1) || b.pendencias - a.pendencias)
      .map(item => [
        `<strong>${Huddle.Utils.escapeHtml(item.nome)}</strong><br><small>${Huddle.Utils.escapeHtml(item.grupo || "")}</small>`,
        String(item.participacoes),
        String(item.respostas),
        String(item.pendencias),
        `${this.formatarPercentual(item.conformidade)} ${this.barraMini(item.conformidade || 0)}`
      ]);

    return this.tabela(
      ["Setor", "Participações", "Respostas", "NC geradas", "Conformidade"],
      linhas,
      "Ainda não há respostas ou pendências para calcular conformidade por setor."
    );
  },

  tabelaPendenciasSetor(setoresResumo) {
    const linhas = setoresResumo
      .filter(item => item.pendencias > 0)
      .sort((a, b) => b.vencidas - a.vencidas || b.abertas - a.abertas || b.pendencias - a.pendencias)
      .map(item => [
        `<strong>${Huddle.Utils.escapeHtml(item.nome)}</strong>`,
        String(item.pendencias),
        String(item.abertas),
        String(item.resolvidas),
        item.vencidas ? `<span class="dashboard-texto-critico">${item.vencidas}</span>` : "0",
        item.prorrogacoes ? String(item.prorrogacoes) : "-"
      ]);

    return this.tabela(
      ["Setor", "Geradas", "Abertas", "Resolvidas", "Vencidas", "Prorrogações"],
      linhas,
      "Ainda não há pendências registradas no período."
    );
  },

  tabelaPerguntasCriticas(perguntasResumo) {
    const linhas = perguntasResumo
      .filter(item => item.pendencias > 0)
      .sort((a, b) => b.pendencias - a.pendencias || b.naoConformidade - a.naoConformidade)
      .slice(0, 12)
      .map(item => [
        `<strong>${Huddle.Utils.escapeHtml(item.pergunta)}</strong><br><small>${Huddle.Utils.escapeHtml(item.setor)}</small>`,
        String(item.respostas),
        String(item.pendencias),
        `${this.formatarPercentual(item.naoConformidade)} ${this.barraMini(item.naoConformidade || 0)}`
      ]);

    return this.tabela(
      ["Pergunta", "Respostas", "NC geradas", "% não conformidade"],
      linhas,
      "Nenhuma pergunta gerou pendência no período."
    );
  },

  tabelaEngajamento(engajamentoSetores) {
    const linhas = engajamentoSetores
      .filter(item => item.presentes > 0 || item.ausencias > 0)
      .sort((a, b) => b.indice - a.indice || b.presentes - a.presentes)
      .map(item => [
        `<strong>${Huddle.Utils.escapeHtml(item.nome)}</strong><br><small>${Huddle.Utils.escapeHtml(item.grupo || "")}</small>`,
        `${item.presentes}<br><small>${this.formatarPercentual(item.taxaParticipacao)}</small>`,
        String(item.coordenador),
        String(item.representante),
        String(item.ausencias),
        `${this.formatarPercentual(item.indice)} ${this.barraMini(item.indice || 0)}`
      ]);

    return this.tabela(
      ["Setor", "Presenças", "Coord.", "Repres.", "Ausências", "Índice"],
      linhas,
      "Ainda não há reuniões suficientes para calcular engajamento."
    );
  }
};
