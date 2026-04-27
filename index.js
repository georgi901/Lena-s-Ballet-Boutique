const express = require("express");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const sharp = require("sharp");
const sass = require("sass");

const app = express();
app.set("view engine", "ejs");

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

let obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css")
};

const zileSaptamanii = ["duminica", "luni", "marti", "miercuri", "joi", "vineri", "sambata"];
const zileSaptamaniiAfisare = {
    duminica: "duminică",
    luni: "luni",
    marti: "marți",
    miercuri: "miercuri",
    joi: "joi",
    vineri: "vineri",
    sambata: "sâmbătă"
};
const dimensiuniGalerie = {
    mare: { latime: 500, inaltime: 640 },
    medie: { latime: 360, inaltime: 460 },
    mica: { latime: 240, inaltime: 320 }
};
const dimensiuneImagineAnimata = { latime: 460, inaltime: 460 };
const optiuniGalerieAnimata = [4, 9, 16];
const dataTestGalerie = null; // Pentru prezentare poti seta temporar, de exemplu: new Date("2026-05-17T12:00:00");

function normalizeText(text) {
    return (text || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function indexZiSaptamana(zi) {
    return zileSaptamanii.indexOf(normalizeText(zi));
}

function obtineZiGalerie(dataReferinta = dataTestGalerie || new Date()) {
    return zileSaptamanii[dataReferinta.getDay()];
}

function formatZiAfisare(zi) {
    return zileSaptamaniiAfisare[normalizeText(zi)] || zi;
}

function ziInInterval(ziCurenta, intervale) {
    let indexZiCurenta = indexZiSaptamana(ziCurenta);
    if (indexZiCurenta === -1 || !Array.isArray(intervale)) {
        return false;
    }

    return intervale.some(interval => {
        if (!Array.isArray(interval) || interval.length !== 2) {
            return false;
        }

        let [ziStart, ziStop] = interval;
        let indexStart = indexZiSaptamana(ziStart);
        let indexStop = indexZiSaptamana(ziStop);

        if (indexStart === -1 || indexStop === -1) {
            return false;
        }

        if (indexStart <= indexStop) {
            return indexZiCurenta >= indexStart && indexZiCurenta <= indexStop;
        }

        return indexZiCurenta >= indexStart || indexZiCurenta <= indexStop;
    });
}

async function asiguraImagineRedimensionata(caleSursa, caleDestinatie, dimensiune) {
    if (fs.existsSync(caleDestinatie)) {
        return;
    }

    await fs.promises.mkdir(path.dirname(caleDestinatie), { recursive: true });
    await sharp(caleSursa)
        .resize(dimensiune.latime, dimensiune.inaltime, {
            fit: "cover",
            position: "centre"
        })
        .toFile(caleDestinatie);
}

async function pregatesteSurseImagineGalerie(numeFisier) {
    let radacinaGalerie = path.join(__dirname, "resurse", "imagini", "galerie");
    let caleSursa = path.join(radacinaGalerie, "original", numeFisier);

    if (!fs.existsSync(caleSursa)) {
        throw new Error(`Imaginea galeriei nu exista: ${numeFisier}`);
    }

    for (let [tip, dimensiune] of Object.entries(dimensiuniGalerie)) {
        let caleDestinatie = path.join(radacinaGalerie, tip, numeFisier);
        await asiguraImagineRedimensionata(caleSursa, caleDestinatie, dimensiune);
    }
}

async function pregatesteImagineGalerieAnimata(numeFisier) {
    let radacinaGalerie = path.join(__dirname, "resurse", "imagini", "galerie");
    let caleSursa = path.join(radacinaGalerie, "original", numeFisier);
    let caleDestinatie = path.join(radacinaGalerie, "animata", numeFisier);

    if (!fs.existsSync(caleSursa)) {
        throw new Error(`Imaginea pentru galeria animata nu exista: ${numeFisier}`);
    }

    await asiguraImagineRedimensionata(caleSursa, caleDestinatie, dimensiuneImagineAnimata);
}

function rezolvaCaleScss(caleScss) {
    if (!caleScss) {
        throw new Error("Calea catre fisierul scss lipseste.");
    }

    return path.isAbsolute(caleScss) ? caleScss : path.join(obGlobal.folderScss, caleScss);
}

function rezolvaCaleCss(caleScssAbs, caleCss) {
    if (caleCss) {
        return path.isAbsolute(caleCss) ? caleCss : path.join(obGlobal.folderCss, caleCss);
    }

    let caleRelativaScss = path.relative(obGlobal.folderScss, caleScssAbs);
    if (caleRelativaScss.startsWith("..")) {
        caleRelativaScss = path.basename(caleScssAbs);
    }

    return path.join(obGlobal.folderCss, caleRelativaScss.replace(/\.scss$/i, ".css"));
}

async function salveazaCssInBackup(caleCssAbs) {
    if (!fs.existsSync(caleCssAbs)) {
        return;
    }

    let caleRelativaCss = path.relative(obGlobal.folderCss, caleCssAbs);
    if (caleRelativaCss.startsWith("..")) {
        caleRelativaCss = path.basename(caleCssAbs);
    }

    let infoFisierCss = path.parse(caleRelativaCss);
    let numeBackup = `${infoFisierCss.name}_${Date.now()}${infoFisierCss.ext}`;
    let caleBackup = path.join(
        __dirname,
        "backup",
        "resurse",
        "css",
        infoFisierCss.dir,
        numeBackup
    );

    try {
        await fs.promises.mkdir(path.dirname(caleBackup), { recursive: true });
        await fs.promises.copyFile(caleCssAbs, caleBackup);
    } catch (err) {
        console.error(`Eroare la copierea fisierului CSS in backup: ${caleCssAbs}`);
        console.error(err);
    }
}

async function compileazaScss(caleScss, caleCss) {
    let caleScssAbs = rezolvaCaleScss(caleScss);
    let caleCssAbs = rezolvaCaleCss(caleScssAbs, caleCss);

    if (!fs.existsSync(caleScssAbs)) {
        throw new Error(`Fisierul SCSS nu exista: ${caleScssAbs}`);
    }

    await fs.promises.mkdir(path.dirname(caleCssAbs), { recursive: true });
    await salveazaCssInBackup(caleCssAbs);

    let rezultat = sass.compile(caleScssAbs, {
        style: "expanded",
        loadPaths: [path.join(__dirname, "node_modules")]
    });

    await fs.promises.writeFile(caleCssAbs, rezultat.css);
    return caleCssAbs;
}

function colecteazaFisiereScss(folderCurent = obGlobal.folderScss) {
    if (!fs.existsSync(folderCurent)) {
        return [];
    }

    let rezultate = [];
    let intrari = fs.readdirSync(folderCurent, { withFileTypes: true });

    for (let intrare of intrari) {
        let caleIntrare = path.join(folderCurent, intrare.name);

        if (intrare.isDirectory()) {
            rezultate.push(...colecteazaFisiereScss(caleIntrare));
            continue;
        }

        if (intrare.isFile() && intrare.name.endsWith(".scss") && !intrare.name.startsWith("_")) {
            rezultate.push(caleIntrare);
        }
    }

    return rezultate;
}

async function compileazaToateScss() {
    let fisiereScss = colecteazaFisiereScss();

    for (let caleScssAbs of fisiereScss) {
        await compileazaScss(caleScssAbs);
    }
}

function pornesteWatcherScss() {
    if (!fs.existsSync(obGlobal.folderScss)) {
        return;
    }

    let debounceCompilare = new Map();

    fs.watch(obGlobal.folderScss, { recursive: true }, (tipEveniment, numeFisier) => {
        if (!numeFisier || !numeFisier.endsWith(".scss")) {
            return;
        }

        if (path.basename(numeFisier).startsWith("_")) {
            return;
        }

        let caleScssAbs = path.join(obGlobal.folderScss, numeFisier);
        clearTimeout(debounceCompilare.get(caleScssAbs));

        let timeoutId = setTimeout(async () => {
            debounceCompilare.delete(caleScssAbs);

            if (!fs.existsSync(caleScssAbs)) {
                return;
            }

            try {
                await compileazaScss(caleScssAbs);
                console.log(`SCSS recompilat automat: ${numeFisier} (${tipEveniment})`);
            } catch (err) {
                console.error(`Eroare la recompilarea SCSS pentru ${numeFisier}`);
                console.error(err);
            }
        }, 200);

        debounceCompilare.set(caleScssAbs, timeoutId);
    });
}

const caleJsonGalerie = path.join(__dirname, "resurse", "json", "galerie-statica.json");

function citesteJsonGalerie() {
    let continutGalerie = fs.readFileSync(caleJsonGalerie, "utf-8");
    return JSON.parse(continutGalerie);
}

function rezolvaCalePublicaLaSistemFisier(calePublica) {
    if (!calePublica) {
        return "";
    }

    if (path.isAbsolute(calePublica) && !calePublica.startsWith("/resurse")) {
        return calePublica;
    }

    return path.join(__dirname, calePublica.replace(/^[/\\]+/, ""));
}

function valideazaJsonGalerie() {
    let galerie = citesteJsonGalerie();
    let caleGalerieAbsoluta = rezolvaCalePublicaLaSistemFisier(galerie.cale_galerie);

    if (!fs.existsSync(caleGalerieAbsoluta)) {
        console.error(`[Galerie JSON] Folderul definit in "cale_galerie" nu exista.`);
        console.error(`[Galerie JSON] Valoarea din JSON este "${galerie.cale_galerie}", iar calea rezolvata in sistemul de fisiere este "${caleGalerieAbsoluta}".`);
        console.error(`[Galerie JSON] Corecteaza proprietatea "cale_galerie" din ${caleJsonGalerie} sau creeaza folderul lipsa.`);
        return;
    }

    let folderImaginiSursa = fs.existsSync(path.join(caleGalerieAbsoluta, "original"))
        ? path.join(caleGalerieAbsoluta, "original")
        : caleGalerieAbsoluta;

    galerie.imagini.forEach((imagine, index) => {
        let caleImagineAbsoluta = path.join(folderImaginiSursa, imagine.fisier_imagine);

        if (!fs.existsSync(caleImagineAbsoluta)) {
            console.error(`[Galerie JSON] Lipseste un fisier imagine din lista galeriei.`);
            console.error(`[Galerie JSON] Intrarea #${index + 1} din ${caleJsonGalerie} indica fisierul "${imagine.fisier_imagine}".`);
            console.error(`[Galerie JSON] Fisierul nu exista la calea "${caleImagineAbsoluta}". Verifica numele fisierului, extensia sau copiaza imaginea in folderul "${folderImaginiSursa}".`);
        }
    });
}

function amestecaVector(vector) {
    let copie = [...vector];
    for (let i = copie.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [copie[i], copie[j]] = [copie[j], copie[i]];
    }
    return copie;
}

function genereazaKeyframesGalerieAnimata(numarImagini) {
    let dimensiuneGrid = Math.sqrt(numarImagini);
    let procentSegment = 100 / numarImagini;
    let scaleGrid = (1 / dimensiuneGrid).toFixed(4);
    let cadre = [];

    for (let i = 0; i < numarImagini; i++) {
        let rand = Math.floor(i / dimensiuneGrid);
        let coloana = i % dimensiuneGrid;
        let inceput = (i * procentSegment).toFixed(4);
        let pauzaImagine = (i * procentSegment + procentSegment * 0.42).toFixed(4);
        let zoomOut = (i * procentSegment + procentSegment * 0.66).toFixed(4);
        let finalSegment = ((i + 1) * procentSegment).toFixed(4);

        let translatieX = `calc(-${coloana} * var(--latura-cadru))`;
        let translatieY = `calc(-${rand} * var(--latura-cadru))`;

        cadre.push(`${inceput}%,
${pauzaImagine}% {
    transform: translate(${translatieX}, ${translatieY}) scale(1);
}`);

        cadre.push(`${zoomOut}% {
    transform: translate(0, 0) scale(${scaleGrid});
}`);

        if (i < numarImagini - 1) {
            let randUrmator = Math.floor((i + 1) / dimensiuneGrid);
            let coloanaUrmatoare = (i + 1) % dimensiuneGrid;
            let translatieUrmatoareX = `calc(-${coloanaUrmatoare} * var(--latura-cadru))`;
            let translatieUrmatoareY = `calc(-${randUrmator} * var(--latura-cadru))`;

            cadre.push(`${finalSegment}% {
    transform: translate(${translatieUrmatoareX}, ${translatieUrmatoareY}) scale(1);
}`);
        } else {
            cadre.push(`${finalSegment}% {
    transform: translate(${translatieX}, ${translatieY}) scale(1);
}`);
        }
    }

    return cadre.join("\n\n");
}

async function genereazaCssGalerieAnimata(numarImagini) {
    let dimensiuneGrid = Math.sqrt(numarImagini);
    let numeFisierScss = `galerie-animata-${numarImagini}.scss`;
    let numeFisierCss = `galerie-animata-${numarImagini}.css`;
    let caleTemplate = path.join(obGlobal.folderScss, "_galerie-animata.template.scss");
    let caleScssGenerat = path.join(obGlobal.folderScss, numeFisierScss);
    let templateScss = await fs.promises.readFile(caleTemplate, "utf-8");

    let scssFinal = templateScss
        .replace(/__NUMAR_IMAGINI__/g, String(numarImagini))
        .replace(/__DIMENSIUNE_GRID__/g, String(dimensiuneGrid))
        .replace(/__BORDER_IMAGE__/g, "../imagini/image.png")
        .replace(/__KEYFRAMES__/g, genereazaKeyframesGalerieAnimata(numarImagini));

    await fs.promises.writeFile(caleScssGenerat, scssFinal);
    await compileazaScss(caleScssGenerat, numeFisierCss);

    return `/resurse/css/${numeFisierCss}?v=${Date.now()}`;
}

async function obtineGalerieStatica() {
    let galerie = citesteJsonGalerie();
    let ziCurenta = obtineZiGalerie();

    let imaginiFiltrate = galerie.imagini.filter(imagine => ziInInterval(ziCurenta, imagine.intervale_zile));

    if (imaginiFiltrate.length % 2 !== 0) {
        imaginiFiltrate = imaginiFiltrate.slice(0, imaginiFiltrate.length - 1);
    }

    let imaginiCuSurse = await Promise.all(
        imaginiFiltrate.map(async imagine => {
            await pregatesteSurseImagineGalerie(imagine.fisier_imagine);

            return {
                ...imagine,
                altFinal: imagine.continut_alternativ || imagine.nume_poza
            };
        })
    );

    return {
        caleGalerie: galerie.cale_galerie,
        ziCurenta,
        ziCurentaAfisare: formatZiAfisare(ziCurenta),
        imagini: imaginiCuSurse
    };
}

async function obtineGalerieAnimata() {
    let galerie = citesteJsonGalerie();
    let imaginiEligibile = galerie.imagini.filter(imagine => imagine.nume_poza && imagine.nume_poza.trim().length < 12);
    let fisiereDistincte = new Set(imaginiEligibile.map(imagine => imagine.fisier_imagine));

    if (fisiereDistincte.size < 16) {
        throw new Error("Galeria animata necesita cel putin 16 imagini distincte cu nume mai scurt de 12 caractere.");
    }

    let numarImagini = optiuniGalerieAnimata[Math.floor(Math.random() * optiuniGalerieAnimata.length)];
    let imaginiSelectate = amestecaVector(imaginiEligibile).slice(0, numarImagini);

    await Promise.all(imaginiSelectate.map(imagine => pregatesteImagineGalerieAnimata(imagine.fisier_imagine)));

    return {
        caleGalerie: galerie.cale_galerie,
        imagini: imaginiSelectate.map(imagine => ({
            ...imagine,
            altFinal: imagine.continut_alternativ || imagine.nume_poza
        })),
        numarImagini,
        dimensiuneGrid: Math.sqrt(numarImagini),
        stilHref: await genereazaCssGalerieAnimata(numarImagini)
    };
}

function verificaErori() {
    let caleJson = path.join(__dirname, "erori.json");

    // 1. Fisierul erori.json nu exista
    if (!fs.existsSync(caleJson)) {
        console.error("EROARE CRITICA: Fisierul erori.json nu exista la calea: " + caleJson + ". Aplicatia se inchide.");
        process.exit(1);
    }

    let continutRaw = fs.readFileSync(caleJson, "utf-8");
    let obErori = JSON.parse(continutRaw);

    // 2. Proprietati obligatorii lipsesc
    let propsObligatorii = ["info_erori", "cale_baza", "eroare_default"];
    for (let prop of propsObligatorii) {
        if (!obErori.hasOwnProperty(prop)) {
            console.error("EROARE: Proprietatea '" + prop + "' lipseste din fisierul erori.json.");
        }
    }

    // 3. Proprietati eroare_default lipsesc
    if (obErori.eroare_default) {
        let propsDefault = ["titlu", "text", "imagine"];
        for (let prop of propsDefault) {
            if (!obErori.eroare_default.hasOwnProperty(prop)) {
                console.error("EROARE: Proprietatea '" + prop + "' lipseste din eroare_default in erori.json.");
            }
        }
    }

    // 4. Folderul din cale_baza nu exista
    if (obErori.cale_baza) {
        let caleFolder = path.join(__dirname, obErori.cale_baza);
        if (!fs.existsSync(caleFolder)) {
            console.error("EROARE: Folderul specificat in 'cale_baza' nu exista in sistemul de fisiere. Calea completa: " + caleFolder);
        }
    }

    // 5. Imaginile asociate erorilor nu exista
    if (obErori.eroare_default && obErori.eroare_default.imagine && obErori.cale_baza) {
        let caleImg = path.join(__dirname, obErori.cale_baza, obErori.eroare_default.imagine);
        if (!fs.existsSync(caleImg)) {
            console.error("EROARE: Imaginea '" + obErori.eroare_default.imagine + "' pentru eroare_default nu exista. Calea completa: " + caleImg);
        }
    }
    if (obErori.info_erori) {
        for (let eroare of obErori.info_erori) {
            if (eroare.imagine && obErori.cale_baza) {
                let caleImg = path.join(__dirname, obErori.cale_baza, eroare.imagine);
                if (!fs.existsSync(caleImg)) {
                    console.error("EROARE: Imaginea '" + eroare.imagine + "' pentru eroarea cu identificatorul " + eroare.identificator + " nu exista. Calea completa: " + caleImg);
                }
            }
        }
    }

    // 6. Proprietati duplicate in acelasi obiect (verificare pe string, nu pe obiect)
    let objectStack = [];
    for (let i = 0; i < continutRaw.length; i++) {
        let ch = continutRaw[i];

        if (ch === '"') {
            let end = i + 1;
            while (end < continutRaw.length) {
                if (continutRaw[end] === '\\') { end += 2; continue; }
                if (continutRaw[end] === '"') break;
                end++;
            }
            let strValue = continutRaw.substring(i + 1, end);

            let j = end + 1;
            while (j < continutRaw.length && /\s/.test(continutRaw[j])) j++;
            if (j < continutRaw.length && continutRaw[j] === ':' && objectStack.length > 0) {
                let currentObj = objectStack[objectStack.length - 1];
                if (!currentObj[strValue]) currentObj[strValue] = 0;
                currentObj[strValue]++;
            }

            i = end;
            continue;
        }

        if (ch === '{') {
            objectStack.push({});
        } else if (ch === '}') {
            if (objectStack.length > 0) {
                let obj = objectStack.pop();
                for (let prop in obj) {
                    if (obj[prop] > 1) {
                        console.error("EROARE: In fisierul erori.json, proprietatea \"" + prop + "\" apare de " + obj[prop] + " ori in acelasi obiect.");
                    }
                }
            }
        }
    }

    // 7. Identificatori duplicati in vectorul info_erori
    if (obErori.info_erori) {
        let mapId = {};
        for (let eroare of obErori.info_erori) {
            let id = eroare.identificator;
            if (!mapId[id]) mapId[id] = [];
            mapId[id].push(eroare);
        }
        for (let id in mapId) {
            if (mapId[id].length > 1) {
                console.error("EROARE: Identificatorul '" + id + "' apare de " + mapId[id].length + " ori in vectorul info_erori. Erorile duplicate:");
                for (let er of mapId[id]) {
                    let { identificator, ...rest } = er;
                    console.error("  - " + JSON.stringify(rest));
                }
            }
        }
    }
}

function initErori() {
    let continut = fs.readFileSync(path.join(__dirname, "erori.json"), "utf-8");
    obGlobal.obErori = JSON.parse(continut);

    obGlobal.obErori.eroare_default.imagine = obGlobal.obErori.cale_baza + obGlobal.obErori.eroare_default.imagine;

    for (let eroare of obGlobal.obErori.info_erori) {
        eroare.imagine = obGlobal.obErori.cale_baza + eroare.imagine;
    }
}

verificaErori();
initErori();

let vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
for (let folder of vect_foldere) {
    let caleFoler = path.join(__dirname, folder);
    if (!fs.existsSync(caleFoler)) {
        fs.mkdirSync(caleFoler);
    }
}

function getEroare(identificator) {
    let eroare = obGlobal.obErori.info_erori.find(e => e.identificator === identificator);
    if (!eroare) {
        return obGlobal.obErori.eroare_default;
    }
    return eroare;
}

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroare = identificator ? getEroare(identificator) : obGlobal.obErori.eroare_default;

    let renderData = {
        titlu: titlu || eroare.titlu,
        text: text || eroare.text,
        imagine: imagine || eroare.imagine
    };

    let statusCode = eroare.status ? identificator || 500 : 200;
    res.status(statusCode).render("pagini/eroare", renderData);
}

app.use((req, res, next) => {
    if (req.path.endsWith(".ejs")) {
        afisareEroare(res, 400);
    } else {
        next();
    }
});

app.use("/resurse", (req, res, next) => {
    let caleFisier = path.join(__dirname, "resurse", req.path);
    if (fs.existsSync(caleFisier) && fs.statSync(caleFisier).isDirectory()) {
        afisareEroare(res, 403);
    } else {
        next();
    }
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, "resurse", "imagini", "favicon", "favicon.ico"));
});

app.get(["/", "/index", "/home"], async (req, res) => {
    try {
        let galerieStatica = await obtineGalerieStatica();
        let rezultatRandare = await ejs.renderFile(path.join(__dirname, "views", "pagini", "index.ejs"), {
            ip: req.ip,
            galerieStatica
        }, {
            views: [path.join(__dirname, "views")]
        });
        res.send(rezultatRandare);
    } catch (err) {
        console.error(err);
        afisareEroare(res, 500);
    }
});

app.get("/galerie-statica", async (req, res) => {
    try {
        let galerieStatica = await obtineGalerieStatica();
        let rezultatRandare = await ejs.renderFile(path.join(__dirname, "views", "pagini", "galerie-statica.ejs"), {
            galerieStatica
        }, {
            views: [path.join(__dirname, "views")]
        });
        res.send(rezultatRandare);
    } catch (err) {
        console.error(err);
        afisareEroare(res, 500);
    }
});

app.get("/galerie-dinamica", async (req, res) => {
    try {
        let galerieAnimata = await obtineGalerieAnimata();
        let rezultatRandare = await ejs.renderFile(path.join(__dirname, "views", "pagini", "galerie-dinamica.ejs"), {
            galerieAnimata
        }, {
            views: [path.join(__dirname, "views")]
        });
        res.send(rezultatRandare);
    } catch (err) {
        console.error(err);
        afisareEroare(res, 500);
    }
});

app.get("/:pagina", async (req, res) => {
    let pagina = req.params.pagina;

    try {
        let dateRandare = {};

        if (pagina === "galerie-statica") {
            dateRandare.galerieStatica = await obtineGalerieStatica();
        }

        if (pagina === "galerie-dinamica") {
            dateRandare.galerieAnimata = await obtineGalerieAnimata();
        }

        res.render("pagini/" + pagina, dateRandare, function (eroare, rezultatRandare) {
            if (eroare) {
                if (eroare.message.startsWith("Failed to lookup view")) {
                    afisareEroare(res, 404);
                } else {
                    afisareEroare(res, 500);
                }
            } else {
                res.send(rezultatRandare);
            }
        });
    } catch (err) {
        console.error(err);
        afisareEroare(res, 500);
    }
});

async function initAplicatie() {
    try {
        valideazaJsonGalerie();
    } catch (err) {
        console.error("Eroare la validarea JSON-ului galeriei statice.");
        console.error(err);
    }

    try {
        await compileazaToateScss();
    } catch (err) {
        console.error("Eroare la compilarea initiala a fisierelor SCSS.");
        console.error(err);
    }

    pornesteWatcherScss();

    const PORT = Number(process.env.PORT) || 8080;
    const server = app.listen(PORT, () => {
        console.log(`Serverul a pornit pe portul ${PORT}`);
    });

    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`Portul ${PORT} este deja ocupat. Opreste procesul care il foloseste sau porneste aplicatia pe alt port, de exemplu: PORT=8081 node index.js`);
        } else {
            console.error(err);
        }
    });
}

initAplicatie();

module.exports = app;
