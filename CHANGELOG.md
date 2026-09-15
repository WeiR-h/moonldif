# Changelog

## 0.1.0-dev.1 — 2026-09-15

First local development iteration; not published.

- Add byte-preserving LDIF content and basic change parsing with physical line spans.
- Add bounded unfolding, explicit unsupported diagnostics and an entry-deletion policy.
- Add deterministic semantic serialization with a reparse-and-compare gate.
- Add check, inspect and no-overwrite format CLI commands, JSON/text reports and three synthetic scenarios.
- Verify content interoperability with a pinned independent Python implementation.
- Add an optional moonldap 0.3.0 model adapter with real BER round-trip tests; reject operation controls and implicit content-to-add conversion.
- Prepare Windows/Ubuntu CI and local verification evidence. Remote CI, registry publication and organizer review remain pending.
