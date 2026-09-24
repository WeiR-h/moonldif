///|
priv struct BatchItem {
  label : String
  code : Int
  report : Json
  text : String
  markdown : String
}

///|
/// Bounded, ordered offline review. No cross-file execution or LDAP state is inferred.
/// Only compact reports are retained, not input bytes or parsed documents.
pub struct BatchReview {
  priv items : Array[BatchItem]
  priv options : Options
  priv risk_policy : RiskPolicy
  priv legacy_dn_spaces : Bool
  priv profile : Profile?
  priv profile_meta : Json
  priv mut requested : Int
  priv mut input_bytes : Int
}

///|
pub fn BatchReview::new(
  options? : Options = Options::default(),
  risk_policy? : RiskPolicy = RiskPolicy::default(),
  legacy_dn_spaces? : Bool = false,
) -> BatchReview {
  {
    items: [],
    profile: None,
    profile_meta: Json::null(),
    options,
    risk_policy,
    legacy_dn_spaces,
    requested: 0,
    input_bytes: 0,
  }
}

///|
fn batch_label(label : String) -> String {
  let out = StringBuilder()
  let mut count = 0
  for c in label.iter() {
    if count >= 200 {
      break
    }
    count += 1
    let n = c.to_int()
    if n < 32 ||
      n == 127 ||
      (n >= 0x202A && n <= 0x202E) ||
      (n >= 0x2066 && n <= 0x2069) ||
      c == '/' ||
      c == '\\' ||
      c == ':' {
      out.write_char('_')
    } else {
      out.write_char(c)
    }
  }
  if count == 0 {
    "unnamed"
  } else {
    out.to_string()
  }
}

///|
fn BatchReview::failure(
  self : BatchReview,
  label : String,
  reason : String,
) -> Unit {
  let safe_label = batch_label(label)
  self.items.push({
    label: safe_label,
    code: 2,
    report: {
      "status": "unavailable",
      "exit_code": 2,
      "source": Json::null(),
      "diagnostics": [
        {
          "code": "batch-input-error",
          "severity": "error",
          "reason": reason.to_json(),
        },
      ],
    },
    text: "Not analysed: " + reason + "\n",
    markdown: "**Not analysed:** " + markdown_escape(reason) + "\n",
  })
}

///|
/// Record a host I/O failure without leaking an OS error or local path.
pub fn BatchReview::add_unavailable(self : BatchReview, label : String) -> Unit {
  self.requested += 1
  if self.requested <= 50 {
    self.failure(
      label, "Input could not be read within the batch/file limits; no content was analysed.",
    )
  }
}

///|
/// Remaining cumulative accepted-input-byte budget, for bounded host I/O.
pub fn BatchReview::remaining_bytes(self : BatchReview) -> Int {
  32 * 1024 * 1024 - self.input_bytes
}

///|
/// The host must compute input_sha256 from data. Syntax is checked here;
/// this identity is not an authenticity proof. Labels are display names, not paths.
pub fn BatchReview::add_bytes(
  self : BatchReview,
  label : String,
  data : Bytes,
  input_sha256 : String,
) -> Unit {
  self.requested += 1
  if self.requested > 50 {
    return
  }
  if data.length() > 8 * 1024 * 1024 || data.length() > self.remaining_bytes() {
    self.failure(label, "Input exceeds the 8 MiB file or 32 MiB batch limit.")
    return
  }
  self.input_bytes += data.length()
  if input_sha256.length() != 64 ||
    !input_sha256
    .iter()
    .all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
    self.failure(
      label, "Source SHA-256 must be 64 lowercase hexadecimal characters.",
    )
    return
  }
  let report = check(
    data,
    options=self.options,
    risk_policy=self.risk_policy,
    legacy_dn_spaces=self.legacy_dn_spaces,
  )
  let counts = self.profile.map(p => profile_evaluate(report, p))
  let metadata : ReviewMetadata = {
    input_sha256,
    input_byte_length: data.length(),
    options: self.options,
    risk_policy: self.risk_policy,
    legacy_dn_spaces: self.legacy_dn_spaces,
  }
  let json = report.review_json(metadata)
  if self.profile is Some(_) && json is Object(fields) {
    fields["report_schema_version"] = (3).to_json()
    fields["profile"] = snapshot_copy_json(self.profile_meta)
    fields["change_limits"] = counts.unwrap()
  }
  let extra = if counts is Some(c) {
    "\nChange limits: " + c.stringify() + "\n"
  } else {
    ""
  }
  self.items.push({
    label: batch_label(label),
    code: report.exit_code(),
    report: json,
    text: "Source SHA-256: " +
    input_sha256 +
    "; bytes: " +
    data.length().to_string() +
    "\n" +
    report.to_text() +
    report.review().to_text() +
    extra,
    markdown: report.review_markdown(metadata) + markdown_escape(extra),
  })
}

///|
pub fn BatchReview::exit_code(self : BatchReview) -> Int {
  if self.requested == 0 ||
    self.requested > 50 ||
    self.items.any(item => item.code == 2) {
    2
  } else if self.items.any(item => item.code == 1) {
    1
  } else {
    0
  }
}

///|
pub fn BatchReview::to_json(self : BatchReview) -> Json {
  let diagnostics : Array[Json] = []
  if self.requested == 0 || self.requested > 50 {
    diagnostics.push({
      "code": "batch-file-count",
      "severity": "error",
      "reason": "A batch requires 1 to 50 explicit inputs. Unreported inputs were not analysed.",
    })
  }
  let files : Array[Json] = []
  for i, item in self.items {
    files.push({
      "index": i.to_json(),
      "label": item.label.to_json(),
      "report": item.report,
    })
  }
  let json : Json = {
    "tool": "MoonLDIF",
    "version": version().to_json(),
    "kind": "batch-review",
    "report_schema_version": 1,
    "exit_code": self.exit_code().to_json(),
    "status": (if self.exit_code() == 2 { "incomplete" } else { "complete" }).to_json(),
    "analysis_complete": (self.exit_code() != 2).to_json(),
    "requested_files": self.requested.to_json(),
    "reported_files": self.items.length().to_json(),
    "unreported_files": (self.requested - self.items.length()).to_json(),
    "input_byte_budget_used": self.input_bytes.to_json(),
    "passed_files": self.items.filter(i => i.code == 0).length().to_json(),
    "blocked_files": self.items.filter(i => i.code == 1).length().to_json(),
    "incomplete_or_error_files": self.items
    .filter(i => i.code == 2)
    .length()
    .to_json(),
    "options": self.options_json(),
    "diagnostics": diagnostics.to_json(),
    "files": files.to_json(),
  }
  if self.profile is Some(_) && json is Object(fields) {
    fields["report_schema_version"] = (3).to_json()
    fields["profile"] = snapshot_copy_json(self.profile_meta)
    fields["limit_scope"] = "per_file".to_json()
  }
  json
}

///|
fn BatchReview::options_json(self : BatchReview) -> Json {
  {
    "allow_missing_version": self.options.allow_missing_version.to_json(),
    "deny_delete": self.options.deny_delete.to_json(),
    "deny_clear": self.risk_policy.deny_clear.to_json(),
    "deny_rename": self.risk_policy.deny_rename.to_json(),
    "legacy_dn_spaces": self.legacy_dn_spaces.to_json(),
  }
}

///|
pub fn BatchReview::to_text(self : BatchReview) -> String {
  let out = StringBuilder()
  out.write_string(
    "MoonLDIF " +
    version() +
    " batch review; exit " +
    self.exit_code().to_string() +
    "; files " +
    self.items.length().to_string() +
    "/" +
    self.requested.to_string() +
    "\n",
  )
  out.write_string(
    "Reports contain filenames and DNs, not attribute values. Files are checked independently, not as a combined transaction.\n",
  )
  out.write_string("Options: " + self.options_json().stringify() + "\n")
  if self.profile is Some(_) {
    out.write_string(
      "Profile (per_file): " + self.profile_meta.stringify() + "\n",
    )
  }
  if self.requested == 0 || self.requested > 50 {
    out.write_string(
      "batch-file-count: expected 1 to 50 inputs; unreported inputs were not analysed.\n",
    )
  }
  for i, item in self.items {
    out.write_string(
      "\n[" +
      (i + 1).to_string() +
      "] " +
      item.label +
      "; exit " +
      item.code.to_string() +
      "\n" +
      item.text,
    )
  }
  out.to_string()
}

///|
pub fn BatchReview::to_markdown(self : BatchReview) -> String {
  let out = StringBuilder()
  out.write_string(
    "# MoonLDIF batch review\n\nVersion: " +
    markdown_escape(version()) +
    "; exit: " +
    self.exit_code().to_string() +
    "; reported files: " +
    self.items.length().to_string() +
    "/" +
    self.requested.to_string() +
    "\n\nFiles are checked independently; this is not a transaction or server import approval. Reports contain filenames and target DNs, not attribute values.\n\n",
  )
  out.write_string(
    "Options: " + markdown_escape(self.options_json().stringify()) + "\n\n",
  )
  if self.profile is Some(_) {
    out.write_string(
      "Profile (per_file): " +
      markdown_escape(self.profile_meta.stringify()) +
      "\n\n",
    )
  }
  if self.exit_code() == 2 {
    out.write_string(
      "**Incomplete batch: do not treat missing findings as approval.**\n\n",
    )
  }
  if self.requested == 0 || self.requested > 50 {
    out.write_string(
      "batch-file-count: expected 1 to 50 inputs; unreported inputs were not analysed.\n\n",
    )
  }
  for i, item in self.items {
    out.write_string(
      "## File " +
      (i + 1).to_string() +
      ": " +
      markdown_escape(item.label) +
      "\n\n",
    )
    for line in item.markdown.split("\n") {
      if line.has_prefix("#") {
        out.write_string("##")
      }
      out.write_string(line.to_owned() + "\n")
    }
    out.write_string("\n")
  }
  out.to_string()
}

///|
pub fn BatchReview::with_profile(
  profile : Profile,
  profile_source_sha256? : String = "",
  profile_effective_sha256? : String = "",
) -> BatchReview raise QueryError {
  {
    items: [],
    options: profile.options,
    risk_policy: profile.risk,
    legacy_dn_spaces: profile.legacy,
    profile: Some(profile),
    profile_meta: profile_metadata(
      profile, "review", profile_source_sha256, profile_effective_sha256,
    ),
    requested: 0,
    input_bytes: 0,
  }
}
