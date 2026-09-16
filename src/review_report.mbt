///|
/// Host-computed identity of the exact analysed bytes, not a signature.
/// Callers must supply the options used to create the report.
pub(all) struct ReviewMetadata {
  input_sha256 : String
  input_byte_length : Int
  options : Options
  legacy_dn_spaces : Bool
  risk_policy : RiskPolicy
} derive(Eq)

///|
fn ReviewMetadata::json(self : ReviewMetadata) -> Json {
  {
    "allow_missing_version": self.options.allow_missing_version.to_json(),
    "deny_delete": self.options.deny_delete.to_json(),
    "deny_clear": self.risk_policy.deny_clear.to_json(),
    "deny_rename": self.risk_policy.deny_rename.to_json(),
    "legacy_dn_spaces": self.legacy_dn_spaces.to_json(),
  }
}

///|
/// Additive fields preserve the existing report JSON shape. Attribute bytes,
/// complete input text, filenames and host paths are intentionally omitted.
pub fn Report::review_json(self : Report, metadata : ReviewMetadata) -> Json {
  let result = self.to_json(include_review=true)
  if result is Object(fields) {
    fields["report_schema_version"] = (1).to_json()
    fields["source"] = {
      "sha256": metadata.input_sha256.to_json(),
      "byte_length": metadata.input_byte_length.to_json(),
      "identity_scope": "Exact analysed bytes; not a signature or authenticity proof",
    }
    fields["options"] = metadata.json()
    fields["diagnostics_truncated"] = self.diagnostics
      .any(d => d.code == "diagnostic-limit")
      .to_json()
  }
  result
}

///|
fn markdown_escape(text : String) -> String {
  let out = StringBuilder()
  for c in text.iter() {
    if c.to_int() < 32 || "&<>\\`*_{}[]()#+-.!|~=\"".contains(c.to_string()) {
      out.write_string("&#" + c.to_int().to_string() + ";")
    } else {
      out.write_char(c)
    }
  }
  out.to_string()
}

///|
pub fn Report::review_markdown(
  self : Report,
  metadata : ReviewMetadata,
) -> String {
  let review = self.review()
  let out = StringBuilder()
  out.write_string("# MoonLDIF operation review\n\n")
  out.write_string("Tool version: " + markdown_escape(version()) + "\n\n")
  out.write_string(
    "Input SHA-256: " + markdown_escape(metadata.input_sha256) + "\n\n",
  )
  out.write_string(
    "Input bytes: " + metadata.input_byte_length.to_string() + "\n\n",
  )
  out.write_string(
    "Status: " +
    self.status() +
    "; exit: " +
    self.exit_code().to_string() +
    "; records: " +
    self.document.records.length().to_string() +
    "\n\n",
  )
  out.write_string(
    "Options: " + markdown_escape(metadata.json().stringify()) + "\n\n",
  )
  out.write_string(
    "File intent only, not server import approval. Hash identifies analysed bytes, not authenticity. This report contains target DNs; do not share it as anonymised data.\n\n",
  )
  out.write_string(
    "Not checked: " + markdown_escape(self.not_checked().join(", ")) + "\n\n",
  )
  out.write_string(
    "Review items: " +
    review.total_items.to_string() +
    "; retained: " +
    review.items.length().to_string() +
    "; truncated: " +
    review.truncated.to_string() +
    "\n\n",
  )
  out.write_string(
    "Diagnostics truncated: " +
    self.diagnostics.any(d => d.code == "diagnostic-limit").to_string() +
    "\n\n",
  )
  if self.exit_code() == 2 {
    out.write_string(
      "**Partial or invalid analysis. Missing findings are not proof of no impact.**\n\n",
    )
  }
  out.write_string("## Diagnostics\n\n")
  if self.diagnostics.is_empty() {
    out.write_string("No diagnostics in the supported checks.\n\n")
  }
  for d in self.diagnostics {
    out.write_string(
      "- " +
      markdown_escape(d.code) +
      " / " +
      markdown_escape(d.severity) +
      " / lines " +
      d.span.line.to_string() +
      "–" +
      d.span.end_line.to_string() +
      ": " +
      markdown_escape(d.reason) +
      "\n",
    )
  }
  out.write_string("\n## Operations\n\n")
  for item in review.items {
    out.write_string(
      "### " +
      (item.record_index + 1).to_string() +
      ". " +
      markdown_escape(item.title) +
      "\n\n",
    )
    out.write_string(
      "- Code: " +
      markdown_escape(item.code) +
      "; level: " +
      markdown_escape(item.level) +
      "\n",
    )
    out.write_string("- Target DN: " + markdown_escape(item.dn) + "\n")
    out.write_string(
      "- Lines: " +
      item.span.line.to_string() +
      "–" +
      item.span.end_line.to_string() +
      "\n",
    )
    match item.attribute {
      Some(attribute) =>
        out.write_string(
          "- Attribute: " +
          markdown_escape(attribute) +
          "; supplied values: " +
          item.value_count.to_string() +
          "\n",
        )
      None => ()
    }
    out.write_string(
      "- Reason: " +
      markdown_escape(item.reason) +
      "\n- Review action: " +
      markdown_escape(item.action) +
      "\n\n",
    )
  }
  out.to_string()
}
