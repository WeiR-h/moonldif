///|
fn value_json(value : Value) -> Json {
  match value {
    Inline(b) => {
      // Base64 is authoritative; text is only a convenience representation.
      let text : Json = ToJson::to_json(@utf8.decode(b[:])) catch {
        _ => Json::null()
      }
      {
        "kind": "inline",
        "base64": ToJson::to_json(@base64.encode(b[:])),
        "text": text,
      }
    }
    External(url) => { "kind": "external", "url": ToJson::to_json(url) }
  }
}

///|
fn attr_json(a : Attribute) -> Json {
  { "name": ToJson::to_json(a.name), "value": value_json(a.value) }
}

///|
fn record_json(r : Record) -> Json {
  let body : Json = match r.body {
    Entry(a) =>
      { "type": "entry", "attributes": ToJson::to_json(a.map(attr_json)) }
    Add(a) => { "type": "add", "attributes": ToJson::to_json(a.map(attr_json)) }
    Delete => { "type": "delete" }
    Modify(m) =>
      {
        "type": "modify",
        "modifications": ToJson::to_json(
          m.map(v => {
            "operation": ToJson::to_json(v.operation),
            "attribute": ToJson::to_json(v.attribute),
            "values": ToJson::to_json(v.values.map(attr_json)),
          }),
        ),
      }
    Rename(rdn, old, superior) =>
      {
        "type": "moddn",
        "newrdn": ToJson::to_json(rdn),
        "deleteoldrdn": ToJson::to_json(old),
        "newsuperior": match superior {
          Some(s) => ToJson::to_json(s)
          None => Json::null()
        },
      }
  }
  let controls = r.controls.map(c => {
    "oid": ToJson::to_json(c.oid),
    "critical": ToJson::to_json(c.critical),
    "value": match c.value {
      Some(v) => value_json(v)
      None => Json::null()
    },
  })
  {
    "dn": ToJson::to_json(r.dn),
    "controls": ToJson::to_json(controls),
    "body": body,
  }
}

///|
/// Semantic JSON omits source locations, but preserves record/operation/value
/// order and the distinction between absent and empty control values.
pub fn document_json(document : Document) -> Json {
  {
    "mode": ToJson::to_json(document.mode),
    "records": ToJson::to_json(document.records.map(record_json)),
  }
}

///|
pub fn Report::to_json(
  self : Report,
  include_records~ : Bool = false,
  include_review~ : Bool = false,
) -> Json {
  let locations = if include_records {
    self.document.records.map(r => {
      let attrs : Array[Attribute] = match r.body {
        Entry(a) | Add(a) => a
        Modify(m) => m.iter().flat_map(v => v.values.iter()).to_array()
        _ => []
      }
      {
        "record": ToJson::to_json(r.span),
        "attributes": ToJson::to_json(
          attrs.map(a => {
            "name": ToJson::to_json(a.name),
            "span": ToJson::to_json(a.span),
          }),
        ),
      }
    })
  } else {
    []
  }
  {
    "tool": "MoonLDIF",
    "version": ToJson::to_json(version()),
    "status": ToJson::to_json(self.status()),
    "exit_code": ToJson::to_json(self.exit_code()),
    "mode": ToJson::to_json(self.document.mode),
    "record_count": ToJson::to_json(self.document.records.length()),
    "scope": if self.names_checked {
      "LDIF v1 supported structure and DN/RDN string syntax; not server import approval"
    } else {
      "LDIF v1 supported structural profile; not server import approval"
    },
    "names_checked": ToJson::to_json(self.names_checked),
    "name_profile": if !self.names_checked {
      "not_checked"
    } else if self.diagnostics.any(d => d.code == "legacy-name-separator-spaces") {
      "RFC 4514 with explicitly enabled legacy separator spaces"
    } else {
      "RFC 4514 string syntax"
    },
    "not_checked": ToJson::to_json(self.not_checked()),
    "diagnostics": ToJson::to_json(self.diagnostics),
    "review": if include_review {
      self.review().to_json()
    } else {
      Json::null()
    },
    "document": if include_records {
      document_json(self.document)
    } else {
      Json::null()
    },
    "locations": if include_records {
      ToJson::to_json(locations)
    } else {
      Json::null()
    },
  }
}

///|
pub fn Report::to_text(
  self : Report,
  include_records~ : Bool = false,
) -> String {
  let out = StringBuilder()
  out.write_string("MoonLDIF " + version() + "\n")
  out.write_string(
    "Status: " +
    self.status() +
    "; exit=" +
    self.exit_code().to_string() +
    "; records=" +
    self.document.records.length().to_string() +
    "; mode=" +
    self.document.mode +
    "\n",
  )
  out.write_string(
    if self.names_checked {
      "Scope: supported LDIF structure and DN/RDN string syntax.\n"
    } else {
      "Scope: supported LDIF structure; DN/RDN syntax was not requested.\n"
    },
  )
  out.write_string("Not checked: " + self.not_checked().join(", ") + ".\n")
  for d in self.diagnostics {
    out.write_string(
      d.severity +
      " " +
      d.code +
      " line " +
      d.span.line.to_string() +
      "-" +
      d.span.end_line.to_string() +
      ": " +
      d.reason +
      "\n",
    )
  }
  if include_records {
    out.write_string(document_json(self.document).stringify(indent=2))
    out.write_string("\n")
  }
  out.to_string()
}

///|
pub fn Report::not_checked(self : Report) -> Array[String] {
  let items = [
    "DN equality and schema matching", "BER-hex assertion semantics", "directory schema",
    "server state and ACL", "control semantics", "external value contents",
  ]
  if !self.names_checked {
    items.push("DN/RDN string syntax")
  }
  items
}
