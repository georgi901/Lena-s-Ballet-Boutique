document.addEventListener("DOMContentLoaded", () => {
    const cheieTema = "tema-lena-ballet";
    const radacina = document.documentElement;
    const comutatorTema = document.getElementById("comutator-tema");
    const selectorTema = document.getElementById("selector-tema");
    const etichetaTema = document.getElementById("eticheta-tema");
    const eticheteTeme = {
        light: "Temă luminoasă",
        studio: "Temă studio",
        dark: "Temă întunecată"
    };

    function normalizeazaTema(tema) {
        return ["light", "studio", "dark"].includes(tema) ? tema : "light";
    }

    function actualizeazaEticheta(tema) {
        if (etichetaTema) {
            etichetaTema.textContent = eticheteTeme[tema] || eticheteTeme.light;
        }
    }

    function aplicaTema(tema) {
        const temaFinala = normalizeazaTema(tema);
        radacina.setAttribute("data-site-theme", temaFinala);
        radacina.setAttribute("data-bs-theme", temaFinala === "dark" ? "dark" : "light");
        localStorage.setItem(cheieTema, temaFinala);

        if (selectorTema) {
            selectorTema.value = temaFinala;
        }

        if (comutatorTema) {
            comutatorTema.checked = temaFinala === "dark";
        }

        actualizeazaEticheta(temaFinala);
    }

    aplicaTema(localStorage.getItem(cheieTema) || radacina.getAttribute("data-site-theme"));

    if (selectorTema) {
        selectorTema.addEventListener("change", () => {
            aplicaTema(selectorTema.value);
        });
    }

    if (comutatorTema) {
        comutatorTema.addEventListener("change", () => {
            if (comutatorTema.checked) {
                aplicaTema("dark");
                return;
            }

            let temaSelectata = selectorTema && selectorTema.value !== "dark" ? selectorTema.value : "light";
            aplicaTema(temaSelectata);
        });
    }
});
