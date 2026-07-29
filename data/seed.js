window.Huddle = window.Huddle || {};

Huddle.Seed = {
  setores: [
    {
        "id": "SET-001",
        "nome": "Pronto Socorro",
        "grupo": "Assistencial",
        "ordem": 1
    },
    {
        "id": "SET-002",
        "nome": "Centro Cirúrgico",
        "grupo": "Assistencial",
        "ordem": 6
    },
    {
        "id": "SET-003",
        "nome": "Clínica Obstétrica (Maternidade)",
        "grupo": "Assistencial",
        "ordem": 3
    },
    {
        "id": "SET-004",
        "nome": "Unidades de Internação",
        "grupo": "Assistencial",
        "ordem": 2
    },
    {
        "id": "SET-007",
        "nome": "UTI Adulto",
        "grupo": "Assistencial",
        "ordem": 4
    },
    {
        "id": "SET-009",
        "nome": "CME (Central de Materiais e Esterilização)",
        "grupo": "Assistencial",
        "ordem": 7
    },
    {
        "id": "SET-010",
        "nome": "NVE / SCIH",
        "grupo": "Assistencial",
        "ordem": 9
    },
    {
        "id": "SET-012",
        "nome": "SADT",
        "grupo": "Assistencial",
        "ordem": 5
    },
    {
        "id": "SET-013",
        "nome": "Equipe Multiprofissional",
        "grupo": "Assistencial",
        "ordem": 8
    },
    {
        "id": "SET-014",
        "nome": "Almoxarifado",
        "grupo": "Apoio",
        "ordem": 10
    },
    {
        "id": "SET-015",
        "nome": "Engenharia Clínica",
        "grupo": "Apoio",
        "ordem": 17
    },
    {
        "id": "SET-016",
        "nome": "Farmácia",
        "grupo": "Apoio",
        "ordem": 11
    },
    {
        "id": "SET-017",
        "nome": "Lavanderia",
        "grupo": "Apoio",
        "ordem": 13
    },
    {
        "id": "SET-018",
        "nome": "Manutenção",
        "grupo": "Apoio",
        "ordem": 16
    },
    {
        "id": "SET-019",
        "nome": "NIR",
        "grupo": "Apoio",
        "ordem": 12
    },
    {
        "id": "SET-020",
        "nome": "NQSP",
        "grupo": "Apoio",
        "ordem": 15
    },
    {
        "id": "SET-021",
        "nome": "Nutrição",
        "grupo": "Apoio",
        "ordem": 14
    },
    {
        "id": "SET-022",
        "nome": "S.A.U. - Serviço de Atendimento ao Usuário",
        "grupo": "Apoio",
        "ordem": 17
    },
    {
        "id": "SET-023",
        "nome": "TI - Tecnologia da Informação",
        "grupo": "Apoio",
        "ordem": 19
    }
],

  perguntas: [
    {
        "id": "PER-001",
        "id_setor": "SET-001",
        "ordem": 1,
        "texto": "Quantos pacientes encontram-se no setor?",
        "tipo": "NUMERO",
        "obrigatoria": true,
        "gera_pendencia": false
    },
    {
        "id": "PER-002",
        "id_setor": "SET-001",
        "ordem": 2,
        "texto": "Algum paciente crítico aguardando leito ou exame urgente?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-003",
        "id_setor": "SET-001",
        "ordem": 3,
        "texto": "Há risco de atraso em atendimento ou exames de urgência?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-004",
        "id_setor": "SET-001",
        "ordem": 4,
        "texto": "Fluxo de entrada está sobrecarregado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-005",
        "id_setor": "SET-002",
        "ordem": 1,
        "texto": "Alguma cirurgia cancelada ou em risco de atraso?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-006",
        "id_setor": "SET-002",
        "ordem": 2,
        "texto": "Checklist de cirurgia segura está sendo aplicado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-007",
        "id_setor": "SET-002",
        "ordem": 3,
        "texto": "Todos os recursos (sala, equipe, materiais) estão disponíveis?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-008",
        "id_setor": "SET-002",
        "ordem": 4,
        "texto": "Falta algum OPME ou instrumental?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-009",
        "id_setor": "SET-003",
        "ordem": 1,
        "texto": "Há previsão de partos simultâneos?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": false
    },
    {
        "id": "PER-010",
        "id_setor": "SET-003",
        "ordem": 2,
        "texto": "Alguma intercorrência materna/fetal crítica?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-011",
        "id_setor": "SET-003",
        "ordem": 3,
        "texto": "Algum leito bloqueado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-012",
        "id_setor": "SET-003",
        "ordem": 4,
        "texto": "Há alguma paciente aguardando exames/parecer?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-013",
        "id_setor": "SET-004",
        "ordem": 1,
        "texto": "Há pacientes aguardando exame, avaliação ou parecer?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-014",
        "id_setor": "SET-004",
        "ordem": 2,
        "texto": "Escala da equipe está completa?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-015",
        "id_setor": "SET-004",
        "ordem": 3,
        "texto": "Algum leito bloqueado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-016",
        "id_setor": "SET-004",
        "ordem": 4,
        "texto": "Algum paciente crítico aguardando leito de UTI ou exame urgente?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-025",
        "id_setor": "SET-007",
        "ordem": 1,
        "texto": "Algum paciente aguardando avaliação, parecer ou exame?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-026",
        "id_setor": "SET-007",
        "ordem": 2,
        "texto": "Escala de enfermagem/médica está completa?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-027",
        "id_setor": "SET-007",
        "ordem": 3,
        "texto": "Algum leito bloqueado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-028",
        "id_setor": "SET-007",
        "ordem": 4,
        "texto": "Algum equipamento vital (ventilador, bomba de infusão, monitor) inoperante?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-033",
        "id_setor": "SET-009",
        "ordem": 1,
        "texto": "Processo de esterilização está ocorrendo dentro do tempo padrão?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-034",
        "id_setor": "SET-009",
        "ordem": 2,
        "texto": "Há pendência de instrumental crítico para o centro cirúrgico?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-035",
        "id_setor": "SET-009",
        "ordem": 3,
        "texto": "Alguma falta de insumos no CME?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-036",
        "id_setor": "SET-009",
        "ordem": 4,
        "texto": "Alguma autoclave fora de funcionamento ou com manutenção pendente?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-037",
        "id_setor": "SET-010",
        "ordem": 1,
        "texto": "Algum surto, caso suspeito ou aumento de infecções foi identificado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-038",
        "id_setor": "SET-010",
        "ordem": 2,
        "texto": "Quantos pacientes estão em isolamento ou vigilância?",
        "tipo": "NUMERO",
        "obrigatoria": true,
        "gera_pendencia": false
    },
    {
        "id": "PER-039",
        "id_setor": "SET-010",
        "ordem": 3,
        "texto": "Bundles e vigilância de infecção estão sendo aplicados corretamente?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-040",
        "id_setor": "SET-010",
        "ordem": 4,
        "texto": "Comunicação com unidades assistenciais está atualizada?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-044",
        "id_setor": "SET-012",
        "ordem": 1,
        "texto": "Algum exame essencial com atraso que impacte o cuidado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-045",
        "id_setor": "SET-012",
        "ordem": 2,
        "texto": "Houve falha em equipamentos de imagem?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-046",
        "id_setor": "SET-012",
        "ordem": 3,
        "texto": "Fluxo de laudos está dentro do tempo adequado?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-047",
        "id_setor": "SET-012",
        "ordem": 4,
        "texto": "Algum incidente com administração de contraste ocorreu nas últimas 24 horas?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-048",
        "id_setor": "SET-013",
        "ordem": 1,
        "texto": "Todos os pacientes críticos estão sendo acompanhados pela equipe multiprofissional?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-049",
        "id_setor": "SET-013",
        "ordem": 2,
        "texto": "Houve dificuldade em avaliação de fisioterapia, nutrição, psicologia ou fonoaudiologia?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-050",
        "id_setor": "SET-013",
        "ordem": 3,
        "texto": "Algum encaminhamento interdisciplinar pendente?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-051",
        "id_setor": "SET-014",
        "ordem": 1,
        "texto": "Algum insumo crítico em risco de desabastecimento?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-052",
        "id_setor": "SET-014",
        "ordem": 2,
        "texto": "Estoque de emergência está garantido?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-053",
        "id_setor": "SET-014",
        "ordem": 3,
        "texto": "Alguma entrega essencial em atraso?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-054",
        "id_setor": "SET-015",
        "ordem": 1,
        "texto": "Algum equipamento essencial inoperante (ventiladores, monitores, bombas)?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-055",
        "id_setor": "SET-015",
        "ordem": 2,
        "texto": "Manutenção corretiva ou urgente pendente em setor crítico?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-056",
        "id_setor": "SET-015",
        "ordem": 3,
        "texto": "Plano de contingência está pronto em caso de falha?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-057",
        "id_setor": "SET-016",
        "ordem": 1,
        "texto": "Medicamentos de alto custo ou uso contínuo em falta?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-058",
        "id_setor": "SET-016",
        "ordem": 2,
        "texto": "Alguma falha na dispensação para setores críticos?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-059",
        "id_setor": "SET-016",
        "ordem": 3,
        "texto": "Controle de psicotrópicos e antibióticos em dia?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-060",
        "id_setor": "SET-017",
        "ordem": 1,
        "texto": "Rouparia hospitalar suficiente para demanda do dia?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-061",
        "id_setor": "SET-017",
        "ordem": 2,
        "texto": "Algum risco de atraso na entrega de roupas limpas?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-062",
        "id_setor": "SET-017",
        "ordem": 3,
        "texto": "Roupas críticas (enxoval cirúrgico, UTI ou obstétrico) estão garantidas?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-063",
        "id_setor": "SET-018",
        "ordem": 1,
        "texto": "Alguma falha estrutural (energia, gases, climatização, elevadores ou hidráulica)?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-064",
        "id_setor": "SET-018",
        "ordem": 2,
        "texto": "Houve falha em geradores ou nobreaks que impacte a segurança?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-065",
        "id_setor": "SET-018",
        "ordem": 3,
        "texto": "Algum risco estrutural identificado (alagamento, infiltração ou panes)?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-066",
        "id_setor": "SET-019",
        "ordem": 1,
        "texto": "Qual a taxa de ocupação atual dos leitos?",
        "tipo": "NUMERO",
        "obrigatoria": true,
        "gera_pendencia": false
    },
    {
        "id": "PER-067",
        "id_setor": "SET-019",
        "ordem": 2,
        "texto": "Há pacientes aguardando transferência interna ou externa prioritária?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-068",
        "id_setor": "SET-019",
        "ordem": 3,
        "texto": "Existe previsão de altas estratégicas para liberar leitos críticos?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": false
    },
    {
        "id": "PER-069",
        "id_setor": "SET-020",
        "ordem": 1,
        "texto": "Há notificações pendentes de análise ou plano de ação?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-070",
        "id_setor": "SET-020",
        "ordem": 2,
        "texto": "Algum evento adverso grave requer reunião de desdobramento?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-071",
        "id_setor": "SET-020",
        "ordem": 3,
        "texto": "Indicadores de segurança estão dentro da meta?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-072",
        "id_setor": "SET-021",
        "ordem": 1,
        "texto": "Dieta enteral/parenteral disponível para todos os pacientes?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-073",
        "id_setor": "SET-021",
        "ordem": 2,
        "texto": "Alguma intercorrência na produção ou distribuição das dietas?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-074",
        "id_setor": "SET-021",
        "ordem": 3,
        "texto": "Estoques de fórmulas nutricionais e suplementos estão adequados?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    },
    {
        "id": "PER-075",
        "id_setor": "SET-022",
        "ordem": 1,
        "texto": "Há registros de reclamações ou elogios relevantes nas últimas 24h?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": false
    },
    {
        "id": "PER-076",
        "id_setor": "SET-022",
        "ordem": 2,
        "texto": "Algum caso crítico de insatisfação do usuário requer retorno da gestão?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-077",
        "id_setor": "SET-023",
        "ordem": 1,
        "texto": "Algum sistema essencial apresentou falhas hoje?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-078",
        "id_setor": "SET-023",
        "ordem": 2,
        "texto": "Houve indisponibilidade de rede ou morosidade que impactou a assistência?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "SIM"
    },
    {
        "id": "PER-079",
        "id_setor": "SET-023",
        "ordem": 3,
        "texto": "Planos de contingência para sistemas críticos estão atualizados?",
        "tipo": "SIM_NAO",
        "obrigatoria": true,
        "gera_pendencia": true,
        "resposta_gera_pendencia": "NÃO"
    }
],

  async run() {
    await this.seedSetores();
    await this.seedPerguntas();
  },

  async seedSetores() {
    const meta = await Huddle.DB.get("meta", "seed_config_padrao_20260729_setores");

    if (meta) return;

    const setoresExistentes = await Huddle.DB.getAll("setores");

    // Para não sobrescrever configurações já feitas em uso real, a configuração
    // padrão só é aplicada automaticamente quando ainda não existem setores cadastrados.
    if (setoresExistentes.length > 0) {
      await Huddle.DB.put("meta", {
        id: "seed_config_padrao_20260729_setores",
        ignorado: true,
        motivo: "Setores já existentes no dispositivo.",
        executado_em: Huddle.Utils.agoraISO()
      });
      return;
    }

    const agora = Huddle.Utils.agoraISO();

    for (const setor of this.setores) {
      await Huddle.DB.put("setores", {
        ...setor,
        ativo: true,
        created_at: agora,
        updated_at: agora
      });
    }

    await Huddle.DB.put("meta", {
      id: "seed_config_padrao_20260729_setores",
      executado_em: agora
    });

    // Compatibilidade com versões anteriores do projeto.
    await Huddle.DB.put("meta", {
      id: "seed_v1",
      executado_em: agora
    });

    await Huddle.DB.put("meta", {
      id: "seed_v1_setores",
      executado_em: agora
    });
  },

  async seedPerguntas() {
    const meta = await Huddle.DB.get("meta", "seed_config_padrao_20260729_perguntas");

    if (meta) return;

    const perguntasExistentes = await Huddle.DB.getAll("perguntas");

    // Para não sobrescrever perguntas editadas em uso real, a configuração
    // padrão só é aplicada automaticamente quando ainda não existem perguntas cadastradas.
    if (perguntasExistentes.length > 0) {
      await Huddle.DB.put("meta", {
        id: "seed_config_padrao_20260729_perguntas",
        ignorado: true,
        motivo: "Perguntas já existentes no dispositivo.",
        executado_em: Huddle.Utils.agoraISO()
      });
      return;
    }

    const agora = Huddle.Utils.agoraISO();

    for (const pergunta of this.perguntas) {
      await Huddle.DB.put("perguntas", {
        resposta_gera_pendencia: "",
        categoria_pendencia: "",
        responsavel_padrao: "",
        ...pergunta,
        ativo: true,
        created_at: agora,
        updated_at: agora
      });
    }

    await Huddle.DB.put("meta", {
      id: "seed_config_padrao_20260729_perguntas",
      executado_em: agora
    });

    // Compatibilidade com versões anteriores do projeto.
    await Huddle.DB.put("meta", {
      id: "seed_v2_perguntas",
      executado_em: agora
    });
  }
};
