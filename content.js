async function translateText(rawText, sourceLang = "PL", targetLang = "SK") {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: "translate",
        text: rawText,
        sourceLang: sourceLang,
        targetLang: targetLang
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Messaging error:", chrome.runtime.lastError.message);
          resolve(rawText);
          return;
        }
        if (!response) {
          console.error("No response received");
          resolve(rawText);
          return;
        }
        if (response.error) {
          console.error("Translation error:", response.error);
          resolve(rawText);
          return;
        }
        resolve(response.translated);
      }
    );
  });
}

async function runTranslations() {
  const tables = document.querySelectorAll("form table");

  for (const table of tables) {
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
        sk.value = "[Translation error]";
      }
    }
  }
}

const btn = document.createElement("button");
btn.id = "auto-translate-btn";
btn.textContent = "🔄 Automaticky preložiť PL/EN → SK";
btn.onclick = runTranslations;
document.body.appendChild(btn);
