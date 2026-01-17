document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("save").addEventListener("click", () => {
        const deeplKey = document.getElementById("deeplKey").value.trim();
        const openaiKey = document.getElementById("openaiKey").value.trim();
        const engine = document.getElementById("engine").value;

        chrome.storage.sync.set(
            { deeplKey, openaiKey, engine },
            () => {
                const status = document.getElementById("status");
                status.textContent = "Uložené!";
                setTimeout(() => (status.textContent = ""), 1500);
            }
        );
    });

    chrome.storage.sync.get(["deeplKey", "openaiKey", "engine"], (data) => {
        if (data.deeplKey) {
            let input = document.getElementById("deeplKey");
            input.value = "";
            input.placeholder = `Current: ${data.deeplKey.slice(0, 12)}...`;
        }
        if (data.openaiKey) {
            let input = document.getElementById("openaiKey");
            input.value = "";
            input.placeholder = `Current: ${data.openaiKey.slice(0, 12)}...`;
        }
        if (data.engine) document.getElementById("engine").value = data.engine;
    });

    const checkbox = document.getElementById("preprocessingEnabled");
    const { preprocessingEnabled = true } = await chrome.storage.sync.get("preprocessingEnabled");
    checkbox.checked = preprocessingEnabled;
    checkbox.addEventListener("change", async () => {
        await chrome.storage.sync.set({
            preprocessingEnabled: checkbox.checked
        });
    });
});
