window.Huddle = window.Huddle || {};

Huddle.App = {
  async iniciar() {
    try {
      await Huddle.DB.abrir();
      await Huddle.Seed.run();
      await Huddle.Reunioes.renderHome();
      this.registrarPWA();
    } catch (erro) {
      console.error(erro);

      document.getElementById("app").innerHTML = `
        <div class="card">
          <h2>Erro ao iniciar o sistema</h2>
          <p>${Huddle.Utils.escapeHtml(erro.message || erro)}</p>
        </div>
      `;
    }
  },

  registrarPWA() {
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker
        .register("sw.js")
        .catch(erro => console.warn("Service Worker não registrado:", erro));
    };

    if (document.readyState === "complete") {
      registrar();
    } else {
      window.addEventListener("load", registrar, { once: true });
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  Huddle.App.iniciar();
});
