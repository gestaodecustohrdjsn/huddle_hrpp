window.Huddle = window.Huddle || {};

Huddle.DB = {
  nome: "huddle_hrpp_local",
  versao: 1,
  db: null,

  abrir() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.nome, this.versao);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        this.criarStores(db);
      };

      request.onsuccess = event => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = event => {
        reject(event.target.error);
      };
    });
  },

  criarStores(db) {
    const stores = [
      "meta",
      "setores",
      "perguntas",
      "opcoes_pergunta",
      "reunioes",
      "reuniao_setores",
      "respostas",
      "pendencias",
      "pendencia_logs",
      "logs"
    ];

    stores.forEach(nomeStore => {
      if (!db.objectStoreNames.contains(nomeStore)) {
        const store = db.createObjectStore(nomeStore, {
          keyPath: "id"
        });

        if (nomeStore === "reunioes") {
          store.createIndex("status", "status", { unique: false });
        }

        if (nomeStore === "reuniao_setores") {
          store.createIndex("id_reuniao", "id_reuniao", { unique: false });
          store.createIndex("id_setor", "id_setor", { unique: false });
        }

        if (nomeStore === "perguntas") {
          store.createIndex("id_setor", "id_setor", { unique: false });
        }

        if (nomeStore === "respostas") {
          store.createIndex("id_reuniao", "id_reuniao", { unique: false });
          store.createIndex("id_setor", "id_setor", { unique: false });
          store.createIndex("id_pergunta", "id_pergunta", { unique: false });
        }

        if (nomeStore === "pendencias") {
          store.createIndex("status", "status", { unique: false });
          store.createIndex("id_setor", "id_setor", { unique: false });
          store.createIndex("id_reuniao_origem", "id_reuniao_origem", { unique: false });
        }

        if (nomeStore === "logs") {
          store.createIndex("id_reuniao", "id_reuniao", { unique: false });
        }
      }
    });
  },

  transacao(nomeStore, modo = "readonly") {
    return this.db
      .transaction(nomeStore, modo)
      .objectStore(nomeStore);
  },

  getAll(nomeStore) {
    return new Promise((resolve, reject) => {
      const store = this.transacao(nomeStore);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  get(nomeStore, id) {
    return new Promise((resolve, reject) => {
      const store = this.transacao(nomeStore);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  put(nomeStore, objeto) {
    return new Promise((resolve, reject) => {
      const store = this.transacao(nomeStore, "readwrite");
      const request = store.put(objeto);

      request.onsuccess = () => resolve(objeto);
      request.onerror = () => reject(request.error);
    });
  },

  add(nomeStore, objeto) {
    return this.put(nomeStore, objeto);
  },

  delete(nomeStore, id) {
    return new Promise((resolve, reject) => {
      const store = this.transacao(nomeStore, "readwrite");
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  },

  async addLog({ id_reuniao = "", tipo = "", acao = "", detalhe = "", usuario = "" }) {
    const log = {
      id: Huddle.Utils.id("LOG"),
      id_reuniao,
      tipo,
      acao,
      detalhe,
      usuario,
      created_at: Huddle.Utils.agoraISO()
    };

    await this.add("logs", log);

    return log;
  }
};
