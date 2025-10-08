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

const btn = document.createElement("button");
btn.id = "auto-translate-btn";
btn.textContent = "🔄 Automaticky preložiť PL/EN → SK";
btn.onclick = runTranslations;
document.body.appendChild(btn);
