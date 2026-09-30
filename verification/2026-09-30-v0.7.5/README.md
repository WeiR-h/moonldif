# v0.7.5 verification

Scope: workbench presentation and layout. Analysis, risk policies, report formats, limits, recovery and save state machines are unchanged. Compiler stays moonc 0.10.14+7d59c7ec9.

- [Core checks](verification.json): JS / Wasm GC, CLI, bounded reading, pagination, profiles, reproduction and examples.
- [Frozen v0.7.4 comparison](compatibility.json): 317 comparisons pass, excluding tool version.
- [Archive consumer](package-consumer.json): independent JS and Wasm GC consumption of the library ZIP. This is not registry installation.
- [Local browser workflows](local-result.json): Chromium / Firefox, including 50 analysis and cancellation cycles per engine, profile recovery, full reports, reproduction, error and timeout recovery. This run preceded final wordmark contrast and small typography adjustments; the final source is checked again by release CI.
- [Design and direct browser review](VISUAL-QA.md).

## Published release

Source `30af64e863409d77acb44e2bd30d7a31a3672821`:

- [Source CI](https://github.com/WeiR-h/moonldif/actions/runs/36687941602) and [stable tag / Pages CI](https://github.com/WeiR-h/moonldif/actions/runs/36688812260) pass, including Windows/Ubuntu and browsers.
- [Registry consumer CI](https://github.com/WeiR-h/moonldif/actions/runs/36688876315), [CLI download CI](https://github.com/WeiR-h/moonldif/actions/runs/36688974550), [local registry consumer](registry-0.7.5.json) and [public CLI consumer](cli-consumer.json) pass.
- [GitHub release](https://github.com/WeiR-h/moonldif/releases/tag/v0.7.5), [registry](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.5/) and [workbench](https://weir-h.github.io/moonldif/) are public.
- [Public attachments](release-assets.json) match SHA256SUMS. Local anonymous download timed out ([receipt](public075-download-first.json)); GitHub CLI retry succeeded. Anonymous dual-platform download is separately verified by CI.
- [Public Chromium/Firefox suite](public-result.json) passes actual report/LDIF downloads, reproduction, profile recovery, full pagination, startup/save faults and stability cycles.
- [Built-in browser record](in-app-public.json) confirms the new presentation and both workflows. This embedded host did not expose download completion, and its clipboard readback was empty despite the UI message. Those host-specific actions are not claimed as verified disk writes.

 Automated and agent-operated checks are not a third-party trial, personal full acceptance or an organizer decision.
