window.Huddle = window.Huddle || {};

Huddle.Utils = {
  $(id) {
    return document.getElementById(id);
  },

  id(prefixo = "ID") {
    const data = new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14);

    const aleatorio = Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

    return `${prefixo}-${data}-${aleatorio}`;
  },

  agoraISO() {
    return new Date().toISOString();
  },

  dataBR(data = new Date()) {
    return new Intl.DateTimeFormat("pt-BR").format(data);
  },

  horaBR(data = new Date()) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(data);
  },

  dataHoraBR(valor) {
    if (!valor) return "";

    const data = new Date(valor);

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(data);
  },

  escapeHtml(valor) {
    return String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  formatarNomeProprio(valor) {
    return String(valor ?? "")
      .toLocaleLowerCase("pt-BR")
      .replace(/(^|\s)(\S)/g, (trecho, espaco, letra) => {
        return espaco + letra.toLocaleUpperCase("pt-BR");
      });
  },

  toast(mensagem, tempo = 2800) {
    const toast = document.getElementById("toast");

    toast.textContent = mensagem;
    toast.classList.remove("hidden");

    clearTimeout(this._toastTimer);

    this._toastTimer = setTimeout(() => {
      toast.classList.add("hidden");
    }, tempo);
  }
};
