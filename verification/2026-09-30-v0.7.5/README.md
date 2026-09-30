# v0.7.5 verification

Scope: workbench presentation and layout. Analysis, risk policies, report formats, limits, recovery and save state machines are unchanged. Compiler stays moonc 0.10.14+7d59c7ec9.

- [Core checks](verification.json): JS / Wasm GC, CLI, bounded reading, pagination, profiles, reproduction and examples.
- [Frozen v0.7.4 comparison](compatibility.json): 317 comparisons pass, excluding tool version.
- [Archive consumer](package-consumer.json): independent JS and Wasm GC consumption of the library ZIP. This is not registry installation.
- [Local browser workflows](local-result.json): Chromium / Firefox, including 50 analysis and cancellation cycles per engine, profile recovery, full reports, reproduction, error and timeout recovery. This run preceded final wordmark contrast and small typography adjustments; the final source is checked again by release CI.
- [Design and direct browser review](VISUAL-QA.md).

Release, public downloads and exact-version registry evidence are added only after completion. Automated and agent-operated checks are not a third-party trial, personal full acceptance or an organizer decision.
