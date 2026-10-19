# LUNAVYRA — The Ultimate Automatic Infinite Girl Profile Universe

This repository contains a static, client-side implementation of LUNAVYRA: an infinite, deterministic profile generator and viewer designed to run on GitHub Pages or any static host. The implementation focuses on a logically unbounded profile universe with bounded physical resources using virtualization and a rolling scroll window.

Files
- index.html — application entry point
- style.css — dark premium theme and responsive layout
- script.js — core logic for deterministic generation, virtualization, exact-ID search, viewer, Profiles.txt parsing, and tests
- Profiles.txt — example user-supplied profiles (editable)
- Post.txt — optional documented example format for posts
- README.md — this file

Key features implemented
1. No application-defined last profile — generator defines a profile for every positive decimal ID.
2. Deterministic identity per exact decimal ID — names, bios, and SVG portraits are deterministic and derived from the canonical decimal string.
3. Unlimited-length exact decimal search — the search accepts arbitrarily long decimal strings (as allowed by the browser environment), preserves digits exactly, and computes profiles directly from the input without iterating predecessors.
4. Continuous automatic infinite scrolling — the feed prepares rows ahead of the viewport, uses IntersectionObserver plus an rAF scroll-based replenisher, and replenishes automatically.
5. Rolling-window virtualization and rebasing — the virtualizer mounts a bounded number of rows and rebases physical spacers when they grow too large to avoid scroll-coordinate limits.
6. Profiles.txt override — local Profiles.txt entries can supply name and media (image/video) and override generated profiles for those IDs (IDs assigned by position starting from 1).
7. Deterministic SVG portrait generator — a local, deterministic SVG generator provides varied portraits for profiles without supplied media. The site does not depend on external paid APIs.
8. Full portrait viewer — open card avatars to view the full image in an overlay with zoom, rotate, reset, and close controls.
9. Robust data handling — Profiles.txt is parsed robustly with tolerance for CRLF/LF and malformed records.
10. Automated in-page tests — the page runs a set of tests on load that exercise generation, rebase, search for very long IDs, parser resilience, and virtualization bounds. Results are logged in the in-page console.

Important implementation notes
- ID canonicalization: inputs are trimmed, a leading '+' is allowed, but leading zeros are normalized away. "0" and empty input are rejected as invalid (IDs must be positive decimal strings).
- Exact arithmetic: the code uses BigInt where available and string-based arithmetic for division/addition when falling back to long strings. For incrementing a very long decimal string we use string-digit math to ensure exactness.
- Mapping: here the logical mapping is ID decimal string ↔ profile identity. The row index for display is computed as floor((ID-1) / itemsPerRow) so the feed's logical order is exactly increasing decimal IDs (1,2,3...).
- Profiles.txt assignment: manual records are assigned IDs sequentially starting at 1 in file order. Inserting/removing records will change assigned IDs — the README and UI note this behavior. For stable persistent IDs, an extension could add an explicit ID column in Profiles.txt (not implemented here).
- Portraits: if a Profiles.txt record supplies a URL, the card uses that URL for the avatar with a deterministic SVG fallback if the media fails to load. Generated portraits are SVG data URLs and are explicitly synthetic (not claimed as photographs).
- Virtualization: the implementation uses fixed row height (CSS and JS constant) to simplify accurate spacer math and rebasing. This keeps layout stable and avoids cumulative layout shift.
- Replenishment: while IntersectionObserver is used, the feed also listens to scroll & resize events and uses requestAnimationFrame-driven replenishment to avoid being dependent solely on observer callbacks.
- Bounded DOM: mounted rows are bounded via MAX_MOUNTED_ROWS. Off-screen rows are removed and recreated near the viewport as needed. Memory usage is bounded, and no accumulation of DOM nodes should occur during prolonged browsing.

Tests run on page load
The page executes a suite of automated tests and reports results in the UI console area and the browser console:
- Generator simulation for 500 consecutive sequential cycles (non-DOM) — ensures determinism and non-terminal operation.
- Rebase logic invocation — ensures rebase does not cause errors.
- Exact ID generation tests for sample IDs including 100-, 500-, and 1,000-digit IDs.
- Parser resilience with malformed Profiles.txt content.
- Virtualizer bounded DOM check by repeated buffer calls.

Honest limitations and tests that require manual/environment verification
- The automated tests run in the browser environment but cannot fully and exhaustively validate long-duration memory growth across many hours, or CPU/GC behavior on low-memory budget Android devices. Please perform manual testing/profiling on target devices to confirm long-session stability under realistic conditions.
- Network failure sequences (e.g., cdn image outages, flaky video streams) are partially simulated by checking image error handlers, but real-world CDN behaviors, timeouts, and cross-origin restrictions depend on hosting and browser behavior.
- Extremely large decimal input sizes are accepted, but your browser's memory limits and JavaScript engine may limit processing of enormously large strings (e.g., multi-million-digit inputs). The UI reports resource problems if the browser cannot complete the requested operation rather than silently truncating.

Deployment (GitHub Pages)
- Place all files in the repository root (or in a /docs directory if you use GitHub Pages with docs folder) and enable GitHub Pages from the repository settings.
- The site uses relative paths (./style.css, ./script.js, ./Profiles.txt) so it works from project pages (https://<user>.github.io/<repo>/) without changes.

Extensibility ideas (not required)
- Add explicit ID fields to Profiles.txt to provide stable manual IDs independent of file position.
- Improve portrait generator complexity or add optional integration with a configurable external image provider (kept optional and never required).
- Add a lightweight persisted cache with a size budget to reduce recomputation of complex portraits during a session.

Security and content note
All profiles are fictional and generated locally. The UI and README make no claims about real people.

If you want, I can:
- Add explicit per-record ID support for Profiles.txt (so manual records retain stable IDs when reordered).
- Add a toggle to persist a small LRU cache of generated portraits in sessionStorage with a controlled memory budget.
- Add an alternate generator algorithm for different aesthetics.

What I did next
- Implemented complete site files above with the features described and an in-page automated test suite.
- The test suite logs results and notes the items that require manual verification.

How to view and test locally
1. Save the files into a folder.
2. Open index.html in a modern browser (Chrome, Firefox, Edge, Safari). For some browsers fetching local files may be blocked; to fully emulate GitHub Pages, serve the folder via a simple static server:
   - Python 3: python -m http.server 8000
   - Then open http://localhost:8000
3. Use the search icon to search exact decimal IDs (try 1, 99, 1000000, and a 100-digit ID like 1 repeated 100 times).
4. Scroll continuously to see automatic generation, virtualization, and rebasing (inspected via console logs).
5. Inspect the in-page console (bottom-left) for test results and status messages.

If you'd like, I can:
- Add explicit per-record IDs in Profiles.txt (with backward-compatible parsing).
- Reduce the fixed-row assumptions by measuring row heights dynamically (at the expense of slightly more complex spacer math).
- Integrate an optional static JSON manifest for user overrides with assigned IDs.

Thank you — tell me which extension you'd like next (stable manual IDs in Profiles.txt, session cache, or alternate portrait aesthetic), or I can open a PR/commit these files into your repo if you give the repository details and want me to push them directly.
