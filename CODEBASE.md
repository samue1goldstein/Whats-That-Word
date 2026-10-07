# Codebase map

Quick reference so nobody has to re-explore. ~450 lines of first-party JS, no build step, no dependencies, no tests.
Manifest V2. Uses the `browser.*` promise API (Firefox native; Chrome via the polyfill).

## Files

| File | Runs in | What it does |
|---|---|---|
| `manifest.json` | — | MV2 manifest, v1.2.0. Content script on `<all_urls>`, non-persistent background (event page), permissions `storage` + `https://en.wiktionary.org/`. Gecko ID `dictionary-anywhere-fork@samue1goldstein`. |
| `content_scripts/dictionary.js` | every page | Listens for `dblclick`, reads the selection, sends `{word, lang, time}` to the background, draws the pop-up in a shadow DOM. |
| `background/background.js` | background event page | Receives the message, looks the word up via the Wiktionary REST API (`en.wiktionary.org/api/rest_v1/page/definition/<word>`), replies `{content}`, saves to history. |
| `options/options.html/.js/.css` | options page | Language, trigger key, history on/off, download/clear history. |
| `common/browser-polyfill.js` | all contexts | Mozilla webextension-polyfill (MPL-2.0, third-party, don't edit). No-op in Firefox. |
| `icons/` | — | 48/64/96/128 PNGs. |

## Flow

```
dblclick (dictionary.js:192)
  -> TRIGGER_KEY check ('none' or e[`${key}Key`])
  -> showMeaning (:7)
       getSelectionInfo (:25)   trimmed selection text + bounding rect (needs non-empty)
       retrieveMeaning (:56)    browser.runtime.sendMessage({word, lang, time})
       createDiv (:60)          "Searching / Please Wait..." pop-up, shown immediately
  -> background onMessage (background.js:7)
       lookup (:33) x up to 3: lowercase/original casing in user's lang, then original casing in any lang
       extractMeaning (:43)     sendResponse({content})  content = {word, meaning, audioSrc: null} | null
       errors -> sendResponse({content: null})
       saveWord (:64) if history enabled
  -> appendToDiv (dictionary.js:151) or noMeaningFound (:178)
click anywhere not on the popup -> removeMeaning (:183) removes all .dictionaryDiv
```

## Definition source (background.js)

- English Wiktionary: definitions of words in **any** language, written in English (so "chien" -> "Dog").
- Response is keyed by language code (`en`, `fr`, `de`, `es`, ..., `other`). `extractMeaning` takes the first non-empty definition, preferring the user's language, then `en`, then anything.
- Definitions are HTML; `stripHtml` reduces them to text with `DOMParser` (never `innerHTML`).
- Titles are case-sensitive. German tries the original casing first (nouns are capitalized: "Haus"), other languages try lowercase first (sentence-initial "Dog").
- No audio: `audioSrc` is always `null`, so the speaker icon never shows.
- 404 = no entry. Sends `Api-User-Agent` as Wikimedia asks; `credentials: 'omit'`.

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
- "More »" links to `en.wiktionary.org/wiki/<word>`.

## Options page

- Mac detection: `navigator.platform` contains "mac" -> the Ctrl option becomes "Command" with value `meta`.
- Download history = tab-separated `word\t\tmeaning` lines as `DictionaryAnywhere.txt`, via a Blob URL.

## Dev / testing

- Firefox: `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `manifest.json`. Background console: "Inspect".
- Chrome: `chrome://extensions` -> Developer mode -> Load unpacked. (Recent Chrome versions no longer run MV2.)

Known bugs: `BUGREPORT.md`. Why the Google version broke: `FIREFOX_BROKEN.md`.
