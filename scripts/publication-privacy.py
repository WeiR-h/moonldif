"""Check publishable files without printing matched personal values.

Run against tracked files, or pass --archive for the exact release ZIP.
This is a bounded text check; screenshots and Git history need separate review.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PERSONAL_PATH = re.compile(r'[A-Za-z]:[\\/]Users[\\/]([^\\/\s"<>]+)', re.I)
PHONE = re.compile(r'(?<![\w])1[3-9][0-9]{9}(?![\w])')
PRIVATE_FILE = re.compile(r'申报书|个人验收|联系方式|(?:^|/)(?:private|credentials)(?:/|\.)', re.I)
SAFE_USERS = {'runneradmin', 'runner', 'public', 'default', 'user', 'username'}


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            yield key
            yield from strings(item)


def inspect(name, data):
    reasons = []
    if PRIVATE_FILE.search(name):
        reasons.append('private material filename')
    if Path(name).suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.woff', '.woff2'}:
        return reasons
    text = data.decode('utf-8-sig', errors='replace')
    if name.endswith('.json'):
        try:
            values = list(strings(json.loads(text)))
        except ValueError:
            values = [text]
    else:
        values = [text.replace('\\\\', '\\')]
    if any(m.group(1).lower() not in SAFE_USERS for s in values for m in PERSONAL_PATH.finditer(s)):
        reasons.append('personal Windows user path')
    if any(PHONE.search(s) for s in values):
        reasons.append('possible private phone number')
    return reasons


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path)
    args = parser.parse_args()
    if args.archive:
        with zipfile.ZipFile(args.archive) as archive:
            files = [(n, archive.read(n)) for n in archive.namelist() if not n.endswith('/')]
    else:
        names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
        files = [(n, (ROOT / n).read_bytes()) for n in names if n]
    failures = [{'file': n, 'reasons': reasons} for n, data in files if (reasons := inspect(n, data))]
    print(json.dumps({'status': 'failed' if failures else 'passed', 'files': len(files),
                      'findings': failures, 'limits': 'Text patterns only; manually review images, contact details, Git authors and history.'}, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
