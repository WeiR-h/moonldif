# Same rules in local review and CI

All files are synthetic. The example permits at most 5 delete records per file, denies attribute clear and rename, and limits the file to 100 change records. These values are demonstrations, not production recommendations.

After building the repository:

```text
node dist/moonldif.js review examples/profiles/within.ldif --profile examples/profiles/rules.json --all --format json
node dist/moonldif.js review examples/profiles/exceeded.ldif --profile examples/profiles/rules.json --all --format markdown
node dist/moonldif.js review examples/profiles/incomplete.ldif --profile examples/profiles/rules.json --all --format json
```

Expected exit codes: 0, 1, 2 respectively. The incomplete file retains the known exceeded limit. Load rules.json in the workbench and run the same fixtures; search/filter does not change the overall result. Increase the delete limit to 6, recheck, and download the edited configuration for CLI reuse.

`node examples/profiles/check-ci.mjs report.json examples/profiles/rules.json examples/profiles/exceeded.ldif` saves a new report and exits 1. Report files include DNs; review your own artifact retention and access before uploading real reports.

The following workflow steps assume this repository and its pinned MoonBit toolchain are already checked out and built, with Node.js 24 available. Use explicit file paths:

```yaml
- name: Check maintenance plan
  run: node examples/profiles/check-ci.mjs report.json examples/profiles/rules.json examples/profiles/within.ldif
- name: Keep the diagnostic report
  if: always()
  uses: actions/upload-artifact@v7.0.1
  with:
    name: ldif-check
    path: report.json
```

Do not set continue-on-error on the check. An uploaded report does not convert an intercepted or incomplete plan into success. Each file's limits are independent; splitting a plan does not provide aggregate protection. No LDAP connection or operation is performed.
