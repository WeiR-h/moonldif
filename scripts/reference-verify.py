"""Compare the actual MoonLDIF CLI with a pinned independent Python parser.

No third-party parser source is shipped. An explicitly supplied copy is hash
checked, or the pinned public source is downloaded to ignored local storage.
Only content records and ordered modify callbacks are used as oracle surfaces.
"""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
import pathlib
import random
import subprocess
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
COMMIT = "7ffae5b4f16eed9dae4ed3ab682396cd678acd5d"
SHA256 = "4bfd6cc743c4651e54a7a8e673586ccc42c5c632a0381f4775240aed4d7c080a"
URL = f"https://raw.githubusercontent.com/python-ldap/python-ldap/{COMMIT}/Lib/ldif.py"
parser = argparse.ArgumentParser()
parser.add_argument("--reference", type=pathlib.Path)
parser.add_argument("--node", default="node")
parser.add_argument("--output", type=pathlib.Path, default=ROOT / "verification/local/reference.json")
args = parser.parse_args()
local = ROOT / "verification/local"
local.mkdir(parents=True, exist_ok=True)
reference = args.reference or local / "reference_ldif.py"
if not reference.exists():
    reference.write_bytes(urllib.request.urlopen(URL, timeout=30).read())
if hashlib.sha256(reference.read_bytes()).hexdigest() != SHA256:
    raise SystemExit("Reference source hash mismatch; refusing execution.")
spec = importlib.util.spec_from_file_location("independent_ldif", reference)
ldif = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ldif)
def no_url(*_args, **_kwargs):
    raise AssertionError("External value resolution is prohibited during verification")
ldif.urlopen = no_url

def oracle(text, changes=False):
    p = ldif.LDIFRecordList(io.BytesIO(text.encode("utf8")), process_url_schemes=[])
    if changes:
        p.parse_change_records()
        return p.all_modify_changes
    p.parse_entry_records()
    return p.all_records

def invoke(path, *flags):
    completed = subprocess.run([args.node, str(ROOT / "dist/moonldif.js"), "inspect", str(path), "--format", "json", *flags], capture_output=True, encoding="utf8", timeout=15)
    if completed.returncode != 0:
        raise AssertionError(completed.stdout + completed.stderr)
    return json.loads(completed.stdout)["document"]["records"]

def as_entries(records):
    output = []
    for r in records:
        assert r["body"]["type"] == "entry"
        attrs = {}
        for a in r["body"]["attributes"]:
            assert a["value"]["kind"] == "inline"
            attrs.setdefault(a["name"], []).append(base64.b64decode(a["value"]["base64"], validate=True))
        output.append((r["dn"], attrs))
    return output

base = "version: 1\n\ndn: cn=fixture,dc=example,dc=org\nobjectClass: top\ncn: fixture\ndescription: alpha\n  beta\nphoto:: /wA=\nempty:\nmember: one\nmember: two\n\n"
cases = [("fold-empty-binary-multivalue", base), ("crlf", base.replace("\n", "\r\n")),
         ("project-export", (ROOT / "examples/01-directory-export.ldif").read_text(encoding="utf8")),
         ("initial-and-trailing-spaces", "version: 1\ndn: cn=A\ncn:: IEEg\ndescription:: OmNvbG9u\nother:: PGFuZ2xl\n\n"),
         ("empty-root-dn", "version: 1\ndn:\nobjectClass: top\n\n"),
         ("multiple-entries", base + "dn: cn=second\ncn: second\n\n")]
rng = random.Random(2849)
all_bytes = [bytes(range(256)), b"", "中文🙂".encode(), b"\x00\r\n\t", b" leading "]
all_bytes += [bytes(rng.randrange(256) for _ in range(n)) for n in range(1, 300, 19)]
cases.append(("deterministic-byte-corpus", "version: 1\ndn: cn=bytes\n" + "".join("data:: " + base64.b64encode(b).decode() + "\n" for b in all_bytes) + "\n"))
checks = []
try:
    with tempfile.TemporaryDirectory(prefix="oracle-", dir=local) as folder:
        folder = pathlib.Path(folder)
        for index, (name, text) in enumerate(cases):
            source = folder / f"input-{index}.ldif"
            target = folder / f"output-{index}.ldif"
            source.write_text(text, encoding="utf8", newline="")
            expected = oracle(text)
            assert as_entries(invoke(source)) == expected, name
            result = subprocess.run([args.node, str(ROOT / "dist/moonldif.js"), "format", str(source), "--output", str(target)], capture_output=True, encoding="utf8", timeout=15)
            assert result.returncode == 0, result.stdout
            assert oracle(target.read_text(encoding="utf8")) == expected, name
            rendered = io.StringIO()
            writer = ldif.LDIFWriter(rendered)
            for dn, attributes in expected:
                writer.unparse(dn, attributes)
            source.write_text(rendered.getvalue(), encoding="utf8", newline="")
            assert as_entries(invoke(source, "--compat")) == expected, name
            checks.append({"case": name, "parse_comparison": "passed", "our_writer_reference_reader": "passed", "reference_writer_our_reader": "passed"})
        modify = "version: 1\ndn: cn=A\nchangetype: modify\ndelete: cn\ncn: A\n-\nadd: cn\ncn: B\n-\nreplace: photo\nphoto:: /wA=\n-\n\n"
        source = folder / "modify.ldif"
        source.write_text(modify, encoding="utf8", newline="")
        records = invoke(source)
        codes = {"add": 0, "delete": 1, "replace": 2}
        actual = [(r["dn"], [(codes[m["operation"]], m["attribute"], [base64.b64decode(a["value"]["base64"]) for a in m["values"]]) for m in r["body"]["modifications"]], None) for r in records]
        expected = oracle(modify, changes=True)
        assert actual == expected, repr((actual, expected))
        checks.append({"case": "ordered-modify", "parse_comparison": "passed"})
except Exception as exc:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"status": "failed", "completed": checks, "error": str(exc)}, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    raise
result = {"status": "passed", "scope": "Seven synthetic content cases (three directions) and one ordered modify case; no LDAP server validation", "reference_commit": COMMIT, "reference_sha256": SHA256, "reference_url": URL, "external_url_access": "blocked", "checks": checks}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
print(f"Independent comparison passed: {len(checks)} cases; evidence: {args.output}")
