///|
pub(all) struct Span {
  line : Int
  end_line : Int
} derive(Eq, ToJson)

///|
pub(all) enum Value {
  Inline(Bytes)
  External(String)
} derive(Eq)

///|
pub(all) struct Attribute {
  name : String
  value : Value
  span : Span
} derive(Eq)

///|
pub(all) struct Control {
  oid : String
  critical : Bool
  value : Value?
  span : Span
} derive(Eq)

///|
pub(all) struct Modification {
  operation : String
  attribute : String
  values : Array[Attribute]
  span : Span
} derive(Eq)

///|
pub(all) enum Body {
  Entry(Array[Attribute])
  Add(Array[Attribute])
  Delete
  Modify(Array[Modification])
  Rename(String, Bool, String?)
} derive(Eq)

///|
pub(all) struct Record {
  dn : String
  controls : Array[Control]
  body : Body
  span : Span
} derive(Eq)

///|
pub(all) struct Document {
  mode : String
  records : Array[Record]
} derive(Eq)

///|
pub(all) struct Diagnostic {
  code : String
  severity : String
  span : Span
  reason : String
} derive(Eq, ToJson)

///|
pub(all) struct Options {
  allow_missing_version : Bool
  deny_delete : Bool
} derive(Eq)

///|
pub fn Options::default() -> Options {
  { allow_missing_version: false, deny_delete: false, }
}

///|
pub(all) struct Report {
  document : Document
  diagnostics : Array[Diagnostic]
  names_checked : Bool
}

///|
pub fn Report::status(self : Report) -> String {
  if self.diagnostics.any(d => d.severity == "error") {
    "invalid"
  } else if self.diagnostics.any(d => d.severity == "unsupported") {
    "incomplete"
  } else {
    "complete"
  }
}

///|
pub fn Report::exit_code(self : Report) -> Int {
  if self.status() != "complete" {
    2
  } else if self.diagnostics.any(d => d.severity == "policy") {
    1
  } else {
    0
  }
}

///|
fn diagnose(
  ds : Array[Diagnostic],
  code : String,
  severity : String,
  span : Span,
  reason : String,
) -> Unit {
  if ds.length() < 100 {
    ds.push({ code, severity, span, reason, })
  } else if ds.length() == 100 {
    ds.push({
      code: "diagnostic-limit",
      severity: "error",
      span,
      reason: "Stopped collecting diagnostics at the configured limit.",
    })
  }
}

///|
priv struct Line {
  text : String
  span : Span
}

///|
fn single_line(line : Int) -> Span {
  { line, end_line: line, }
}

///|
pub fn version() -> String {
  "0.6.0"
}
