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

        <form class="card card-pergunta" onsubmit="Huddle.Perguntas.avancar(event, '${idReuniao}', '${idSetor}', ${indice})">
          <div class="pergunta-meta">
            <span>Pergunta ${numero}</span>
            <span>${Huddle.Utils.escapeHtml(pergunta.tipo)}</span>
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

          <div class="box-pendencia-em-breve">
            <div>
              <strong>Pendência vinculada à pergunta</strong>
              <p>Na próxima etapa, este botão permitirá adicionar quantas pendências forem necessárias para esta pergunta.</p>
            </div>

            <button type="button" class="btn-claro" disabled>
              Adicionar pendência
            </button>
          </div>

          <div class="acoes acoes-pergunta">
            <button type="button" class="btn-secundario" onclick="Huddle.Perguntas.voltar('${idReuniao}', '${idSetor}', ${indice})">
              ${indice === 0 ? "Voltar ao setor" : "Voltar"}
            </button>

            <button type="submit" class="btn-principal">
              ${indice === total - 1 ? "Revisar setor" : "Próxima"}
            </button>
          </div>
        </form>

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
