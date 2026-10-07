# Bug report

Found by reading the code (v1.2.0, commit `89e91f9`). Severity: **Critical** = extension doesn't work, **High** = visible breakage, **Medium** = wrong behaviour in some cases, **Low** = cleanup.

> Fixed items (#1–4, #10, #13–17, #19) were removed on 2026-10-07; see git history. #5 is partly fixed: selection is trimmed and one-letter words work, but there's still no character/length check.

## High

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

### 11. Pop-up can go off-screen
`content_scripts/dictionary.js:64`. Horizontal position is `left - 10` with no clamp, so words near the right edge produce a 320px pop-up cut off by the viewport. Nothing stops it going above the top of the page either.

### 12. Manifest V2 no longer runs in Chrome
`manifest.json:4`. Chrome has phased out MV2 extensions. Firefox still runs MV2. Moving to MV3 changes `background.scripts` to a service worker in Chrome, and service workers have **no `DOMParser`**. `stripHtml` in `background.js` would need replacing.

## Low

### 18. Deprecated APIs
`navigator.platform` (`options.js:96`), `chrome_style`/`browser_style` (`manifest.json:19-20`, MV2-only). All still work for now.

