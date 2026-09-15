///|
pub suberror WriteError {
  InvalidDocument(String)
} derive(Debug)

///|
fn folded(out : StringBuilder, line : String) -> Unit {
  // Every generated line is ASCII, including Base64, so character boundaries
  // are byte boundaries and a continuation never splits UTF-8.
  let mut start = 0
  let mut width = 76
  while line.length() - start > width {
    out.write_string(line[start:start + width].to_owned())
    out.write_string("\n ")
    start = start + width
    width = 75
  }
  out.write_string(line[start:].to_owned())
  out.write_string("\n")
}

///|
fn value_suffix(value : Value) -> String raise WriteError {
  match value {
    External(_) =>
      raise InvalidDocument(
        "Unresolved external values cannot be written by the safe writer.",
      )
    Inline(b) => {
      if b.is_empty() {
        return ":"
      }
      let encode = b[0] == 32 ||
        b[0] == 58 ||
        b[0] == 60 ||
        b[b.length() - 1] == 32 ||
        b.iter().any(v => v < 32 || v >= 127)
      if encode {
        ":: " + @base64.encode(b[:])
      } else {
        let text = @utf8.decode(b[:]) catch {
          _ => raise InvalidDocument("Unexpected non-UTF-8 plain value.")
        }
        ": " + text
      }
    }
  }
}

///|
fn write_attribute(
  out : StringBuilder,
  attr : Attribute,
) -> Unit raise WriteError {
  if !valid_attribute(attr.name) {
    raise InvalidDocument("Invalid attribute description.")
  }
  folded(out, attr.name + value_suffix(attr.value))
}

///|
fn write_text(
  out : StringBuilder,
  name : String,
  text : String,
) -> Unit raise WriteError {
  folded(out, name + value_suffix(Inline(@utf8.encode(text[:]))))
}

///|
fn same_attributes(a : Array[Attribute], b : Array[Attribute]) -> Bool {
  a.length() == b.length() &&
  a
  .iter()
  .zip(b.iter())
  .all(pair => pair.0.name == pair.1.name && pair.0.value == pair.1.value)
}

///|
// Compare the contract directly, omitting only physical spans. Serializing two
// complete JSON trees here duplicates binary/text values and inflates memory.
fn same_document(a : Document, b : Document) -> Bool {
  if a.mode != b.mode || a.records.length() != b.records.length() {
    return false
  }
  for i in 0..<a.records.length() {
    let x = a.records[i]
    let y = b.records[i]
    if x.dn != y.dn || x.controls.length() != y.controls.length() {
      return false
    }
    for j in 0..<x.controls.length() {
      let c = x.controls[j]
      let d = y.controls[j]
      if c.oid != d.oid || c.critical != d.critical || c.value != d.value {
        return false
      }
    }
    let body_equal = match (x.body, y.body) {
      (Entry(p), Entry(q)) | (Add(p), Add(q)) => same_attributes(p, q)
      (Delete, Delete) => true
      (Rename(p, flag, parent), Rename(q, other_flag, other_parent)) =>
        p == q && flag == other_flag && parent == other_parent
      (Modify(p), Modify(q)) =>
        p.length() == q.length() &&
        p
        .iter()
        .zip(q.iter())
        .all(pair => {
          let m = pair.0
          let n = pair.1
          m.operation == n.operation &&
          m.attribute == n.attribute &&
          same_attributes(m.values, n.values)
        })
      _ => false
    }
    if !body_equal {
      return false
    }
  }
  true
}

///|
/// Deterministic semantic serialization. Comments, casing of changetype
/// aliases, original folding and source locations are not preserved.
/// Refuses models that do not round-trip through this supported profile.
pub fn write(document : Document) -> String raise WriteError {
  let out = StringBuilder()
  out.write_string("version: 1\n\n")
  for r in document.records {
    write_text(out, "dn", r.dn)
    for c in r.controls {
      if !valid_oid(c.oid) {
        raise InvalidDocument("Invalid control OID.")
      }
      let prefix = "control: " +
        c.oid +
        (if c.critical { " true" } else { " false" })
      let line = match c.value {
        None => prefix
        // Empty Base64 is equivalent to an empty plain value, and avoids an
        // out-of-bounds read in UnboundID 7.0.5's control parser for "false:".
        Some(Inline(b)) if b.is_empty() => prefix + "::"
        Some(v) => prefix + value_suffix(v)
      }
      folded(out, line)
    }
    match r.body {
      Entry(a) => {
        if !r.controls.is_empty() {
          raise InvalidDocument(
            "Content records cannot have operation controls.",
          )
        }
        for attr in a {
          write_attribute(out, attr)
        }
      }
      Add(a) => {
        out.write_string("changetype: add\n")
        for attr in a {
          write_attribute(out, attr)
        }
      }
      Delete => out.write_string("changetype: delete\n")
      Modify(mods) => {
        out.write_string("changetype: modify\n")
        for m in mods {
          if !(m.operation == "add" ||
            m.operation == "delete" ||
            m.operation == "replace") ||
            !valid_attribute(m.attribute) {
            raise InvalidDocument(
              "Unsupported modification operation or invalid attribute.",
            )
          }
          folded(out, m.operation + ": " + m.attribute)
          for a in m.values {
            write_attribute(out, a)
          }
          out.write_string("-\n")
        }
      }
      Rename(rdn, delete_old, superior) => {
        out.write_string("changetype: moddn\n")
        write_text(out, "newrdn", rdn)
        out.write_string(
          if delete_old {
            "deleteoldrdn: 1\n"
          } else {
            "deleteoldrdn: 0\n"
          },
        )
        match superior {
          Some(s) => write_text(out, "newsuperior", s)
          None => ()
        }
      }
    }
    out.write_string("\n")
  }
  let result = out.to_string()
  let verified = parse_text(result)
  if verified.exit_code() != 0 || !same_document(verified.document, document) {
    raise InvalidDocument(
      "Serialized model does not round-trip within the supported profile.",
    )
  }
  result
}

///|
pub fn Report::format(self : Report) -> String raise WriteError {
  if self.exit_code() != 0 {
    raise InvalidDocument(
      "Cannot format an invalid, incomplete or policy-blocked report.",
    )
  }
  write(self.document)
}
