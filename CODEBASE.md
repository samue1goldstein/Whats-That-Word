# Codebase map

Quick reference so nobody has to re-explore. ~450 lines of first-party JS, no build step, no dependencies, no tests.
Manifest V2. Uses the `browser.*` promise API (Firefox native; Chrome via the polyfill).

## Files

| File | Runs in | What it does |
|---|---|---|
| `manifest.json` | — | MV2 manifest, v1.2.0. Content script on `<all_urls>`, non-persistent background (event page), permissions `storage` + `https://www.google.com/`. No `browser_specific_settings.gecko.id`. |
| `content_scripts/dictionary.js` | every page | Listens for `dblclick`, reads the selection, sends `{word, lang, time}` to the background, draws the pop-up in a shadow DOM. |
| `background/background.js` | background event page | Receives the message, fetches `https://www.google.com/search?hl=<lang>&q=define+<word>&gl=US`, scrapes the HTML, replies `{content}`, saves to history. |
| `options/options.html/.js/.css` | options page | Language, trigger key, history on/off, download/clear history. |
| `common/browser-polyfill.js` | all contexts | Mozilla webextension-polyfill (MPL-2.0, third-party, don't edit). No-op in Firefox. |
| `icons/` | — | 48/64/96/128 PNGs. |

## Flow

```
dblclick (dictionary.js:192)
  -> TRIGGER_KEY check ('none' or e[`${key}Key`])
  -> showMeaning (:7)
       getSelectionInfo (:25)   selection text + bounding rect (needs length > 1)
       retrieveMeaning (:56)    browser.runtime.sendMessage({word, lang, time})
       createDiv (:60)          "Searching / Please Wait..." pop-up, shown immediately
  -> background onMessage (background.js:7)
       fetch Google HTML -> DOMParser -> extractMeaning (:31)
       sendResponse({content})  content = {word, meaning, audioSrc} | null
       saveWord (:72) if history enabled
  -> appendToDiv (dictionary.js:151) or noMeaningFound (:178)
click anywhere not on the popup -> removeMeaning (:183) removes all .dictionaryDiv
```

## Scraping selectors (background.js `extractMeaning`)

- Headword: `[data-dobid='hdw']` (missing -> returns `null` -> "No definition found")
- Definition: `div[data-dobid='dfn']`, concatenates `span`s that have no `<sup>`
- Audio: `audio[jsname='QInZvb'] source[src]`; otherwise builds a `google.com/speech-api/v1/synthesize` TTS URL
- **All of this is dead as of 2025.** Google returns a JS-only page. See `FIREFOX_BROKEN.md`.

## Storage (`browser.storage.local`)

```js
{
  language: 'en' | 'fr' | 'de' | 'es',             // default 'en'
  interaction: { dblClick: { key: 'none'|'ctrl'|'meta'|'alt'|'shift' } },  // default 'none'; 'meta' = Command on Mac
  history: { enabled: boolean },                   // default true
  definitions: { [word]: meaning }                 // history, written by background saveWord
}
```
The content script reads `language` and `interaction` **once** at injection (dictionary.js:207). Changed settings only apply to tabs loaded afterwards.

## Pop-up UI

- `div.dictionaryDiv` (absolute, z-index 1e6) on `document.body`, with an open shadow root holding inline CSS (`.mwe-popups*` classes, copied from Wikipedia's page previews).
- Placed below the word if it's in the top half of the viewport (`mwe-popups-no-image-tri`), above otherwise (`flipped_y`).
- `appendToDiv` finds the popup via `getRootNode().querySelectorAll("div")[1]`, which depends on element order.
- "More »" links to the Google define search.

## Options page

- Mac detection: `navigator.platform` contains "mac" -> the Ctrl option becomes "Command" with value `meta`.
- Download history = tab-separated `word\t\tmeaning` lines as `DictionaryAnywhere.txt`, via a Blob URL.

## Dev / testing

- Firefox: `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `manifest.json`. Background console: "Inspect".
- Chrome: `chrome://extensions` -> Developer mode -> Load unpacked. (Recent Chrome versions no longer run MV2.)

Known bugs: `BUGREPORT.md`. Why it's broken: `FIREFOX_BROKEN.md`.
