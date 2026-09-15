///|
fn ascii_lower(s : String) -> String {
  let out = StringBuilder()
  for c in s.iter() {
    let n = c.to_int()
    out.write_char(if n >= 65 && n <= 90 { (n + 32).unsafe_to_char() } else { c })
  }
  out.to_string()
}

///|
fn is_digit(c : Char) -> Bool { c >= '0' && c <= '9' }

///|
fn is_alpha(c : Char) -> Bool { (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') }

///|
fn valid_oid(s : String) -> Bool {
  let parts = s.split(".").to_array()
  parts.length() >= 2 && parts.all(p => !p.is_empty() && p.iter().all(is_digit))
}

///|
fn valid_attribute(s : String) -> Bool {
  let parts = s.split(";").to_array()
  if parts.is_empty() || parts[0].is_empty() { return false }
  let head = parts[0].to_owned()
  let chars = head.iter().to_array()
  if !(valid_oid(head) || (is_alpha(chars[0]) && chars.all(c => is_alpha(c) || is_digit(c) || c == '-'))) {
    return false
  }
  for i in 1..<parts.length() {
    if parts[i].is_empty() || !parts[i].iter().all(c => is_alpha(c) || is_digit(c) || c == '-') { return false }
  }
  true
}

///|
fn attribute_equal(a : String, b : String) -> Bool {
  let aa = ascii_lower(a).split(";").map(p => p.to_owned()).to_array()
  let bb = ascii_lower(b).split(";").map(p => p.to_owned()).to_array()
  aa[0] == bb[0] && aa.all(p => bb.contains(p)) && bb.all(p => aa.contains(p))
}

///|
/// LDAP attribute-description spelling only; does not compare DN or values.
pub fn same_attribute_description(a : String, b : String) -> Bool {
  valid_attribute(a) && valid_attribute(b) && attribute_equal(a, b)
}

///|
fn parse_field(line : Line, ds : Array[Diagnostic]) -> Attribute? {
  let bytes = @utf8.encode(line.text[:])
  let mut colon = -1
  for i in 0..<bytes.length() {
    if bytes[i] == 58 { colon = i; break }
  }
  if colon < 1 {
    diagnose(ds, "missing-value-separator", "error", line.span, "Expected an attribute name followed by ':'.")
    return None
  }
  let name = @utf8.decode(bytes[:colon]) catch { _ => return None }
  if !valid_attribute(name) {
    diagnose(ds, "invalid-attribute-name", "error", line.span, "Invalid attribute description.")
    return None
  }
  let mut start = colon + 1
  let mut encoding = "plain"
  if start < bytes.length() && bytes[start] == 58 { encoding = "base64"; start = start + 1 }
  else if start < bytes.length() && bytes[start] == 60 { encoding = "url"; start = start + 1 }
  while start < bytes.length() && bytes[start] == 32 { start = start + 1 }
  let raw = bytes[start:].to_owned()
  let value = if encoding == "base64" {
    let encoded = @utf8.decode(raw[:]) catch { _ => return None }
    if !encoded.iter().all(c => is_alpha(c) || is_digit(c) || c == '+' || c == '/' || c == '=') {
      diagnose(ds, "invalid-base64", "error", line.span, "Base64 contains characters outside its alphabet.")
      return None
    }
    let decoded = @base64.decode(encoded[:], ignore_whitespace=false) catch {
      _ => {
        diagnose(ds, "invalid-base64", "error", line.span, "Invalid Base64 length or padding.")
        return None
      }
    }
    Inline(decoded)
  } else if encoding == "url" {
    let url = @utf8.decode(raw[:]) catch { _ => return None }
    if url == "" || url.iter().any(c => c <= ' ') {
      diagnose(ds, "invalid-url-value", "error", line.span, "Expected a nonempty URL without whitespace.")
    } else {
      diagnose(ds, "external-value-unresolved", "unsupported", line.span, "URL value is preserved but will not be read.")
    }
    External(url)
  } else {
    if raw.length() > 0 && (raw[0] == 58 || raw[0] == 60) {
      diagnose(ds, "unsafe-initial-value", "error", line.span, "This initial character requires Base64 encoding.")
    }
    if raw.iter().any(b => b == 0 || b == 10 || b == 13 || b >= 128) {
      diagnose(ds, "unsafe-plain-value", "error", line.span, "Non-ASCII or forbidden bytes require Base64 encoding.")
    }
    Inline(raw)
  }
  Some({ name, value, span: line.span })
}

///|
fn field_text(field : Attribute, ds : Array[Diagnostic]) -> String? {
  match field.value {
    Inline(bytes) => {
      let text = @utf8.decode(bytes[:]) catch {
        _ => { diagnose(ds, "invalid-text-value", "error", field.span, "This field must be valid UTF-8."); return None }
      }
      Some(text)
    }
    External(_) => {
      diagnose(ds, "external-structural-field", "error", field.span, "This structural field cannot use a URL reference.")
      None
    }
  }
}
