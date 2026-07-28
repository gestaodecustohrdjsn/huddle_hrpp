window.Huddle = window.Huddle || {};

Huddle.Reunioes = {
  async renderHome() {
    const reunioes = await Huddle.DB.getAll("reunioes");

    const emAndamento = reunioes
      .filter(r => r.status === "Em andamento")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const concluidas = reunioes
      .filter(r => r.status === "Concluída")
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const ultimasConcluidas = concluidas.slice(0, 5);

    const app = Huddle.Utils.$("app");

    app.innerHTML = `
      <div class="tela">

        <div class="tela-topo">
          <div>
            <h2>Início</h2>
            <p class="texto-apoio">
              Inicie uma nova reunião, continue uma reunião em andamento ou consulte reuniões já concluídas neste dispositivo.
            </p>
          </div>
        </div>

        <div class="grid-cards">

          <div class="card card-destaque">
            <h3>Nova reunião</h3>
            <p>
              Criar uma reunião, informar quem está registrando e selecionar os setores presentes.
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
                  <p>Existe uma reunião aberta neste dispositivo.</p>

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
                : `<p>Nenhuma reunião em andamento neste navegador.</p>`
            }
          </div>

          <div class="card">
            <h3>Reuniões realizadas</h3>
            <p>
              Consulte o histórico de reuniões já concluídas, setores participantes e respostas registradas.
            </p>

            <div class="acoes">
              <button class="btn-principal" onclick="Huddle.Reunioes.renderHistoricoReunioes()" ${concluidas.length ? "" : "disabled"}>
                Ver histórico
              </button>
            </div>
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

        ${
          ultimasConcluidas.length
            ? `
              <section class="secao-historico-home">
                <div class="secao-cabecalho">
                  <div>
                    <h2>Últimas reuniões concluídas</h2>
                    <p class="texto-apoio">Mostrando apenas as mais recentes para manter a tela inicial leve.</p>
                  </div>

                  <button class="btn-claro" onclick="Huddle.Reunioes.renderHistoricoReunioes()">
                    Ver todas
                  </button>
                </div>

                <div class="lista-reunioes-resumo">
                  ${ultimasConcluidas.map(reuniao => this.htmlItemReuniaoResumo(reuniao)).join("")}
                </div>
              </section>
            `
            : ""
        }

      </div>
    `;
  },

  htmlItemReuniaoResumo(reuniao) {
    return `
      <button class="item-reuniao-resumo" onclick="Huddle.Reunioes.renderDetalheReuniao('${reuniao.id}')">
        <span>
          <strong>Reunião do dia ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}</strong><br>
          <small>Registro por ${Huddle.Utils.escapeHtml(reuniao.responsavel_nome || "Não informado")}</small>
        </span>

        <span class="tag tag-respondido">Concluída</span>
      </button>
    `;
  },

  async renderHistoricoReunioes() {
    const reunioes = await Huddle.DB.getAll("reunioes");
    const relacoes = await Huddle.DB.getAll("reuniao_setores");

    const concluidas = reunioes
      .filter(r => r.status === "Concluída")
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const htmlLista = concluidas.length
      ? concluidas.map(reuniao => {
        const setores = relacoes.filter(r => r.id_reuniao === reuniao.id);
        const coordenadores = setores.filter(s => (s.tipo_presenca || "Coordenador") === "Coordenador").length;
        const representantes = setores.filter(s => (s.tipo_presenca || "Coordenador") === "Representante").length;

        return `
          <button class="item-reuniao-historico" onclick="Huddle.Reunioes.renderDetalheReuniao('${reuniao.id}')">
            <span>
              <strong>Reunião do dia ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}</strong><br>
              <small>
                Registro por ${Huddle.Utils.escapeHtml(reuniao.responsavel_nome || "Não informado")} ·
                ${setores.length} setor(es) ·
                ${coordenadores} coord. ·
                ${representantes} repres.
              </small>
            </span>

            <span class="tag tag-respondido">Concluída</span>
          </button>
        `;
      }).join("")
      : `
        <div class="card">
          <p class="texto-apoio">Ainda não há reuniões concluídas neste dispositivo.</p>
        </div>
      `;

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">

        <div class="tela-topo">
          <div>
            <h2>Reuniões realizadas</h2>
            <p class="texto-apoio">
              Histórico das reuniões concluídas neste navegador. Depois, essa área vira base dos relatórios de participação e engajamento dos setores.
            </p>
          </div>
        </div>

        <div class="lista-reunioes-historico">
          ${htmlLista}
        </div>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderHome()">
            Voltar ao início
          </button>
        </div>

      </div>
    `;
  },

  async renderDetalheReuniao(idReuniao) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    if (!reuniao) {
      Huddle.Utils.toast("Reunião não encontrada.");
      await this.renderHistoricoReunioes();
      return;
    }

    const setoresDaReuniao = await this.obterSetoresDaReuniao(idReuniao);
    const respostas = await Huddle.DB.getAll("respostas");
    const perguntas = await Huddle.DB.getAll("perguntas");

    const respostasDaReuniao = respostas.filter(r => r.id_reuniao === idReuniao);
    const totalCoordenador = setoresDaReuniao.filter(s => s.tipo_presenca === "Coordenador").length;
    const totalRepresentante = setoresDaReuniao.filter(s => s.tipo_presenca === "Representante").length;

    const htmlSetores = setoresDaReuniao
      .sort((a, b) => Number(a.ordem) - Number(b.ordem))
      .map(item => {
        const respostasSetor = respostasDaReuniao.filter(r => r.id_setor === item.id_setor);

        const htmlRespostas = respostasSetor.length
          ? respostasSetor.map(resposta => {
            const pergunta = perguntas.find(p => p.id === resposta.id_pergunta);

            return `
              <div class="resposta-detalhe">
                <strong>${Huddle.Utils.escapeHtml(pergunta?.texto || resposta.id_pergunta)}</strong>
                <div>Resposta: <strong>${Huddle.Utils.escapeHtml(resposta.resposta || "-")}</strong></div>
                ${resposta.observacao ? `<div>Observação: ${Huddle.Utils.escapeHtml(resposta.observacao)}</div>` : ""}
              </div>
            `;
          }).join("")
          : `<p class="texto-apoio">Nenhuma resposta registrada para este setor.</p>`;

        return `
          <details class="detalhe-setor-reuniao">
            <summary>
              <span>
                <strong>${Huddle.Utils.escapeHtml(item.setor_nome)}</strong><br>
                <small>${Huddle.Utils.escapeHtml(item.tipo_presenca)} · ${respostasSetor.length} resposta(s)</small>
              </span>

              <span class="tag ${item.respondido ? "tag-respondido" : "tag-aguardando"}">
                ${item.respondido ? "Respondido" : "Aguardando"}
              </span>
            </summary>

            <div class="detalhe-setor-conteudo">
              ${htmlRespostas}
            </div>
          </details>
        `;
      }).join("");

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">

        <div class="tela-topo">
          <div>
            <h2>Detalhe da reunião</h2>
            <p class="texto-apoio">
              Reunião do dia ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}.
            </p>
          </div>
        </div>

        <div class="info-reuniao">
          <div><strong>Registro por:</strong> ${Huddle.Utils.escapeHtml(reuniao.responsavel_nome || "Não informado")}</div>
          <div><strong>Início:</strong> ${Huddle.Utils.escapeHtml(reuniao.hora_inicio || "-")}</div>
          <div><strong>Término:</strong> ${Huddle.Utils.escapeHtml(reuniao.hora_fim || "-")}</div>
          <div><strong>Status:</strong> ${Huddle.Utils.escapeHtml(reuniao.status || "-")}</div>
          <div><strong>Participação:</strong> ${setoresDaReuniao.length} setor(es), ${totalCoordenador} Coordenador(es), ${totalRepresentante} Representante(s)</div>
        </div>

        <div class="lista-detalhe-reuniao">
          ${htmlSetores || `<p class="texto-apoio">Nenhum setor registrado para esta reunião.</p>`}
        </div>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderHistoricoReunioes()">
            Voltar ao histórico
          </button>

          <button class="btn-claro" onclick="Huddle.Reunioes.renderHome()">
            Ir ao início
          </button>
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

              <div class="grupo-setores-botoes">
                <button type="button" class="btn-mini btn-claro" onclick="Huddle.Reunioes.marcarGrupo('${grupoSeguro}', true)">
                  Marcar todos
                </button>

                <button type="button" class="btn-mini btn-claro" onclick="Huddle.Reunioes.marcarGrupo('${grupoSeguro}', false)">
                  Limpar
                </button>
              </div>
            </div>

            <div class="lista-presenca">
              ${
                lista.map(setor => {
                  const idSetor = Huddle.Utils.escapeHtml(setor.id);
                  const nomeSetor = Huddle.Utils.escapeHtml(setor.nome);
                  const grupoSetor = Huddle.Utils.escapeHtml(setor.grupo);

                  return `
                    <div class="linha-presenca nao-selecionado" data-id-setor="${idSetor}">
                      <input
                        id="check_${idSetor}"
                        type="checkbox"
                        class="check-presenca"
                        data-grupo="${grupoSetor}"
                        value="${idSetor}"
                        onchange="Huddle.Reunioes.atualizarTipoPresenca('${idSetor}')"
                      >

                      <label class="nome-presenca" for="check_${idSetor}">
                        ${nomeSetor}
                      </label>

                      <select
                        class="select-presenca"
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
      .querySelectorAll(`.check-presenca[data-grupo="${grupo}"]`)
      .forEach(input => {
        input.checked = marcado;
        this.atualizarTipoPresenca(input.value);
      });
  },

  atualizarTipoPresenca(idSetor) {
    const check = document.querySelector(`.check-presenca[value="${idSetor}"]`);
    const linha = document.querySelector(`.linha-presenca[data-id-setor="${idSetor}"]`);
    const select = document.querySelector(`.select-presenca[data-id-setor="${idSetor}"]`);

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
      .from(document.querySelectorAll(".check-presenca:checked"))
      .map(input => {
        const idSetor = input.value;

        const tipoPresenca =
          document.querySelector(`.select-presenca[data-id-setor="${idSetor}"]`)?.value
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

  async obterSetoresDaReuniao(idReuniao) {
    const todosSetores = await Huddle.DB.getAll("setores");
    const relacoes = await Huddle.DB.getAll("reuniao_setores");

    return relacoes
      .filter(r => r.id_reuniao === idReuniao)
      .map(relacao => {
        const setor = todosSetores.find(s => s.id === relacao.id_setor);

        return {
          ...relacao,
          tipo_presenca: relacao.tipo_presenca || "Coordenador",
          setor_nome: setor ? setor.nome : "Setor não encontrado"
        };
      })
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));
  },

  ordenarSetoresParaLista(setores) {
    return [...setores].sort((a, b) => {
      if (a.respondido !== b.respondido) {
        return a.respondido ? 1 : -1;
      }

      return Number(a.ordem) - Number(b.ordem);
    });
  },

  obterProximoSetorPendente(setores, idSetorAtual) {
    const atual = setores.find(s => s.id_setor === idSetorAtual);
    const ordemAtual = atual ? Number(atual.ordem) : 0;

    const pendentes = setores
      .filter(s => !s.respondido && s.id_setor !== idSetorAtual)
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));

    if (!pendentes.length) return null;

    const proximoNaSequencia = pendentes.find(s => Number(s.ordem) > ordemAtual);

    return proximoNaSequencia || pendentes[0];
  },

  async renderReuniao(idReuniao) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    if (!reuniao) {
      Huddle.Utils.toast("Reunião não encontrada.");
      await this.renderHome();
      return;
    }

    const setoresDaReuniao = await this.obterSetoresDaReuniao(idReuniao);
    const setoresOrdenados = this.ordenarSetoresParaLista(setoresDaReuniao);

    const totalSetores = setoresDaReuniao.length;
    const totalRespondidos = setoresDaReuniao.filter(s => s.respondido).length;
    const totalPendentes = totalSetores - totalRespondidos;

    const todosRespondidos =
      setoresDaReuniao.length > 0 &&
      setoresDaReuniao.every(s => s.respondido);

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">

        <div class="tela-topo">
          <div>
            <h2>Setores presentes</h2>
            <p class="texto-apoio">
              Os setores ainda pendentes ficam no topo. Conforme forem finalizados, descem automaticamente para o final da lista.
            </p>
          </div>
        </div>

        <div class="info-reuniao">
          <div><strong>Registro por:</strong> ${Huddle.Utils.escapeHtml(reuniao.responsavel_nome)}</div>
          <div><strong>Reunião:</strong> ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}</div>
          <div><strong>Status:</strong> ${Huddle.Utils.escapeHtml(reuniao.status)}</div>
          <div><strong>Andamento:</strong> ${totalRespondidos}/${totalSetores} setores respondidos · ${totalPendentes} pendente(s)</div>
        </div>

        <div class="lista-setores">
          ${
            setoresOrdenados.map(item => `
              <button
                class="item-setor ${item.respondido ? "respondido" : ""}"
                onclick="Huddle.Reunioes.renderSetor('${item.id_reuniao}', '${item.id_setor}')"
              >
                <span>
                  <span class="nome-setor">${Huddle.Utils.escapeHtml(item.setor_nome)}</span><br>
                  <span class="tag tag-presenca">${Huddle.Utils.escapeHtml(item.tipo_presenca)}</span>
                </span>

                <span class="tag ${item.respondido ? "tag-respondido" : "tag-aguardando"}">
                  ${item.respondido ? "Respondido" : "Aguardando"}
                </span>
              </button>
            `).join("")
          }
        </div>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderHome()">
            Voltar ao início
          </button>

          <button
            class="btn-principal"
            ${todosRespondidos ? "" : "disabled"}
            onclick="Huddle.Reunioes.concluirReuniao('${idReuniao}')"
          >
            Concluir reunião
          </button>
        </div>

        ${
          todosRespondidos
            ? ""
            : `<p class="texto-apoio">A reunião só poderá ser concluída depois que todos os setores presentes forem respondidos.</p>`
        }

      </div>
    `;
  },

  async renderSetor(idReuniao, idSetor) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);
    const setor = await Huddle.DB.get("setores", idSetor);

    if (!reuniao || !setor) {
      Huddle.Utils.toast("Reunião ou setor não encontrado.");
      await this.renderReuniao(idReuniao);
      return;
    }

    const setoresDaReuniao = await this.obterSetoresDaReuniao(idReuniao);
    const perguntas = await Huddle.Perguntas.obterPerguntasSetor(idSetor);
    const respostas = await Huddle.Perguntas.obterRespostasSetor(idReuniao, idSetor);
    const pendenciasAbertas = await Huddle.Perguntas.obterPendenciasAbertasSetor(idSetor);

    const relacao = setoresDaReuniao.find(r =>
      r.id_reuniao === idReuniao &&
      r.id_setor === idSetor
    );

    const tipoPresenca = relacao?.tipo_presenca || "Coordenador";
    const totalRespondidas = perguntas.filter(pergunta =>
      respostas.some(resposta => resposta.id_pergunta === pergunta.id && String(resposta.resposta || "").trim() !== "")
    ).length;

    Huddle.Utils.$("app").innerHTML = `
      <div class="tela">

        <div class="tela-topo">
          <div>
            <h2>${Huddle.Utils.escapeHtml(setor.nome)}</h2>
            <p class="texto-apoio">
              Revise as pendências do setor e depois inicie as perguntas.
            </p>
          </div>
        </div>

        <div class="info-reuniao">
          <div><strong>Reunião:</strong> ${Huddle.Utils.escapeHtml(reuniao.data)} às ${Huddle.Utils.escapeHtml(reuniao.hora_inicio)}</div>
          <div><strong>Registro por:</strong> ${Huddle.Utils.escapeHtml(reuniao.responsavel_nome)}</div>
          <div><strong>Presença do setor:</strong> ${Huddle.Utils.escapeHtml(tipoPresenca)}</div>
          <div><strong>Status do setor:</strong> ${relacao?.respondido ? "Respondido" : "Aguardando"}</div>
          <div><strong>Perguntas:</strong> ${totalRespondidas}/${perguntas.length} respondida(s)</div>
        </div>

        <div class="card card-pendencias-setor">
          <div class="card-titulo-linha">
            <h3>Pendências do setor</h3>
            <span class="tag tag-pendencias">${pendenciasAbertas.length} aberta(s)</span>
          </div>

          ${await Huddle.Perguntas.renderListaPendenciasSetor(pendenciasAbertas)}
        </div>

        <div class="card card-iniciar-perguntas">
          ${perguntas.length ? `
            <button class="btn-principal btn-largo" onclick="Huddle.Perguntas.iniciar('${idReuniao}', '${idSetor}', 0)">
              ${respostas.length ? "Continuar / editar perguntas" : "Iniciar perguntas"}
            </button>

            ${respostas.length ? `
              <button class="btn-claro btn-largo" onclick="Huddle.Perguntas.renderRevisaoSetor('${idReuniao}', '${idSetor}')">
                Revisar respostas
              </button>
            ` : ""}
          ` : `
            <p class="texto-apoio">Este setor ainda não possui perguntas cadastradas.</p>
          `}
        </div>

        <div class="acoes">
          <button class="btn-secundario" onclick="Huddle.Reunioes.renderReuniao('${idReuniao}')">
            Voltar para lista de setores
          </button>

          ${relacao?.respondido ? `
            <button class="btn-principal" onclick="Huddle.Perguntas.reabrirParaEdicao('${idReuniao}', '${idSetor}')">
              Editar setor
            </button>
          ` : ""}
        </div>

      </div>
    `;
  },

  async concluirReuniao(idReuniao) {
    const reuniao = await Huddle.DB.get("reunioes", idReuniao);

    if (!reuniao) {
      Huddle.Utils.toast("Reunião não encontrada.");
      return;
    }

    const setoresDaReuniao = await this.obterSetoresDaReuniao(idReuniao);

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
