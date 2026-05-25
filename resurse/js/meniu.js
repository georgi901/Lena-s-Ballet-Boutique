document.addEventListener("DOMContentLoaded", () => {
    const breakpointMic = window.matchMedia("(max-width: 700px)");
    const meniuHamburger = document.getElementById("toggle-meniu");
    const elementeCuSubmeniu = Array.from(
        document.querySelectorAll("nav .meniu-principal > li.are-submeniu")
    );

    function esteEcranMic() {
        return breakpointMic.matches;
    }

    function inchideSubmeniuri(exceptie = null) {
        elementeCuSubmeniu.forEach((element) => {
            if (element === exceptie) {
                return;
            }

            element.classList.remove("submeniu-deschis");
            element.classList.remove("submeniu-inchis-fortat");
            const linkPrincipal = element.querySelector(":scope > a");
            if (linkPrincipal) {
                linkPrincipal.setAttribute("aria-expanded", "false");
            }
        });
    }

    elementeCuSubmeniu.forEach((element) => {
        const linkPrincipal = element.querySelector(":scope > a");
        const submeniu = element.querySelector(":scope > .submeniu");

        if (!linkPrincipal || !submeniu) {
            return;
        }

        linkPrincipal.setAttribute("aria-haspopup", "true");
        linkPrincipal.setAttribute("aria-expanded", "false");

        linkPrincipal.addEventListener("click", (event) => {
            if (!esteEcranMic()) {
                return;
            }

            event.preventDefault();
            const esteDeschis = element.classList.contains("submeniu-deschis");
            inchideSubmeniuri(element);

            if (esteDeschis) {
                element.classList.remove("submeniu-deschis");
                element.classList.add("submeniu-inchis-fortat");
                linkPrincipal.setAttribute("aria-expanded", "false");
                return;
            }

            element.classList.remove("submeniu-inchis-fortat");
            element.classList.add("submeniu-deschis");
            linkPrincipal.setAttribute("aria-expanded", "true");
        });

        element.addEventListener("mouseleave", () => {
            element.classList.remove("submeniu-inchis-fortat");
        });

        submeniu.querySelectorAll("a").forEach((linkSubmeniu) => {
            linkSubmeniu.addEventListener("click", () => {
                if (!esteEcranMic()) {
                    return;
                }

                if (meniuHamburger) {
                    meniuHamburger.checked = false;
                }
                inchideSubmeniuri();
            });
        });
    });

    if (meniuHamburger) {
        meniuHamburger.addEventListener("change", () => {
            if (meniuHamburger.checked) {
                return;
            }

            inchideSubmeniuri();
        });
    }

    document.addEventListener("click", (event) => {
        if (!esteEcranMic()) {
            return;
        }

        if (!event.target.closest("nav")) {
            inchideSubmeniuri();
        }
    });

    breakpointMic.addEventListener("change", () => {
        if (!esteEcranMic()) {
            inchideSubmeniuri();
        }
    });
});
