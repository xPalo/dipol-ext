document.addEventListener("DOMContentLoaded", async () => {
    const input = document.getElementById("apiKey");
    const status = document.getElementById("status");
    const saveBtn = document.getElementById("save");
    const usageEl = document.getElementById("usage");

    const {deeplKey} = await chrome.storage.sync.get("deeplKey");
    if (deeplKey) {
        input.placeholder = `Current: ${deeplKey.slice(0, 12)}...`;
        await updateUsage(deeplKey);
    }

    saveBtn.addEventListener("click", async () => {
        const value = input.value.trim();

        if (!value) {
            status.textContent = "Please enter a valid API key.";
            status.style.color = "red";
            return;
        }

        await chrome.storage.sync.set({deeplKey: value});
        status.textContent = "API key saved!";
        status.style.color = "green";

        input.value = "";
        input.placeholder = `Current: ${value.slice(0, 12)}...`;

        await updateUsage(value);
    });

    async function updateUsage(apiKey) {
        if (!usageEl) return;

        usageEl.textContent = "⏳ Fetching usage...";
        usageEl.style.color = "gray";

        try {
            const res = await fetch("https://api-free.deepl.com/v2/usage", {
                headers: {
                    Authorization: `DeepL-Auth-Key ${apiKey}`,
                },
            });

            if (!res.ok) throw new Error("Invalid API key or network error");

            const data = await res.json();
            const used = data.character_count || 0;
            const limit = data.character_limit || 500000;
            const percent = Math.min((used / limit) * 100, 100);

            usageEl.textContent = `🔠 ${used.toLocaleString()} / ${limit.toLocaleString()} characters used (${percent.toFixed(1)}%)`;
            usageEl.style.color = percent > 90 ? "red" : percent > 70 ? "orange" : "green";
        } catch (err) {
            console.error(err);
            usageEl.textContent = "❌ Could not fetch usage info.";
            usageEl.style.color = "red";
        }
    }
});
