# LUNAVYRA

A static, profile-focused fictional identity universe for GitHub Pages. No backend, build step, paid API, or external framework is required.

## Files

- `index.html` — accessible app shell and dialogs.
- `style.css` — responsive dark theme.
- `script.js` — deterministic profile generation, exact decimal IDs, virtualized feed, search, data parsing, and portrait viewer.
- `Profiles.txt` — optional supplied profiles.
- `Post.txt` — optional post data example (currently informational; see limitation below).

## Run locally

Because browsers commonly block `fetch()` from `file://`, run a local static server from this directory, for example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

Upload all files to the repository root and enable Pages for the desired branch/folder. All asset and data requests use project-relative paths (`./style.css`, `./script.js`, `./Profiles.txt`) so a repository project site works without root-domain assumptions.

Repository name: `lunavyra-infinite-girl-profiles`  
Visible brand: `LUNAVYRA`

## Profiles.txt format

Each record has three non-empty fields separated by a line containing only `$`:

```text
$
Mira Vale
$
https://example.com/mira.jpg
$
https://example.com/mira-profile
$
Luna Rey
$
https://example.com/luna.webm
$
https://example.com/luna-profile
$
```

The three fields are name, portrait URL, and profile URL. Blank lines are ignored; CRLF and LF are supported. Only HTTP(S) URLs are accepted. Missing or invalid image URLs fall back to a generated SVG portrait. Configured records currently receive IDs in file order starting at `1`; inserting/reordering records can change those IDs. To preserve permanent manual IDs, add an explicit-ID format before relying on this sample convention.

The file ending does not end the generated universe. If fetch fails, generated profiles still work.

## IDs and deterministic identities

IDs are canonical decimal strings, with leading zeroes removed. Empty values, zero, negatives, decimals, spaces, and non-digits are rejected. The full ID is never converted to a JavaScript `Number`; incrementing uses decimal-string arithmetic. The profile seed is a stable 32-bit hash of the entire ID string, so identity generation is direct and does not require creating preceding profiles. The SVG portrait is a locally rendered illustration, not a photograph of a real person. Generated characters are fictional adults.

## Scrolling architecture

The feed uses a bounded physical scroll window and renders only a small set of nearby rows. The logical row base is stored separately as `BigInt`. When the physical scroll position crosses a threshold, the viewport is shifted and the logical base is adjusted to preserve the visible logical row. A passive scroll listener plus scheduled rendering replenishes the rendered window; it does not rely on an `IntersectionObserver` sentinel. DOM row count is bounded by the current buffer rather than the total number of profiles visited.

## Current limitations (important)

- This is an infinite-feeling logical sequence within browser resource limits, not a mathematical proof of infinity. Very large input strings still consume finite memory/time.
- Configured records use positional IDs, so changing `Profiles.txt` can change their assigned IDs.
- `Post.txt` is currently a documented optional placeholder format; post rendering is not fully implemented.
- The profile URL is parsed and retained but there is no separate external-profile navigation control yet.
- Portrait illustrations are deterministic SVGs. A stable hash can collide, so distinct IDs are guaranteed to remain distinct identifiers, but generated names/visual traits are not guaranteed globally unique.
- Media URLs with no recognizable extension are treated as images. For extensionless video URLs, use a future explicit media-type field.
- Rebase thresholds and layout behavior are implemented but require real-device browser testing for smoothness across all browsers.

## Tests

Run the included Node tests with:

```sh
node tests.js
```

The tests cover ID validation, 100/500/1,000-digit IDs, direct deterministic generation, sequential decimal incrementing, data-file parsing, and repeated virtual-window coordinate rebasing. They do not replace automated real-browser tests for touch behavior, media loading, visual jumps, memory profiling, or GitHub Pages deployment.
