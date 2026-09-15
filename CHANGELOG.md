# Changelog

## 0.1.0-dev.3 — 2026-09-15

Third local development iteration; not published.

- Add ordered, source-linked operation review without exposing attribute values or changing input/policy status; retain incomplete results and bound review output.
- Add review CLI and MoonBit browser bridge using the same analysis and checked writer.
- Add a local React workbench with worker isolation, file/edit revision guards, diagnostic navigation and checked downloads.
- Verify desktop/mobile layouts and actual file import, repair, policy, export and failure flows; independently compare the downloaded file through the CLI.
- Expand to 30 core tests on JS/Wasm GC and 9 CLI groups; rerun Python, Java SDK, RFC and moonldap comparisons.
- Add locked browser dependencies and production build to the prepared dual-platform CI. Remote CI remains unverified.

## 0.1.0-dev.2 — 2026-09-15

Second local development iteration; not published.

- Add RFC 4514 DN/RDN syntax diagnostics and an explicit legacy separator-space mode; preserve physical locations and original names.
- Add independent UnboundID SDK comparisons across all change types, with two control encoding differences reported explicitly.
- Verify all seven RFC examples, separating original publication errors from documented prepared variants.
- Write empty control values using interoperable Base64; report whole-control encoding as unsupported.
- Verify the core on JS and Wasm GC; add repeatable scale measurements through 10,000 records.
- Compare writer round-trips directly without duplicate JSON trees; avoid allocating unused location reports.
- Document official award project benchmarks, remaining competitive gates and precise support limits.

## 0.1.0-dev.1 — 2026-09-15

First local development iteration; not published.

- Add byte-preserving LDIF content and basic change parsing with physical line spans.
- Add bounded unfolding, explicit unsupported diagnostics and an entry-deletion policy.
- Add deterministic semantic serialization with a reparse-and-compare gate.
- Add check, inspect and no-overwrite format CLI commands, JSON/text reports and three synthetic scenarios.
- Verify content interoperability with a pinned independent Python implementation.
- Add an optional moonldap 0.3.0 model adapter with real BER round-trip tests; reject operation controls and implicit content-to-add conversion.
- Prepare Windows/Ubuntu CI and local verification evidence. Remote CI, registry publication and organizer review remain pending.
