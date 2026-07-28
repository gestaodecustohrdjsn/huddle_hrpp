window.Huddle = window.Huddle || {};

Huddle.App = {
  async iniciar() {
    try {
      await Huddle.DB.abrir();
      await Huddle.Seed.run();
      await Huddle.Reunioes.renderHome();
    } catch (erro) {
      console.error(erro);

      document.getElementById("app").innerHTML = `
        <div class="card">
          <h2>Erro ao iniciar o sistema</h2>
          <p>${Huddle.Utils.escapeHtml(erro.message || erro)}</p>
        </div>
      `;
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  Huddle.App.iniciar();
});
