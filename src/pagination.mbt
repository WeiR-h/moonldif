///|
#derive(Eq)
pub(all) struct PageQuery {
  offset : Int32
  limit : Int32
  query : String
  kind : String
}

///|
pub fn PageQuery::default() -> PageQuery {
  { offset: 0, limit: 50, query: "", kind: "all", }
}

///|
pub suberror QueryError {
  InvalidQuery(String)
  ExportLimit
}

///|
fn validate_query(
  q : PageQuery,
  kinds : Array[String],
) -> Unit raise QueryError {
  if q.offset < 0 ||
    q.limit < 1 ||
    q.limit > 200 ||
    q.query.length() > 256 ||
    (q.kind != "all" && !kinds.contains(q.kind)) {
    raise InvalidQuery(
      "Use offset >= 0, limit 1-200, query <= 256 characters and a supported kind.",
    )
  }
}

///|
fn page_matches(
  q : PageQuery,
  dn : String,
  attr : String?,
  kind : String,
) -> Bool {
  let needle = ascii_lower(q.query.trim().to_owned())
  (q.kind == "all" || q.kind == kind) &&
  (
    needle.is_empty() ||
    ascii_lower(dn).contains(needle) ||
    (match attr {
      Some(a) => ascii_lower(a).contains(needle)
      None => false
    })
  )
}

///|
fn page_result(
  summary : Json,
  code : Int32,
  total : Int32,
  matched : Int32,
  q : PageQuery,
  items : Array[Json],
  all~ : Bool = false,
) -> Json {
  {
    "report_schema_version": ToJson::to_json(
      if snapshot_field(summary, "profile") == Json::null() {
        2
      } else {
        3
      },
    ),
    "exit_code": ToJson::to_json(code),
    "summary": snapshot_copy_json(summary),
    "page": {
      "total_items": ToJson::to_json(total),
      "matched_items": ToJson::to_json(matched),
      "offset": ToJson::to_json(q.offset),
      "limit": ToJson::to_json(q.limit),
      "returned_items": ToJson::to_json(items.length()),
      "has_more": ToJson::to_json(
        q.offset < matched && items.length() < matched - q.offset,
      ),
      "query": ToJson::to_json(q.query),
      "kind": ToJson::to_json(q.kind),
      "selection": ToJson::to_json(if all { "all" } else { "page" }),
    },
    "items": ToJson::to_json(items),
  }
}

///|
priv struct ReviewRef {
  record : Int32
  control : Int32
  modification : Int32
  code : String
  attribute : String?
}

///|
pub struct ReviewSession {
  priv report : Report
  priv summary : Json
  priv index : Array[ReviewRef]
}

///|
/// Private parsed state is not shared with caller-owned Report/Document arrays.
pub fn ReviewSession::new(
  input : Bytes,
  options~ : Options = Options::default(),
  legacy_dn_spaces~ : Bool = false,
  risk_policy~ : RiskPolicy = RiskPolicy::default(),
  sha256~ : String = "",
) -> ReviewSession raise QueryError {
  review_session(
    input,
    options,
    legacy_dn_spaces,
    risk_policy,
    sha256,
    None,
    "",
    "",
  )
}

///|
pub fn ReviewSession::with_profile(
  input : Bytes,
  profile : Profile,
  sha256~ : String = "",
  profile_source_sha256~ : String = "",
  profile_effective_sha256~ : String = "",
) -> ReviewSession raise QueryError {
  review_session(
    input,
    profile.options,
    profile.legacy,
    profile.risk,
    sha256,
    Some(profile),
    profile_source_sha256,
    profile_effective_sha256,
  )
}

///|
fn review_session(
  input : Bytes,
  options : Options,
  legacy_dn_spaces : Bool,
  risk_policy : RiskPolicy,
  sha256 : String,
  profile : Profile?,
  profile_source_sha256 : String,
  profile_effective_sha256 : String,
) -> ReviewSession raise QueryError {
  if sha256 != "" &&
    (
      sha256.length() != 64 ||
      !sha256.iter().all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))
    ) {
    raise InvalidQuery("Invalid SHA-256.")
  }
  let report = check(input, options~, legacy_dn_spaces~, risk_policy~)
  let counts = profile.map(p => profile_evaluate(report, p))
  let summary = report.review_json({
    input_sha256: sha256,
    input_byte_length: input.length(),
    options,
    legacy_dn_spaces,
    risk_policy,
  })
  if profile is Some(p) {
    if summary is Object(fields) {
      fields["report_schema_version"] = ToJson::to_json(3)
      fields["profile"] = profile_metadata(
        p, "review", profile_source_sha256, profile_effective_sha256,
      )
      fields["change_limits"] = counts.unwrap()
    }
  }
  if snapshot_field(summary, "review") is Object(fields) {
    fields.remove("items") |> ignore
    fields.remove("truncated") |> ignore
  }
  let index : Array[ReviewRef] = []
  for ri in 0..<report.document.records.length() {
    let r = report.document.records[ri]
    for ci in 0..<r.controls.length() {
      index.push({
        record: ri,
        control: ci,
        modification: -1,
        code: "operation-control",
        attribute: None,
      })
    }
    match r.body {
      Entry(_) => ()
      Modify(mods) =>
        for mi in 0..<mods.length() {
          let m = mods[mi]
          let code = match m.operation {
            "add" => "attribute-add"
            "delete" =>
              if m.values.is_empty() {
                "attribute-delete-all"
              } else {
                "attribute-delete-values"
              }
            "replace" =>
              if m.values.is_empty() {
                "attribute-clear"
              } else {
                "attribute-replace"
              }
            _ => "unsupported-modification"
          }
          index.push({
            record: ri,
            control: -1,
            modification: mi,
            code,
            attribute: Some(m.attribute),
          })
        }
      _ => {
        let code = match r.body {
          Add(_) => "entry-add"
          Delete => "entry-delete"
          Rename(_, _, None) => "entry-rename"
          _ => "entry-move"
        }
        index.push({
          record: ri,
          control: -1,
          modification: -1,
          code,
          attribute: None,
        })
      }
    }
  }
  { report, summary, index, }
}

///|
pub fn ReviewSession::exit_code(self : ReviewSession) -> Int32 {
  self.report.exit_code()
}

///|
fn ReviewSession::item(self : ReviewSession, i : Int32) -> Json {
  let intent = self.index[i]
  let r = self.report.document.records[intent.record]
  // Reuse the existing rule descriptions on one selected intent, not a second rule engine.
  let selected : Record = {
    dn: r.dn,
    span: r.span,
    controls: if intent.control >= 0 {
      [r.controls[intent.control]]
    } else {
      []
    },
    body: if intent.control >= 0 {
      Entry([])
    } else if intent.modification >= 0 {
      match r.body {
        Modify(ms) => Modify([ms[intent.modification]])
        _ => Entry([])
      }
    } else {
      r.body
    },
  }
  let isolated : Report = {
    document: { mode: self.report.document.mode, records: [selected], },
    diagnostics: [],
    names_checked: true,
  }
  let json = isolated.review().to_json()
  if snapshot_field(json, "items") is Array(items) {
    let item = items[0]
    if item is Object(fields) {
      fields["record_index"] = ToJson::to_json(intent.record)
      fields["item_index"] = ToJson::to_json(i)
    }
    item
  } else {
    Json::null()
  }
}

///|
pub fn ReviewSession::page(
  self : ReviewSession,
  q : PageQuery,
) -> Json raise QueryError {
  validate_query(q, [
    "operation-control", "entry-add", "entry-delete", "attribute-add", "attribute-delete-all",
    "attribute-delete-values", "attribute-clear", "attribute-replace", "unsupported-modification",
    "entry-rename", "entry-move",
  ])
  let items : Array[Json] = []
  let mut matched = 0
  for i in 0..<self.index.length() {
    let intent = self.index[i]
    if page_matches(
        q,
        self.report.document.records[intent.record].dn,
        intent.attribute,
        intent.code,
      ) {
      if matched >= q.offset && items.length() < q.limit {
        items.push(self.item(i))
      }
      matched += 1
    }
  }
  page_result(
    self.summary,
    self.exit_code(),
    self.index.length(),
    matched,
    q,
    items,
  )
}

///|
#derive(ToJson)
priv struct SnapshotItem {
  code : String
  dn : String
  attribute : String?
  before_span : Span?
  after_span : Span?
  removed_value_count : Int32
  added_value_count : Int32
}

///|
pub struct SnapshotSession {
  priv summary : Json
  priv code : Int32
  priv items : Array[SnapshotItem]
}

///|
pub fn SnapshotSession::new(
  before : Bytes,
  after : Bytes,
  allow_missing_version~ : Bool = false,
  legacy_dn_spaces~ : Bool = false,
  before_sha256~ : String? = None,
  after_sha256~ : String? = None,
  ignored_attributes~ : Array[String] = [],
) -> SnapshotSession {
  let items : Array[SnapshotItem] = []
  let result = snapshot_compare(
    before,
    after,
    allow_missing_version~,
    legacy_dn_spaces~,
    before_sha256~,
    after_sha256~,
    ignored_attributes~,
    retained=Some(items),
  )
  let summary = result.to_json()
  if summary is Object(fields) {
    fields.remove("changes") |> ignore
    fields.remove("truncated") |> ignore
    fields.remove("reported_changes") |> ignore
  }
  { summary, code: result.exit_code(), items, }
}

///|
pub fn SnapshotSession::exit_code(self : SnapshotSession) -> Int32 {
  self.code
}

///|
fn SnapshotSession::item(self : SnapshotSession, i : Int32) -> Json {
  let json = ToJson::to_json(self.items[i])
  if json is Object(fields) {
    fields["item_index"] = ToJson::to_json(i)
  }
  json
}

///|
pub fn SnapshotSession::page(
  self : SnapshotSession,
  q : PageQuery,
) -> Json raise QueryError {
  validate_query(q, [
    "entry-added", "entry-removed", "attribute-added", "attribute-removed", "values-changed",
  ])
  let items : Array[Json] = []
  let mut matched = 0
  for i in 0..<self.items.length() {
    let item = self.items[i]
    if page_matches(q, item.dn, item.attribute, item.code) {
      if matched >= q.offset && items.length() < q.limit {
        items.push(self.item(i))
      }
      matched += 1
    }
  }
  page_result(self.summary, self.code, self.items.length(), matched, q, items)
}

///|
/// Forward-only output. Consumers must finish successfully before publishing any chunks.
pub struct ReportCursor {
  priv metadata : Json
  priv item : (Int32) -> Json
  priv count : Int32
  priv format : String
  priv mut position : Int32
  priv mut bytes : Int32
  priv mut failed : Bool
}

///|
fn report_cursor(
  summary : Json,
  code : Int32,
  count : Int32,
  item : (Int32) -> Json,
  format : String,
) -> ReportCursor raise QueryError {
  if !["json", "markdown", "text"].contains(format) {
    raise InvalidQuery("Unknown report format.")
  }
  let metadata = page_result(
    summary,
    code,
    count,
    count,
    { offset: 0, limit: count, query: "", kind: "all", },
    [],
    all=true,
  )
  if metadata is Object(fields) {
    fields.remove("items") |> ignore
    if fields.get("page") is Some(Object(page)) {
      page["returned_items"] = ToJson::to_json(count)
      page["has_more"] = ToJson::to_json(false)
    }
  }
  { metadata, item, count, format, position: -1, bytes: 0, failed: false, }
}

///|
pub fn ReviewSession::report(
  self : ReviewSession,
  format : String,
) -> ReportCursor raise QueryError {
  report_cursor(
    self.summary,
    self.exit_code(),
    self.index.length(),
    i => self.item(i),
    format,
  )
}

///|
pub fn SnapshotSession::report(
  self : SnapshotSession,
  format : String,
) -> ReportCursor raise QueryError {
  report_cursor(
    self.summary,
    self.code,
    self.items.length(),
    i => self.item(i),
    format,
  )
}

///|
/// Chunks contain at most one item; total UTF-8 output is limited to 32 MiB.
pub fn ReportCursor::next(self : ReportCursor) -> String? raise QueryError {
  if self.failed {
    raise ExportLimit
  }
  if self.position > self.count {
    return None
  }
  let chunk = if self.position == -1 {
    let meta = self.metadata.stringify()
    if self.format == "json" {
      meta[:meta.length() - 1].to_owned() + ",\"items\":["
    } else if self.format == "markdown" {
      report_heading(self.metadata)
    } else {
      "MoonLDIF complete report\n" + meta + "\n"
    }
  } else if self.position == self.count {
    if self.format == "json" {
      "]}\n"
    } else {
      "\n"
    }
  } else {
    let item = (self.item)(self.position)
    let json = item.stringify()
    if self.format == "json" {
      (if self.position > 0 { "," } else { "" }) + json
    } else if self.format == "markdown" {
      report_item_markdown(item)
    } else {
      json + "\n"
    }
  }
  self.position += 1
  self.bytes += @utf8.encode(chunk).length()
  if self.bytes > 32 * 1024 * 1024 {
    self.failed = true
    raise ExportLimit
  }
  Some(chunk)
}

///|
pub fn page_text(page : Json, markdown~ : Bool = false) -> String {
  if markdown {
    let out = StringBuilder()
    out.write_string(report_heading(page))
    if snapshot_field(page, "items") is Array(items) {
      for item in items {
        out.write_string(report_item_markdown(item))
      }
    }
    out.to_string()
  } else {
    "MoonLDIF page\n" + page.stringify(indent=2) + "\n"
  }
}

///|
fn report_heading(metadata : Json) -> String {
  let out = StringBuilder()
  let summary = snapshot_field(metadata, "summary")
  out.write_string(
    "# MoonLDIF review report\n\nAll known items in the selected range; incomplete analysis remains incomplete. Target DNs are included. No server execution or authenticity certification.\n\n",
  )
  for
    key in [
      "version", "status", "exit_code", "options", "scope", "matching", "diagnostics_truncated",
    ] {
    let value = snapshot_field(summary, key)
    if value != Json::null() {
      out.write_string(
        "- " + key + ": " + markdown_escape(snapshot_display(value)) + "\n",
      )
    }
  }
  out.write_string(
    "- Selection and counts: " +
    markdown_escape(snapshot_field(metadata, "page").stringify()) +
    "\n",
  )
  for
    key in [
      "source", "before", "after", "diagnostics", "counts", "excluded_attribute_occurrences",
      "ambiguous_dn_count", "profile", "change_limits",
    ] {
    let value = snapshot_field(summary, key)
    if value != Json::null() {
      out.write_string(
        "\n## " + key + "\n\n" + markdown_escape(snapshot_display(value)) + "\n",
      )
    }
  }
  out.write_string("\n## Items\n\n")
  out.to_string()
}

///|
fn report_item_markdown(item : Json) -> String {
  let out = StringBuilder()
  out.write_string(
    "### " +
    markdown_escape(snapshot_display(snapshot_field(item, "item_index"))) +
    ": " +
    markdown_escape(snapshot_display(snapshot_field(item, "code"))) +
    "\n\n",
  )
  for
    key in [
      "title", "dn", "attribute", "level", "record_index", "span", "before_span",
      "after_span", "value_count", "removed_value_count", "added_value_count", "reason",
      "action",
    ] {
    let value = snapshot_field(item, key)
    if value != Json::null() {
      out.write_string(
        "- " + key + ": " + markdown_escape(snapshot_display(value)) + "\n",
      )
    }
  }
  out.write_string("\n")
  out.to_string()
}

///|
pub fn ReviewSession::format(self : ReviewSession) -> String raise WriteError {
  self.report.format()
}

///|
pub fn SnapshotSession::with_profile(
  before : Bytes,
  after : Bytes,
  profile : Profile,
  before_sha256~ : String? = None,
  after_sha256~ : String? = None,
  profile_source_sha256~ : String = "",
  profile_effective_sha256~ : String = "",
) -> SnapshotSession raise QueryError {
  let s = SnapshotSession::new(
    before,
    after,
    allow_missing_version=profile.options.allow_missing_version,
    legacy_dn_spaces=profile.legacy,
    ignored_attributes=profile.ignored,
    before_sha256~,
    after_sha256~,
  )
  if s.summary is Object(fields) {
    fields["report_schema_version"] = ToJson::to_json(3)
    fields["profile"] = profile_metadata(
      profile, "compare", profile_source_sha256, profile_effective_sha256,
    )
  }
  s
}
