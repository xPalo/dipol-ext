document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("apiKey");
  const status = document.getElementById("status");
  const saveBtn = document.getElementById("save");

  const { deeplKey } = await chrome.storage.sync.get("deeplKey");
  if (deeplKey) {
    input.placeholder = `Current: ${deeplKey.slice(0, 12)}...`;
  }

  saveBtn.addEventListener("click", async () => {
    const value = input.value.trim();
    if (!value) {
      status.textContent = "Please enter a valid API key.";
      status.style.color = "red";
      return;
    }

    await chrome.storage.sync.set({ deeplKey: value });
    status.textContent = "API key saved!";
    status.style.color = "green";

    input.value = "";
    input.placeholder = `Current: ${value.slice(0, 12)}...`;
  });
});
