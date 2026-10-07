# Codebase map

Quick reference so nobody has to re-explore. ~450 lines of first-party JS, no build step, no dependencies, no tests.
Manifest V2. Uses the `browser.*` promise API (Firefox native; Chrome via the polyfill).

## Files

| File | Runs in | What it does |
|---|---|---|
| `manifest.json` | — | MV2 manifest, v1.2.0. Content script on `<all_urls>`, non-persistent background (event page), permissions `storage` + `https://en.wiktionary.org/`. Gecko ID `dictionary-anywhere-fork@samue1goldstein`. |
| `content_scripts/dictionary.js` | every page | Listens for `dblclick`, reads the selection, sends `{word, lang}` to the background, draws the pop-up in a shadow DOM. |
| `background/background.js` | background event page | Receives the message, looks the word up via the Wiktionary REST API (`en.wiktionary.org/api/rest_v1/page/definition/<word>`), replies `{content}`, saves to history. |
| `options/options.html/.js/.css` | options page | Language, trigger key, history on/off, download/clear history. |
| `common/browser-polyfill.js` | all contexts | Mozilla webextension-polyfill (MPL-2.0, third-party, don't edit). No-op in Firefox. |
| `icons/` | — | 48/64/96/128 PNGs. |

## Flow

```
dblclick (dictionary.js:181)
  -> ignored if the target is editable (input/textarea/select/contenteditable)
  -> TRIGGER_KEY check ('none' or e[`${key}Key`])
  -> showMeaning (:7)
       getSelectionInfo (:25)   trimmed selection text + bounding rect (needs non-empty)
       sendMessage (:13)        browser.runtime.sendMessage({word, lang})
       createDiv (:53)          pop-up with the word + "Looking up…", shown immediately
  -> background onMessage (background.js:3)
       lookup (:25) x up to 3: lowercase/original casing in user's lang, then original casing in any lang
       extractMeaning (:35)     sendResponse({content})  content = {word, meaning} | null
       errors -> sendResponse({content: null})
       saveWord (:56) checks history setting, then saves
  -> appendToDiv (dictionary.js:152) or noMeaningFound (:158, shows "Search Wiktionary »")
click anywhere not on the popup, or Escape -> removeAllPopups (:171) removes all .dictionaryDiv
```

## Definition source (background.js)

- English Wiktionary: definitions of words in **any** language, written in English (so "chien" -> "Dog").
- Response is keyed by language code (`en`, `fr`, `de`, `es`, ..., `other`). `extractMeaning` takes the first non-empty definition, preferring the user's language, then `en`, then anything.
- Definitions are HTML; `stripHtml` reduces them to text with `DOMParser` (never `innerHTML`).
- Titles are case-sensitive. German tries the original casing first (nouns are capitalized: "Haus"), other languages try lowercase first (sentence-initial "Dog").
- No audio (Wiktionary has none).
- 404 = no entry. Sends `Api-User-Agent` as Wikimedia asks; `credentials: 'omit'`.

## Storage (`browser.storage.local`)

```js
{
  language: 'en'|'nl'|'fr'|'de'|'it'|'ja'|'la'|'pl'|'pt'|'ru'|'es',  // default 'en'; language the user READS (definitions are always English)
  interaction: { dblClick: { key: 'none'|'ctrl'|'meta'|'alt'|'shift' } },  // default 'none'; 'meta' = Command on Mac
  history: { enabled: boolean },                   // default true
  definitions: { [word]: meaning }                 // history, written by background saveWord
}
```
The content script reads `language` and `interaction` **once** at injection (dictionary.js:192). Changed settings only apply to tabs loaded afterwards.

## Pop-up UI

- `div.dictionaryDiv` (absolute, z-index 1e6) on `document.body`, with an open shadow root holding inline CSS (`.mwe-popups*` classes, copied from Wikipedia's page previews).
- Placed below the word if it's in the top half of the viewport (`mwe-popups-no-image-tri`), above otherwise (`flipped_y`).
- `flipped_y` uses `transform: translateY(-100%)`, so `top` is the popup's bottom edge and it grows upward as content arrives (no re-measuring).
- Entrance: 150ms opacity + `scale(0.97)` from the arrow via `@starting-style` (Firefox 129+; older versions just skip it). Reduced motion: fade only.
- Dark colors under `prefers-color-scheme: dark`. No audio button (Wiktionary has no audio).
- "More »" links to `en.wiktionary.org/wiki/<word>`.

## Options page

- Mac detection: `navigator.platform` contains "mac" -> the Ctrl option becomes "Command" with value `meta`.
- Download history = tab-separated `word\t\tmeaning` lines as `DictionaryAnywhere.txt`, via a Blob URL.

## Dev / testing

- Firefox: `about:debugging#/runtime/this-firefox` -> Load Temporary Add-on -> `manifest.json`. Background console: "Inspect".
- Chrome: `chrome://extensions` -> Developer mode -> Load unpacked. (Recent Chrome versions no longer run MV2.)

Known bugs: `BUGREPORT.md`. Why the Google version broke: see git history of `FIREFOX_BROKEN.md` (removed).
