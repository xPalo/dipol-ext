chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    (async () => {
      const { text, sourceLang, targetLang } = message;
      const { deeplKey } = await chrome.storage.sync.get("deeplKey");

      async function googleTranslateFallback() {
        try {
          const googleRes = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang.toLowerCase()}&tl=${targetLang.toLowerCase()}&dt=t&q=${encodeURIComponent(text)}`
          );
          const googleData = await googleRes.json();
          const translated = googleData?.[0]?.[0]?.[0];

          if (translated) {
            sendResponse({ translated, note: "Translated via Google fallback" });
          } else {
            sendResponse({ error: "Google Translate fallback failed" });
          }
        } catch (gErr) {
          console.error("Google Translate fallback error:", gErr);
          sendResponse({ error: "Both DeepL and Google fallback failed" });
        }
      }

      if (!deeplKey) {
        console.warn("No DeepL key found — using Google fallback.");
        await googleTranslateFallback();
        return;
      }

      try {
        const deeplResponse = await fetch("https://api-free.deepl.com/v2/translate", {
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

        if (!deeplResponse.ok) {
          const errorText = await deeplResponse.text();
          console.warn("DeepL API error:", deeplResponse.status, errorText);
          await googleTranslateFallback();
          return;
        }

        const data = await deeplResponse.json();

        if (data.translations && data.translations[0]) {
          sendResponse({ translated: data.translations[0].text });
        } else {
          console.warn("Invalid DeepL response:", data);
          await googleTranslateFallback();
        }
      } catch (err) {
        console.error("DeepL translation failed:", err);
        await googleTranslateFallback();
      }
    })();

    return true;
  }
});
