# MoonLDIF snapshot comparison

Exit: 1

Content exports only. Exact DN strings and byte multiset values; not server equality or an executable patch. Reports contain DNs. Truncated findings are explicitly counted.

Version: 0.4.0

- analysis&#95;complete: true
- comparison&#95;performed: true
- options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;
- counts: &#123;&#34;entry&#45;added&#34;:0,&#34;entry&#45;removed&#34;:0,&#34;attribute&#45;added&#34;:0,&#34;attribute&#45;removed&#34;:0,&#34;values&#45;changed&#34;:1&#125;
- total&#95;changes: 1
- reported&#95;changes: 1
- truncated: false
- ambiguous&#95;dn&#95;count: 0
- diagnostics&#95;truncated: false

## before source

- byte&#95;length: 63
- sha256: 067de0379baff1aa367bc0b058fc0b69ef68fbc965b13ced263f46b76aaf61fe
- status: complete
- record&#95;count: 1
- diagnostics: &#91;&#93;

## after source

- byte&#95;length: 70
- sha256: b374a1a0ef7649c23f3bb87b8408fe4cce32606e0da856f586573f8f9ab4676d
- status: complete
- record&#95;count: 1
- diagnostics: &#91;&#93;

## Comparison diagnostics

&#91;&#93;

## Differences

| Change | DN | Attribute | Before lines | After lines | Removed values | Added values |
|---|---|---|---|---|---|---|
| values&#45;changed | cn&#61;&#91;demo&#93; | photo | &#123;&#34;line&#34;:4,&#34;end&#95;line&#34;:4&#125; | &#123;&#34;line&#34;:3,&#34;end&#95;line&#34;:3&#125; | 1 | 1 |
