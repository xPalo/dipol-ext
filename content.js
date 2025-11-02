let translationHalted = false;

async function translateText(rawText, sourceLang = "PL", targetLang = "SK") {
    return new Promise((resolve, reject) => {
        if (translationHalted) {
            reject("Translations halted due to previous error.");
            return;
        }

        chrome.runtime.sendMessage(
            {
                action: "translate",
                text: rawText,
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

                resolve(response.translated);
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

            try {
                const translated = await translateText(sourceText, sourceLang, "SK");
                sk.value = translated;
            } catch (err) {
                console.error("Translation failed:", err);
                sk.value = "";
                break;
            }
        }
    }

    showErrorPopup(`Hotovo! Preložených ${tables.length} textov.`);
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

    console.log(`Našiel som ${saveButtons.length} tlačidiel na uloženie.`);

    const scriptEl = document.createElement("script");
    scriptEl.id = "autosave-confirm-bypass";
    scriptEl.textContent = `
    (function() {
      window._autosaveBypassActive = true;
      const originalConfirm = window.confirm;
      const originalAlert = window.alert;
      window.confirm = function(msg) { 
        console.log("[AutoConfirm] Potvrdené:", msg);
        return true; 
      };
      window.alert = function(msg) { 
        console.log("[AutoAlert] Preskočené:", msg);
      };
      window._restoreAlerts = function() {
        window.confirm = originalConfirm;
        window.alert = originalAlert;
        window._autosaveBypassActive = false;
        console.log("[AutoConfirm] Obnovené pôvodné správanie.");
      };
    })();
    `;
    (document.head || document.documentElement).appendChild(scriptEl);

    for (let i = 0; i < saveButtons.length; i++) {
        const btn = saveButtons[i];
        btn.click();
        console.log(`Autosave: klikol som na ${i + 1}/${saveButtons.length}`);
        await new Promise(r => setTimeout(r, 700));
    }

    const cleanupScript = document.createElement("script");
    cleanupScript.textContent = `
    if (window._autosaveBypassActive && typeof window._restoreAlerts === 'function') {
      window._restoreAlerts();
    }
    `;
    (document.head || document.documentElement).appendChild(cleanupScript);
    cleanupScript.remove();

    showErrorPopup(`Hotovo! Uložených ${saveButtons.length} položiek.`);
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