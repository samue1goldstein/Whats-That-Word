# Why the extension no longer works (Firefox)

## Symptom
Double-clicking a word shows "Searching / Please Wait...", then "Sorry, No definition found." for every word. Depending on the response, it can also stay stuck on "Please Wait...".

## Root cause: Google Search no longer serves results without JavaScript

The whole extension depends on scraping Google's server-rendered "define" card (`background/background.js:9-17, 31-70`):

```js
url = `https://www.google.com/search?hl=${lang}&q=define+${word}&gl=US`;
fetch(url) -> DOMParser -> document.querySelector("[data-dobid='hdw']")
```

Since early 2025, Google Search requires JavaScript. A plain `fetch` gets back a JS bootstrap shell with no results in it.

**Verified 2026-10-04** by requesting exactly that URL with a Firefox user agent:
- HTTP 200, ~93 KB, but **zero** `data-dobid` attributes in the HTML
- The page contains a `<noscript>` redirect to `/httpservice/retry/enablejs?sei=...`

`DOMParser` doesn't run scripts, so `[data-dobid='hdw']` is never found, `extractMeaning` returns `null`, and the pop-up shows "No definition found".

### Why it may have kept working in Chrome a little longer
The last upstream commit (`59805f4`, May 2025, "Removed credentials:omit to fix issue") made the fetch send the user's google.com cookies. The author presumably saw that requests with cookies still got a usable page in Chrome.
Firefox handles cookies for extension background requests differently (Total Cookie Protection / partitioning), so the user's Google cookies probably aren't attached there.
*Not verified.* Only the cookie-less request was tested. Either way, depending on Google's cookie behaviour isn't a real fix: Google can change it at any time, and it ties every lookup to the user's Google account.

## Things that make it worse (not the root cause)
- **Errors leave the pop-up stuck.** There's no `.catch` on the fetch, and `meaning[0].toUpperCase()` throws when the headword exists but the definition div doesn't. Either way `sendResponse` is never called and the pop-up sits on "Please Wait..." forever. (BUGREPORT #2, #3)
- **The audio endpoint** `google.com/speech-api/v1/synthesize` is an old, undocumented API. Assume it's dead too.

## Not the cause (checked)
- **Manifest V2:** Firefox still supports MV2 extensions.
- **The `browser.*` API / polyfill:** native in Firefox, works.
- **`sendResponse` + `return true`:** supported in Firefox.
- **`chrome_style` in `options_ui`:** Firefox just warns about an unknown key.

## Fix: replace the Google scraper with a real dictionary API

Only `background/background.js` needs to change. Keep the response shape `{word, meaning, audioSrc}` so the content script stays the same.

| Option | Languages | Audio | Status at time of check |
|---|---|---|---|
| **Wiktionary REST** `https://en.wiktionary.org/api/rest_v1/page/definition/<word>` | All four (en/fr/de/es); results are grouped by language name | No | **HTTP 200, works** |
| Free Dictionary API `https://api.dictionaryapi.dev/api/v2/entries/en/<word>` | English only | Yes (mp3 URLs) | **HTTP 522 (down)** at time of check; unreliable |

Recommendation: Wiktionary, with these changes:
- In `manifest.json` permissions, swap `https://www.google.com/` for `https://en.wiktionary.org/`.
- Pick the entry whose `language` matches the user's setting (English/French/German/Spanish).
- Definitions contain HTML links. Strip them (use `DOMParser` + `textContent`); never insert them with `innerHTML`.
- `encodeURIComponent(word.trim())`.
- Point "More »" at `https://en.wiktionary.org/wiki/<word>`.
- Wikimedia asks API clients to send a descriptive `User-Agent` / `Api-User-Agent` header.

Also fix BUGREPORT #2–#4 at the same time so failures show "No definition found" instead of hanging.
