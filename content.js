async function translateText(text, targetLang) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "translate", text, targetLang },
      (response) => {
        if (response?.translation) resolve(response.translation);
        else resolve("");
      }
    );
  });
}

async function processTables() {
  const tables = Array.from(document.querySelectorAll("table")).filter((table) =>
    table.querySelector("textarea")
  );

  for (const table of tables) {
    const textareas = table.querySelectorAll("textarea");
    if (textareas.length < 3) continue;

    const plTextarea = textareas[0];
    const enTextarea = textareas[1];
    const skTextarea = textareas[2];

    if (skTextarea.value.trim().length > 0) continue;

    const sourceText = enTextarea.value.trim() || plTextarea.value.trim();
    if (!sourceText) continue;

    const translated = await translateText(sourceText, "sk");

    if (translated) {
      skTextarea.value = translated;
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("[Auto Translator] Všetky tabuľky spracované.");
}

// Spusti po načítaní stránky
window.addEventListener("load", () => {
  console.log("[Auto Translator] Stránka načítaná, začínam preklad...");
  processTables();
});
