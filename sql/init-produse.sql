-- Bootstrap PostgreSQL pentru Lena's Ballet Boutique
-- Rulează scriptul ca utilizator cu drepturi de administrare, de exemplu: psql -U postgres -f sql/init-produse.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lena_app') THEN
        CREATE ROLE lena_app LOGIN PASSWORD 'lena_app_2026';
    END IF;
END
$$;

SELECT 'CREATE DATABASE lena_ballet_boutique OWNER lena_app'
WHERE NOT EXISTS (
    SELECT 1 FROM pg_database WHERE datname = 'lena_ballet_boutique'
)\gexec

\connect lena_ballet_boutique

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categorie_produs') THEN
        CREATE TYPE categorie_produs AS ENUM (
            'incaltaminte',
            'imbracaminte',
            'accesorii',
            'antrenament',
            'spectacol'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS produse (
    id INTEGER PRIMARY KEY,
    nume VARCHAR(120) NOT NULL,
    descriere TEXT NOT NULL,
    imagine VARCHAR(255) NOT NULL,
    categorie categorie_produs NOT NULL,
    subcategorie VARCHAR(40) NOT NULL,
    pret NUMERIC(8, 2) NOT NULL CHECK (pret > 0),
    nivel_experienta INTEGER NOT NULL CHECK (nivel_experienta BETWEEN 1 AND 10),
    data_adaugare DATE NOT NULL,
    culoare VARCHAR(40) NOT NULL,
    materiale TEXT NOT NULL,
    personalizabil BOOLEAN NOT NULL DEFAULT FALSE,
    brand VARCHAR(80) NOT NULL,
    stoc INTEGER NOT NULL DEFAULT 0 CHECK (stoc >= 0),
    recomandare_lena TEXT NOT NULL,
    detalii TEXT NOT NULL,
    intretinere TEXT NOT NULL
);

ALTER TABLE produse OWNER TO lena_app;
GRANT CONNECT ON DATABASE lena_ballet_boutique TO lena_app;
GRANT USAGE ON SCHEMA public TO lena_app;
GRANT USAGE ON TYPE categorie_produs TO lena_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE produse TO lena_app;

TRUNCATE TABLE produse RESTART IDENTITY;

INSERT INTO produse (
    id, nume, descriere, imagine, categorie, subcategorie, pret, nivel_experienta,
    data_adaugare, culoare, materiale, personalizabil, brand, stoc,
    recomandare_lena, detalii, intretinere
) VALUES
(1, 'Poante Aurora Stage', 'Poante pentru scenă, cu profil stabil și susținere fermă pentru variații clasice și repetiții finale.', '/resurse/imagini/galerie/original/satin.jpeg', 'incaltaminte', 'scena', 420.00, 9, '2026-01-12', 'roz pudrat', 'satin,piele,spuma', TRUE, 'Nikolay', 6, 'Le recomand pentru recitaluri în care ai nevoie de o linie curată și un box rezistent.', 'Model cu platformă echilibrată, talpă medie și interior moale pentru confort la repetiții lungi.', 'Aerisește după fiecare purtare și schimbă panglicile după aproximativ 20 de ședințe intense.'),
(2, 'Demi-poante Rehearsal Soft', 'Demi-poante flexibile pentru cursuri zilnice, cu prindere elastică și interior moale.', '/resurse/imagini/galerie/original/pasclasic.jpeg', 'incaltaminte', 'repetitie', 168.00, 4, '2025-11-08', 'piersică', 'panza,bumbac,elastan', FALSE, 'Bloch', 18, 'Sunt excelente pentru încălzire și pentru clasele în care ai nevoie de multă mobilitate.', 'Vârf ușor întărit, bandă elastică pre-cusută și talpă split pentru articulație clară.', 'Se spală manual cu apă rece și se lasă la uscat pe o suprafață plană.'),
(3, 'Balerini Allegro Start', 'Model de început pentru cursuri de bază, cu talpă suede și susținere blândă pentru picior.', '/resurse/imagini/galerie/original/imag1.jpeg', 'incaltaminte', 'incepatori', 145.00, 2, '2025-09-20', 'alb sidefat', 'panza,piele intoarsa,bumbac', FALSE, 'Capezio', 24, 'Îi recomand copiilor care intră pentru prima dată în sala de balet și au nevoie de stabilitate.', 'Croială clasică, elastic simplu și interior respirabil pentru cursuri săptămânale.', 'Curăță talpa cu o perie uscată și depozitează-i într-un săculeț textil.'),
(4, 'Protecții Pointe Cloud', 'Set moale pentru protejarea degetelor în poante, ideal pentru ședințe lungi de studiu.', '/resurse/imagini/galerie/original/lumina.jpeg', 'incaltaminte', 'antrenament', 64.00, 5, '2026-02-02', 'nude', 'silicon,textil,gel', FALSE, 'Grishko', 31, 'Le folosesc când cresc volumul de lucru înainte de concurs și vreau să reduc presiunea pe articulații.', 'Set de două bucăți reutilizabile, cu suprafață lavabilă și ajustare rapidă în poantă.', 'Spală-le delicat cu apă călduță și lasă-le să se usuce complet înainte de reutilizare.'),
(5, 'Body Adagio Elegance', 'Body clasic cu decolteu rotund, potrivit atât pentru repetiții, cât și pentru ședințe foto de studio.', '/resurse/imagini/galerie/original/reverie.jpeg', 'imbracaminte', 'repetitie', 219.00, 4, '2026-01-28', 'vișiniu', 'microfibra,elastan,tul fin', TRUE, 'Wear Moi', 14, 'Este una dintre piesele cele mai versatile din boutique și avantajează aproape orice linie a spatelui.', 'Cusături plate, decolteu moderat și finisaje care nu se văd sub fustă sau tutu.', 'Se spală la program delicat și nu se calcă direct pe zona de tul.'),
(6, 'Fustă Wrap Rosette', 'Fustă petrecută ușoară, cu cădere fluidă, gândită pentru clase și probe de scenă.', '/resurse/imagini/galerie/original/imag2.jpeg', 'imbracaminte', 'repetitie', 139.00, 3, '2025-10-14', 'roz prăfuit', 'sifon,microfibra', FALSE, 'Intermezzo', 22, 'Se potrivește foarte bine peste body-urile simple și oferă o siluetă elegantă fără să încarce ținuta.', 'Nod reglabil în talie, lungime medie și material semi-transparent cu mișcare fluidă.', 'Depoziteaz-o pe umeraș și evită uscarea la temperaturi ridicate.'),
(7, 'Dres Performance 70', 'Dres opac, rezistent la frecare și confortabil pentru antrenamente repetitive.', '/resurse/imagini/galerie/original/imag3.jpeg', 'imbracaminte', 'antrenament', 89.00, 2, '2025-12-05', 'unt cald', 'poliamida,elastan', FALSE, 'Sansha', 40, 'Îl recomand elevelor care au nevoie de un dres sigur, fără transparențe, pentru program zilnic.', 'Talie confortabilă, textură uniformă și susținere lejeră pe gambă.', 'Spală-l într-un săculeț textil și evită contactul cu suprafețe aspre.'),
(8, 'Pulover Warm-Up Relevé', 'Pulover scurt pentru încălzire, cu croială lejeră și mâneci lungi care păstrează mobilitatea brațelor.', '/resurse/imagini/galerie/original/atelier.jpg', 'imbracaminte', 'antrenament', 174.00, 5, '2026-02-18', 'gri perlă', 'vascoza,modal,casmir', FALSE, 'Mirella', 11, 'Îl folosesc la începutul barei, când mușchii trebuie încălziți fără să îți pierzi linia corpului.', 'Lungime cropped, fibre moi și elasticitate bună pentru treceri rapide între exerciții.', 'Spală-l manual și usucă-l pe orizontală pentru a păstra forma.'),
(9, 'Kit Panglici Prima Pointe', 'Set complet pentru montarea poantelor, cu panglici satin și elastic pentru gleznă.', '/resurse/imagini/galerie/original/panglici.jpeg', 'accesorii', 'scena', 52.00, 6, '2026-03-01', 'roz balerină', 'satin,elastic,bumbac', TRUE, 'Freed', 26, 'Este kitul pe care îl recomand când vrei să îți personalizezi poantele rapid și curat, fără compromisuri.', 'Conține patru panglici, două elastice și ghid de montare pentru prindere simetrică.', 'Păstrează-l ferit de umezeală și taie marginile cu grijă pentru a evita destrămarea.'),
(10, 'Plasă de Păr Pearl Hold', 'Plasă elastică pentru coc, decorată discret și potrivită pentru examene și scenă.', '/resurse/imagini/galerie/original/regal.jpeg', 'accesorii', 'concurs', 36.00, 1, '2025-08-26', 'negru', 'plasa textila,elastic,perle', FALSE, 'So Danca', 55, 'Funcționează excelent pentru coafuri curate la examene, mai ales când ai nevoie de fixare rapidă.', 'Diametru mediu, elastic rezistent și finisaj discret cu perle mate.', 'Depoziteaz-o într-o cutie mică pentru a proteja elementele decorative.'),
(11, 'Geantă Studio Ribbon', 'Geantă încăpătoare pentru cursuri, cu compartimente separate pentru încălțăminte și accesorii.', '/resurse/imagini/galerie/original/balerina-echipament.jpg', 'accesorii', 'antrenament', 249.00, 2, '2026-02-10', 'bleumarin', 'textil impermeabil,captuseala,fermoar metalic', TRUE, 'DellaLo', 9, 'Îmi place pentru că păstrează poantele separate de restul ținutei și are suficient loc pentru toate accesoriile de sală.', 'Buzunar lateral pentru sticlă, compartiment ventilat și bretea reglabilă.', 'Șterge exteriorul cu o lavetă umedă și las-o deschisă după antrenament pentru aerisire.'),
(12, 'Benzi Stretch Arabesque', 'Set de benzi elastice pentru mobilitate și întărirea gleznelor înainte de lucru pe poante.', '/resurse/imagini/galerie/original/balet-hero-medie.jpeg', 'antrenament', 'antrenament', 79.00, 3, '2025-11-19', 'lila', 'latex,textil', FALSE, 'TheraBand', 33, 'Le recomand în special pentru exercițiile de mobilitate și control al gleznei la începutul săptămânii.', 'Trei rezistențe diferite, marcate cromatic, utile pentru încălzire progresivă.', 'Păstrează benzile ferite de soare direct și presară talc dacă se lipesc între ele.'),
(13, 'Roller Talpă PointeCare', 'Roller compact pentru masaj plantar și recuperare după repetiții intense.', '/resurse/imagini/galerie/original/imag4.jpeg', 'antrenament', 'recuperare', 94.00, 4, '2026-03-05', 'lavandă', 'spuma eva,silicon', FALSE, 'Bunheads', 17, 'Îl folosesc după variații lungi, când talpa devine tensionată și are nevoie de decompresie.', 'Suprafață texturată, dimensiune ușor de transportat și rezistență bună la compresie.', 'Curăță-l cu o lavetă umedă și evită expunerea lângă surse de căldură.'),
(14, 'Tutu Mini Recital', 'Tutu pentru eleve, cu volum controlat și talie comodă pentru recitaluri și serbări.', '/resurse/imagini/galerie/original/ballet-dancer-cc-by.jpg', 'spectacol', 'copii', 315.00, 5, '2026-01-05', 'alb perlat', 'tul,satin,bumbac', TRUE, 'DanceLux Atelier', 8, 'Este alegerea mea preferată pentru recitalurile copiilor, pentru că rămâne aerisit și confortabil pe scenă.', 'Bază moale, stratificare în patru nivele și talie elastică ascunsă.', 'Transportă-l pe umeraș și aburește-l ușor de la distanță înainte de spectacol.'),
(15, 'Coroniță Lumina Scenei', 'Accesoriu de scenă cu strălucire discretă, potrivit pentru variații clasice și poze oficiale.', '/resurse/imagini/galerie/original/lumina.jpeg', 'spectacol', 'scena', 129.00, 6, '2026-02-22', 'auriu soft', 'cristale,metal texturat,catifea', TRUE, 'Atelier Lena', 12, 'O recomand când vrei să adaugi lumină ținutei fără să încarci silueta balerinei.', 'Bandă reglabilă, finisaj antiderapant și elemente ușoare pentru purtare îndelungată.', 'Păstreaz-o în cutia originală și șterge delicat cristalele după fiecare eveniment.'),
(16, 'Costum Aurora Variation', 'Costum complet pentru variații clasice, cu detalii elegante și structură stabilă pentru scenă.', '/resurse/imagini/galerie/original/balet-hero-mare.jpeg', 'spectacol', 'concurs', 498.00, 8, '2026-03-18', 'albastru regal', 'catifea,tul,aplicatii stralucitoare', TRUE, 'DanceLux Atelier', 5, 'Îl aleg pentru concursuri pentru că oferă prezență scenică și rămâne confortabil la mișcări ample.', 'Corsaj structurat, fustă ușoară în straturi și aplicații cusute manual.', 'Necesită curățare profesională și depozitare pe umeraș capitonat.');
