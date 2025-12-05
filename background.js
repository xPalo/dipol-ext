chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action !== "translate") return;

    (async () => {
        const { text, sourceLang, targetLang } = message;
        const { engine = "deepl", deeplKey, openaiKey } = await chrome.storage.sync.get(["engine", "deeplKey", "openaiKey"]);

        /* ---------------- GOOGLE ---------------- */

        async function translateWithGoogle() {
            console.log("Translating with Google");

            try {
                const res = await fetch(
                    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang.toLowerCase()}&tl=${targetLang.toLowerCase()}&dt=t&q=${encodeURIComponent(text)}`
                );
                const data = await res.json();
                const translated = data?.[0]?.[0]?.[0];

                if (!translated) throw new Error("Invalid Google response");

                return { translated, provider: "google" };
            } catch (err) {
                throw new Error("Google Translate failed");
            }
        }

        /* ---------------- DEEPL ---------------- */

        async function translateWithDeepL() {
            console.log("Translating with DeepL");

            if (!deeplKey) throw new Error("Missing DeepL API key");

            const res = await fetch("https://api-free.deepl.com/v2/translate", {
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

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`DeepL error ${res.status}: ${body}`);
            }

            const data = await res.json();
            const translated = data?.translations?.[0]?.text;

            if (!translated) throw new Error("Invalid DeepL response");

            return { translated, provider: "deepl" };
        }

        /* ---------------- OPENAI ---------------- */

        async function translateWithOpenAI() {
            console.log("Translating with GPT");

            if (!openaiKey) throw new Error("Missing OpenAI API key");

            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "You are a professional translation engine. Translate the text to Slovak. Preserve all formatting, punctuation and custom markup such as +++, ###, *** and placeholders."
                        },
                        {
                            role: "user",
                            content: text
                        }
                    ],
                    temperature: 0.2
                })
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`OpenAI error ${res.status}: ${body}`);
            }

            const data = await res.json();
            const translated = data?.choices?.[0]?.message?.content;

            if (!translated) throw new Error("Invalid OpenAI response");

            return { translated, provider: "openai" };
        }

        /* ---------------- ENGINE SWITCH ---------------- */

        try {
            let result;

            if (engine === "openai") {
                try {
                    result = await translateWithOpenAI();
                } catch (e) {
                    console.warn("OpenAI failed → fallback DeepL", e);
                    result = await translateWithDeepL();
                }
            } else if (engine === "deepl") {
                try {
                    result = await translateWithDeepL();
                } catch (e) {
                    console.warn("DeepL failed → fallback Google", e);
                    result = await translateWithGoogle();
                }
            } else {
                result = await translateWithGoogle();
            }

            sendResponse(result);
        } catch (finalError) {
            console.error("Translation failed completely:", finalError);
            sendResponse({ error: finalError.message });
        }
    })();

    return true; // async response
});
