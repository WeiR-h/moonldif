///|
/// A bounded comparison of two content exports, not an executable LDAP patch.
pub struct SnapshotDiff {
  priv code : Int
  priv result : Json
}

///|
pub fn SnapshotDiff::exit_code(self : SnapshotDiff) -> Int {
  self.code
}

///|
pub fn SnapshotDiff::to_json(self : SnapshotDiff) -> Json {
  self.result
}

///|
fn snapshot_attribute_key(name : String) -> String {
  let parts = ascii_lower(name).split(";").map(p => p.to_owned()).to_array()
  let options : Array[String] = []
  for i in 1..<parts.length() {
    if !options.contains(parts[i]) {
      options.push(parts[i])
    }
  }
  options.sort()
  if options.is_empty() {
    parts[0]
  } else {
    parts[0] + ";" + options.join(";")
  }
}

///|
priv struct SnapshotAttribute {
  values : Map[String, Int]
  mut count : Int
  mut span : Span
}

///|
fn snapshot_attributes(record : Record) -> Map[String, SnapshotAttribute] {
  let result : Map[String, SnapshotAttribute] = Map([])
  if record.body is Entry(attributes) {
    for a in attributes {
      let key = snapshot_attribute_key(a.name)
      let group = match result.get(key) {
        Some(group) => group
        None => {
          let group : SnapshotAttribute = {
            values: Map([]),
            count: 0,
            span: a.span,
          }
          result[key] = group
          group
        }
      }
      if a.value is Inline(bytes) {
        // Base64 is an injective byte key, never included in the report.
        let value = @base64.encode(bytes[:])
        group.values[value] = group.values.get(value).unwrap_or(0) + 1
        group.count += 1
        group.span = { line: group.span.line, end_line: a.span.end_line, }
      }
    }
  }
  result
}

///|
fn snapshot_index(report : Report) -> Map[String, Array[Record]] {
  let index : Map[String, Array[Record]] = Map([])
  for r in report.document.records {
    match index.get(r.dn) {
      Some(records) => records.push(r)
      None => index[r.dn] = [r]
    }
  }
  index
}

///|
fn[A, B] snapshot_union(
  a : Map[String, A],
  b : Map[String, B],
) -> Array[String] {
  let keys : Map[String, Bool] = Map([])
  for key in a.keys() {
    keys[key] = true
  }
  for key in b.keys() {
    keys[key] = true
  }
  let sorted = keys.keys().to_array()
  sorted.sort()
  sorted
}

///|
fn snapshot_span(span : Span?) -> Json {
  match span {
    Some(s) => ToJson::to_json(s)
    None => Json::null()
  }
}

///|
fn snapshot_source(report : Report, length : Int, sha : String?) -> Json {
  {
    "byte_length": length.to_json(),
    "sha256": match sha {
      Some(s) => ToJson::to_json(s)
      None => Json::null()
    },
    "status": report.status().to_json(),
    "record_count": report.document.records.length().to_json(),
    "diagnostics": report.diagnostics.to_json(),
  }
}

///|
/// DN strings match exactly after LDIF decoding, without LDAP name matching.
/// Attribute descriptions ignore ASCII case/option order. Values are byte
/// multisets (duplicates counted); order, wrapping and Base64 spelling do not
/// matter. Host-computed SHA-256 is optional and never an authenticity proof.
/// 0 = no differences, 1 = differences, 2 = incomplete/invalid, with 2 priority.
pub fn compare_snapshots(
  before : Bytes,
  after : Bytes,
  allow_missing_version? : Bool = false,
  legacy_dn_spaces? : Bool = false,
  before_sha256? : String? = None,
  after_sha256? : String? = None,
) -> SnapshotDiff {
  let options : Options = { allow_missing_version, deny_delete: false, }
  let old = check(before, options~, legacy_dn_spaces~)
  let new = check(after, options~, legacy_dn_spaces~)
  let diagnostics : Array[Json] = []
  let mut failed = old.exit_code() == 2 || new.exit_code() == 2
  for pair in [("before", old), ("after", new)] {
    let (side, report) = pair
    if report.document.mode != "content" && report.document.mode != "empty" {
      failed = true
      diagnostics.push({
        "code": "snapshot-content-only",
        "side": side.to_json(),
        "reason": "Comparison accepts content exports, not change plans.",
      })
    }
  }
  for pair in [("before", before_sha256), ("after", after_sha256)] {
    let (side, sha) = pair
    if sha is Some(s) {
      if s.length() != 64 ||
        !s.iter().all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
        failed = true
        diagnostics.push({
          "code": "snapshot-source-hash",
          "side": side.to_json(),
          "reason": "SHA-256 must be 64 lowercase hexadecimal characters.",
        })
      }
    }
  }
  let can_compare = !failed
  let items : Array[Json] = []
  let counts : Map[String, Int] = {
    "entry-added": 0,
    "entry-removed": 0,
    "attribute-added": 0,
    "attribute-removed": 0,
    "values-changed": 0,
  }
  let mut total = 0
  let mut ambiguous = 0
  let mut compared = 0
  fn add_item(
    code : String,
    dn : String,
    attr : String?,
    old_span : Span?,
    new_span : Span?,
    removed : Int,
    added : Int,
  ) {
    total += 1
    counts[code] = counts.get(code).unwrap_or(0) + 1
    if items.length() < 200 {
      items.push({
        "code": code.to_json(),
        "dn": dn.to_json(),
        "attribute": match attr {
          Some(a) => a.to_json()
          None => Json::null()
        },
        "before_span": snapshot_span(old_span),
        "after_span": snapshot_span(new_span),
        "removed_value_count": removed.to_json(),
        "added_value_count": added.to_json(),
      })
    }
  }
  if can_compare {
    let old_index = snapshot_index(old)
    let new_index = snapshot_index(new)
    for dn in snapshot_union(old_index, new_index) {
      let aa = old_index.get(dn).unwrap_or([])
      let bb = new_index.get(dn).unwrap_or([])
      if aa.length() > 1 || bb.length() > 1 {
        failed = true
        ambiguous += 1
        if diagnostics.length() < 100 {
          diagnostics.push({
            "code": "snapshot-duplicate-dn",
            "dn": dn.to_json(),
            "before_count": aa.length().to_json(),
            "after_count": bb.length().to_json(),
            "before_span": if aa.is_empty() {
              Json::null()
            } else {
              ToJson::to_json(aa[0].span)
            },
            "after_span": if bb.is_empty() {
              Json::null()
            } else {
              ToJson::to_json(bb[0].span)
            },
            "reason": "Repeated exact DN is ambiguous; this key was excluded from comparison.",
          })
        }
        continue
      }
      compared += 1
      if aa.is_empty() {
        add_item("entry-added", dn, None, None, Some(bb[0].span), 0, 0)
      } else if bb.is_empty() {
        add_item("entry-removed", dn, None, Some(aa[0].span), None, 0, 0)
      } else {
        let a_attrs = snapshot_attributes(aa[0])
        let b_attrs = snapshot_attributes(bb[0])
        for attr in snapshot_union(a_attrs, b_attrs) {
          match (a_attrs.get(attr), b_attrs.get(attr)) {
            (None, Some(b)) =>
              add_item(
                "attribute-added",
                dn,
                Some(attr),
                None,
                Some(b.span),
                0,
                b.count,
              )
            (Some(a), None) =>
              add_item(
                "attribute-removed",
                dn,
                Some(attr),
                Some(a.span),
                None,
                a.count,
                0,
              )
            (Some(a), Some(b)) => {
              let mut removed = 0
              let mut added = 0
              for value, count in a.values {
                let delta = count - b.values.get(value).unwrap_or(0)
                if delta > 0 {
                  removed += delta
                }
              }
              for value, count in b.values {
                let delta = count - a.values.get(value).unwrap_or(0)
                if delta > 0 {
                  added += delta
                }
              }
              if removed > 0 || added > 0 {
                add_item(
                  "values-changed",
                  dn,
                  Some(attr),
                  Some(a.span),
                  Some(b.span),
                  removed,
                  added,
                )
              }
            }
            _ => ()
          }
        }
      }
    }
  }
  let code = if failed { 2 } else if total > 0 { 1 } else { 0 }
  {
    code,
    result: {
      "tool": "MoonLDIF",
      "version": version().to_json(),
      "kind": "snapshot-diff",
      "report_schema_version": 1,
      "exit_code": code.to_json(),
      "status": (if failed { "incomplete" } else { "complete" }).to_json(),
      "analysis_complete": (!failed).to_json(),
      "comparison_performed": can_compare.to_json(),
      "matching": "Exact decoded DN string; ASCII-insensitive attribute descriptions; byte multiset values",
      "scope": "Export comparison only; not LDAP semantic equality, rename detection or an executable patch. Reports contain DNs, not attribute values.",
      "options": {
        "allow_missing_version": allow_missing_version.to_json(),
        "legacy_dn_spaces": legacy_dn_spaces.to_json(),
      },
      "before": snapshot_source(old, before.length(), before_sha256),
      "after": snapshot_source(new, after.length(), after_sha256),
      "diagnostics": diagnostics.to_json(),
      "diagnostics_truncated": (ambiguous > 100).to_json(),
      "ambiguous_dn_count": ambiguous.to_json(),
      "compared_dn_count": compared.to_json(),
      "counts": counts.to_json(),
      "total_changes": total.to_json(),
      "reported_changes": items.length().to_json(),
      "truncated": (total > items.length()).to_json(),
      "changes": items.to_json(),
    },
  }
}

///|
/// Human-readable reports retain all JSON fields without raw attribute bytes.
pub fn SnapshotDiff::to_text(self : SnapshotDiff) -> String {
  "MoonLDIF snapshot comparison; exit " +
  self.code.to_string() +
  "\n" +
  self.result.stringify(indent=2) +
  "\n"
}

///|
fn snapshot_field(json : Json, key : String) -> Json {
  match json {
    Object(fields) => fields.get(key).unwrap_or(Json::null())
    _ => Json::null()
  }
}

///|
fn snapshot_display(json : Json) -> String {
  match json {
    String(s) => s
    Null => "-"
    _ => json.stringify()
  }
}

///|
/// Human-readable summary and locations; all input-derived strings are escaped.
pub fn SnapshotDiff::to_markdown(self : SnapshotDiff) -> String {
  let out = StringBuilder()
  out.write_string(
    "# MoonLDIF snapshot comparison\n\nExit: " + self.code.to_string() + "\n\n",
  )
  out.write_string(
    "Content exports only. Exact DN strings and byte multiset values; not server equality or an executable patch. Reports contain DNs. Truncated findings are explicitly counted.\n\n",
  )
  out.write_string("Version: " + version() + "\n\n")
  for
    key in [
      "analysis_complete", "comparison_performed", "options", "counts", "total_changes",
      "reported_changes", "truncated", "ambiguous_dn_count", "diagnostics_truncated",
    ] {
    out.write_string(
      "- " +
      markdown_escape(key) +
      ": " +
      markdown_escape(snapshot_display(snapshot_field(self.result, key))) +
      "\n",
    )
  }
  for side in ["before", "after"] {
    out.write_string("\n## " + side + " source\n\n")
    let source = snapshot_field(self.result, side)
    for
      key in ["byte_length", "sha256", "status", "record_count", "diagnostics"] {
      out.write_string(
        "- " +
        markdown_escape(key) +
        ": " +
        markdown_escape(snapshot_display(snapshot_field(source, key))) +
        "\n",
      )
    }
  }
  out.write_string(
    "\n## Comparison diagnostics\n\n" +
    markdown_escape(snapshot_field(self.result, "diagnostics").stringify()) +
    "\n\n## Differences\n\n",
  )
  out.write_string(
    "| Change | DN | Attribute | Before lines | After lines | Removed values | Added values |\n|---|---|---|---|---|---|---|\n",
  )
  if snapshot_field(self.result, "changes") is Array(items) {
    for item in items {
      out.write_string("|")
      for
        key in [
          "code", "dn", "attribute", "before_span", "after_span", "removed_value_count",
          "added_value_count",
        ] {
        out.write_string(
          " " +
          markdown_escape(snapshot_display(snapshot_field(item, key))) +
          " |",
        )
      }
      out.write_string("\n")
    }
  }
  out.to_string()
}
