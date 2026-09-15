"""Three-way semantic checks against pinned UnboundID LDAP SDK; offline fixtures only.

Requires Java 17+ and javac. The SDK is a test oracle, never a shipped dependency.
Attribute descriptions are case/option-order normalized and grouped for comparison;
record, modification and value sequences remain ordered. No DN equality is inferred.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import random
import re
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
VERSION = "7.0.5"
SHA256 = "463f0ee93f8046c6f72766f111fc27b18ab4727541968b9fa72699023e1b0ff0"
URL = f"https://repo.maven.apache.org/maven2/com/unboundid/unboundid-ldapsdk/{VERSION}/unboundid-ldapsdk-{VERSION}.jar"
parser = argparse.ArgumentParser()
parser.add_argument("--jar", type=Path, default=ROOT / f".tools/unboundid/unboundid-ldapsdk-{VERSION}.jar")
parser.add_argument("--java", default="java")
parser.add_argument("--javac", default="javac")
parser.add_argument("--node", default="node")
parser.add_argument("--output", type=Path, default=ROOT / "verification/local/sdk-reference.json")
args = parser.parse_args()
args.jar = args.jar.resolve()
evidence = {"oracle": f"UnboundID LDAP SDK {VERSION}", "sha256": SHA256, "source": URL,
            "version": json.loads((ROOT / "package.json").read_text())["version"],
            "status": "running", "cases": [], "scope": "LDIF byte values and ordered changes; no server or schema validation"}


def run(command):
    result = subprocess.run(command, cwd=ROOT, capture_output=True, encoding="utf8", errors="replace", timeout=60)
    if result.returncode or "AccessDeniedException" in result.stderr:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout


def key(name):
    parts = name.lower().split(";")
    return ";".join([parts[0], *sorted(parts[1:])])


def attrs(items):
    result = {}
    for item in items:
        result.setdefault(key(item["name"]), []).append(item["value"]["base64"])
    return result


def ours(path):
    data = json.loads(run([args.node, str(ROOT / "dist/moonldif.js"), "inspect", str(path), "--format", "json"]))
    records = data["document"]["records"]
    for record in records:
        for control in record["controls"]:
            if control["value"] is not None:
                control["value"] = control["value"]["base64"]
        body = record["body"]
        if "attributes" in body:
            body["attributes"] = attrs(body["attributes"])
        if "modifications" in body:
            for mod in body["modifications"]:
                mod["attribute"] = key(mod["attribute"])
                mod["values"] = [a["value"]["base64"] for a in mod["values"]]
    return records


cases = [(p.stem, p.read_text(encoding="utf8")) for p in sorted((ROOT / "examples").glob("0[123]-*.ldif"))]
cases += [
    ("empty-root-entry", "dn:\nobjectClass: top\n"),
    ("modify-empty-delete-replace", "dn: cn=A\nchangetype: modify\ndelete: description\n-\nreplace: mail\n-\n"),
    ("ordered-repeated-modifications", "dn: cn=A\nchangetype: modify\ndelete: cn\ncn: A\n-\nadd: cn\ncn: B\n-\nreplace: cn\ncn: C\n-\n"),
    ("rename-without-superior", "dn: cn=A,dc=example\nchangetype: modrdn\nnewrdn: cn=B+uid=42\ndeleteoldrdn: 0\n"),
    ("move-to-root", "dn: cn=A,dc=example\nchangetype: moddn\nnewrdn: cn=B\ndeleteoldrdn: 1\nnewsuperior:\n"),
    ("controls-absent-empty-binary", "dn: cn=A\ncontrol: 1.2.3 true\ncontrol: 1.2.4 false::\ncontrol: 1.2.5 true:: /wAB\nchangetype: delete\n"),
    ("attribute-options-case", "dn: cn=A\nCN: A\ndescription;LANG-en;binary:: /wA=\ndescription;binary;lang-EN:: AQI=\n"),
    ("escaped-dn-folded-value", "dn: cn=A\\, B,dc=example\ncn: A, B\ndescription: This is\n  folded\n"),
]
rng = random.Random(4514)
for index in range(16):
    raw = bytes(rng.randrange(256) for _ in range(index * 37 + 1))
    encoded = base64.b64encode(raw).decode()
    # Vary changes and boundary-sized binary strings, without duplicate LDAP values.
    op = ["add", "modify"][index % 2]
    fields = f"data:: {encoded}\ndata:\n"
    body = fields if op == "add" else "replace: data\n" + fields + "-\n"
    cases.append((f"binary-{op}-{len(raw)}", f"dn: cn=bytes-{index}\nchangetype: {op}\n" + body))
cases = [(name, text if text.startswith("version:") else "version: 1\n\n" + text + "\n") for name, text in cases]

try:
    args.jar.parent.mkdir(parents=True, exist_ok=True)
    if not args.jar.exists():
        args.jar.write_bytes(urllib.request.urlopen(URL, timeout=30).read())
    if hashlib.sha256(args.jar.read_bytes()).hexdigest() != SHA256:
        raise RuntimeError("SDK hash mismatch; refusing execution")
    local = ROOT / "verification/local"
    local.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="sdk-", dir=local) as directory:
        directory = Path(directory)
        run([args.javac, "-encoding", "UTF-8", "-cp", str(args.jar), "-d", str(directory), str(ROOT / "scripts/oracle/LdifOracle.java")])
        command = [args.java, "-cp", os.pathsep.join([str(directory), str(args.jar)]), "LdifOracle"]
        # Keep the discovered SDK disagreement visible rather than dropping it.
        mismatch = directory / "sdk-empty-control.ldif"
        mismatch.write_text("version: 1\ndn: cn=A\ncontrol: 1.2.4 false:\nchangetype: delete\n\n", encoding="utf8")
        parsed = ours(mismatch)
        assert parsed[0]["controls"][0]["value"] == ""
        failure = subprocess.run(command + [str(mismatch)], capture_output=True, encoding="utf8", errors="replace", timeout=30)
        assert failure.returncode != 0 and "StringIndexOutOfBoundsException" in failure.stderr, "SDK empty-control behavior changed; review the recorded difference"
        evidence["profile_differences"] = [{"case": "empty-plain-control-value", "moonldif": "accepted as empty bytes", "sdk": "StringIndexOutOfBoundsException", "writer": "uses equivalent empty Base64 form", "sdk_exit": failure.returncode}]
        normalized = directory / "empty-control-normalized.ldif"
        run([args.node, str(ROOT / "dist/moonldif.js"), "format", str(mismatch), "--output", str(normalized)])
        assert json.loads(run(command + [str(normalized)]))[0]["records"] == parsed
        sources = []
        for index, (name, text) in enumerate(cases):
            path = directory / f"input-{index}.ldif"
            path.write_text(text, encoding="utf8", newline="")
            sources.append(path)
        expected = json.loads(run(command + list(map(str, sources))))
        targets = []
        sdk_writer_extensions = set()
        for index, ((name, text), source, oracle) in enumerate(zip(cases, sources, expected)):
            assert ours(source) == oracle["records"], f"{name}: parser differs"
            generated = directory / f"sdk-{index}.ldif"
            generated.write_bytes(base64.b64decode(oracle["written_base64"]))
            sdk_text = generated.read_text(encoding="utf8")
            if re.search(r"^control::", sdk_text, flags=re.M):
                # SDK sometimes Base64-encodes the entire control, an extension
                # outside RFC 2849 control grammar. Do not call this direct parity.
                rejected = subprocess.run([args.node, str(ROOT / "dist/moonldif.js"), "inspect", str(generated), "--format", "json"], capture_output=True, encoding="utf8", timeout=15)
                assert rejected.returncode == 2
                evidence["profile_differences"].append({"case": name, "sdk_writer": "whole control Base64 extension", "moonldif": "strict profile rejects with exit 2", "test_adapter": "decodes whole control to RFC control grammar before comparing"})
                sdk_text = re.sub(r"^control:: *([^\n]*)", lambda m: "control: " + base64.b64decode(m[1], validate=True).decode("ascii"), sdk_text, flags=re.M)
                generated.write_text(sdk_text, encoding="utf8", newline="")
                sdk_writer_extensions.add(name)
            assert ours(generated) == oracle["records"], f"{name}: SDK writer -> MoonLDIF differs"
            target = directory / f"formatted-{index}.ldif"
            run([args.node, str(ROOT / "dist/moonldif.js"), "format", str(source), "--output", str(target)])
            targets.append(target)
        roundtrip = json.loads(run(command + list(map(str, targets))))
        for (name, _), first, last in zip(cases, expected, roundtrip):
            assert first["records"] == last["records"], f"{name}: MoonLDIF writer -> SDK differs"
            evidence["cases"].append({"name": name, "parse": "passed", "sdk_writer_to_moonldif": "passed_after_control_extension_conversion" if name in sdk_writer_extensions else "passed", "moonldif_writer_to_sdk": "passed"})
    evidence["status"] = "passed"
except Exception as error:
    evidence["status"] = "failed"
    evidence["error"] = str(error)
    raise
finally:
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf8")
    print(json.dumps({"status": evidence["status"], "cases": len(evidence["cases"]), "evidence": str(args.output)}))
