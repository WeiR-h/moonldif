# MoonLDIF batch review

Version: 0&#46;3&#46;0; exit: 1; reported files: 3/3

Files are checked independently; this is not a transaction or server import approval. Reports contain filenames and target DNs, not attribute values.

Options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;deny&#95;delete&#34;:true,&#34;deny&#95;clear&#34;:true,&#34;deny&#95;rename&#34;:true,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;

## File 1: 01&#45;directory&#45;export&#46;ldif

### MoonLDIF operation review

Tool version: 0&#46;3&#46;0

Input SHA-256: 400ba054c2cce09e7a5213fc4f4a364fda078075c9954b7dfd96a921a386f9f2

Input bytes: 273

Status: complete; exit: 0; records: 1

Options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;deny&#95;delete&#34;:true,&#34;deny&#95;clear&#34;:true,&#34;deny&#95;rename&#34;:true,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;

File intent only, not server import approval. Hash identifies analysed bytes, not authenticity. This report contains target DNs; do not share it as anonymised data.

Not checked: DN equality and schema matching, BER&#45;hex assertion semantics, directory schema, server state and ACL, control semantics, external value contents

Review items: 0; retained: 0; truncated: false

Diagnostics truncated: false

#### Diagnostics

No diagnostics in the supported checks.


#### Operations



## File 2: 02&#45;account&#45;changes&#46;ldif

### MoonLDIF operation review

Tool version: 0&#46;3&#46;0

Input SHA-256: bf8e94f2616e98f6383f8d39062dbe074941ee8252a9c87af7e127c436e1e9d0

Input bytes: 265

Status: complete; exit: 1; records: 2

Options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;deny&#95;delete&#34;:true,&#34;deny&#95;clear&#34;:true,&#34;deny&#95;rename&#34;:true,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;

File intent only, not server import approval. Hash identifies analysed bytes, not authenticity. This report contains target DNs; do not share it as anonymised data.

Not checked: DN equality and schema matching, BER&#45;hex assertion semantics, directory schema, server state and ACL, control semantics, external value contents

Review items: 3; retained: 3; truncated: false

Diagnostics truncated: false

#### Diagnostics

- delete&#45;denied / policy / lines 11–12: Entry deletion is blocked by &#45;&#45;deny&#45;delete&#46;
- clear&#45;denied / policy / lines 8–9: Removing all attribute values is blocked by &#45;&#45;deny&#45;clear&#46;

#### Operations

##### 1. Replace attribute values

- Code: attribute&#45;replace; level: caution
- Target DN: uid&#61;demo,ou&#61;People,dc&#61;example,dc&#61;org
- Lines: 5–7
- Attribute: mail; supplied values: 1
- Reason: This replaces the entire value set rather than appending to it&#46;
- Review action: Include any old values that must be retained in the replacement set&#46;

##### 1. Delete entire attribute

- Code: attribute&#45;delete&#45;all; level: high
- Target DN: uid&#61;demo,ou&#61;People,dc&#61;example,dc&#61;org
- Lines: 8–9
- Attribute: description; supplied values: 0
- Reason: No values were supplied, so this requests removal of the attribute and all its values&#46;
- Review action: Confirm that all values should be removed and that the attribute is not required&#46;

##### 2. Delete directory entry

- Code: entry&#45;delete; level: high
- Target DN: uid&#61;retired,ou&#61;People,dc&#61;example,dc&#61;org
- Lines: 11–12
- Reason: Requests deletion of this DN&#46; The server state and effects of attached controls are unknown&#46;
- Review action: Verify the target and recovery plan&#46; The optional deletion policy can block this file&#46;



## File 3: 03&#45;migration&#45;plan&#46;ldif

### MoonLDIF operation review

Tool version: 0&#46;3&#46;0

Input SHA-256: 0686d441672d8ead71b481bf49eab77b9ddd5c806c2ec10f033fcbf3f70ea64e

Input bytes: 273

Status: complete; exit: 1; records: 2

Options: &#123;&#34;allow&#95;missing&#95;version&#34;:false,&#34;deny&#95;delete&#34;:true,&#34;deny&#95;clear&#34;:true,&#34;deny&#95;rename&#34;:true,&#34;legacy&#95;dn&#95;spaces&#34;:false&#125;

File intent only, not server import approval. Hash identifies analysed bytes, not authenticity. This report contains target DNs; do not share it as anonymised data.

Not checked: DN equality and schema matching, BER&#45;hex assertion semantics, directory schema, server state and ACL, control semantics, external value contents

Review items: 2; retained: 2; truncated: false

Diagnostics truncated: false

#### Diagnostics

- rename&#45;denied / policy / lines 9–13: Renaming or moving a directory entry is blocked by &#45;&#45;deny&#45;rename&#46;

#### Operations

##### 1. Add directory entry

- Code: entry&#45;add; level: notice
- Target DN: uid&#61;demo,ou&#61;People,dc&#61;example,dc&#61;org
- Lines: 2–7
- Reason: Requests a new entry with the supplied attribute values&#46;
- Review action: Check the parent, object classes and required attributes against the target directory schema&#46;

##### 2. Rename with a new parent DN

- Code: entry&#45;move; level: high
- Target DN: uid&#61;demo,ou&#61;People,dc&#61;example,dc&#61;org
- Lines: 9–13
- Reason: New RDN: uid&#61;demo&#45;renamed&#46; Requests removal of the old RDN attribute values&#46; New parent DN: ou&#61;Archive,dc&#61;example,dc&#61;org&#46;
- Review action: Review dependent names and child entries; confirm target&#45;parent and permission requirements on the server&#46;



