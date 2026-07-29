window.Huddle = window.Huddle || {};

Huddle.Perguntas = {
  async obterPerguntasSetor(idSetor) {
    const perguntas = await Huddle.DB.getAll("perguntas");

    return perguntas
      .filter(pergunta => pergunta.id_setor === idSetor && pergunta.ativo !== false)
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));
  },

  async obterOpcoesPergunta(idPergunta) {
    const opcoes = await Huddle.DB.getAll("opcoes_pergunta");

    return opcoes
      .filter(opcao => opcao.id_pergunta === idPergunta && opcao.ativo !== false)
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));
  },

  respostaId(idReuniao, idSetor, idPergunta) {
    return `RESP-${idReuniao}-${idSetor}-${idPergunta}`;
  },

  async obterResposta(idReuniao, idSetor, idPergunta) {
    return await Huddle.DB.get(
      "respostas",
      this.respostaId(idReuniao, idSetor, idPergunta)
    );
  },

  async obterRespostasSetor(idReuniao, idSetor) {
    const respostas = await Huddle.DB.getAll("respostas");

    return respostas.filter(resposta =>
      resposta.id_reuniao === idReuniao &&
      resposta.id_setor === idSetor
    );
  },

  async iniciar(idReuniao, idSetor, indice = 0) {
    const perguntas = await this.obterPerguntasSetor(idSetor);

    if (!perguntas.length) {
      Huddle.Utils.toast("Este setor ainda não possui perguntas cadastradas.");
      await Huddle.Reunioes.renderSetor(idReuniao, idSetor);
      return;
    }

    const indiceSeguro = Math.max(0, Math.min(indice, perguntas.length - 1));
    await this.renderPergunta(idReuniao, idSetor, indiceSeguro);
  },

  async obterPendenciasAbertasSetor(idSetor) {
    const pendencias = await Huddle.DB.getAll("pendencias");

    const abertas = pendencias.filter(pendencia =>
      pendencia.id_setor === idSetor &&
      pendencia.status === "Aberta" &&
      pendencia.removida !== true
    );

    return abertas.sort((a, b) => this.calcularCriticidadePendencia(a) - this.calcularCriticidadePendencia(b));
  },

  async obterPendenciasPergunta(idReuniao, idSetor, idPergunta) {
    const pendencias = await Huddle.DB.getAll("pendencias");

    return pendencias
      .filter(pendencia =>
        pendencia.id_reuniao_origem === idReuniao &&
        pendencia.id_setor === idSetor &&
        pendencia.id_pergunta === idPergunta &&
        pendencia.removida !== true
      )
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  calcularCriticidadePendencia(pendencia) {
    if (!pendencia.prazo_data) return 999999999;

    const agora = new Date();
    const prazo = new Date(pendencia.prazo_data);
    const diferenca = prazo.getTime() - agora.getTime();

    if (diferenca < 0) return -999999999;

    return diferenca;
  },

  async renderListaPendenciasSetor(pendencias) {
    if (!pendencias.length) {
      return `
        <div class="sem-pendencias">
          Sem Pendências
        </div>
      `;
    }

    const reunioes = await Huddle.DB.getAll("reunioes");
    const perguntas = await Huddle.DB.getAll("perguntas");

    return `
      <div class="lista-pendencias-setor">
        ${pendencias.map(pendencia => {
          const reuniaoOrigem = reunioes.find(r => r.id === pendencia.id_reuniao_origem);
          const perguntaOrigem = perguntas.find(p => p.id === pendencia.id_pergunta);
          const textoReuniao = reuniaoOrigem
            ? `Reunião do dia ${reuniaoOrigem.data} às ${reuniaoOrigem.hora_inicio}`
            : "Reunião não localizada";

          return `
            <div class="pendencia-setor-item">
              <strong>${Huddle.Utils.escapeHtml(pendencia.descricao)}</strong>
              <span>${Huddle.Utils.escapeHtml(textoReuniao)}</span>
              ${perguntaOrigem ? `<small>${Huddle.Utils.escapeHtml(perguntaOrigem.texto)}</small>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  renderCardsPendenciasPergunta(pendencias) {
    if (!pendencias.length) {
      return `<div id="pendencias_pergunta" class="lista-pendencias-pergunta hidden"></div>`;
    }

    return `
      <div id="pendencias_pergunta" class="lista-pendencias-pergunta">
        ${pendencias.map((pendencia, index) => `
          <div class="card-pendencia-pergunta">
            <div class="card-pendencia-topo">
              <strong>Pendência ${index + 1}</strong>
              <span class="tag tag-pendencia-card">Aberta</span>
            </div>

            <p>${Huddle.Utils.escapeHtml(pendencia.descricao)}</p>

            ${pendencia.observacao ? `
              <small>${Huddle.Utils.escapeHtml(pendencia.observacao)}</small>
            ` : ""}

            ${pendencia.prazo_texto ? `
              <div class="prazo-pendencia-card">Prazo: ${Huddle.Utils.escapeHtml(pendencia.prazo_texto)}</div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
  },

  async renderPergunta(idReuniao, idSetor, indice) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);
    const setor = await Huddle.DB.get("setores", idSetor);
    const perguntas = await this.obterPerguntasSetor(idSetor);
    const pergunta = perguntas[indice];

    if (!reuniao || !setor || !pergunta) {
      Huddle.Utils.toast("Não foi possível carregar a pergunta.");
      await Huddle.Reunioes.renderSetor(idReuniao, idSetor);
      return;
    }

    const respostaAtual = await this.obterResposta(idReuniao, idSetor, pergunta.id);
    const opcoes = await this.obterOpcoesPergunta(pergunta.id);
    const pendenciasPergunta = await this.obterPendenciasPergunta(idReuniao, idSetor, pergunta.id);
    const pendenciasAbertasSetor = await Huddle.Pendencias.obterAbertasDoSetor(idSetor);
    const pendenciasAntigasSetor = pendenciasAbertasSetor.filter(pendencia =>
      pendencia.id_reuniao_origem !== idReuniao
    );
    const total = perguntas.length;
    const numero = indice + 1;
    const percentual = Math.round((numero / total) * 100);

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">

        <div class="tela-topo tela-topo-compacto">
          <div>
            <h2>${Huddle.Utils.escapeHtml(setor.nome)}</h2>
            <p class="texto-apoio">
              Pergunta ${numero} de ${total} · Reunião do dia ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}
            </p>
          </div>
        </div>

        <div class="barra-progresso" aria-label="Progresso das perguntas">
          <div class="barra-progresso-preenchida" style="width: ${percentual}%"></div>
        </div>

        ${await Huddle.Pendencias.htmlPendenciasDurantePerguntas(pendenciasAntigasSetor, idReuniao, idSetor, indice)}

        <form class="card card-pergunta" onsubmit="Huddle.Perguntas.avancar(event, '${idReuniao}', '${idSetor}', ${indice})">
          <div class="pergunta-meta pergunta-meta-acoes">
            <span>Pergunta ${numero}</span>
            <button
              type="button"
              class="btn-pendencia-topo"
              onclick="Huddle.Perguntas.abrirModalPendencia('${idReuniao}', '${idSetor}', '${pergunta.id}', ${indice})"
            >
              Adicionar Pendência
            </button>
          </div>

          <h3 class="texto-pergunta">${Huddle.Utils.escapeHtml(pergunta.texto)}</h3>

          ${this.renderCampoResposta(pergunta, respostaAtual, opcoes)}

          <div class="form-linha campo-observacao">
            <label for="observacao_pergunta">Observação</label>
            <textarea
              id="observacao_pergunta"
              rows="4"
              placeholder="Digite uma observação, se necessário..."
            >${Huddle.Utils.escapeHtml(respostaAtual?.observacao || "")}</textarea>
          </div>

          ${this.renderCardsPendenciasPergunta(pendenciasPergunta)}

          <div class="acoes acoes-pergunta">
            <button type="button" class="btn-secundario" onclick="Huddle.Perguntas.voltar('${idReuniao}', '${idSetor}', ${indice})">
              ${indice === 0 ? "Voltar ao setor" : "Voltar"}
            </button>

            <button type="submit" class="btn-principal">
              ${indice === total - 1 ? "Revisar setor" : "Próxima"}
            </button>
          </div>
        </form>

        ${this.renderModalPendencia(idReuniao, idSetor, pergunta.id, indice)}

      </div>
    `;
  },

  renderModalPendencia(idReuniao, idSetor, idPergunta, indice) {
    return `
      <div id="modal_pendencia" class="modal-pendencia hidden">
        <div class="modal-pendencia-card">
          <div class="modal-pendencia-topo">
            <h3>Adicionar pendência</h3>
            <button type="button" class="btn-fechar-modal" onclick="Huddle.Perguntas.fecharModalPendencia()">×</button>
          </div>

          <form onsubmit="Huddle.Perguntas.salvarPendencia(event, '${idReuniao}', '${idSetor}', '${idPergunta}', ${indice})">
            <div class="form-linha">
              <label for="pendencia_descricao">Descrição da pendência</label>
              <textarea
                id="pendencia_descricao"
                rows="3"
                placeholder="Descreva a pendência identificada..."
                required
              ></textarea>
            </div>

            <div class="form-linha">
              <label for="pendencia_observacao">Observação</label>
              <textarea
                id="pendencia_observacao"
                rows="3"
                placeholder="Detalhe a situação, se necessário..."
              ></textarea>
            </div>

            <div class="form-linha">
              <label for="pendencia_prazo_tipo">Tempo para resolução</label>
              <select id="pendencia_prazo_tipo" onchange="Huddle.Perguntas.atualizarCamposPrazoPendencia()">
                <option value="24H">24 horas</option>
                <option value="DIAS">Quantidade de dias</option>
                <option value="DATA">Data final</option>
                <option value="SEM_PRAZO">Sem prazo definido</option>
              </select>
            </div>

            <div id="campo_prazo_dias" class="form-linha hidden">
              <label for="pendencia_prazo_dias">Quantidade de dias</label>
              <input id="pendencia_prazo_dias" type="number" min="1" step="1" placeholder="Ex.: 3">
            </div>

            <div id="campo_prazo_data" class="form-linha hidden">
              <label for="pendencia_prazo_data">Data final</label>
              <input id="pendencia_prazo_data" type="date">
            </div>

            <div class="acoes acoes-modal">
              <button type="button" class="btn-secundario" onclick="Huddle.Perguntas.fecharModalPendencia()">
                Cancelar
              </button>

              <button type="submit" class="btn-principal">
                Salvar pendência
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  renderCampoResposta(pergunta, respostaAtual, opcoes = []) {
    const valor = respostaAtual?.resposta || "";
    const valorSeguro = Huddle.Utils.escapeHtml(valor);

    if (pergunta.tipo === "NUMERO") {
      return `
        <div class="form-linha grupo-resposta">
          <label for="resposta_pergunta">Resposta</label>
          <input
            id="resposta_pergunta"
            type="number"
            inputmode="numeric"
            step="any"
            value="${valorSeguro}"
            placeholder="Digite um número"
            ${pergunta.obrigatoria ? "required" : ""}
          >
        </div>
      `;
    }

    if (pergunta.tipo === "TEXTO") {
      return `
        <div class="form-linha grupo-resposta">
          <label for="resposta_pergunta">Resposta</label>
          <textarea
            id="resposta_pergunta"
            rows="5"
            placeholder="Digite a resposta"
            ${pergunta.obrigatoria ? "required" : ""}
          >${valorSeguro}</textarea>
        </div>
      `;
    }

    if (pergunta.tipo === "LISTA") {
      return `
        <div class="form-linha grupo-resposta">
          <label for="resposta_pergunta">Resposta</label>
          <select id="resposta_pergunta" ${pergunta.obrigatoria ? "required" : ""}>
            <option value="">Selecione</option>
            ${opcoes.map(opcao => {
              const opcaoValor = Huddle.Utils.escapeHtml(opcao.valor || opcao.texto);
              const opcaoTexto = Huddle.Utils.escapeHtml(opcao.texto || opcao.valor);
              const selecionado = valor === (opcao.valor || opcao.texto) ? "selected" : "";
              return `<option value="${opcaoValor}" ${selecionado}>${opcaoTexto}</option>`;
            }).join("")}
          </select>
        </div>
      `;
    }

    if (pergunta.tipo === "MULTIPLA_ESCOLHA") {
      const valores = valor ? valor.split("; ") : [];

      return `
        <div class="grupo-resposta">
          <label>Resposta</label>
          <div class="lista-opcoes-multiplas">
            ${opcoes.map(opcao => {
              const opcaoValorOriginal = opcao.valor || opcao.texto;
              const opcaoValor = Huddle.Utils.escapeHtml(opcaoValorOriginal);
              const opcaoTexto = Huddle.Utils.escapeHtml(opcao.texto || opcao.valor);
              const marcado = valores.includes(opcaoValorOriginal) ? "checked" : "";

              return `
                <label class="opcao-multipla">
                  <input type="checkbox" name="resposta_multipla" value="${opcaoValor}" ${marcado}>
                  <span>${opcaoTexto}</span>
                </label>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    return `
      <div class="grupo-resposta">
        <label>Resposta</label>

        <div class="opcoes-sim-nao">
          <label class="opcao-resposta ${valor === "SIM" ? "selecionada" : ""}">
            <input type="radio" name="resposta_sim_nao" value="SIM" ${valor === "SIM" ? "checked" : ""} ${pergunta.obrigatoria ? "required" : ""}>
            <span>SIM</span>
          </label>

          <label class="opcao-resposta ${valor === "NÃO" ? "selecionada" : ""}">
            <input type="radio" name="resposta_sim_nao" value="NÃO" ${valor === "NÃO" ? "checked" : ""} ${pergunta.obrigatoria ? "required" : ""}>
            <span>NÃO</span>
          </label>
        </div>
      </div>
    `;
  },

  lerRespostaDoFormulario(pergunta) {
    if (pergunta.tipo === "SIM_NAO") {
      return document.querySelector("input[name='resposta_sim_nao']:checked")?.value || "";
    }

    if (pergunta.tipo === "MULTIPLA_ESCOLHA") {
      return Array
        .from(document.querySelectorAll("input[name='resposta_multipla']:checked"))
        .map(input => input.value)
        .join("; ");
    }

    return Huddle.Utils.$("resposta_pergunta")?.value?.trim() || "";
  },

  async salvarPerguntaAtual(idReuniao, idSetor, pergunta) {
    const resposta = this.lerRespostaDoFormulario(pergunta);
    const observacao = Huddle.Utils.$("observacao_pergunta")?.value?.trim() || "";

    if (pergunta.obrigatoria && !resposta) {
      Huddle.Utils.toast("Responda a pergunta antes de continuar.");
      return false;
    }

    const agora = Huddle.Utils.agoraISO();
    const respostaExistente = await this.obterResposta(idReuniao, idSetor, pergunta.id);

    const registro = {
      id: this.respostaId(idReuniao, idSetor, pergunta.id),
      id_reuniao: idReuniao,
      id_setor: idSetor,
      id_pergunta: pergunta.id,
      resposta,
      observacao,
      gera_pendencia: Boolean(pergunta.gera_pendencia),
      resposta_gera_pendencia: pergunta.resposta_gera_pendencia || "",
      created_at: respostaExistente?.created_at || agora,
      updated_at: agora
    };

    await Huddle.DB.put("respostas", registro);

    return true;
  },

  async avancar(event, idReuniao, idSetor, indice) {
    event.preventDefault();

    const perguntas = await this.obterPerguntasSetor(idSetor);
    const pergunta = perguntas[indice];

    const salvo = await this.salvarPerguntaAtual(idReuniao, idSetor, pergunta);

    if (!salvo) return;

    if (indice >= perguntas.length - 1) {
      await this.renderRevisaoSetor(idReuniao, idSetor);
      return;
    }

    await this.renderPergunta(idReuniao, idSetor, indice + 1);
  },

  async voltar(idReuniao, idSetor, indice) {
    const perguntas = await this.obterPerguntasSetor(idSetor);
    const pergunta = perguntas[indice];

    if (pergunta) {
      await this.salvarPerguntaAtual(idReuniao, idSetor, pergunta);
    }

    if (indice <= 0) {
      await Huddle.Reunioes.renderSetor(idReuniao, idSetor);
      return;
    }

    await this.renderPergunta(idReuniao, idSetor, indice - 1);
  },

  async renderRevisaoSetor(idReuniao, idSetor) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);
    const setor = await Huddle.DB.get("setores", idSetor);
    const perguntas = await this.obterPerguntasSetor(idSetor);
    const respostas = await this.obterRespostasSetor(idReuniao, idSetor);
    const setoresDaReuniao = await Huddle.Reunioes.obterSetoresDaReuniao(idReuniao);
    const proximoSetor = Huddle.Reunioes.obterProximoSetorPendente(setoresDaReuniao, idSetor);

    if (!reuniao || !setor) {
      Huddle.Utils.toast("Não foi possível carregar a revisão do setor.");
      await Huddle.Reunioes.renderReuniao(idReuniao);
      return;
    }

    const htmlRespostas = perguntas.map((pergunta, indice) => {
      const resposta = respostas.find(item => item.id_pergunta === pergunta.id);
      const respostaTexto = resposta?.resposta || "Sem resposta";
      const observacao = resposta?.observacao || "";
      const gerariaPendencia = pergunta.gera_pendencia && respostaTexto === pergunta.resposta_gera_pendencia;

      return `
        <div class="item-revisao">
          <div class="item-revisao-topo">
            <strong>${indice + 1}. ${Huddle.Utils.escapeHtml(pergunta.texto)}</strong>
            ${gerariaPendencia ? `<span class="tag tag-alerta">Atenção</span>` : ""}
          </div>

          <div class="resposta-revisao">
            <span>Resposta:</span>
            <strong>${Huddle.Utils.escapeHtml(respostaTexto)}</strong>
          </div>

          ${observacao ? `
            <div class="observacao-revisao">
              <span>Observação:</span>
              ${Huddle.Utils.escapeHtml(observacao)}
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">

        <div class="tela-topo">
          <div>
            <h2>Revisar setor</h2>
            <p class="texto-apoio">
              Confira as respostas antes de finalizar o setor ${Huddle.Utils.escapeHtml(setor.nome)}.
            </p>
          </div>
        </div>

        <div class="info-reuniao">
          <div><strong>Reunião:</strong> ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}</div>
          <div><strong>Setor:</strong> ${Huddle.Utils.escapeHtml(setor.nome)}</div>
          <div><strong>Total de perguntas:</strong> ${perguntas.length}</div>
        </div>

        <div class="lista-revisao">
          ${htmlRespostas}
        </div>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Perguntas.iniciar('${idReuniao}', '${idSetor}', ${Math.max(perguntas.length - 1, 0)})">
            Voltar e corrigir
          </button>

          <button class="btn-secundario" onclick="Huddle.Perguntas.finalizarSetor('${idReuniao}', '${idSetor}', 'lista')">
            Finalizar e voltar para lista
          </button>

          ${proximoSetor ? `
            <button class="btn-principal" onclick="Huddle.Perguntas.finalizarSetor('${idReuniao}', '${idSetor}', 'proximo')">
              Finalizar e ir para: ${Huddle.Utils.escapeHtml(proximoSetor.setor_nome)}
            </button>
          ` : `
            <button class="btn-principal" onclick="Huddle.Perguntas.finalizarSetor('${idReuniao}', '${idSetor}', 'lista')">
              Finalizar último setor
            </button>
          `}
        </div>

      </div>
    `;
  },

  async finalizarSetor(idReuniao, idSetor, acaoDepois = "lista") {
    const perguntas = await this.obterPerguntasSetor(idSetor);
    const respostas = await this.obterRespostasSetor(idReuniao, idSetor);
    const respondidas = perguntas.every(pergunta =>
      respostas.some(resposta => resposta.id_pergunta === pergunta.id && String(resposta.resposta || "").trim() !== "")
    );

    if (!respondidas) {
      Huddle.Utils.toast("Ainda existem perguntas sem resposta neste setor.");
      await this.iniciar(idReuniao, idSetor, 0);
      return;
    }

    const relacoes = await Huddle.DB.getAll("reuniao_setores");
    const relacao = relacoes.find(r =>
      r.id_reuniao === idReuniao &&
      r.id_setor === idSetor
    );

    if (!relacao) {
      Huddle.Utils.toast("Vínculo do setor não encontrado.");
      return;
    }

    const agora = Huddle.Utils.agoraISO();
    const setor = await Huddle.DB.get("setores", idSetor);
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    relacao.respondido = true;
    relacao.respondido_em = agora;
    relacao.updated_at = agora;

    await Huddle.DB.put("reuniao_setores", relacao);

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "setor",
      acao: "Setor finalizado",
      detalhe: setor ? setor.nome : idSetor,
      usuario: reuniao ? reuniao.responsavel_nome : ""
    });

    const setoresAtualizados = await Huddle.Reunioes.obterSetoresDaReuniao(idReuniao);
    const proximoSetor = Huddle.Reunioes.obterProximoSetorPendente(setoresAtualizados, idSetor);

    if (acaoDepois === "proximo" && proximoSetor) {
      Huddle.Utils.toast(`Setor finalizado. Próximo: ${proximoSetor.setor_nome}.`);
      await Huddle.Reunioes.renderSetor(idReuniao, proximoSetor.id_setor);
      return;
    }

    if (!proximoSetor) {
      Huddle.Utils.toast("Setor finalizado. Todos os setores foram respondidos.");
    } else {
      Huddle.Utils.toast("Setor finalizado. Ele foi movido para o final da lista.");
    }

    await Huddle.Reunioes.renderReuniao(idReuniao);
  },

  abrirModalPendencia(idReuniao, idSetor, idPergunta, indice) {
    const modal = Huddle.Utils.$("modal_pendencia");

    if (!modal) return;

    modal.classList.remove("hidden");

    setTimeout(() => {
      Huddle.Utils.$("pendencia_descricao")?.focus();
    }, 60);
  },

  fecharModalPendencia() {
    const modal = Huddle.Utils.$("modal_pendencia");

    if (!modal) return;

    modal.classList.add("hidden");
  },

  atualizarCamposPrazoPendencia() {
    const tipo = Huddle.Utils.$("pendencia_prazo_tipo")?.value || "24H";
    const campoDias = Huddle.Utils.$("campo_prazo_dias");
    const campoData = Huddle.Utils.$("campo_prazo_data");

    campoDias?.classList.toggle("hidden", tipo !== "DIAS");
    campoData?.classList.toggle("hidden", tipo !== "DATA");
  },

  calcularPrazoPendencia() {
    const tipo = Huddle.Utils.$("pendencia_prazo_tipo")?.value || "24H";
    const agora = new Date();

    if (tipo === "24H") {
      const prazo = new Date(agora.getTime() + 24 * 60 * 60 * 1000);

      return {
        tipo,
        valor: "24",
        data: prazo.toISOString(),
        texto: "24 horas"
      };
    }

    if (tipo === "DIAS") {
      const dias = Number(Huddle.Utils.$("pendencia_prazo_dias")?.value || 0);

      if (!dias || dias < 1) {
        Huddle.Utils.toast("Informe a quantidade de dias para resolução.");
        return null;
      }

      const prazo = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);

      return {
        tipo,
        valor: String(dias),
        data: prazo.toISOString(),
        texto: `${dias} dia(s)`
      };
    }

    if (tipo === "DATA") {
      const dataInformada = Huddle.Utils.$("pendencia_prazo_data")?.value;

      if (!dataInformada) {
        Huddle.Utils.toast("Informe a data final da pendência.");
        return null;
      }

      const prazo = new Date(`${dataInformada}T23:59:59`);

      return {
        tipo,
        valor: dataInformada,
        data: prazo.toISOString(),
        texto: `até ${prazo.toLocaleDateString("pt-BR")}`
      };
    }

    return {
      tipo: "SEM_PRAZO",
      valor: "",
      data: "",
      texto: "Sem prazo definido"
    };
  },

  async salvarPendencia(event, idReuniao, idSetor, idPergunta, indice) {
    event.preventDefault();

    const descricao = Huddle.Utils.$("pendencia_descricao")?.value.trim() || "";
    const observacaoPendencia = Huddle.Utils.$("pendencia_observacao")?.value.trim() || "";

    if (!descricao) {
      Huddle.Utils.toast("Descreva a pendência antes de salvar.");
      return;
    }

    const prazo = this.calcularPrazoPendencia();

    if (!prazo) return;

    const perguntas = await this.obterPerguntasSetor(idSetor);
    const pergunta = perguntas.find(item => item.id === idPergunta);
    const respostaContexto = pergunta ? this.lerRespostaDoFormulario(pergunta) : "";
    const observacaoResposta = Huddle.Utils.$("observacao_pergunta")?.value?.trim() || "";
    const agora = Huddle.Utils.agoraISO();
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);
    const setor = await Huddle.DB.get("setores", idSetor);

    if (pergunta && (respostaContexto || observacaoResposta)) {
      const respostaExistente = await this.obterResposta(idReuniao, idSetor, idPergunta);

      await Huddle.DB.put("respostas", {
        id: this.respostaId(idReuniao, idSetor, idPergunta),
        id_reuniao: idReuniao,
        id_setor: idSetor,
        id_pergunta: idPergunta,
        resposta: respostaContexto,
        observacao: observacaoResposta,
        gera_pendencia: Boolean(pergunta.gera_pendencia),
        resposta_gera_pendencia: pergunta.resposta_gera_pendencia || "",
        created_at: respostaExistente?.created_at || agora,
        updated_at: agora
      });
    }

    const pendencia = {
      id: Huddle.Utils.id("PEN"),
      id_reuniao_origem: idReuniao,
      id_setor: idSetor,
      id_pergunta: idPergunta,
      id_resposta: this.respostaId(idReuniao, idSetor, idPergunta),
      descricao,
      observacao: observacaoPendencia,
      pergunta_contexto: pergunta?.texto || "",
      resposta_contexto: respostaContexto,
      observacao_resposta_contexto: observacaoResposta,
      prazo_tipo: prazo.tipo,
      prazo_valor: prazo.valor,
      prazo_data: prazo.data,
      prazo_texto: prazo.texto,
      status: "Aberta",
      removida: false,
      prorrogacoes: 0,
      created_at: agora,
      updated_at: agora,
      resolved_at: "",
      removed_at: ""
    };

    await Huddle.DB.add("pendencias", pendencia);

    await Huddle.DB.add("pendencia_logs", {
      id: Huddle.Utils.id("PLOG"),
      id_pendencia: pendencia.id,
      id_reuniao: idReuniao,
      acao: "Criada",
      descricao: `Pendência criada no setor ${setor ? setor.nome : idSetor}.`,
      created_at: agora,
      usuario: reuniao ? reuniao.responsavel_nome : ""
    });

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "pendencia",
      acao: "Pendência criada",
      detalhe: descricao,
      usuario: reuniao ? reuniao.responsavel_nome : ""
    });

    Huddle.Utils.toast("Pendência adicionada.");

    await this.renderPergunta(idReuniao, idSetor, indice);
  },

  async reabrirParaEdicao(idReuniao, idSetor) {
    const confirmar = confirm("Deseja editar este setor? Ele voltará para o status Aguardando.");

    if (!confirmar) return;

    const relacoes = await Huddle.DB.getAll("reuniao_setores");
    const relacao = relacoes.find(r =>
      r.id_reuniao === idReuniao &&
      r.id_setor === idSetor
    );

    if (!relacao) return;

    const reuniao = await Huddle.DB.get("reunioes", idReuniao);
    const setor = await Huddle.DB.get("setores", idSetor);

    relacao.respondido = false;
    relacao.updated_at = Huddle.Utils.agoraISO();

    await Huddle.DB.put("reuniao_setores", relacao);

    await Huddle.DB.addLog({
      id_reuniao: idReuniao,
      tipo: "setor",
      acao: "Setor reaberto para edição",
      detalhe: setor ? setor.nome : idSetor,
      usuario: reuniao ? reuniao.responsavel_nome : ""
    });

    await this.iniciar(idReuniao, idSetor, 0);
  }
};
