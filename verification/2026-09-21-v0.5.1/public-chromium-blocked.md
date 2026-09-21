# MoonLDIF operation review

Tool version: 0&#46;5&#46;1

Input SHA-256: c59bf60d2cc48035ee1576d0d79e19ce6ec8c5f7d8c7fb87ebc801d203ebfb2a

Input bytes: 137

Status: complete; exit: 1; records: 1

Options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;deny&#95;delete&#34;:true,&#34;deny&#95;clear&#34;:true,&#34;deny&#95;rename&#34;:false,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;

File intent only, not server import approval. Hash identifies analysed bytes, not authenticity. This report contains target DNs; do not share it as anonymised data.

Not checked: DN equality and schema matching, BER&#45;hex assertion semantics, directory schema, server state and ACL, control semantics, external value contents

Review items: 2; retained: 2; truncated: false

Diagnostics truncated: false

## Diagnostics

- clear&#45;denied / policy / lines 7–8: Removing all attribute values is blocked by &#45;&#45;deny&#45;clear&#46;

## Operations

### 1. Replace attribute values

- Code: attribute&#45;replace; level: caution
- Target DN: cn&#61;&#91;demo&#93;&#38;user
- Lines: 4–6
- Attribute: description; supplied values: 1
- Reason: This replaces the entire value set rather than appending to it&#46;
- Review action: Include any old values that must be retained in the replacement set&#46;

### 1. Clear attribute values

- Code: attribute&#45;clear; level: high
- Target DN: cn&#61;&#91;demo&#93;&#38;user
- Lines: 7–8
- Attribute: mail; supplied values: 0
- Reason: An empty replace requests removal of this attribute's values&#46;
- Review action: Confirm that an empty replacement is intentional and permitted by the schema&#46;

