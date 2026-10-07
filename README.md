# Whats That Word! (WTW)
**Whats That Word!** helps you stay focused on what you are reading by eliminating the need to search for meaning.
Double-clicking any word will view its definition in a small pop-up bubble.
Now you never have to leave what you are reading to search for the meaning of the words you don't yet know.

Definitions come from [Wiktionary](https://en.wiktionary.org/).

## Credits and license
Whats That Word! is a fork of [Dictionary Anywhere](https://github.com/meetDeveloper/Dictionary-Anywhere) by Suraj Jain (meetDeveloper), licensed under GPL-3.0. This fork is also GPL-3.0; see `LICENSE`.

## Changes in this fork
Modified by samue1goldstein:
- 2026-10-07: definitions now come from the Wiktionary API instead of scraping Google (which stopped working), added a Firefox add-on ID, and fixed the pop-up hanging on errors. Pronunciation audio was removed (no source).
- 2026-10-08: renamed to Whats That Word!, faster lookups (parallel requests), looked-up text capped at 50 characters, "Looking up" loading animation.
