let translationHalted = false;

const CUSTOM_MARKUP_RULES = [
    {
        type: "paired",
        marker: "+++",
        name: "BOLD"
    },
    {
        type: "paired",
        marker: "---",
        name: "HEAD"
    },
    {
        type: "paired",
        marker: "^H2^",
        name: "HEADER"
    },
    {
        type: "paired",
        marker: "###",
        name: "PARAGRAPH"
    },
    {
        type: "paired",
        marker: "===",
        name: "EQUALS"
    },
    {
        type: "paired",
        marker: "///",
        name: "ITALIC"
    },
    {
        type: "single",
        marker: "***",
        name: "STAR"
    },
    {
        type: "single",
        marker: ">>>",
        name: "MORE"
    }
];

async function translateText(rawText, sourceLang = "PL", targetLang = "SK") {
    return new Promise((resolve, reject) => {
        if (translationHalted) {
            reject("Translations halted due to previous error.");
            return;
        }

        const {text: preparedText, mappings} = preprocessCustomMarkup(rawText);

        chrome.runtime.sendMessage(
            {
                action: "translate",
                text: preparedText,
                sourceLang: sourceLang,
                targetLang: targetLang
            },
            (response) => {
                if (!response) {
                    console.error("No response received");
                    translationHalted = true;
                    showErrorPopup("Chyba prekladu: Žiadna odpoveď od background skriptu.");
                    reject("No response");
                    return;
                }

                if (chrome.runtime.lastError) {
                    console.error("Messaging error:", chrome.runtime.lastError.message);
                    translationHalted = true;
                    showErrorPopup("Chyba komunikácie: " + chrome.runtime.lastError.message);
                    reject(chrome.runtime.lastError.message);
                    return;
                }

                if (response.error) {
                    console.error("Translation error:", response.error);
                    translationHalted = true;
                    showErrorPopup("Chyba prekladu: '" + response.error + "'");
                    reject(response.error);
                    return;
                }

                const finalText = postprocessCustomMarkup(response.translated, mappings);
                resolve(finalText);
            }
        );
    });
}

async function runTranslations() {
    if (translationHalted) {
        showErrorPopup("Preklady sú zastavené kvôli predchádzajúcej chybe.");
        return;
    }

    const tables = document.querySelectorAll("form table");
    const total = tables.length;
    let processed = 0;

    for (const table of tables) {
        if (translationHalted) break;

        const tds = table.querySelectorAll("td textarea");
        if (tds.length === 3) {
            const [pl, en, sk] = tds;

            if (!sk || sk.value.trim()) continue;

            let sourceText = "";
            let sourceLang = "";

            if (pl && pl.value.trim()) {
                sourceText = pl.value.trim();
                sourceLang = "PL";
            } else if (en && en.value.trim()) {
                sourceText = en.value.trim();
                sourceLang = "EN";
            } else {
                continue;
            }

            sk.value = "Translating...";
            processed = processed + 1;

            try {
                const translated = await translateText(sourceText, sourceLang, "SK");
                sk.value = translated;
                showErrorPopup(`Preklad: preložil som ${processed}/${total} textov.`);
            } catch (err) {
                console.error("Translation failed:", err);
                sk.value = "";
                break;
            }
        }
    }

    showErrorPopup(`Hotovo! Preložených ${total} textov.`);
}

async function runAutosave() {
    const saveButtons = Array.from(document.querySelectorAll("a"))
        .filter(a =>
            a.textContent.trim().toLowerCase() === "save" &&
            (a.getAttribute("onclick") || "").includes("edit_update")
        );

    if (saveButtons.length === 0) {
        alert("Žiadne 'Save' tlačidlá neboli nájdené.");
        return;
    }

    for (let i = 0; i < saveButtons.length; i++) {
        const btn = saveButtons[i];
        btn.click();
        showErrorPopup(`Autosave: uložil som ${i + 1}/${saveButtons.length} textov.`);
        await new Promise(r => setTimeout(r, 700));
    }

    showErrorPopup(`Hotovo! Uložených ${saveButtons.length} položiek.`);
}

function preprocessCustomMarkup(text) {
    let mappings = [];
    let counter = 0;

    for (const rule of CUSTOM_MARKUP_RULES) {

        if (rule.type === "paired") {
            const regex = new RegExp(
                `${escapeRegex(rule.marker)}([\\s\\S]+?)${escapeRegex(rule.marker)}`,
                "g"
            );

            text = text.replace(regex, (_, inner) => {
                const id = counter++;
                const start = `__${rule.name}_${id}__`;
                const end = `__END_${rule.name}_${id}__`;

                mappings.push({
                    type: "paired",
                    start,
                    end,
                    marker: rule.marker,
                });

                return `${start}${inner}${end}`;
            });
        }

        if (rule.type === "single") {
            const regex = new RegExp(escapeRegex(rule.marker), "g");

            text = text.replace(regex, () => {
                const id = counter++;
                const placeholder = `__${rule.name}_${id}__`;

                mappings.push({
                    type: "single",
                    placeholder,
                    marker: rule.marker
                });

                return placeholder;
            });
        }
    }

    return {text, mappings};
}

function postprocessCustomMarkup(text, mappings) {
    for (const map of mappings) {
        if (map.type === "paired") {
            const { start, end, marker } = map;
            let startIndex = text.indexOf(start);
            let endIndex = text.indexOf(end);

            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                const inner = text.substring(startIndex + start.length, endIndex);
                text = text.substring(0, startIndex) + marker + inner + marker + text.substring(endIndex + end.length);
            }
        }

        if (map.type === "single") {
            text = text.split(map.placeholder).join(map.marker);
        }
    }

    return text;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function showErrorPopup(message) {
    const existing = document.getElementById("translation-error-popup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.id = "translation-error-popup";
    popup.textContent = message;

    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 5000);
}

// --- Wrapper pre tlačidlá ---
const controlBar = document.createElement("div");
controlBar.id = "translation-control-bar";
document.body.appendChild(controlBar);

// --- Translate Button ---
const btn = document.createElement("button");
btn.id = "auto-translate-btn";
btn.textContent = "🔄 Automaticky preložiť PL/EN → SK";
btn.onclick = runTranslations;
controlBar.appendChild(btn);

// --- Autosave Button ---
const autosaveBtn = document.createElement("button");
autosaveBtn.id = "auto-save-btn";
autosaveBtn.textContent = "💾 Uložiť všetko";
autosaveBtn.onclick = runAutosave;
controlBar.appendChild(autosaveBtn);