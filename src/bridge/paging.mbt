///|
pub enum PagingSession {
  Review(@ldif.ReviewSession)
  Snapshot(@ldif.SnapshotSession)
  Failed
}

///|
fn field(json : Json, key : String) -> Json {
  match json {
    Object(fields) => fields.get(key).unwrap_or(Json::null())
    _ => Json::null()
  }
}

///|
fn string_field(json : Json, key : String, fallback? : String = "") -> String {
  match field(json, key) {
    String(s) => s
    _ => fallback
  }
}

///|
fn bool_field(json : Json, key : String) -> Bool {
  field(json, key) == true.to_json()
}

///|
fn int_field(json : Json, key : String, fallback : Int) -> Int {
  match field(json, key) {
    Number(n, ..) => n.to_int()
    _ => fallback
  }
}

///|
#export_name("paged_start")
pub fn paged_start(
  command : String,
  before : String,
  after : String,
  config : String,
) -> PagingSession {
  start_session(command, before, after, config) catch {
    _ => Failed
  }
}

///|
fn start_session(
  command : String,
  before : String,
  after : String,
  config : String,
) -> PagingSession raise {
  let cfg = @json.parse(config)
  let a = @base64.decode(before[:], ignore_whitespace=false)
  if command == "compare" {
    let b = @base64.decode(after[:], ignore_whitespace=false)
    let ignored : Array[String] = []
    if field(cfg, "ignored_attributes") is Array(attrs) {
      for attr in attrs {
        if attr is String(s) {
          ignored.push(s)
        }
      }
    }
    Snapshot(
      @ldif.SnapshotSession::new(
        a,
        b,
        allow_missing_version=bool_field(cfg, "compat"),
        legacy_dn_spaces=bool_field(cfg, "legacy_dn_spaces"),
        before_sha256=Some(string_field(cfg, "before_sha256")),
        after_sha256=Some(string_field(cfg, "after_sha256")),
        ignored_attributes=ignored,
      ),
    )
  } else {
    Review(
      @ldif.ReviewSession::new(
        a,
        options={
          allow_missing_version: bool_field(cfg, "compat"),
          deny_delete: bool_field(cfg, "deny_delete"),
        },
        legacy_dn_spaces=bool_field(cfg, "legacy_dn_spaces"),
        risk_policy={
          deny_clear: bool_field(cfg, "deny_clear"),
          deny_rename: bool_field(cfg, "deny_rename"),
        },
        sha256=string_field(cfg, "before_sha256"),
      ),
    )
  }
}

///|
#export_name("paged_exit_code")
pub fn paged_exit_code(session : PagingSession) -> Int {
  match session {
    Review(s) => s.exit_code()
    Snapshot(s) => s.exit_code()
    Failed => 2
  }
}

///|
#export_name("paged_page")
pub fn paged_page(
  session : PagingSession,
  query : String,
  format : String,
) -> String {
  let raw = @json.parse(query) catch {
    _ => return host_error("Invalid query transport.", format)
  }
  let q : @ldif.PageQuery = {
    offset: int_field(raw, "offset", 0),
    limit: int_field(raw, "limit", 50),
    query: string_field(raw, "query"),
    kind: string_field(raw, "kind", fallback="all"),
  }
  let page = try {
    match session {
      Review(s) => s.page(q)
      Snapshot(s) => s.page(q)
      Failed => return host_error("Invalid session input.", format)
    }
  } catch {
    _ => return host_error("Invalid page query.", format)
  }
  envelope(
    paged_exit_code(session),
    if format == "json" {
      page.stringify() + "\n"
    } else {
      @ldif.page_text(page, markdown=format == "markdown")
    },
  )
}

///|
#export_name("paged_report_start")
pub fn paged_report_start(
  session : PagingSession,
  format : String,
) -> PagingCursor {
  let cursor = try {
    match session {
      Review(s) => s.report(format)
      Snapshot(s) => s.report(format)
      Failed => return { cursor: None, }
    }
  } catch {
    _ => return { cursor: None, }
  }
  { cursor: Some(cursor), }
}

///|
pub struct PagingCursor {
  priv cursor : @ldif.ReportCursor?
}

///|
#export_name("paged_report_next")
pub fn paged_report_next(handle : PagingCursor) -> String {
  let cursor = match handle.cursor {
    Some(c) => c
    None => return "{\"error\":\"Cannot start report export.\"}"
  }
  let chunk = cursor.next() catch {
    _ =>
      return "{\"error\":\"Complete report exceeds 32 MiB. No report was exported.\"}"
  }
  let json : Json = match chunk {
    None => { "done": true }
    Some(s) => { "done": false, "chunk": s.to_json() }
  }
  json.stringify()
}
