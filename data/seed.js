window.Huddle = window.Huddle || {};

Huddle.Seed = {
  setores: [
    { id: "SET-001", nome: "Triagem e Acolhimento", grupo: "Assistencial", ordem: 1 },
    { id: "SET-002", nome: "Centro Cirúrgico", grupo: "Assistencial", ordem: 2 },
    { id: "SET-003", nome: "Clínica Obstétrica (Maternidade)", grupo: "Assistencial", ordem: 3 },
    { id: "SET-004", nome: "Unidade de Internação Clínica Cirúrgica", grupo: "Assistencial", ordem: 4 },
    { id: "SET-005", nome: "Unidade de Internação Clínica Médica", grupo: "Assistencial", ordem: 5 },
    { id: "SET-006", nome: "Unidade de Internação Pediatria", grupo: "Assistencial", ordem: 6 },
    { id: "SET-007", nome: "UTI A", grupo: "Assistencial", ordem: 7 },
    { id: "SET-008", nome: "UTI B", grupo: "Assistencial", ordem: 8 },
    { id: "SET-009", nome: "CME (Central de Materiais e Esterilização)", grupo: "Assistencial", ordem: 9 },
    { id: "SET-010", nome: "NVE / SCIH", grupo: "Assistencial", ordem: 10 },
    { id: "SET-011", nome: "Hemodinâmica", grupo: "Assistencial", ordem: 11 },
    { id: "SET-012", nome: "SADT", grupo: "Assistencial", ordem: 12 },
    { id: "SET-013", nome: "Equipe Multiprofissional", grupo: "Assistencial", ordem: 13 },

    { id: "SET-014", nome: "Almoxarifado", grupo: "Apoio", ordem: 14 },
    { id: "SET-015", nome: "Engenharia Clínica", grupo: "Apoio", ordem: 15 },
    { id: "SET-016", nome: "Farmácia", grupo: "Apoio", ordem: 16 },
    { id: "SET-017", nome: "Lavanderia", grupo: "Apoio", ordem: 17 },
    { id: "SET-018", nome: "Manutenção", grupo: "Apoio", ordem: 18 },
    { id: "SET-019", nome: "NIR", grupo: "Apoio", ordem: 19 },
    { id: "SET-020", nome: "NQSP", grupo: "Apoio", ordem: 20 },
    { id: "SET-021", nome: "Nutrição", grupo: "Apoio", ordem: 21 },
    { id: "SET-022", nome: "S.A.U. - Serviço de Atendimento ao Usuário", grupo: "Apoio", ordem: 22 },
    { id: "SET-023", nome: "TI - Tecnologia da Informação", grupo: "Apoio", ordem: 23 }
  ],

  async run() {
    const meta = await Huddle.DB.get("meta", "seed_v1");

    if (meta) return;

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
      id: "seed_v1",
      executado_em: agora
    });
  }
};
