document.addEventListener("DOMContentLoaded", async () => {
    const deeplInput = document.getElementById("deeplKey");
    const openaiInput = document.getElementById("openaiKey");
    const engineSelect = document.getElementById("engine");
    const preprocessingCheckbox = document.getElementById("preprocessingEnabled");
    const promptRow = document.getElementById("openaiPromptRow");
    const promptTextarea = document.getElementById("openaiPrompt");
    const saveBtn = document.getElementById("save");
    const status = document.getElementById("status");

    function togglePromptRow() {
        if (engineSelect.value === "openai") {
            promptRow.style.display = "block";
        } else {
            promptRow.style.display = "none";
        }
    }
    engineSelect.addEventListener("change", togglePromptRow);

    chrome.storage.sync.get(
        ["deeplKey", "openaiKey", "engine", "preprocessingEnabled", "openaiPrompt"],
        (data) => {
            if (data.deeplKey) deeplInput.value = data.deeplKey;
            if (data.openaiKey) openaiInput.value = data.openaiKey;

            const engineValue = data.engine || "google";
            engineSelect.value = engineValue;

            preprocessingCheckbox.checked = data.preprocessingEnabled ?? false;

            promptTextarea.value =
                data.openaiPrompt ||
                "You are a professional translation engine. Translate the text to Slovak. Preserve all formatting, punctuation and custom markup such as +++, ###, *** and placeholders.";

            togglePromptRow();
        }
    );

    preprocessingCheckbox.addEventListener("change", async () => {
        await chrome.storage.sync.set({
            preprocessingEnabled: preprocessingCheckbox.checked
        });
    });

    saveBtn.addEventListener("click", async () => {
        const deeplKey = deeplInput.value.trim();
        const openaiKey = openaiInput.value.trim();
        const engine = engineSelect.value;
        const preprocessingEnabled = preprocessingCheckbox.checked;
        const openaiPrompt = promptTextarea.value.trim();

        await chrome.storage.sync.set({
            deeplKey,
            openaiKey,
            engine,
            preprocessingEnabled,
            openaiPrompt
        });

        status.textContent = "Uložené!";
        status.style.color = "#4E8F6A";
        setTimeout(() => (status.textContent = ""), 1500);
    });
});