///|
/// Decoded assertion bytes or opaque BER hex form. No directory schema or
/// distinguishedNameMatch is applied by this syntax parser.
pub(all) enum NameValue {
  Text(Bytes)
  Ber(Bytes)
} derive(Eq)

///|
pub(all) struct NameAssertion {
  attribute : String
  value : NameValue
  byte_offset : Int
} derive(Eq)

///|
pub(all) struct RelativeName {
  assertions : Array[NameAssertion]
} derive(Eq)

///|
pub(all) struct DistinguishedName {
  rdns : Array[RelativeName]
} derive(Eq)

///|
pub(all) struct NameError {
  code : String
  byte_offset : Int
  reason : String
} derive(Eq, ToJson)

///|
fn hex_digit(b : Byte) -> Int? {
  let n = b.to_int()
  if n >= 48 && n <= 57 {
    Some(n - 48)
  } else if n >= 65 && n <= 70 {
    Some(n - 55)
  } else if n >= 97 && n <= 102 {
    Some(n - 87)
  } else {
    None
  }
}

///|
fn name_error(code : String, byte_offset : Int, reason : String) -> NameError {
  { code, byte_offset, reason, }
}

///|
fn name_attribute(s : String) -> Bool {
  if s == "" {
    return false
  }
  let chars = s.iter().to_array()
  if is_alpha(chars[0]) {
    return chars.all(c => is_alpha(c) || is_digit(c) || c == '-')
  }
  let parts = s.split(".").to_array()
  parts.length() >= 2 &&
  parts.all(p => {
    !p.is_empty() &&
    p.iter().all(is_digit) &&
    (p.length() == 1 || !p.has_prefix("0"))
  })
}

///|
/// RFC 4514 string grammar. Empty DN is the root; values are never trimmed.
pub fn parse_dn(text : String) -> Result[DistinguishedName, NameError] {
  let b = @utf8.encode(text[:])
  if b.length() > 16384 {
    return Err(
      name_error("name-limit", 16384, "DN exceeds this profile's 16 KiB limit."),
    )
  }
  let rdns : Array[RelativeName] = []
  if b.is_empty() {
    return Ok({ rdns, })
  }
  let mut assertions : Array[NameAssertion] = []
  let mut i = 0
  while i < b.length() {
    let begin = i
    while i < b.length() && b[i] != 61 && b[i] != 43 && b[i] != 44 {
      i = i + 1
    }
    if i == b.length() || b[i] != 61 {
      return Err(
        name_error(
          "name-missing-equals", begin, "Expected an attribute type followed by '='.",
        ),
      )
    }
    let attribute = @utf8.decode(b[begin:i]) catch {
      _ =>
        return Err(
          name_error(
            "name-invalid-attribute", begin, "Attribute type must be an ASCII descriptor or numeric OID.",
          ),
        )
    }
    if !name_attribute(attribute) {
      return Err(
        name_error(
          "name-invalid-attribute", begin, "Expected an ASCII descriptor or OID without options, whitespace or leading-zero arcs.",
        ),
      )
    }
    i = i + 1
    let value_start = i
    let value : NameValue = if i < b.length() && b[i] == 35 {
      i = i + 1
      let bytes : Array[Byte] = []
      while i < b.length() && b[i] != 43 && b[i] != 44 {
        if i + 1 >= b.length() {
          return Err(
            name_error(
              "name-invalid-hex", i, "BER hex form requires pairs of hexadecimal digits.",
            ),
          )
        }
        match (hex_digit(b[i]), hex_digit(b[i + 1])) {
          (Some(high), Some(low)) => bytes.push((high * 16 + low).to_byte())
          _ =>
            return Err(
              name_error(
                "name-invalid-hex", i, "BER hex form requires pairs of hexadecimal digits.",
              ),
            )
        }
        i = i + 2
      }
      if bytes.is_empty() {
        return Err(
          name_error(
            "name-empty-hex", value_start, "BER hex form requires at least one byte after '#'.",
          ),
        )
      }
      Ber(Bytes::from_array(bytes))
    } else {
      let bytes : Array[Byte] = []
      let mut trailing_space = false
      while i < b.length() && b[i] != 43 && b[i] != 44 {
        let c = b[i]
        if c == 92 {
          if i + 1 == b.length() {
            return Err(
              name_error(
                "name-incomplete-escape", i, "A backslash must be followed by an allowed escaped character or two hex digits.",
              ),
            )
          }
          let next = b[i + 1]
          match hex_digit(next) {
            Some(high) => {
              if i + 2 >= b.length() {
                return Err(
                  name_error(
                    "name-incomplete-escape", i, "A hexadecimal escape requires two digits.",
                  ),
                )
              }
              let low = match hex_digit(b[i + 2]) {
                Some(n) => n
                None =>
                  return Err(
                    name_error(
                      "name-invalid-escape", i, "A hexadecimal escape requires two digits.",
                    ),
                  )
              }
              bytes.push((high * 16 + low).to_byte())
              i = i + 3
            }
            None => {
              if ![32, 34, 35, 43, 44, 59, 60, 61, 62, 92].contains(
                  next.to_int(),
                ) {
                return Err(
                  name_error(
                    "name-invalid-escape", i, "This character cannot be escaped with a single backslash; use its hex byte representation.",
                  ),
                )
              }
              bytes.push(next)
              i = i + 2
            }
          }
          trailing_space = false
        } else {
          if (i == value_start && c == 32) ||
            c == 0 ||
            c == 34 ||
            c == 59 ||
            c == 60 ||
            c == 62 {
            return Err(
              name_error(
                "name-unescaped-character", i, "Escape this leading space or special character in the DN value.",
              ),
            )
          }
          bytes.push(c)
          trailing_space = c == 32
          i = i + 1
        }
      }
      if trailing_space {
        return Err(
          name_error(
            "name-trailing-space",
            i - 1,
            "A trailing DN value space must be escaped; it is never silently trimmed.",
          ),
        )
      }
      Text(Bytes::from_array(bytes))
    }
    assertions.push({ attribute, value, byte_offset: begin, })
    if i == b.length() || b[i] == 44 {
      rdns.push({ assertions, })
      assertions = []
      if rdns.length() > 256 {
        return Err(
          name_error(
            "name-rdn-limit", i, "DN exceeds this profile's 256 RDN limit.",
          ),
        )
      }
    }
    if i < b.length() {
      i = i + 1
      if i == b.length() {
        return Err(
          name_error(
            "name-empty-component", i, "A trailing comma or plus must be followed by an attribute assertion.",
          ),
        )
      }
    }
  }
  Ok({ rdns, })
}

///|
pub fn parse_rdn(text : String) -> Result[RelativeName, NameError] {
  match parse_dn(text) {
    Err(e) => Err(e)
    Ok(name) =>
      if name.rdns.length() == 1 {
        Ok(name.rdns[0])
      } else {
        Err(
          name_error(
            "name-expected-rdn", 0, "Expected exactly one nonempty RDN; use '+' for multiple assertions, not ','.",
          ),
        )
      }
  }
}

///|
fn report_name_error(
  ds : Array[Diagnostic],
  e : NameError,
  field : String,
  span : Span,
) -> Unit {
  diagnose(
    ds,
    e.code,
    "error",
    span,
    field +
    ": decoded value byte " +
    e.byte_offset.to_string() +
    ": " +
    e.reason,
  )
}

///|
/// Structural parsing plus DN/newrdn/newsuperior string-syntax checks.
/// Diagnostics locate original physical fields even with Base64 or folding.
pub fn check(data : Bytes, options? : Options = Options::default()) -> Report {
  let report = parse(data, options~)
  let ds = report.diagnostics.copy()
  let lines = logical_lines(data, [])
  let mut cursor = 0
  for r in report.document.records {
    while cursor < lines.length() && lines[cursor].span.line < r.span.line {
      cursor = cursor + 1
    }
    let mut dn_span = single_line(r.span.line)
    let mut rdn_span = r.span
    let mut superior_span = r.span
    while cursor < lines.length() && lines[cursor].span.line <= r.span.end_line {
      let line = lines[cursor]
      if line.span.line == r.span.line {
        dn_span = line.span
      }
      if line_name(line) == "newrdn" {
        rdn_span = line.span
      }
      if line_name(line) == "newsuperior" {
        superior_span = line.span
      }
      cursor = cursor + 1
    }
    match parse_dn(r.dn) {
      Err(e) => report_name_error(ds, e, "dn", dn_span)
      Ok(_) => ()
    }
    match r.body {
      Rename(rdn, _, superior) => {
        match parse_rdn(rdn) {
          Err(e) => report_name_error(ds, e, "newrdn", rdn_span)
          Ok(_) => ()
        }
        match superior {
          Some(s) =>
            match parse_dn(s) {
              Err(e) => report_name_error(ds, e, "newsuperior", superior_span)
              Ok(_) => ()
            }
          None => ()
        }
      }
      _ => ()
    }
  }
  { document: report.document, diagnostics: ds, names_checked: true, }
}

///|
pub fn check_text(
  text : String,
  options? : Options = Options::default(),
) -> Report {
  check(@utf8.encode(text[:]), options~)
}
