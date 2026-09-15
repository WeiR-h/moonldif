///|
fn value_json(value : Value) -> Json {
  match value {
    Inline(b) => {
      // Base64 is authoritative; text is only a convenience representation.
      let text : Json = @utf8.decode(b[:]).to_json() catch { _ => Json::null() }
      {
        "kind": "inline",
        "base64": @base64.encode(b[:]).to_json(),
        "text": text,
      }
    }
    External(url) => { "kind": "external", "url": url.to_json() }
  }
}

///|
fn attr_json(a : Attribute) -> Json {
  { "name": a.name.to_json(), "value": value_json(a.value) }
}

///|
fn record_json(r : Record) -> Json {
  let body : Json = match r.body {
    Entry(a) => { "type": "entry", "attributes": a.map(attr_json).to_json() }
    Add(a) => { "type": "add", "attributes": a.map(attr_json).to_json() }
    Delete => { "type": "delete" }
    Modify(m) =>
      {
        "type": "modify",
        "modifications": m
        .map(v => {
          "operation": v.operation.to_json(),
          "attribute": v.attribute.to_json(),
          "values": v.values.map(attr_json).to_json(),
        })
        .to_json(),
      }
    Rename(rdn, old, superior) =>
      {
        "type": "moddn",
        "newrdn": rdn.to_json(),
        "deleteoldrdn": old.to_json(),
        "newsuperior": match superior {
          Some(s) => s.to_json()
          None => Json::null()
        },
      }
  }
  let controls = r.controls.map(c => {
    "oid": c.oid.to_json(),
    "critical": c.critical.to_json(),
    "value": match c.value {
      Some(v) => value_json(v)
      None => Json::null()
    },
  })
  { "dn": r.dn.to_json(), "controls": controls.to_json(), "body": body }
}

///|
/// Semantic JSON omits source locations, but preserves record/operation/value
/// order and the distinction between absent and empty control values.
pub fn document_json(document : Document) -> Json {
  {
    "mode": document.mode.to_json(),
    "records": document.records.map(record_json).to_json(),
  }
}

///|
pub fn Report::to_json(self : Report, include_records? : Bool = false) -> Json {
  let locations = self.document.records.map(r => {
    let attrs : Array[Attribute] = match r.body {
      Entry(a) | Add(a) => a
      Modify(m) => m.iter().flat_map(v => v.values.iter()).to_array()
      _ => []
    }
    {
      "record": ToJson::to_json(r.span),
      "attributes": attrs
      .map(a => { "name": a.name.to_json(), "span": ToJson::to_json(a.span) })
      .to_json(),
    }
  })
  {
    "tool": "MoonLDIF",
    "version": version().to_json(),
    "status": self.status().to_json(),
    "exit_code": self.exit_code().to_json(),
    "mode": self.document.mode.to_json(),
    "record_count": self.document.records.length().to_json(),
    "scope": "LDIF v1 supported structural profile; not server import approval",
    "not_checked": [
      "full DN syntax and equality", "directory schema", "server state and ACL",
      "control semantics", "external value contents",
    ],
    "diagnostics": self.diagnostics.to_json(),
    "document": if include_records {
      document_json(self.document)
    } else {
      Json::null()
    },
    "locations": if include_records {
      locations.to_json()
    } else {
      Json::null()
    },
  }
}

///|
pub fn Report::to_text(
  self : Report,
  include_records? : Bool = false,
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
    "Scope: supported LDIF structure only. DN semantics, schema, ACL, server state and control semantics are not checked.\n",
  )
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
