# MoonLDIF snapshot comparison

Exit: 1

Content exports only. Exact DN strings and byte multiset values; not server equality or an executable patch. Reports contain DNs. Truncated findings are explicitly counted.

Version: 0.4.0

- analysis&#95;complete: true
- comparison&#95;performed: true
- options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;
- counts: &#123;&#34;entry&#45;added&#34;:1,&#34;entry&#45;removed&#34;:1,&#34;attribute&#45;added&#34;:0,&#34;attribute&#45;removed&#34;:1,&#34;values&#45;changed&#34;:1&#125;
- total&#95;changes: 4
- reported&#95;changes: 4
- truncated: false
- ambiguous&#95;dn&#95;count: 0
- diagnostics&#95;truncated: false

## before source

- byte&#95;length: 216
- sha256: f0266fb2a65f18ebdb787d388c64010f2110aebbc95bab88145ae6d5680facd8
- status: complete
- record&#95;count: 2
- diagnostics: &#91;&#93;

## after source

- byte&#95;length: 161
- sha256: 6558c8297a3ba31c6d0b91794e44174fdb39ca2f3e29690513691324f8ee7e68
- status: complete
- record&#95;count: 2
- diagnostics: &#91;&#93;

## Comparison diagnostics

&#91;&#93;

## Differences

| Change | DN | Attribute | Before lines | After lines | Removed values | Added values |
|---|---|---|---|---|---|---|
| entry&#45;removed | uid&#61;bob,dc&#61;example,dc&#61;org | &#45; | &#123;&#34;line&#34;:8,&#34;end&#95;line&#34;:10&#125; | &#45; | 0 | 0 |
| attribute&#45;removed | uid&#61;alice,dc&#61;example,dc&#61;org | mail | &#123;&#34;line&#34;:4,&#34;end&#95;line&#34;:4&#125; | &#45; | 1 | 0 |
| values&#45;changed | uid&#61;alice,dc&#61;example,dc&#61;org | memberof | &#123;&#34;line&#34;:5,&#34;end&#95;line&#34;:6&#125; | &#123;&#34;line&#34;:4,&#34;end&#95;line&#34;:4&#125; | 1 | 0 |
| entry&#45;added | uid&#61;carol,dc&#61;example,dc&#61;org | &#45; | &#45; | &#123;&#34;line&#34;:6,&#34;end&#95;line&#34;:8&#125; | 0 | 0 |
