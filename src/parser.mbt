///|
fn plain_field(line : Line, ds : Array[Diagnostic]) -> Attribute? {
  let field = parse_field(line, ds)
  let parts = line.text.split(":").to_array()
  if parts.length() > 1 &&
    ((parts[1] == "" && parts.length() > 2) || parts[1].has_prefix("<")) {
    diagnose(
      ds,
      "encoded-keyword",
      "error",
      line.span,
      "This structural keyword requires a plain value.",
    )
  }
  field
}

///|
fn line_name(line : Line) -> String {
  ascii_lower(line.text.split(":").to_array()[0].to_owned())
}

///|
fn parse_control(line : Line, ds : Array[Diagnostic]) -> Control? {
  // Controls have a distinct grammar: OID [criticality] [value-spec].
  let b = @utf8.encode(line.text[:])
  if b.length() > 8 && b[8] == 58 {
    diagnose(
      ds,
      "unsupported-control-encoding",
      "unsupported",
      line.span,
      "Whole-control Base64 encoding is a tool extension outside this profile. Encode only the control value after the OID and criticality.",
    )
    return None
  }
  let mut i = 8 // control:
  while i < b.length() && b[i] == 32 {
    i = i + 1
  }
  let begin = i
  while i < b.length() && b[i] != 32 && b[i] != 58 {
    i = i + 1
  }
  let oid = @utf8.decode(b[begin:i]) catch { _ => return None }
  if !valid_oid(oid) {
    diagnose(
      ds,
      "invalid-control-oid",
      "error",
      line.span,
      "Control requires a dotted numeric OID.",
    )
    return None
  }
  let space_before = i < b.length() && b[i] == 32
  while i < b.length() && b[i] == 32 {
    i = i + 1
  }
  let mut critical = false
  if i < b.length() && b[i] != 58 {
    let begin = i
    while i < b.length() && b[i] != 32 && b[i] != 58 {
      i = i + 1
    }
    let flag = @utf8.decode(b[begin:i]) catch { _ => return None }
    if !space_before ||
      !(ascii_lower(flag) == "true" || ascii_lower(flag) == "false") {
      diagnose(
        ds,
        "invalid-criticality",
        "error",
        line.span,
        "Expected true or false after the control OID.",
      )
      return None
    }
    critical = ascii_lower(flag) == "true"
    while i < b.length() && b[i] == 32 {
      i = i + 1
    }
  }
  let value = if i < b.length() {
    if b[i] != 58 {
      diagnose(
        ds,
        "invalid-control-value",
        "error",
        line.span,
        "Expected a control value separator.",
      )
      return None
    }
    let suffix = @utf8.decode(b[i:]) catch { _ => return None }
    match parse_field({ text: "controlValue" + suffix, span: line.span, }, ds) {
      Some(field) => Some(field.value)
      None => return None
    }
  } else {
    None
  }
  Some({ oid, critical, value, span: line.span, })
}

///|
fn read_attributes(
  lines : Array[Line],
  start : Int,
  ds : Array[Diagnostic],
) -> Array[Attribute] {
  let attrs = []
  for i in start..<lines.length() {
    if line_name(lines[i]) == "dn" {
      diagnose(
        ds,
        "unexpected-dn",
        "error",
        lines[i].span,
        "A new DN requires a blank record separator; DN is not an ordinary attribute in this profile.",
      )
    }
    match parse_field(lines[i], ds) {
      Some(a) => attrs.push(a)
      None => ()
    }
  }
  if attrs.is_empty() {
    diagnose(
      ds,
      "missing-attributes",
      "error",
      lines[0].span,
      "Content and add records require at least one attribute value.",
    )
  }
  attrs
}

///|
fn read_modifications(
  lines : Array[Line],
  start : Int,
  ds : Array[Diagnostic],
) -> Array[Modification] {
  let mods : Array[Modification] = []
  let mut i = start
  while i < lines.length() {
    let head = lines[i]
    let field = match plain_field(head, ds) {
      Some(f) => f
      None => {
        i = i + 1
        continue
      }
    }
    let operation = ascii_lower(field.name)
    let attribute = match field_text(field, ds) {
      Some(s) => s
      None => ""
    }
    if !(operation == "add" || operation == "delete" || operation == "replace") {
      diagnose(
        ds,
        "unsupported-modification",
        "unsupported",
        head.span,
        "Only add, delete and replace modification operations are supported.",
      )
    }
    if !valid_attribute(attribute) {
      diagnose(
        ds,
        "invalid-modification-attribute",
        "error",
        head.span,
        "Modification header requires an attribute description.",
      )
    }
    i = i + 1
    let values : Array[Attribute] = []
    while i < lines.length() && lines[i].text != "-" {
      match parse_field(lines[i], ds) {
        Some(a) => {
          if !attribute_equal(a.name, attribute) {
            diagnose(
              ds,
              "modification-attribute-mismatch",
              "error",
              a.span,
              "Value attribute does not match the modification header.",
            )
          }
          values.push(a)
        }
        None => ()
      }
      i = i + 1
    }
    let end_line = if i < lines.length() {
      lines[i].span.end_line
    } else {
      lines[lines.length() - 1].span.end_line
    }
    if i == lines.length() {
      diagnose(
        ds,
        "missing-modification-terminator",
        "error",
        head.span,
        "Each modification must end with a '-' line.",
      )
    } else {
      i = i + 1
    }
    mods.push({
      operation,
      attribute,
      values,
      span: { line: head.span.line, end_line, },
    })
  }
  if mods.is_empty() {
    diagnose(
      ds,
      "empty-modify",
      "warning",
      lines[0].span,
      "No modifications are present; server acceptance is not checked.",
    )
  }
  mods
}

///|
fn read_rename(
  lines : Array[Line],
  start : Int,
  ds : Array[Diagnostic],
) -> Body {
  let mut rdn = ""
  let mut delete_old = false
  let mut superior : String? = None
  let names = ["newrdn", "deleteoldrdn", "newsuperior"]
  if lines.length() < start + 2 || lines.length() > start + 3 {
    diagnose(
      ds,
      "invalid-rename-fields",
      "error",
      lines[0].span,
      "Rename requires newrdn, deleteoldrdn and optional newsuperior, in that order.",
    )
  }
  for i in start..<lines.length() {
    let j = i - start
    if j >= 3 {
      break
    }
    let field = if j == 1 {
      plain_field(lines[i], ds)
    } else {
      parse_field(lines[i], ds)
    }
    match field {
      Some(f) => {
        if ascii_lower(f.name) != names[j] {
          diagnose(
            ds,
            "unexpected-rename-field",
            "error",
            f.span,
            "Unexpected rename field or field order.",
          )
        }
        match field_text(f, ds) {
          Some(s) =>
            if j == 0 {
              rdn = s
            } else if j == 1 {
              if s != "0" && s != "1" {
                diagnose(
                  ds,
                  "invalid-deleteoldrdn",
                  "error",
                  f.span,
                  "deleteoldrdn must be 0 or 1.",
                )
              }
              delete_old = s == "1"
            } else {
              superior = Some(s)
            }
          None => ()
        }
      }
      None => ()
    }
  }
  Rename(rdn, delete_old, superior)
}

///|
fn read_record(
  lines : Array[Line],
  ds : Array[Diagnostic],
  options : Options,
) -> Record? {
  if line_name(lines[0]) != "dn" {
    diagnose(
      ds,
      "missing-dn",
      "error",
      lines[0].span,
      "Each record must start with dn.",
    )
    return None
  }
  let first = match parse_field(lines[0], ds) {
    Some(f) => f
    None => return None
  }
  let dn = match field_text(first, ds) {
    Some(s) => s
    None => return None
  }
  let span = {
    line: lines[0].span.line,
    end_line: lines[lines.length() - 1].span.end_line,
  }
  let controls : Array[Control] = []
  let mut i = 1
  let mut candidate = i
  while candidate < lines.length() && line_name(lines[candidate]) == "control" {
    candidate = candidate + 1
  }
  if candidate < lines.length() && line_name(lines[candidate]) == "changetype" {
    while i < candidate {
      match parse_control(lines[i], ds) {
        Some(c) => controls.push(c)
        None => ()
      }
      i = i + 1
    }
  }
  let body = if i < lines.length() && line_name(lines[i]) == "changetype" {
    let f = match plain_field(lines[i], ds) {
      Some(f) => f
      None => return None
    }
    let kind = match field_text(f, ds) {
      Some(s) => ascii_lower(s)
      None => return None
    }
    i = i + 1
    match kind {
      "add" => Add(read_attributes(lines, i, ds))
      "delete" => {
        if i < lines.length() {
          diagnose(
            ds,
            "unexpected-delete-fields",
            "error",
            lines[i].span,
            "Delete records cannot contain attributes.",
          )
        }
        if options.deny_delete {
          diagnose(
            ds, "delete-denied", "policy", span, "Entry deletion is blocked by --deny-delete.",
          )
        }
        Delete
      }
      "modify" => Modify(read_modifications(lines, i, ds))
      "moddn" | "modrdn" => read_rename(lines, i, ds)
      _ => {
        diagnose(
          ds,
          "unsupported-change",
          "unsupported",
          f.span,
          "Unknown changetype; this record cannot be interpreted.",
        )
        return None
      }
    }
  } else {
    if !controls.is_empty() {
      diagnose(
        ds, "control-without-change", "error", span, "Controls require a change record.",
      )
    }
    Entry(read_attributes(lines, i, ds))
  }
  Some({ dn, controls, body, span, })
}

///|
/// Parse a bounded LDIF v1 buffer. Diagnostics retain partial records for
/// inspection; callers must check exit_code before accepting the document.
pub fn parse(data : Bytes, options? : Options = Options::default()) -> Report {
  let ds : Array[Diagnostic] = []
  let lines = logical_lines(data, ds)
  let records : Array[Record] = []
  let mut start = 0
  while start < lines.length() && lines[start].text == "" {
    start = start + 1
  }
  if start < lines.length() && line_name(lines[start]) == "version" {
    match plain_field(lines[start], ds) {
      Some(f) =>
        if field_text(f, ds) != Some("1") {
          diagnose(
            ds,
            "unsupported-version",
            "unsupported",
            f.span,
            "Only LDIF version 1 is supported.",
          )
        }
      None => ()
    }
    start = start + 1
  } else {
    diagnose(
      ds,
      "missing-version",
      if options.allow_missing_version {
        "warning"
      } else {
        "error"
      },
      single_line(1),
      "Expected version: 1; --compat explicitly permits a missing version header.",
    )
  }
  let mut mode = "empty"
  let mut group : Array[Line] = []
  for i in start..<(lines.length() + 1) {
    if i == lines.length() || lines[i].text == "" {
      if !group.is_empty() {
        if records.length() >= 10000 {
          diagnose(
            ds,
            "record-limit",
            "error",
            group[0].span,
            "Input exceeds 10000 records.",
          )
          break
        }
        match read_record(group, ds, options) {
          Some(r) => {
            let kind = match r.body {
              Entry(_) => "content"
              _ => "changes"
            }
            if mode == "empty" {
              mode = kind
            } else if mode != kind && mode != "mixed" {
              mode = "mixed"
              diagnose(
                ds,
                "mixed-record-modes",
                "error",
                r.span,
                "Content and change records must be in separate LDIF documents.",
              )
            }
            records.push(r)
          }
          None => ()
        }
        group = []
      }
    } else {
      group.push(lines[i])
    }
  }
  if records.is_empty() &&
    !ds.any(d => d.severity == "error" || d.severity == "unsupported") {
    diagnose(
      ds,
      "no-records",
      "error",
      single_line(1),
      "No supported records were found.",
    )
  }
  { document: { mode, records, }, diagnostics: ds, names_checked: false, }
}

///|
pub fn parse_text(
  text : String,
  options? : Options = Options::default(),
) -> Report {
  parse(@utf8.encode(text[:]), options~)
}
