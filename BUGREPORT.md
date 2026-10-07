# Bug report

Found by reading the code (v1.2.0, commit `89e91f9`). Severity: **Critical** = extension doesn't work, **High** = visible breakage, **Medium** = wrong behaviour in some cases, **Low** = cleanup.

> **Fixed 2026-10-07 (Wiktionary switch):** #1, #2, #3 (code removed), #4, #10, #16, #19. #5 partly: selection is trimmed and one-letter words work, but there's still no character/length check.

## Critical

### 1. Definition source is dead (Google scraping)
`background/background.js:9-70`. Google Search now returns a JS-only page, so no definition is ever found. Details and fix in `FIREFOX_BROKEN.md`.

### 2. No error handling: pop-up hangs on "Please Wait..."
`background/background.js:11-26`. The `fetch` chain has no `.catch`. A network error, a non-200 response or an exception means `sendResponse` is never called. The content script then either never resolves, or gets `undefined` and throws on `response.content` (`content_scripts/dictionary.js:15`).
**Fix:** `.catch(() => sendResponse({ content: null }))`, and guard `if (!response || !response.content)` in the content script.

## High

### 3. Crash when the headword exists but there's no definition
`background/background.js:45`. `meaning[0].toUpperCase()` throws `TypeError` when `meaning === ""` (no `div[data-dobid='dfn']`). Thanks to #2, this leaves the pop-up stuck.
**Fix:** `if (!meaning) return null;` before capitalising.

### 4. Word isn't URL-encoded
`background/background.js:9` and `content_scripts/dictionary.js:111`. Selecting text containing `&`, `#`, `+`, `%` or `?` (e.g. "C++", "AT&T") builds a broken query or link.
**Fix:** `encodeURIComponent(word)`.

### 5. Selection isn't trimmed or validated
`content_scripts/dictionary.js:29-30`.
- Double-click selects a trailing space on Windows ("word "), which gets sent as-is.
- `length > 1` drops real one-letter words ("a", "I") but accepts whitespace-only or multi-paragraph selections. Any length of selected text is sent off.

**Fix:** `word = selection.toString().trim()`; require something like `/^[\p{L}'-]+$/u` and a max length.

## Medium

### 6. Settings don't apply to open tabs
`content_scripts/dictionary.js:207-216`. Language and trigger key are read once, at injection. Changing options does nothing until each tab is reloaded.
**Fix:** `browser.storage.onChanged.addListener(...)` to update `LANGUAGE`/`TRIGGER_KEY`.

### 7. Double-clicks right after page load are ignored
`content_scripts/dictionary.js:193-198`. Until `storage.local.get()` resolves, `TRIGGER_KEY` is `undefined`. It isn't `'none'`, and `e['undefinedKey']` is falsy, so nothing happens. Same root as #6: give `TRIGGER_KEY` its default up front.

### 8. "Clear history" doesn't update the counter
`options/options.js:105-109`. The stored history is cleared, but "Number of words stored" still shows the old count until the page is reloaded.
**Fix:** `.then(restoreOptions)`.

### 9. History writes can lose entries
`background/background.js:72-86`. `saveWord` does read-modify-write on the whole `definitions` object. Two lookups finishing close together race, and one overwrites the other.

### 10. Privacy: every lookup goes to Google with the user's cookies
`background/background.js:11`. Since `credentials: 'omit'` was removed (commit `59805f4`), every looked-up word is sent with the user's Google login cookies, which links it to their account. It also happens on every page (`<all_urls>`). Goes away once #1 is fixed with a different API. Don't send credentials.

### 11. Pop-up can go off-screen
`content_scripts/dictionary.js:64`. Horizontal position is `left - 10` with no clamp, so words near the right edge produce a 320px pop-up cut off by the viewport. Nothing stops it going above the top of the page either.

### 12. Manifest V2 no longer runs in Chrome
`manifest.json:4`. Chrome has phased out MV2 extensions. Firefox still runs MV2. Moving to MV3 changes `background.scripts` to a service worker in Chrome, and service workers have **no `DOMParser`**, which is another reason to switch to a JSON API (#1).

## Low

### 13. Accidental globals in `downloadHistory`
`options/options.js:62-69`. `let fileContent = ""` is missing a trailing comma, so `storageItem` and `anchorTag` become implicit globals through ASI. `definition` in the `for...in` is also undeclared. This would throw in strict mode or a module.

### 14. `return` instead of `continue` in the history export loop
`options/options.js:70`. `if (!hasOwnProperty) return;` would abort the whole export instead of skipping one key. Harmless in practice, but wrong. Use `Object.entries`.

### 15. Dangling label
`options/options.html:31`. `<label for="popup-dblclick-checkbox">` points to an element that doesn't exist (the checkbox was removed; see the commented-out code in `options.js:49`).

### 16. No Firefox add-on ID
`manifest.json`. There's no `browser_specific_settings.gecko.id`. Temporary installs get a random ID, so `storage.local` (settings and history) is wiped on every reload. An ID is also required for signing on AMO.

### 17. Fragile DOM lookup
`content_scripts/dictionary.js:153`. `querySelectorAll("div")[1]` depends on element order. Return `popupDiv` from `createDiv` instead.

### 18. Deprecated APIs
`navigator.platform` (`options.js:128`), `-webkit-transition` (`options.js:112`), `chrome_style`/`browser_style` (`manifest.json:19-20`, MV2-only). All still work for now.

### 19. The Google TTS audio endpoint is undocumented and probably dead
`background/background.js:1, 54-67`. Moot once #1 is fixed.
