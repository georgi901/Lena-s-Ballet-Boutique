const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("view engine", "ejs");

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

let obGlobal = {
    obErori: null
};

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

app.get(["/", "/index", "/home"], (req, res) => {
    res.render("pagini/index", { ip: req.ip });
});

app.get("/:pagina", (req, res) => {
    let pagina = req.params.pagina;
    res.render("pagini/" + pagina, function(eroare, rezultatRandare) {
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
});

app.listen(8080, () => {
    console.log("Serverul a pornit pe portul 8080");
});