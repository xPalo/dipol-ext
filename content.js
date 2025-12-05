let translationHalted = false;

const CUSTOM_MARKUP_RULES = [
    {
        marker: "{{",
        name: "START"
    },
    {
        marker: "}}",
        name: "STOP"
    },
    {
        marker: "+++",
        name: "BOLD"
    },
    {
        marker: "---",
        name: "HEAD"
    },
    {
        marker: "^H2^",
        name: "HEADER"
    },
    {
        marker: "###",
        name: "GRAPH"
    },
    {
        marker: "===",
        name: "EQUALS"
    },
    {
        marker: "///",
        name: "ITALIC"
    },
    {
        marker: "***",
        name: "STAR"
    },
    {
        marker: ">>>",
        name: "MORE"
    }
];

async function translateText(rawText, sourceLang = "PL", targetLang = "SK") {
    const { preprocessingEnabled = true } = await chrome.storage.sync.get("preprocessingEnabled");

    return new Promise((resolve, reject) => {
        if (translationHalted) {
            reject("Translations halted due to previous error.");
            return;
        }

        let preparedText = rawText;
        let mappings = [];

        if (preprocessingEnabled) {
            const processed = preprocessCustomMarkup(rawText);
            preparedText = processed.text;
            mappings = processed.mappings;
        }

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

                let finalText = response.translated;
                if (preprocessingEnabled) {
                    finalText = postprocessCustomMarkup(finalText, mappings);
                }

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

    const { engine = "google" } = await chrome.storage.sync.get("engine");
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
                showErrorPopup(`[${engine.toUpperCase()}] Preklad: preložil som ${processed}/${total} textov.`);
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
        const regex = new RegExp(escapeRegex(rule.marker), "g");

        text = text.replace(regex, () => {
            const id = counter++;
            const placeholder = `__${rule.name}${id}__`;

            mappings.push({
                placeholder,
                marker: rule.marker
            });

            return placeholder;
        });
    }

    return {text, mappings};
}

function postprocessCustomMarkup(text, mappings) {
    for (const map of mappings) {
        text = text.split(map.placeholder).join(map.marker);
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