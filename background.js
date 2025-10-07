chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    (async () => {
      try {
        const { text, sourceLang, targetLang } = message;
        const { deeplKey } = await chrome.storage.sync.get("deeplKey");

        if (!deeplKey) {
          sendResponse({ error: "Missing DeepL API key" });
          return;
        }

        const response = await fetch("https://api-free.deepl.com/v2/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `DeepL-Auth-Key ${deeplKey}`
          },
          body: new URLSearchParams({
            text,
            source_lang: sourceLang,
            target_lang: targetLang
          })
        });

        const data = await response.json();

        if (data.translations && data.translations[0]) {
          sendResponse({ translated: data.translations[0].text });
        } else {
          sendResponse({ error: "Invalid DeepL response" });
        }
      } catch (err) {
        sendResponse({ error: err.message });
      }
    })();

    return true;
  }
});
