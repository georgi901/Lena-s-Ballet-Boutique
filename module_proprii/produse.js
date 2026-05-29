const { Pool } = require("pg");

const configuratieBd = {
    host: process.env.PGHOST || "127.0.0.1",
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || "lena_ballet_boutique",
    user: process.env.PGUSER || "lena_app",
    password: process.env.PGPASSWORD || "lena_app_2026"
};

const eticheteCategorii = {
    incaltaminte: "Încălțăminte",
    imbracaminte: "Îmbrăcăminte",
    accesorii: "Accesorii",
    antrenament: "Antrenament",
    spectacol: "Spectacol"
};

const luni = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie"
];

const zile = [
    "Duminică",
    "Luni",
    "Marți",
    "Miercuri",
    "Joi",
    "Vineri",
    "Sâmbătă"
];

const pragProdusNouZile = Number(process.env.PRODUSE_NOI_ZILE) || 120;

let pool;

function obtinePool() {
    if (!pool) {
        pool = new Pool(configuratieBd);
        pool.on("error", (err) => {
            console.error("Conexiunea la baza de date pentru produse a întâmpinat o eroare.");
            console.error(err);
        });
    }

    return pool;
}

async function interogheaza(text, valori = []) {
    return obtinePool().query(text, valori);
}

function separaValori(text) {
    return (text || "")
        .split(",")
        .map((valoare) => valoare.trim())
        .filter(Boolean);
}

function formateazaDataRomana(data) {
    let dataCalendaristica = data instanceof Date ? data : new Date(data);
    if (Number.isNaN(dataCalendaristica.getTime())) {
        return "";
    }

    return `${zile[dataCalendaristica.getDay()]}, ${dataCalendaristica.getDate()}-${luni[dataCalendaristica.getMonth()]}-${dataCalendaristica.getFullYear()}`;
}

function normalizeazaText(text) {
    return (text || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function esteProdusNou(dataProdus, zileInterval = pragProdusNouZile, dataReferinta = new Date()) {
    let dataComparata = dataProdus instanceof Date ? dataProdus : new Date(dataProdus);
    if (Number.isNaN(dataComparata.getTime())) {
        return false;
    }

    let diferentaMilisecunde = dataReferinta.getTime() - dataComparata.getTime();
    let pragMilisecunde = zileInterval * 24 * 60 * 60 * 1000;
    return diferentaMilisecunde >= 0 && diferentaMilisecunde <= pragMilisecunde;
}

function calculeazaIntervalePret(produse, numarIntervale = 5) {
    let preturi = produse.map((produs) => Number(produs.pret)).filter((pret) => !Number.isNaN(pret));
    if (!preturi.length) {
        return [];
    }

    let pretMinim = Math.floor(Math.min(...preturi) / 10) * 10;
    let pretMaxim = Math.ceil(Math.max(...preturi) / 10) * 10;
    let amplitudine = Math.max(pretMaxim - pretMinim, 10);
    let pas = Math.max(10, Math.ceil(amplitudine / numarIntervale / 10) * 10);
    let intervale = [];

    for (let index = 0; index < numarIntervale; index++) {
        let minim = pretMinim + index * pas;
        let maxim = index === numarIntervale - 1 ? pretMaxim + 1 : minim + pas;
        let eticheta = index === numarIntervale - 1
            ? `${minim} - ${pretMaxim} lei`
            : `${minim} - ${maxim - 1} lei`;

        intervale.push({
            valoare: `${minim}:${maxim}`,
            eticheta,
            minim,
            maxim
        });
    }

    return intervale;
}

function transformaProdus(rand) {
    let dataAdaugare = new Date(rand.data_adaugare);
    let materialeLista = separaValori(rand.materiale);

    return {
        ...rand,
        pret: Number(rand.pret),
        nivel_experienta: Number(rand.nivel_experienta),
        stoc: Number(rand.stoc),
        materiale_lista: materialeLista,
        materiale_afisare: materialeLista.join(", "),
        personalizabil: Boolean(rand.personalizabil),
        categorie_eticheta: eticheteCategorii[rand.categorie] || rand.categorie,
        data_adaugare_iso: Number.isNaN(dataAdaugare.getTime()) ? "" : dataAdaugare.toISOString().slice(0, 10),
        data_adaugare_afisare: formateazaDataRomana(dataAdaugare)
    };
}

function extrageOptiuniProduse(produse) {
    let subcategorii = new Set();
    let culori = new Set();
    let materiale = new Set();
    let niveluri = [];
    let lungimeMaximaNume = 0;
    let produsePersonalizabile = 0;

    produse.forEach((produs) => {
        subcategorii.add(produs.subcategorie);
        culori.add(produs.culoare);
        niveluri.push(Number(produs.nivel_experienta));
        lungimeMaximaNume = Math.max(lungimeMaximaNume, produs.nume.length);

        if (produs.personalizabil) {
            produsePersonalizabile += 1;
        }

        produs.materiale_lista.forEach((material) => materiale.add(material));
    });

    let listaMateriale = [...materiale].sort((a, b) => a.localeCompare(b, "ro"));
    let nivelMinim = niveluri.length ? Math.min(...niveluri) : 1;
    let nivelMaxim = niveluri.length ? Math.max(...niveluri) : 10;
    let exempluNume = produse.length ? produse[0].nume.split(/\s+/)[0] : "Aurora";
    let exempluPlus = listaMateriale[0] || "satin";
    let exempluMinus = listaMateriale.find((material) => material !== exempluPlus) || "gel";

    return {
        subcategorii: [...subcategorii].sort((a, b) => a.localeCompare(b, "ro")),
        culori: [...culori].sort((a, b) => a.localeCompare(b, "ro")),
        materiale: listaMateriale,
        intervalePret: calculeazaIntervalePret(produse),
        personalizare: {
            da: produsePersonalizabile,
            nu: produse.length - produsePersonalizabile
        },
        nivelMinim,
        nivelMaxim,
        nivelInitial: nivelMinim,
        lungimeMaximaNume,
        exempluNume,
        exempluDescriere: `+${exempluPlus} -${exempluMinus}`,
        produsePerPagina: 6,
        sortariDisponibile: [
            { valoare: "pret", eticheta: "Preț" },
            { valoare: "culoare", eticheta: "Culoare" },
            { valoare: "nivel", eticheta: "Nivel recomandat" },
            { valoare: "nume", eticheta: "Nume" },
            { valoare: "categorie", eticheta: "Categorie" }
        ]
    };
}

async function obtineCategoriiProduse() {
    let rezultat = await interogheaza(`
        SELECT unnest(enum_range(NULL::categorie_produs))::text AS categorie
        ORDER BY 1
    `);

    return rezultat.rows.map((rand) => ({
        valoare: rand.categorie,
        eticheta: eticheteCategorii[rand.categorie] || rand.categorie
    }));
}

async function obtineProduse(categorie = null) {
    let conditieCategorie = "";
    let valori = [];

    if (categorie) {
        conditieCategorie = "WHERE p.categorie = $1";
        valori.push(categorie);
    }

    let rezultat = await interogheaza(`
        SELECT
            p.id,
            p.nume,
            p.descriere,
            p.imagine,
            p.categorie,
            p.subcategorie,
            p.pret,
            p.nivel_experienta,
            p.data_adaugare,
            p.culoare,
            p.materiale,
            p.personalizabil,
            p.brand,
            p.stoc,
            p.recomandare_lena,
            p.detalii,
            p.intretinere
        FROM produse p
        ${conditieCategorie}
        ORDER BY p.id
    `, valori);

    return rezultat.rows.map(transformaProdus);
}

async function obtineProdusDupaId(idProdus) {
    let rezultat = await interogheaza(`
        SELECT
            p.id,
            p.nume,
            p.descriere,
            p.imagine,
            p.categorie,
            p.subcategorie,
            p.pret,
            p.nivel_experienta,
            p.data_adaugare,
            p.culoare,
            p.materiale,
            p.personalizabil,
            p.brand,
            p.stoc,
            p.recomandare_lena,
            p.detalii,
            p.intretinere
        FROM produse p
        WHERE p.id = $1
    `, [idProdus]);

    if (!rezultat.rows.length) {
        return null;
    }

    return transformaProdus(rezultat.rows[0]);
}

async function obtineProduseSimilare({ idProdus, categorie, subcategorie, nivelExperienta, pret }, limita = 3) {
    let rezultat = await interogheaza(`
        SELECT
            p.id,
            p.nume,
            p.descriere,
            p.imagine,
            p.categorie,
            p.subcategorie,
            p.pret,
            p.nivel_experienta,
            p.data_adaugare,
            p.culoare,
            p.materiale,
            p.personalizabil,
            p.brand,
            p.stoc,
            p.recomandare_lena,
            p.detalii,
            p.intretinere
        FROM produse p
        WHERE p.id <> $1
          AND p.categorie = $2
        ORDER BY
            CASE WHEN p.subcategorie = $3 THEN 0 ELSE 1 END,
            ABS(p.nivel_experienta - $4),
            ABS(p.pret - $5),
            p.id
        LIMIT $6
    `, [idProdus, categorie, subcategorie, nivelExperienta, pret, limita]);

    return rezultat.rows.map(transformaProdus);
}

module.exports = {
    configuratieBd,
    esteProdusNou,
    extrageOptiuniProduse,
    formateazaDataRomana,
    obtineCategoriiProduse,
    obtinePool,
    obtineProdusDupaId,
    obtineProduse,
    obtineProduseSimilare,
    pragProdusNouZile
};
