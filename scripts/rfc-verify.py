"""Exercise all seven RFC 2849 examples, preserving published failures separately.

The downloaded RFC is not shipped. Only page furniture is removed for raw cases;
documented publication fixes are applied to separately named prepared variants.
External values stay external, so examples 5 and 6 must remain incomplete.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = "https://www.rfc-editor.org/rfc/rfc2849.txt"
SHA256 = "ce2f125a7a765b1cd19ff23e14517ee4148f3ed29a825e3d22a57a3f119acb07"
parser = argparse.ArgumentParser()
parser.add_argument("--reference", type=Path, default=ROOT / "verification/local/research/rfc2849.txt")
parser.add_argument("--node", default="node")
args = parser.parse_args()
folder = ROOT / "verification/local/rfc"
folder.mkdir(parents=True, exist_ok=True)
evidence = {"source": URL, "sha256": SHA256, "version": json.loads((ROOT / "package.json").read_text())["version"],
            "status": "running", "examples": [], "external_resolution": "never attempted"}
try:
    if not args.reference.exists():
        args.reference.parent.mkdir(parents=True, exist_ok=True)
        args.reference.write_bytes(urllib.request.urlopen(URL, timeout=30).read())
    raw = args.reference.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == SHA256, "RFC text hash mismatch"
    text = raw.decode("utf8").replace("\r\n", "\n")
    # The official plaintext pagination occurs inside example 4 and 6. Remove
    # footer/form-feed/header together, not arbitrary empty record separators.
    text = re.sub(r"\n{3,}Good[^\n]*\[Page (\d+)\]\n\f\nRFC 2849[^\n]*\n{3}",
                  lambda m: "\n\n" if m[1] == "10" else "\n", text)
    sections = re.split(r"(?m)^Example [1-7]:", text[text.index("Examples of LDAP Data Interchange Format"):])
    fixes = {
        1: [], 2: [],
        3: ["Add one continuation space to three Base64 continuation lines, per erratum 2258 (Held for Document Update)."],
        4: ["Prefix the stranded JapaneseGivenname comment continuation with '# '; project editorial repair, not a verified erratum."],
        5: ["Remove the blank line splitting the Horatio cn attributes; project editorial repair. Keep the external file value unresolved."],
        6: ["Remove the blank line between the postaladdress modification terminator and delete: description; project editorial repair. Keep the external file value unresolved."],
        7: [],
    }
    for index in range(1, 8):
        section = sections[index]
        body = section[section.index("version: 1"):]
        if index == 7:
            body = body[:body.index("Security Considerations")]
        body = body.rstrip() + "\n\n"
        prepared = body
        if index == 3:
            prepared = re.sub(r"(?m)^(IGlzIG|VyIGlu|b3V0IG)([^\n]*)", r" \1\2", prepared)
        if index == 4:
            prepared = prepared.replace("\n<JapaneseGivenname_in_phonetic_representation_kana>", "\n# <JapaneseGivenname_in_phonetic_representation_kana>")
        if index == 5:
            prepared = prepared.replace("cn: Horatio Jensen\n\ncn:", "cn: Horatio Jensen\ncn:")
        if index == 6:
            prepared = prepared.replace("postaladdress: 123 Anystreet $ Sunnyvale, CA $ 94086\n-\n\ndelete:", "postaladdress: 123 Anystreet $ Sunnyvale, CA $ 94086\n-\ndelete:")
        item = {"example": index, "preparation": fixes[index], "name_profile": "explicit legacy separator-space mode, no DN rewrite"}
        for kind, content in [("published", body), ("prepared", prepared)]:
            path = folder / f"example-{index}-{kind}.ldif"
            path.write_text(content, encoding="utf8", newline="")
            result = subprocess.run([args.node, str(ROOT / "dist/moonldif.js"), "check", str(path), "--legacy-dn-spaces", "--format", "json"], capture_output=True, encoding="utf8", timeout=15)
            report = json.loads(result.stdout)
            item[kind] = {"exit_code": result.returncode, "status": report["status"], "records": report["record_count"], "diagnostics": report["diagnostics"], "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
            expected = (0 if index in [1, 2, 7] else 2) if kind == "published" else (2 if index in [5, 6] else 0)
            assert result.returncode == expected, f"example {index} {kind}: {result.stdout}"
            if kind == "prepared":
                assert report["record_count"] == {1: 2, 2: 1, 3: 1, 4: 2, 5: 1, 6: 6, 7: 1}[index]
                assert report["status"] == ("incomplete" if index in [5, 6] else "complete")
                if index in [5, 6]:
                    assert any(d["code"] == "external-value-unresolved" for d in report["diagnostics"])
        evidence["examples"].append(item)
    evidence["status"] = "passed"
except Exception as error:
    evidence["status"] = "failed"
    evidence["error"] = str(error)
    raise
finally:
    (folder.parent / "rfc-reference.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"status": evidence["status"], "examples": len(evidence["examples"])}))
