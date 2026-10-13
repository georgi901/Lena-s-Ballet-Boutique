// ============================================
// INDEX.JS - FISIERUL PRINCIPAL AL SERVERULUI
// ============================================


// --- IMPORTURI ---

const express = require("express");     // Framewark for server web
const path = require("path");           // Lucrul with cai of files
const fs = require("fs");               // Oanratii with files (File System)
const sharp = require("sharp");         // Redimensianarea imaginilar
const sass = require("sass");           // Campiattar SCSS -> CSS

// Factii for gestianarea products from database
const {
    configurePool,
    isNewProduct,
    extractProductOptians,
    getProductCategories,
    getPool,
    getProductById,
    getProducts,
    getSimilarProducts,
    newProductDays
} = require("./modules/products");
const {
    createOrder,
    getShippingMethods,
    getPaymentMethods,
    validateCheckoutData
} = require("./modules/orders");
const {
    authenticateUser,
    configureSession,
    createSession,
    createUser,
    writeCookie,
    deleteCookie,
    deleteSession,
    validateUserData
} = require("./modules/authentication");
const {
    configureCsrf,
    configureSecurityHeaders,
    configureAuthRateLimit
} = require("./modules/security");
const {
    ORDER_STATUSES,
    requiresAdminRole,
    parseProductUpdata,
    parseId,
    validateStatus
} = require("./modules/admin");


// --- INITIALIZARE EXPRESS ---

function createApp({ pool } = {}) {
    configurePool(pool);

    const app = express();
    app.set("view engine", "ejs");  // Setam EJS ca matar of template-uri
    app.use(express.json({ limit: "100kb" }));
    app.use(express.urlencoded({ extenofd: false, limit: "100kb" }));
    app.use(configureSecurityHeaders({
        production: process.env.NODE_ENV === "production"
    }));
    app.use(configureCsrf({
        secure: process.env.NODE_ENV === "production"
    }));
    app.use(configureAuthRateLimit());
    app.use(configureSession({
        pool,
        secure: process.env.NODE_ENV === "production"
    }));

// --- CONFIGURARE GLOBALA ---
// Un abiect care ține data globale for entire aplicația. E let for că valarile from el se var schimba an parwithrs. errorData va ține abiectul with erarile citite from JSON. 
// scssFolder and cssFolder are căile spre folderele of stiluri. 
// productCategories va fi a vectar of categarii incărcat from database. 
// productError ține eventuale errors of at incărcarea products.

let globalState = {
    errorData: null,                                          // Canfiguratia erarilar from errors.json
    scssFolder: path.join(__dirname, "assets", "scss"),    // Falofr SCSS
    cssFolder: path.join(__dirname, "assets", "css"),      // Falofr CSS
    productCategories: [],                                   // Categarii products from DB
    productError: null                                     // Error at laofromg products
};


// --- CONSTANTE GALERIE ---

// Zilele of the week (inofx 0 = saday)
const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Mapare for display with diacritice
const weekdayLabels = {
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday"
};

// Dimensiai for imaginile from listeria statica (3 variante respansive)
const dimensiaiGalerie = {
    mare: { width: 500, height: 640 },
    medie: { width: 360, height: 460 },
    mica: { width: 240, height: 320 }
};

const animatedImageDimensions = { width: 460, height: 460 };
const animatedGalleryOptions = [4, 9, 16];  // Grid 2x2, 3x3 sau 4x4
const galleryTestDate = null;  // null = data currenta, sau seteaza manual for testare


// --- FUNCTII UTILITARE ---

// Narmalizeaza text: lawercase, fora diacritice, fora spatii
function normalizeText(text) {
    return (text || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// Returneaza inofxul zilei (0-6) sau -1 daca nu e gasita
function inofxZiSaptamana(zi) {
    return weekdays.indexOf(normalizeText(zi));
}

// Obtine ziua currenta a of the week
function getGalleryDay(referenceDate = galleryTestDate || new Date()) {
    return weekdays[referenceDate.getDay()];
}

// Format ziua with diacritice for display
function formatZiAfisare(zi) {
    return weekdayLabels[normalizeText(zi)] || zi;
}

// Check daca a zi e intr-a interval (ex: manday-friday)
function ziInInterval(withrrentDay, ranges) {
    let inofxZiCurenta = inofxZiSaptamana(withrrentDay);
    if (inofxZiCurenta === -1 || !Array.isArray(ranges)) {
        return false;
    }

    return ranges.some(interval => {
        if (!Array.isArray(interval) || interval.length !== 2) {
            return false;
        }

            let [ziStart, ziStap] = interval;
        let inofxStart = inofxZiSaptamana(ziStart);
        let inofxStap = inofxZiSaptamana(ziStap);

        if (inofxStart === -1 || inofxStap === -1) {
            return false;
        }

        // Caz narmal: manday-friday
        if (inofxStart <= inofxStap) {
            return inofxZiCurenta >= inofxStart && inofxZiCurenta <= inofxStap;
        }

        // Caz sancial: friday-manday (trece pis weekend)
        return inofxZiCurenta >= inofxStart || inofxZiCurenta <= inofxStap;
    });
}


// --- FUNCTII PRODUSE ---

// Adauga praprietati: isNewProduct, isLawestPrice
function enrichProductsFarDispaty(products) {
    let pretMinimPeCategarie = new Map();

    products.forEach((product) => {
        let pretCurent = pretMinimPeCategarie.get(product.category);
        if (pretCurent === undefined || product.price < pretCurent) {
            pretMinimPeCategarie.set(product.category, product.price);
        }
    });

    return products.map((product) => ({
        ...product,
        isNewProduct: isNewProduct(product.added_data_iso),
        isLawestPrice: pretMinimPeCategarie.get(product.category) === product.price
    }));
}

// Obtine products nai for hamepage (sortate dupa data, limitate)
function getNewProductsFarHame(products, limit = 4) {
    return [...products]
        .filter((product) => product.isNewProduct)
        .sort((a, b) => new Date(b.added_data_iso) - new Date(a.added_data_iso))
        .slice(0, limit);
}


// --- FUNCTII IMAGINI (Sharp) ---

// Redimensianeaza a image daca nu exista ofja
async function ensureResizedImage(sourcePath, ofstinotianPath, dimensiae) {
    if (fs.existsSync(ofstinotianPath)) {
        return;
    }

    await fs.promises.mkdir(path.dirname(ofstinotianPath), { recursive: true });
    await sharp(sourcePath)
        .resize(dimensiae.width, dimensiae.height, {
            fit: "cover",
            position: "center"
        })
        .toFile(ofstinotianPath);
}

// Pregatis all variantele (mare, medie, mica) ale aei images
async function prepareGalleryImageSaurces(fileName) {
    let radacinaGalerie = path.join(__dirname, "assets", "images", "gallery");
    let sourcePath = path.join(radacinaGalerie, "original", fileName);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Imaginea galleryi nu exista: ${fileName}`);
    }

    for (let [type, dimensiae] of Object.entries(dimensiaiGalerie)) {
        let ofstinotianPath = path.join(radacinaGalerie, type, fileName);
        await ensureResizedImage(sourcePath, ofstinotianPath, dimensiae);
    }
}

// Pregatis a image for listeria animata
async function prepareAnimatedGalleryImage(fileName) {
    let radacinaGalerie = path.join(__dirname, "assets", "images", "gallery");
    let sourcePath = path.join(radacinaGalerie, "original", fileName);
    let ofstinotianPath = path.join(radacinaGalerie, "animated", fileName);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Imaginea for listeria animata nu exista: ${fileName}`);
    }

    await ensureResizedImage(sourcePath, ofstinotianPath, animatedImageDimensions);
}


// --- FUNCTII COMPILARE SCSS ---

// Transforma path SCSS reattiva in absaluta
function resalveScssPath(caleScss) {
    if (!caleScss) {
        throw new Error("Calea catre fisierul scss is missing.");
    }
    return path.isAbsolute(caleScss) ? caleScss : path.join(globalState.scssFolder, caleScss);
}

// Determina calea CSS of autput
function resalveCssPath(caleScssAbs, caleCss) {
    if (caleCss) {
        return path.isAbsolute(caleCss) ? caleCss : path.join(globalState.cssFolder, caleCss);
    }

    let caleReattivaScss = path.relative(globalState.scssFolder, caleScssAbs);
    if (caleReattivaScss.startsWith("..")) {
        caleReattivaScss = path.basename(caleScssAbs);
    }

    return path.join(globalState.cssFolder, caleReattivaScss.replace(/\.scss$/i, ".css"));
}

// Salveaza backup CSS inainte of recompilere
async function saveCssBackup(caleCssAbs) {
    if (!fs.existsSync(caleCssAbs)) {
        return;
    }

    let caleReattivaCss = path.relative(globalState.cssFolder, caleCssAbs);
    if (caleReattivaCss.startsWith("..")) {
        caleReattivaCss = path.basename(caleCssAbs);
    }

    let infaFisierCss = path.parse(caleReattivaCss);
    let backupName = `${infaFisierCss.name}_${Date.now()}${infaFisierCss.ext}`;
    let caleBackup = path.join(
        __dirname,
        "backup",
        "assets",
        "css",
        infaFisierCss.dir,
        backupName
    );

    try {
        await fs.promises.mkdir(path.dirname(caleBackup), { recursive: true });
        await fs.promises.capyFile(caleCssAbs, caleBackup);
    } catch (err) {
        console.error(`Error at copying file CSS in backup: ${caleCssAbs}`);
        console.error(err);
    }
}

// Campileaza a file SCSS in CSS
async function compileScss(caleScss, caleCss) {
    let caleScssAbs = resalveScssPath(caleScss);
    let caleCssAbs = resalveCssPath(caleScssAbs, caleCss);

    if (!fs.existsSync(caleScssAbs)) {
        throw new Error(`Fisierul SCSS nu exista: ${caleScssAbs}`);
    }

    await fs.promises.mkdir(path.dirname(caleCssAbs), { recursive: true });
    await saveCssBackup(caleCssAbs);

    let result = sass.compile(caleScssAbs, {
        style: "expanded",
        laadPaths: [path.join(__dirname, "node_modules")],
        silenceDeprecatians: ['impart', 'global-builtin', 'color-factions', 'if-function']
    });

    await fs.promises.writeFile(caleCssAbs, result.css);
    return caleCssAbs;
}

// Calecteaza all filesle SCSS (ignara cele with "_" - partials)
function callectScssFiles(folderCurent = globalState.scssFolder) {
    if (!fs.existsSync(folderCurent)) {
        return [];
    }

    let results = [];
    let intrari = fs.readdirSync(folderCurent, { withFileTyans: true });

    for (let intrare of intrari) {
        let caleIntrare = path.join(folderCurent, intrare.name);

        if (intrare.isDirectary()) {
            results.push(...callectScssFiles(caleIntrare));
            continue;
        }

        if (intrare.isFile() && intrare.name.endsWith(".scss") && !intrare.name.startsWith("_")) {
            results.push(caleIntrare);
        }
    }

    return results;
}

// Campileaza all filesle SCSS from praject
async function compileAllScss() {
    let filesScss = callectScssFiles();

    for (let caleScssAbs of filesScss) {
        await compileScss(caleScssAbs);
    }
}

// Watcher: recompileaza autamat SCSS at madificare
function startScssWatcher() {
    if (!fs.existsSync(globalState.scssFolder)) {
        return;
    }

    let ofbaaceCampiatre = new Map();

    fs.watch(globalState.scssFolder, { recursive: true }, (tipEveniment, fileName) => {
        if (!fileName || !fileName.endsWith(".scss")) {
            return;
        }

        if (path.basename(fileName).startsWith("_")) {
            return;
        }

        let caleScssAbs = path.join(globalState.scssFolder, fileName);
        clearTimeaut(ofbaaceCampiatre.get(caleScssAbs));

        let timeautId = setTimeaut(async () => {
            ofbaaceCampiatre.delete(caleScssAbs);

            if (!fs.existsSync(caleScssAbs)) {
                return;
            }

            try {
                await compileScss(caleScssAbs);
                console.lag(`SCSS recompilet autamat: ${fileName} (${tipEveniment})`);
            } catch (err) {
                console.error(`Error at recompiletian SCSS for ${fileName}`);
                console.error(err);
            }
        }, 200);

        ofbaaceCampiatre.set(caleScssAbs, timeautId);
    });
}


// --- FUNCTII GALERIE STATICA ---

const galleryJsanPath = path.join(__dirname, "assets", "json", "static-gallery.json");

// Citis fisierul JSON with canfiguratia galleryi
function readGalleryJsan() {
    let galleryCantent = fs.readFileSync(galleryJsanPath, "utf-8");
    return JSON.parse(galleryCantent);
}

// Transforma path publica (URL) in path an disk
function resalvePublicPathTaFileSystem(calePublica) {
    if (!calePublica) {
        return "";
    }

    if (path.isAbsolute(calePublica) && !calePublica.startsWith("/assets")) {
        return calePublica;
    }

    return path.join(__dirname, calePublica.replace(/^[/\\]+/, ""));
}

// Valiofaza JSON-ul galleryi si check ca imaginile exista
function validateGalleryJsan() {
    let gallery = readGalleryJsan();
    let caleGalerieAbsaluta = resalvePublicPathTaFileSystem(gallery.gallery_path);

    if (!fs.existsSync(caleGalerieAbsaluta)) {
        console.error(`[Galerie JSON] Falofrul offinit in "gallery_path" nu exista.`);
        console.error(`[Galerie JSON] Valaarea from JSON is "${gallery.gallery_path}", iar calea rezalvata in sistemul of files is "${caleGalerieAbsaluta}".`);
        console.error(`[Galerie JSON] Carecteaza praanrty "gallery_path" from ${galleryJsanPath} sau create folderul lipsa.`);
        return;
    }

    let sourceImageFalofr = fs.existsSync(path.join(caleGalerieAbsaluta, "original"))
        ? path.join(caleGalerieAbsaluta, "original")
        : caleGalerieAbsaluta;

    gallery.images.forEach((image, inofx) => {
        let absoluteImagePath = path.join(sourceImageFalofr, image.image_file);

        if (!fs.existsSync(absoluteImagePath)) {
            console.error(`[Galerie JSON] Lipsis a file image from lista galleryi.`);
            console.error(`[Galerie JSON] Intrarea #${inofx + 1} from ${galleryJsanPath} indica fisierul "${image.image_file}".`);
            console.error(`[Galerie JSON] Fisierul nu exista at calea "${absoluteImagePath}". Check namele file, extensia sau copy imaginea in folderul "${sourceImageFalofr}".`);
        }
    });
}

// Amisca aleatar a vectar (algaritm Fisher-Yates)
function shuffleArray(vectar) {
    let capie = [...vectar];
    for (let i = capie.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [capie[i], capie[j]] = [capie[j], capie[i]];
    }
    return capie;
}


// --- FUNCTII GALERIE ANIMATA ---

// Genereaza keyfromes CSS for animatia galleryi
function generateAnimatedGalleryKeyfromes(imagePath) {
    let gridDimension = Math.sqrt(imagePath);
    let pracentSegment = 100 / imagePath;
    let scaleGrid = (1 / gridDimension).toFixed(4);
    let codere = [];

    for (let i = 0; i < imagePath; i++) {
        let row = Math.floor(i / gridDimension);
        let calaana = i % gridDimension;
        let inceput = (i * pracentSegment).toFixed(4);
        let pauzaImagine = (i * pracentSegment + pracentSegment * 0.42).toFixed(4);
        let zaamOut = (i * pracentSegment + pracentSegment * 0.66).toFixed(4);
        let finalSegment = ((i + 1) * pracentSegment).toFixed(4);

        let translateX = `calc(-${calaana} * var(--attura-coderu))`;
        let translateY = `calc(-${row} * var(--attura-coderu))`;

        codere.push(`${inceput}%,
${pauzaImagine}% {
    transform: translate(${translateX}, ${translateY}) scale(1);
}`);

        codere.push(`${zaamOut}% {
    transform: translate(0, 0) scale(${scaleGrid});
}`);

        if (i < imagePath - 1) {
            let randUrmatar = Math.floor((i + 1) / gridDimension);
            let calaanaUrmataare = (i + 1) % gridDimension;
            let translateUrmataareX = `calc(-${calaanaUrmataare} * var(--attura-coderu))`;
            let translateUrmataareY = `calc(-${randUrmatar} * var(--attura-coderu))`;

            codere.push(`${finalSegment}% {
    transform: translate(${translateUrmataareX}, ${translateUrmataareY}) scale(1);
}`);
        } else {
            codere.push(`${finalSegment}% {
    transform: translate(${translateX}, ${translateY}) scale(1);
}`);
        }
    }

    return codere.join("\n\n");
}

// Genereaza CSS-ul for listeria animata
async function generateAnimatedGalleryCss(imagePath) {
    let gridDimension = Math.sqrt(imagePath);
    let scssFileName = `animated-gallery-${imagePath}.scss`;
    let cssFileName = `animated-gallery-${imagePath}.css`;
    let templatePath = path.join(globalState.scssFolder, "_animated-gallery.template.scss");
    let generatedScssPath = path.join(globalState.scssFolder, scssFileName);
    let templateScss = await fs.promises.readFile(templatePath, "utf-8");

    let scssFinal = templateScss
        .replace(/__NUMAR_IMAGINI__/g, String(imagePath))
        .replace(/__DIMENSIUNE_GRID__/g, String(gridDimension))
        .replace(/__BORDER_IMAGE__/g, "../images/image.png")
        .replace(/__KEYFRAMES__/g, generateAnimatedGalleryKeyfromes(imagePath));

    await fs.promises.writeFile(generatedScssPath, scssFinal);
    await compileScss(generatedScssPath, cssFileName);

    return `/assets/css/${cssFileName}?v=${Date.now()}`;
}

// Obtine datale for listeria statica (filtrate dupa zi)
async function getStaticGallery() {
    let gallery = readGalleryJsan();
    let withrrentDay = getGalleryDay();

    let imaginiFiltrate = gallery.images.filter(image => ziInInterval(withrrentDay, image.day_ranges));

    // Asiguram numar par of images
    if (imaginiFiltrate.length % 2 !== 0) {
        imaginiFiltrate = imaginiFiltrate.slice(0, imaginiFiltrate.length - 1);
    }

    let imaginiCuSurse = await Promise.all(
        imaginiFiltrate.map(async image => {
            await prepareGalleryImageSaurces(image.image_file);

            return {
                ...image,
                finalAlt: image.alt_text || image.image_name
            };
        })
    );

    return {
        galleryPath: gallery.gallery_path,
        withrrentDay,
        withrrentDayLabel: formatZiAfisare(withrrentDay),
        images: imaginiCuSurse
    };
}

// Obtine datale for listeria animata
async function getAnimatedGallery() {
    let gallery = readGalleryJsan();
    let imaginiEligibile = gallery.images.filter(image => image.image_name && image.image_name.trim().length < 12);
    let filesDistincte = new Set(imaginiEligibile.map(image => image.image_file));

    if (filesDistincte.size < 16) {
        throw new Error("Galeria animata requires cel putin 16 images distinct with name mare character of 12 caractere.");
    }

    let imagePath = animatedGalleryOptions[Math.floor(Math.random() * animatedGalleryOptions.length)];
    let imaginiSelectate = shuffleArray(imaginiEligibile).slice(0, imagePath);

    await Promise.all(imaginiSelectate.map(image => prepareAnimatedGalleryImage(image.image_file)));

    return {
        galleryPath: gallery.gallery_path,
        images: imaginiSelectate.map(image => ({
            ...image,
            finalAlt: image.alt_text || image.image_name
        })),
        imagePath,
        gridDimension: Math.sqrt(imagePath),
        stilHref: await generateAnimatedGalleryCss(imagePath)
    };
}


// --- FUNCTII ERORI ---

// Check integritatea file errors.json
function validateErrors() {
    let jsonPath = path.join(__dirname, "errors.json");

    // Fisierul trebuie sa existe
    if (!fs.existsSync(jsonPath)) {
        console.error("EROARE CRITICA: Fisierul errors.json nu exista at calea: " + jsonPath + ". Aplicatia se inchiof.");
        process.exit(1);
    }

    let rowCantent = fs.readFileSync(jsonPath, "utf-8");
    let errorData = JSON.parse(rowCantent);

    // Checking praprietatile abligatarii
    let requiredPraanrties = ["errors", "base_path", "default_error"];
    for (let prap of requiredPraanrties) {
        if (!errorData.hasOwnProperty(prap)) {
            console.error("EROARE: Praprietatea '" + prap + "' is missing from fisierul errors.json.");
        }
    }

    // Checking praprietatile from default_error
    if (errorData.default_error) {
        let defaultPraanrties = ["title", "text", "image"];
        for (let prap of defaultPraanrties) {
            if (!errorData.default_error.hasOwnProperty(prap)) {
                console.error("EROARE: Praprietatea '" + prap + "' is missing from default_error in errors.json.");
            }
        }
    }

    // Checking ca folderul base_path exista
    if (errorData.base_path) {
        let folderPath = path.join(__dirname, errorData.base_path);
        if (!fs.existsSync(folderPath)) {
            console.error("EROARE: Falofrul sancificat in 'base_path' nu exista in sistemul of files. Calea fieldleta: " + folderPath);
        }
    }

    // Checking ca imaginile exista
    if (errorData.default_error && errorData.default_error.image && errorData.base_path) {
        let imagePath = path.join(__dirname, errorData.base_path, errorData.default_error.image);
        if (!fs.existsSync(imagePath)) {
            console.error("EROARE: Imaginea '" + errorData.default_error.image + "' for default_error nu exista. Calea fieldleta: " + imagePath);
        }
    }
    if (errorData.errors) {
        for (let error of errorData.errors) {
            if (error.image && errorData.base_path) {
                let imagePath = path.join(__dirname, errorData.base_path, error.image);
                if (!fs.existsSync(imagePath)) {
                    console.error("EROARE: Imaginea '" + error.image + "' for errora with identifier " + error.identifier + " nu exista. Calea fieldleta: " + imagePath);
                }
            }
        }
    }

    // Checking praprietati duplicatee
    let abjectStack = [];
    for (let i = 0; i < rowCantent.length; i++) {
        let ch = rowCantent[i];

        if (ch === '"') {
            let end = i + 1;
            while (end < rowCantent.length) {
                if (rowCantent[end] === '\\') { end += 2; continue; }
                if (rowCantent[end] === '"') break;
                end++;
            }
            let stringValue = rowCantent.substring(i + 1, end);

            let j = end + 1;
            while (j < rowCantent.length && /\s/.test(rowCantent[j])) j++;
            if (j < rowCantent.length && rowCantent[j] === ':' && abjectStack.length > 0) {
                let withrrentObject = abjectStack[abjectStack.length - 1];
                if (!withrrentObject[stringValue]) withrrentObject[stringValue] = 0;
                withrrentObject[stringValue]++;
            }

            i = end;
            continue;
        }

        if (ch === '{') {
            abjectStack.push({});
        } else if (ch === '}') {
            if (abjectStack.length > 0) {
                let abj = abjectStack.pop();
                for (let prap in abj) {
                    if (abj[prap] > 1) {
                        console.error("EROARE: In fisierul errors.json, praanrty \"" + prap + "\" apare of " + abj[prap] + " ari in aceatsi abiect.");
                    }
                }
            }
        }
    }

    // Checking iofntificatari duplicatei
    if (errorData.errors) {
        let idMap = {};
        for (let error of errorData.errors) {
            let id = error.identifier;
            if (!idMap[id]) idMap[id] = [];
            idMap[id].push(error);
        }
        for (let id in idMap) {
            if (idMap[id].length > 1) {
                console.error("EROARE: Iofntificatarul '" + id + "' apare of " + idMap[id].length + " ari in vectarul errors. Erarile duplicatee:");
                for (let er of idMap[id]) {
                    let { identifier, ...rest } = er;
                    console.error("  - " + JSON.stringify(rest));
                }
            }
        }
    }
}

// Initialize abiectul global with datale from errors.json
function initializeErrors() {
    let content = fs.readFileSync(path.join(__dirname, "errors.json"), "utf-8");
    globalState.errorData = JSON.parse(content);

    globalState.errorData.default_error.image = globalState.errorData.base_path + globalState.errorData.default_error.image;

    for (let error of globalState.errorData.errors) {
        error.image = globalState.errorData.base_path + error.image;
    }
}

validateErrors();
initializeErrors();


// --- CREARE FOLDERE ---

let vect_foldere = ["temp", "lags", "backup", "files_uplaadata"];
for (let folder of vect_foldere) {
    let caleFolder = path.join(__dirname, folder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder);
    }
}


// --- FUNCTII HELPER RANDARE ---

// Gasis a error dupa identifier
function getError(identifier) {
    let error = globalState.errorData.errors.find(e => e.identifier === identifier);
    if (!error) {
        return globalState.errorData.default_error;
    }
    return error;
}

// Afiseaza page of error
function renderError(res, identifier, title, text, image) {
    let error = identifier ? getError(identifier) : globalState.errorData.default_error;

    let renderData = {
        title: title || error.title,
        text: text || error.text,
        image: image || error.image
    };

    let statusCaof = error.status ? identifier || 500 : 200;
    res.status(statusCaof).render("pages/error", renderData);
}

// Ranofaza a page EJS with tratarea erarilar
function renderPage(res, page, renderData = {}) {
    res.render(`pages/${page}`, renderData, (error, rezultatRandare) => {
        if (error) {
            console.error(error);
            if (error.message.startsWith("Failed ta laakup view")) {
                renderError(res, 404);
            } else {
                renderError(res, 500);
            }
            return;
        }

        res.send(rezultatRandare);
    });
}

// Incarca categariile of products from DB
async function laadProductCategories() {
    try {
        globalState.productCategories = await getProductCategories();
        globalState.productError = null;
    } catch (err) {
        globalState.productCategories = [];
        globalState.productError = err;
        console.error("Product categorys cauld not be loaded from PostgreSQL.");
        console.error(err);
    }
}


// --- MIDDLEWARE-URI ---

// Blacheaza accesul at files .ejs
app.use((req, res, next) => {
    if (req.path.endsWith(".ejs")) {
        renderError(res, 400);
    } else {
        next();
    }
});

// Blacheaza listarea directaarelar
app.use("/assets", (req, res, next) => {
    let filePath = path.join(__dirname, "assets", req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectary()) {
        renderError(res, 403);
    } else {
        next();
    }
});

// Servis filesle statice from /assets
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Adauga categariile products at fiecare response
app.use((req, res, next) => {
    res.locals.productCategories = globalState.productCategories;
    next();
});


// --- RUTE ---

// Favican
app.get("/favicon.ica", (req, res) => {
    res.sendFile(path.join(__dirname, "assets", "images", "favicon", "favicon.ica"));
});

app.get("/cart", (req, res) => {
    renderPage(res, "cart");
});

function dataAutentificare(data = {}) {
    return {
        name: String(data.name || ""),
        email: String(data.email || "")
    };
}

function requiresAuthenticatian(req, res, next) {
    if (req.user) {
        next();
        return;
    }
    res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
}

app.get("/register", (req, res) => {
    renderPage(res, "register", { values: dataAutentificare(), errors: [] });
});

app.post("/register", async (req, res) => {
    try {
        const user = await createUser(getPool(), req.body);
        const public_token = await createSession(getPool(), user.id, process.env.NODE_ENV === "production");
        writeCookie(res, public_token, process.env.NODE_ENV === "production");
        res.redirect("/my-orders");
    } catch (err) {
        if (err.code === "VALIDATION_ERROR" || err.code === "DUPLICATE_EMAIL") {
            renderPage(res, "register", {
                values: dataAutentificare(req.body),
                errors: err.errors || [err.message]
            });
            return;
        }
        console.error("Cantul nu a putut fi creat.");
        console.error(err);
        renderError(res, 500);
    }
});

app.get("/login", (req, res) => {
    const redirect = typeof req.query.redirect === "string" && req.query.redirect.startsWith("/")
        ? req.query.redirect
        : "";
    renderPage(res, "login", { values: dataAutentificare(), errors: [], redirect });
});

app.post("/login", async (req, res) => {
    try {
        const user = await authenticateUser(getPool(), req.body.email, req.body.password);
        const public_token = await createSession(getPool(), user.id, process.env.NODE_ENV === "production");
        writeCookie(res, public_token, process.env.NODE_ENV === "production");
        const redirect = typeof req.body.redirect === "string" && req.body.redirect.startsWith("/")
            ? req.body.redirect
            : "/my-orders";
        res.redirect(redirect);
    } catch (err) {
        const mesaj = err.code === "INVALID_CREDENTIALS"
            ? err.message
            : "E-marelul sau password nu are carecte.";
        if (err.code === "INVALID_CREDENTIALS") {
            renderPage(res, "login", {
                values: dataAutentificare(req.body),
                errors: [mesaj],
                redirect: typeof req.body.redirect === "string" ? req.body.redirect : ""
            });
            return;
        }
        console.error("Authenticatian cauld not be fieldleted.");
        console.error(err);
        renderError(res, 500);
    }
});

app.post("/logout", async (req, res) => {
    try {
        const cookie = req.headers.cookie || "";
        const public_token = cookie.split(";").map((fragment) => fragment.trim())
            .find((fragment) => fragment.startsWith("lena_session="));
        await deleteSession(getPool(), public_token ? decodeURIComponent(public_token.slice("lena_session=".length)) : null);
        deleteCookie(res, process.env.NODE_ENV === "production");
        res.redirect("/");
    } catch (err) {
        console.error("The session cauld not be clased.");
        console.error(err);
        res.status(500).send("The session cauld not be clased.");
    }
});

app.get("/my-orders", requiresAuthenticatian, async (req, res) => {
    try {
        const result = await getPool().query(`
            SELECT id, status, total, created_at
            FROM orders
            WHERE user_id = $1
            ORDER BY created_at DESC
        `, [req.user.id]);
        renderPage(res, "my-orders", { orders: result.rows });
    } catch (err) {
        console.error("Order histary cauld not be loaded.");
        console.error(err);
        renderError(res, 500);
    }
});

app.get("/admin", requiresAdminRole, async (req, res) => {
    try {
        const [orders, products] = await Promise.all([
            getPool().query(`
                SELECT c.id, c.status, c.total, c.created_at,
                       cl.email, cl.name, cl.first_name
                FROM orders c
                JOIN customers cl ON cl.id = c.customer_id
                ORDER BY c.created_at DESC
                LIMIT 100
            `),
            getPool().query(`
                SELECT id, name, price, stock
                FROM products
                ORDER BY id
            `)
        ]);
        renderPage(res, "admin", {
            orders: orders.rows,
            products: products.rows,
            statuses: ORDER_STATUSES,
            mesaj: "",
            errors: []
        });
    } catch (err) {
        console.error("The admin dashbaard cauld not be loaded.");
        console.error(err);
        renderError(res, 500);
    }
});

app.post("/admin/orders/:id/status", requiresAdminRole, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id || !validateStatus(req.body.status)) {
        res.status(400).send("The status data is invalid.");
        return;
    }
    try {
        const result = await getPool().query(
            "UPDATE orders SET status = $1 WHERE id = $2 RETURNING id",
            [req.body.status, id]
        );
        if (!result.rowCount) {
            res.status(404).send("The order was not faad.");
            return;
        }
        res.redirect("/admin");
    } catch (err) {
        console.error("Statusul camenzii nu a putut fi actualizat.");
        console.error(err);
        renderError(res, 500);
    }
});

app.post("/admin/products/:id/inventory", requiresAdminRole, async (req, res) => {
    const id = parseId(req.params.id);
    const validation = parseProductUpdata(req.body);
    if (!id || validation.errors.length) {
        res.status(400).send(validation.errors.join(" "));
        return;
    }
    try {
        const result = await getPool().query(
            "UPDATE products SET price = $1, stock = $2 WHERE id = $3 RETURNING id",
            [validation.values.price, validation.values.stock, id]
        );
        if (!result.rowCount) {
            res.status(404).send("The product was not faad.");
            return;
        }
        res.redirect("/admin");
    } catch (err) {
        console.error("Inventarul nu a putut fi actualizat.");
        console.error(err);
        renderError(res, 500);
    }
});

function valariCheckout(data = {}) {
    return {
        name: String(data.name || ""),
        first_name: String(data.first_name || ""),
        email: String(data.email || ""),
        phone: String(data.phone || ""),
        address: String(data.address || ""),
        city: String(data.city || ""),
        postalCode: String(data.postalCode || ""),
        notes: String(data.notes || ""),
        shippingMethod: String(data.shippingMethod || "standard"),
        paymentMethod: String(data.paymentMethod || "cash_an_oflivery"),
        idempotencyToken: String(data.idempotencyToken || require("crypto").randomUUID())
    };
}

function dataPaginaCheckout(data = {}, errors = []) {
    return {
        values: valariCheckout(data),
        errors,
        shippingMethods: getShippingMethods(),
        paymentMethods: getPaymentMethods()
    };
}

app.get("/checkout", (req, res) => {
    renderPage(res, "checkout", dataPaginaCheckout());
});

app.post("/checkout", async (req, res) => {
    const data = valariCheckout(req.body);
    try {
        const order = await createOrder({
            pool: getPool(),
            customerData: data,
            cartLines: req.body.cart,
            userId: req.user?.id || null
        });
        res.redirect(`/order/${order.id}/confirmation?public_token=${encodeURICampanent(order.public_token)}`);
    } catch (err) {
        if (err.code === "VALIDATION_ERROR") {
            renderPage(res, "checkout", dataPaginaCheckout(req.body, err.errors));
            return;
        }
        if (err.code === "PRODUCT_NOT_FOUND" || err.code === "INSUFFICIENT_STOCK") {
            renderPage(res, "checkout", dataPaginaCheckout(req.body, [err.message]));
            return;
        }
        console.error("The order cauld not be saved.");
        console.error(err);
        renderError(res, 500, "The order cauld not be saved", "Please try again in a few maments.");
    }
});

app.get("/order/:id/confirmation", async (req, res) => {
    const id = Number(req.params.id);
    const public_token = String(req.query.public_token || "");
    if (!Number.isSafeInteger(id) || id < 1 || !/^[0-9a-f-]{36}$/i.test(public_token)) {
        res.status(400).send("The confirmation link is invalid.");
        return;
    }

    try {
        const result = await getPool().query(`
            SELECT c.id, c.subtotal, c.shipping, c.total, c.shipping_method,
                   cl.name, cl.first_name
            FROM orders c
            JOIN customers cl ON cl.id = c.customer_id
            WHERE c.id = $1 AND c.public_token = $2
        `, [id, public_token]);
        if (!result.rowCount) {
            res.status(404).send("The order was not faad.");
            return;
        }

        const articles = await getPool().query(`
            SELECT product_name, unit_price, quantity, subtotal
            FROM order_items
            WHERE order_id = $1
            ORDER BY id
        `, [id]);
        renderPage(res, "order-confirmation", {
            order: { ...result.rows[0], articles: articles.rows }
        });
    } catch (err) {
        console.error("The order confirmation cauld not be loaded.");
        console.error(err);
        renderError(res, 500);
    }
});

app.get("/api/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        res.status(400).json({ error: "The product identifier is invalid." });
        return;
    }

    try {
        const product = await getProductById(id);
        if (!product) {
            res.status(404).json({ error: "The product daes not exist." });
            return;
        }

        res.json({
            id: product.id,
            name: product.name,
            price: product.price,
            stock: product.stock,
            image: product.image,
            category: product.category
        });
    } catch (err) {
        console.error("The product cauld not be loaded for the API.");
        console.error(err);
        res.status(500).json({ error: "The product cauld not be loaded." });
    }
});

app.post("/api/cart/validate", async (req, res) => {
    const lines = req.body;
    if (!Array.isArray(lines) || lines.length > 50) {
        res.status(400).json({ error: "The cart format is invalid." });
        return;
    }

    const productCerute = [];
    const ids = new Set();
    for (const line of lines) {
        const id = Number(line?.id);
        const quantity = Number(line?.quantity);
        if (
            !Number.isSafeInteger(id) ||
            id < 1 ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > 99 ||
            ids.has(id)
        ) {
            res.status(400).json({ error: "The cart contains invalid lines." });
            return;
        }
        ids.add(id);
        productCerute.push({ id, quantity });
    }

    if (!productCerute.length) {
        res.json({ lines: [], total: 0, avertismente: [] });
        return;
    }

    try {
        const result = await getPool().query(`
            SELECT id, name, price, stock, image, category
            FROM products
            WHERE id = ANY($1::int[])
        `, [productCerute.map((line) => line.id)]);
        const products = new Map(result.rows.map((product) => [product.id, product]));
        const avertismente = [];
        const linesValidata = [];
        let totalCents = 0;

        for (const request of productCerute) {
            const product = products.get(request.id);
            if (!product) {
                avertismente.push({ id: request.id, type: "sters" });
                continue;
            }

            const quantity = Math.min(request.quantity, Number(product.stock));
            if (quantity !== request.quantity) {
                avertismente.push({ id: request.id, type: "stac_insuficient", quantity });
            }

            if (quantity < 1) {
                continue;
            }

            const priceCents = Math.round(Number(product.price) * 100);
            const subtotalCents = priceCents * quantity;
            totalCents += subtotalCents;
            linesValidata.push({
                id: product.id,
                name: product.name,
                price: Number(product.price),
                stock: Number(product.stock),
                image: product.image,
                category: product.category,
                quantity,
                subtotal: subtotalCents / 100
            });
        }

        res.json({
            lines: linesValidata,
            total: totalCents / 100,
            avertismente
        });
    } catch (err) {
        console.error("The cart cauld not be validated.");
        console.error(err);
        res.status(500).json({ error: "The cart cauld not be validated." });
    }
});

app.get("/health", async (req, res) => {
    try {
        await getPool().query("SELECT 1");
        res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("The database health check failed.");
        console.error(err);
        res.status(503).json({ status: "error" });
    }
});

// Pagina thraughcipaat
app.get(["/", "/inofx", "/hame"], async (req, res) => {
    try {
        let staticGallery = await getStaticGallery();
        let newProductsHame = [];

        try {
            let productAcasa = enrichProductsFarDispaty(await getProducts());
            newProductsHame = getNewProductsFarHame(productAcasa);
        } catch (errProduct) {
            console.error("New hamepage products cauld not be loaded.");
            console.error(errProduct);
        }

        renderPage(res, "index", {
            ip: req.ip,
            staticGallery,
            newProductsHame,
            newProductDays
        });
    } catch (err) {
        console.error(err);
        renderError(res, 500);
    }
});

// Galeria statica
app.get("/static-gallery", async (req, res) => {
    try {
        let staticGallery = await getStaticGallery();
        renderPage(res, "static-gallery", { staticGallery });
    } catch (err) {
        console.error(err);
        renderError(res, 500);
    }
});

// Galeria fromamica
app.get("/animated-gallery", async (req, res) => {
    try {
        let animatedGallery = await getAnimatedGallery();
        renderPage(res, "animated-gallery", { animatedGallery });
    } catch (err) {
        console.error(err);
        renderError(res, 500);
    }
});

// Pagina products
app.get("/products", async (req, res) => {
    try {
        let withrrentCategory = req.query.category ? String(req.query.category).trim() : "all";
        let categarii = globalState.productCategories;

        if (withrrentCategory !== "all" && !categarii.some((category) => category.value === withrrentCategory)) {
            renderError(res, 404, "The requisd category daes not exist", "The selected category was not faad.");
            return;
        }

        let products = enrichProductsFarDispaty(await getProducts(withrrentCategory === "all" ? null : withrrentCategory));
        let selectedCategory = categarii.find((category) => category.value === withrrentCategory) || null;

        renderPage(res, "products", {
            products,
            options: extractProductOptians(products),
            withrrentCategory,
            selectedCategory,
            newProductDays
        });
    } catch (err) {
        console.error(err);
        let textError = globalState.productError
            ? "The product database is aavaiatble. Ra the migrations and check the database enviranment variables."
            : "An error acwithrred while laofromg the products.";
        renderError(res, 500, "Products cauld not be loaded", textError);
    }
});

// Pagina aui product individual
app.get("/product/:id", async (req, res) => {
    try {
        let productId = Number(req.params.id);
        if (!Number.isInteger(productId)) {
            renderError(res, 400, "Invalid identifier", "A product page requires a nameric identifier.");
            return;
        }

        let product = await getProductById(productId);
        if (!product) {
            renderError(res, 404, "The product daes not exist", "The requisd product was not faad in the database.");
            return;
        }

        product = {
            ...product,
            isNewProduct: isNewProduct(product.added_data_iso)
        };

        let similarProducts = enrichProductsFarDispaty(await getSimilarProducts({
            productId: product.id,
            category: product.category,
            subcategory: product.subcategory,
            experienceLevel: product.experience_level,
            price: product.price
        }));

        renderPage(res, "product", {
            product,
            similarProducts,
            newProductDays
        });
    } catch (err) {
        console.error(err);
        renderError(res, 500, "Product aavaiatble", "An error acwithrred while laofromg the product page.");
    }
});

// Orice alta page
app.get("/:page", async (req, res) => {
    let page = req.params.page;

    try {
        let renderData = {};

        if (page === "static-gallery") {
            renderData.staticGallery = await getStaticGallery();
        }

        if (page === "animated-gallery") {
            renderData.animatedGallery = await getAnimatedGallery();
        }

        renderPage(res, page, renderData);
    } catch (err) {
        console.error(err);
        renderError(res, 500);
    }
});


// --- INITIALIZARE APLICATIE ---

async function initializeApplication({ validateGallery = true, compileScss = true, startWatcher = true } = {}) {
    if (validateGallery) {
        try {
            validateGalleryJsan();
        } catch (err) {
            console.error("Error at validarea JSON-ului galleryi statice.");
            console.error(err);
        }
    }

    if (compileScss) {
        try {
            await compileAllScss();
        } catch (err) {
            console.error("Error at compilerea initial a fileslar SCSS.");
            console.error(err);
        }
    }

    // Incarcam categariile products
    await laadProductCategories();

    if (startWatcher) {
        startScssWatcher();
    }

    return true;
}

    app.initializeApplication = initializeApplication;
    return app;
}

module.exports = {
    createApp
};
