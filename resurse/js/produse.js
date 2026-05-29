document.addEventListener("DOMContentLoaded", () => {
    const sectiuneProduse = document.getElementById("pagina-produse");
    const containerProduse = document.getElementById("lista-produse");

    if (!sectiuneProduse || !containerProduse) {
        return;
    }

    const articole = Array.from(document.querySelectorAll(".produs-card"));
    if (!articole.length) {
        return;
    }

    const inputNume = document.getElementById("filtru-nume");
    const inputNivel = document.getElementById("filtru-nivel");
    const afisajNivel = document.getElementById("valoare-nivel");
    const inputCuloare = document.getElementById("filtru-culoare");
    const selectPersonalizare = document.getElementById("filtru-personalizare");
    const textareaDescriere = document.getElementById("filtru-descriere");
    const selectPreturi = document.getElementById("filtru-pret");
    const selectSortCheie1 = document.getElementById("sort-cheie-1");
    const selectSortCheie2 = document.getElementById("sort-cheie-2");
    const mesajValidare = document.getElementById("mesaj-validare-produse");
    const mesajFaraProduse = document.getElementById("mesaj-fara-produse");
    const sumarProduse = document.getElementById("sumar-produse");
    const indicatorPaginare = document.getElementById("indicator-paginare");
    const navigarePagini = document.getElementById("navigare-pagini-produse");
    const containerPaginare = document.getElementById("paginare-produse");
    const butonFiltrare = document.getElementById("btn-filtreaza");
    const butonSortAsc = document.getElementById("btn-sorteaza-asc");
    const butonSortDesc = document.getElementById("btn-sorteaza-desc");
    const butonCalculeaza = document.getElementById("btn-calculeaza");
    const butonResetare = document.getElementById("btn-reseteaza");
    const checkboxMateriale = Array.from(document.querySelectorAll("input[name='filtru-materiale']"));
    const radioSubcategorii = Array.from(document.querySelectorAll("input[name='filtru-subcategorie']"));
    const modal = document.getElementById("modal-produs");
    const butonInchidereModal = document.getElementById("inchide-modal-produs");
    const campuriModal = {
        imagine: document.getElementById("modal-produs-imagine"),
        titlu: document.getElementById("modal-produs-titlu"),
        meta: document.getElementById("modal-produs-meta"),
        descriere: document.getElementById("modal-produs-descriere"),
        pret: document.getElementById("modal-produs-pret"),
        brand: document.getElementById("modal-produs-brand"),
        materiale: document.getElementById("modal-produs-materiale"),
        personalizare: document.getElementById("modal-produs-personalizare"),
        data: document.getElementById("modal-produs-data"),
        stoc: document.getElementById("modal-produs-stoc"),
        recomandare: document.getElementById("modal-produs-recomandare"),
        detalii: document.getElementById("modal-produs-detalii"),
        intretinere: document.getElementById("modal-produs-intretinere"),
        link: document.getElementById("modal-produs-link"),
        badges: document.getElementById("modal-produs-badges")
    };

    const cheieSessionStorage = "produse-ascunse-sesiune";
    const culoriPermise = new Set((sectiuneProduse.dataset.culori || "").split("|").filter(Boolean).map((valoare) => normalizeazaText(valoare)));
    const produsePerPagina = Number(sectiuneProduse.dataset.produsePePagina) || 6;
    const ordiniInitiale = new Map(articole.map((articol, index) => [articol.id, index]));
    const numeRegex = /^[a-zA-ZăâîșțĂÂÎȘȚ\s\-]+$/;
    const produseFixate = new Set();
    const produseAscunseTemporar = new Set();
    const produseAscunseSesiune = incarcaProduseAscunseSesiune();

    let paginaCurenta = 1;
    let directieSortareCurenta = 0;

    function incarcaProduseAscunseSesiune() {
        try {
            let valori = JSON.parse(sessionStorage.getItem(cheieSessionStorage) || "[]");
            return new Set(Array.isArray(valori) ? valori.map(String) : []);
        } catch (err) {
            return new Set();
        }
    }

    function persistaProduseAscunseSesiune() {
        sessionStorage.setItem(cheieSessionStorage, JSON.stringify([...produseAscunseSesiune]));
    }

    function normalizeazaText(text) {
        return (text || "")
            .toString()
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function afiseazaMesaj(text) {
        mesajValidare.textContent = text;
        mesajValidare.classList.remove("d-none");
    }

    function ascundeMesaj() {
        mesajValidare.textContent = "";
        mesajValidare.classList.add("d-none");
    }

    function extrageTermeniTextarea() {
        let valoare = textareaDescriere.value.trim();
        if (!valoare) {
            return { plus: [], minus: [] };
        }

        let tokenuri = valoare.split(/\s+/);
        let plus = [];
        let minus = [];

        for (let token of tokenuri) {
            if (!/^[+-][^\s+-]+$/u.test(token)) {
                return null;
            }

            if (token.startsWith("+")) {
                plus.push(normalizeazaText(token.slice(1)));
            } else {
                minus.push(normalizeazaText(token.slice(1)));
            }
        }

        return { plus, minus };
    }

    function reseteazaStariInvalidare() {
        inputNume.classList.remove("is-invalid");
        inputCuloare.classList.remove("is-invalid");
        textareaDescriere.classList.remove("is-invalid");
        selectSortCheie1.classList.remove("is-invalid");
        selectSortCheie2.classList.remove("is-invalid");
    }

    function valideazaInputuri() {
        reseteazaStariInvalidare();
        ascundeMesaj();

        let numeCautat = inputNume.value.trim();
        if (numeCautat && !numeRegex.test(numeCautat)) {
            inputNume.classList.add("is-invalid");
            afiseazaMesaj("Filtrul după nume poate conține doar litere, spații și cratimă.");
            return null;
        }

        let culoare = inputCuloare.value.trim();
        if (culoare && !culoriPermise.has(normalizeazaText(culoare))) {
            inputCuloare.classList.add("is-invalid");
            afiseazaMesaj("Alege o culoare dintre sugestiile disponibile în datalist.");
            return null;
        }

        let termeniDescriere = extrageTermeniTextarea();
        if (termeniDescriere === null) {
            textareaDescriere.classList.add("is-invalid");
            afiseazaMesaj("În textarea folosește doar termeni de forma +cuvânt sau -cuvânt, separați prin spații.");
            return null;
        }

        if (selectSortCheie1.value === selectSortCheie2.value) {
            selectSortCheie1.classList.add("is-invalid");
            selectSortCheie2.classList.add("is-invalid");
            afiseazaMesaj("Alege două chei de sortare diferite pentru a obține o ordonare clară.");
            return null;
        }

        return {
            numeCautat: normalizeazaText(numeCautat),
            nivelMinim: Number(inputNivel.value),
            culoare: normalizeazaText(culoare),
            personalizare: selectPersonalizare.value,
            subcategorie: radioSubcategorii.find((radio) => radio.checked)?.value || "toate",
            materiale: checkboxMateriale.filter((checkbox) => checkbox.checked).map((checkbox) => normalizeazaText(checkbox.value)),
            intervalePret: Array.from(selectPreturi.selectedOptions).map((optiune) => {
                let [minim, maxim] = optiune.value.split(":").map(Number);
                return { minim, maxim };
            }),
            termeniDescriere,
            cheiSortare: [selectSortCheie1.value, selectSortCheie2.value]
        };
    }

    function produsTreceFiltrele(articol, filtre) {
        let idProdus = articol.dataset.id;
        if (produseAscunseSesiune.has(idProdus)) {
            return false;
        }

        if (produseAscunseTemporar.has(idProdus)) {
            return false;
        }

        if (produseFixate.has(idProdus)) {
            return true;
        }

        let nume = normalizeazaText(articol.dataset.nume);
        let culoare = normalizeazaText(articol.dataset.culoare);
        let descriere = normalizeazaText(articol.dataset.descriere);
        let subcategorie = articol.dataset.subcategorie;
        let pret = Number(articol.dataset.pret);
        let nivel = Number(articol.dataset.nivel);
        let personalizabil = articol.dataset.personalizabil === "true";
        let materiale = (articol.dataset.materiale || "").split("|").map(normalizeazaText).filter(Boolean);

        if (filtre.numeCautat && !nume.includes(filtre.numeCautat)) {
            return false;
        }

        if (nivel < filtre.nivelMinim) {
            return false;
        }

        if (filtre.culoare && culoare !== filtre.culoare) {
            return false;
        }

        if (filtre.subcategorie !== "toate" && subcategorie !== filtre.subcategorie) {
            return false;
        }

        if (filtre.personalizare === "da" && !personalizabil) {
            return false;
        }

        if (filtre.personalizare === "nu" && personalizabil) {
            return false;
        }

        if (filtre.materiale.length && !filtre.materiale.some((material) => materiale.includes(material))) {
            return false;
        }

        if (filtre.intervalePret.length && !filtre.intervalePret.some((interval) => pret >= interval.minim && pret < interval.maxim)) {
            return false;
        }

        if (filtre.termeniDescriere.plus.length && !filtre.termeniDescriere.plus.some((termen) => descriere.includes(termen))) {
            return false;
        }

        if (filtre.termeniDescriere.minus.some((termen) => descriere.includes(termen))) {
            return false;
        }

        return true;
    }

    function comparaValoriSortare(valoareA, valoareB) {
        if (typeof valoareA === "number" && typeof valoareB === "number") {
            return valoareA - valoareB;
        }

        return String(valoareA).localeCompare(String(valoareB), "ro", { sensitivity: "base" });
    }

    function obtineValoareSortare(articol, cheie) {
        switch (cheie) {
        case "pret":
            return Number(articol.dataset.pret);
        case "culoare":
            return articol.dataset.culoare;
        case "nivel":
            return Number(articol.dataset.nivel);
        case "nume":
            return articol.dataset.nume;
        case "categorie":
            return articol.dataset.categorieEticheta;
        default:
            return ordiniInitiale.get(articol.id);
        }
    }

    function sorteazaArticole(listaArticole, cheiSortare) {
        if (directieSortareCurenta === 0) {
            return [...listaArticole].sort((a, b) => ordiniInitiale.get(a.id) - ordiniInitiale.get(b.id));
        }

        return [...listaArticole].sort((a, b) => {
            for (let cheie of cheiSortare) {
                let diferenta = comparaValoriSortare(obtineValoareSortare(a, cheie), obtineValoareSortare(b, cheie));
                if (diferenta !== 0) {
                    return directieSortareCurenta * diferenta;
                }
            }

            return ordiniInitiale.get(a.id) - ordiniInitiale.get(b.id);
        });
    }

    function actualizeazaStareCarduri() {
        articole.forEach((articol) => {
            let idProdus = articol.dataset.id;
            let butonFixare = articol.querySelector("[data-action-produs='fixeaza']");

            articol.classList.toggle("produs-card--fixat", produseFixate.has(idProdus));

            if (butonFixare) {
                butonFixare.classList.toggle("btn-primary", produseFixate.has(idProdus));
                butonFixare.classList.toggle("btn-outline-primary", !produseFixate.has(idProdus));
                butonFixare.setAttribute("aria-pressed", produseFixate.has(idProdus) ? "true" : "false");
            }
        });
    }

    function actualizeazaRezumat(totalFiltrate, totalAfisate, totalPagini) {
        let totalCatalog = articole.filter((articol) => !produseAscunseSesiune.has(articol.dataset.id)).length;
        sumarProduse.textContent = `Se afișează ${totalAfisate} produse pe pagina curentă din ${totalFiltrate} care corespund filtrării. Catalog activ în acest tab: ${totalCatalog}.`;
        indicatorPaginare.textContent = totalFiltrate ? `Pagina ${paginaCurenta} din ${totalPagini}` : "0 rezultate";
    }

    function randarePaginare(totalPagini) {
        containerPaginare.innerHTML = "";

        if (totalPagini <= 1) {
            navigarePagini.classList.add("d-none");
            return;
        }

        navigarePagini.classList.remove("d-none");

        for (let pagina = 1; pagina <= totalPagini; pagina++) {
            let butonPagina = document.createElement("button");
            butonPagina.type = "button";
            butonPagina.className = `btn ${pagina === paginaCurenta ? "btn-primary" : "btn-outline-primary"}`;
            butonPagina.textContent = String(pagina);
            butonPagina.addEventListener("click", () => {
                paginaCurenta = pagina;
                actualizeazaVizualizare();
            });
            containerPaginare.appendChild(butonPagina);
        }
    }

    function actualizeazaVizualizare({ resetPagina = false, stergeAscunseTemporar = false } = {}) {
        if (stergeAscunseTemporar) {
            produseAscunseTemporar.clear();
        }

        let filtre = valideazaInputuri();
        if (!filtre) {
            return false;
        }

        if (resetPagina) {
            paginaCurenta = 1;
        }

        let articoleFiltrate = articole.filter((articol) => produsTreceFiltrele(articol, filtre));
        let articoleSortate = sorteazaArticole(articoleFiltrate, filtre.cheiSortare);
        let totalPagini = Math.max(1, Math.ceil(articoleSortate.length / produsePerPagina));

        if (paginaCurenta > totalPagini) {
            paginaCurenta = totalPagini;
        }

        let indexStart = (paginaCurenta - 1) * produsePerPagina;
        let articolePagina = articoleSortate.slice(indexStart, indexStart + produsePerPagina);
        let iduriPagina = new Set(articolePagina.map((articol) => articol.id));

        articole.forEach((articol) => {
            let vizibil = iduriPagina.has(articol.id);
            articol.classList.toggle("d-none", !vizibil);
            articol.setAttribute("aria-hidden", vizibil ? "false" : "true");
        });

        articoleSortate.forEach((articol) => containerProduse.appendChild(articol));
        actualizeazaStareCarduri();
        actualizeazaRezumat(articoleSortate.length, articolePagina.length, totalPagini);
        randarePaginare(totalPagini);
        mesajFaraProduse.classList.toggle("d-none", articoleSortate.length !== 0);

        return true;
    }

    function afiseazaRezultatCalcul(text) {
        let existent = document.getElementById("rezultat-calcul-produse");
        if (existent) {
            existent.remove();
        }

        let div = document.createElement("div");
        div.id = "rezultat-calcul-produse";
        div.className = "rezultat-calcul-produse shadow-lg";
        div.textContent = text;
        document.body.appendChild(div);

        window.setTimeout(() => div.remove(), 2000);
    }

    function calculeazaPreturiVizibile() {
        let filtre = valideazaInputuri();
        if (!filtre) {
            return;
        }

        let vizibile = articole.filter((articol) => !articol.classList.contains("d-none"));
        let suma = vizibile.reduce((total, articol) => total + Number(articol.dataset.pret), 0);
        afiseazaRezultatCalcul(`Suma prețurilor pentru produsele vizibile este ${suma.toFixed(2)} lei.`);
    }

    function reseteazaFiltre() {
        directieSortareCurenta = 0;
        produseAscunseTemporar.clear();
        produseFixate.clear();

        inputNume.value = "";
        inputNivel.value = sectiuneProduse.dataset.nivelMinim || "1";
        afisajNivel.textContent = inputNivel.value;
        inputCuloare.value = "";
        selectPersonalizare.selectedIndex = 0;
        textareaDescriere.value = "";
        selectPreturi.selectedIndex = -1;
        selectSortCheie1.value = "pret";
        selectSortCheie2.value = "culoare";
        checkboxMateriale.forEach((checkbox) => { checkbox.checked = false; });

        let radioImplicit = radioSubcategorii.find((radio) => radio.value === "toate");
        if (radioImplicit) {
            radioImplicit.checked = true;
        }

        ascundeMesaj();
        reseteazaStariInvalidare();
        paginaCurenta = 1;
        actualizeazaVizualizare();
    }

    function creeazaBadgeModal(text, clasa) {
        let badge = document.createElement("span");
        badge.className = `badge ${clasa}`;
        badge.textContent = text;
        return badge;
    }

    function deschideModal(articol) {
        campuriModal.imagine.src = articol.querySelector(".produs-card__imagine")?.src || "";
        campuriModal.imagine.alt = articol.dataset.nume;
        campuriModal.titlu.textContent = articol.dataset.nume;
        campuriModal.meta.textContent = `${articol.dataset.categorieEticheta} · ${articol.dataset.subcategorie} · nivel ${articol.dataset.nivel}/10`;
        campuriModal.descriere.textContent = articol.dataset.descriere;
        campuriModal.pret.textContent = `${Number(articol.dataset.pret).toFixed(2)} lei`;
        campuriModal.brand.textContent = articol.dataset.brand;
        campuriModal.materiale.textContent = articol.dataset.materiale.split("|").join(", ");
        campuriModal.personalizare.textContent = articol.dataset.personalizabilText;
        campuriModal.data.textContent = articol.dataset.dataAfisare;
        campuriModal.stoc.textContent = `${articol.dataset.stoc} bucăți`;
        campuriModal.recomandare.textContent = articol.dataset.recomandare;
        campuriModal.detalii.textContent = articol.dataset.detalii;
        campuriModal.intretinere.textContent = articol.dataset.intretinere;
        campuriModal.link.href = articol.dataset.link;
        campuriModal.badges.innerHTML = "";

        if (articol.classList.contains("produs-card--nou")) {
            campuriModal.badges.appendChild(creeazaBadgeModal("NOU", "text-bg-success"));
        }

        if (articol.classList.contains("produs-card--ieftin")) {
            campuriModal.badges.appendChild(creeazaBadgeModal("Cel mai bun preț", "text-bg-warning"));
        }

        modal.classList.remove("d-none");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-deschis");
    }

    function inchideModal() {
        modal.classList.add("d-none");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-deschis");
    }

    function sincronizeazaValidareaSiFiltrarea() {
        actualizeazaVizualizare({ resetPagina: true, stergeAscunseTemporar: true });
    }

    inputNivel.addEventListener("input", () => {
        afisajNivel.textContent = inputNivel.value;
        sincronizeazaValidareaSiFiltrarea();
    });

    inputNume.addEventListener("input", sincronizeazaValidareaSiFiltrarea);
    inputCuloare.addEventListener("input", sincronizeazaValidareaSiFiltrarea);
    textareaDescriere.addEventListener("input", sincronizeazaValidareaSiFiltrarea);
    selectPersonalizare.addEventListener("change", sincronizeazaValidareaSiFiltrarea);
    selectPreturi.addEventListener("change", sincronizeazaValidareaSiFiltrarea);
    selectSortCheie1.addEventListener("change", () => actualizeazaVizualizare({ resetPagina: true, stergeAscunseTemporar: true }));
    selectSortCheie2.addEventListener("change", () => actualizeazaVizualizare({ resetPagina: true, stergeAscunseTemporar: true }));
    checkboxMateriale.forEach((checkbox) => checkbox.addEventListener("change", sincronizeazaValidareaSiFiltrarea));
    radioSubcategorii.forEach((radio) => radio.addEventListener("change", sincronizeazaValidareaSiFiltrarea));

    butonFiltrare.addEventListener("click", () => {
        actualizeazaVizualizare({ resetPagina: true, stergeAscunseTemporar: true });
    });

    butonSortAsc.addEventListener("click", () => {
        directieSortareCurenta = 1;
        actualizeazaVizualizare({ resetPagina: true, stergeAscunseTemporar: true });
    });

    butonSortDesc.addEventListener("click", () => {
        directieSortareCurenta = -1;
        actualizeazaVizualizare({ resetPagina: true, stergeAscunseTemporar: true });
    });

    butonCalculeaza.addEventListener("click", () => {
        calculeazaPreturiVizibile();
    });

    butonResetare.addEventListener("click", () => {
        if (!window.confirm("Sigur vrei să resetezi toate filtrele, ordinea și selecțiile temporare?")) {
            return;
        }

        reseteazaFiltre();
    });

    containerProduse.addEventListener("click", (event) => {
        let butonActiune = event.target.closest("[data-action-produs]");
        if (butonActiune) {
            event.preventDefault();
            event.stopPropagation();

            let articol = butonActiune.closest(".produs-card");
            let idProdus = articol.dataset.id;
            let actiune = butonActiune.dataset.actionProdus;

            if (actiune === "fixeaza") {
                if (produseFixate.has(idProdus)) {
                    produseFixate.delete(idProdus);
                } else {
                    produseFixate.add(idProdus);
                    produseAscunseTemporar.delete(idProdus);
                }
                actualizeazaVizualizare();
                return;
            }

            if (actiune === "ascunde-temporar") {
                produseFixate.delete(idProdus);
                produseAscunseTemporar.add(idProdus);
                actualizeazaVizualizare();
                return;
            }

            if (actiune === "ascunde-sesiune") {
                produseFixate.delete(idProdus);
                produseAscunseTemporar.delete(idProdus);
                produseAscunseSesiune.add(idProdus);
                persistaProduseAscunseSesiune();
                actualizeazaVizualizare({ resetPagina: true });
            }
            return;
        }

        if (event.target.closest("a, button, [data-ignore-modal='true']")) {
            return;
        }

        let articol = event.target.closest(".produs-card");
        if (articol && !articol.classList.contains("d-none")) {
            deschideModal(articol);
        }
    });

    modal?.addEventListener("click", (event) => {
        if (event.target === modal || event.target.closest("[data-inchide-modal='true']")) {
            inchideModal();
        }
    });

    butonInchidereModal?.addEventListener("click", inchideModal);

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal && !modal.classList.contains("d-none")) {
            inchideModal();
        }
    });

    actualizeazaVizualizare({ resetPagina: true });
});
