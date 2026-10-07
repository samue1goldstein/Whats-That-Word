const DEFAULT_LANGUAGE = 'en',
    DEFAULT_TRIGGER_KEY = 'none',
    IS_HISTORY_ENABLED_BY_DEFAULT = true,

    SAVE_STATUS = document.querySelector("#save-status"),

    SAVE_OPTIONS_BUTTON = document.querySelector("#save-btn"),
    RESET_OPTIONS_BUTTON = document.querySelector("#reset-btn"),

    CLEAR_HISTORY_BUTTON = document.querySelector("#clear-history-btn"),
    DOWNLOAD_HISTORY_BUTTON = document.querySelector("#download-history-btn");



function saveOptions(e) {
    browser.storage.local.set({
        language: document.querySelector("#language-selector").value,
        interaction: {
            dblClick: {
                key: document.querySelector("#popup-dblclick-key").value
            }
        },
        history: {
            enabled: document.querySelector("#store-history-checkbox").checked
        }
    }).then(showSaveStatusAnimation);

    e.preventDefault();
  }
  
  function restoreOptions() {
    let storageItem = browser.storage.local.get();

    storageItem.then((results) => {
        let language = results.language,
            interaction = results.interaction || {},
            history = results.history || { enabled: IS_HISTORY_ENABLED_BY_DEFAULT },
            definitions = results.definitions || {};
        
        // language
        document.querySelector("#language-selector").value = language || DEFAULT_LANGUAGE;

        // interaction
        document.querySelector("#popup-dblclick-key").value = (interaction.dblClick && interaction.dblClick.key) || DEFAULT_TRIGGER_KEY;

        // history
        document.querySelector("#store-history-checkbox").checked = history.enabled;
        document.querySelector("#num-words-in-history").innerText = Object.keys(definitions).length;
    });
  }
  
  function downloadHistory (e) {
    let anchorTag = document.querySelector("#download-history-link");

    browser.storage.local.get("definitions").then((results) => {
        let fileContent = Object.entries(results.definitions || {})
            .map(([word, meaning]) => `${word}\t\t${meaning}\n`).join("");

        anchorTag.href = window.URL.createObjectURL(new Blob([fileContent],{
            type: "text/plain"
        }));

        anchorTag.dispatchEvent(new MouseEvent('click'));
    });

    e.preventDefault();
  }

  function resetOptions (e) {
    // Every reader falls back to the defaults when a setting is missing.
    browser.storage.local.remove(["language", "interaction", "history"]).then(restoreOptions);

    e.preventDefault();
  }

  function clearHistory(e) {
    browser.storage.local.set({ definitions: {} });

    e.preventDefault();
  }

  function showSaveStatusAnimation () {
    // Appears instantly, fades out (options.css).
    SAVE_STATUS.classList.add("shown");
    window.setTimeout(() => SAVE_STATUS.classList.remove("shown"), 1500);
  }

  document.addEventListener('DOMContentLoaded', restoreOptions);

  CLEAR_HISTORY_BUTTON.addEventListener("click", clearHistory);
  DOWNLOAD_HISTORY_BUTTON.addEventListener("click", downloadHistory);

  SAVE_OPTIONS_BUTTON.addEventListener("click", saveOptions);
  RESET_OPTIONS_BUTTON.addEventListener("click", resetOptions);

  if (window.navigator.platform.toLowerCase().includes("mac")) {
    document.getElementById("popup-dblclick-key-ctrl").textContent = "Command";
    document.getElementById("popup-dblclick-key-ctrl").value = "meta";
  }
