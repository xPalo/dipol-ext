chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.action === "translate") {
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${msg.targetLang}&dt=t&q=${encodeURIComponent(msg.text)}`
      );
      const data = await res.json();
      const translation = data[0].map((t) => t[0]).join("");
      sendResponse({ translation });
    } catch (err) {
      sendResponse({ error: err.message });
    }
    return true;
  }
});
