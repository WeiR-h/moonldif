///|
fn envelope(
  code : Int,
  output : String,
  written? : String? = None,
  markdown? : String? = None,
) -> String {
  let result : Json = {
    "action": "report",
    "exit_code": code.to_json(),
    "output": output.to_json(),
    "markdown": match markdown {
      Some(s) => s.to_json()
      None => Json::null()
    },
    "written": match written {
      Some(s) => s.to_json()
      None => Json::null()
    },
  }
  result.stringify()
}

///|
#export_name("host_error")
pub fn host_error(message : String, format : String) -> String {
  let r : Json = {
    "tool": "MoonLDIF",
    "version": @ldif.version().to_json(),
    "status": "invalid",
    "exit_code": 2,
    "diagnostics": [
      {
        "code": "execution-error",
        "severity": "error",
        "reason": message.to_json(),
      },
    ],
  }
  envelope(
    2,
    if format == "json" {
      r.stringify(indent=2) + "\n"
    } else {
      "MoonLDIF execution-error: " + message + "\n"
    },
  )
}

///|
fn help() -> String {
  "MoonLDIF " +
  @ldif.version() +
  "\nUsage:\n  node dist/moonldif.js check INPUT [--format text|json] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js review INPUT [--format text|json|markdown] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js inspect INPUT [--format text|json] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js format INPUT --output NEW_FILE [--format text|json] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js batch INPUT... [--format text|json|markdown] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js compare BEFORE AFTER [--format text|json|markdown] [--compat] [--legacy-dn-spaces] [--ignore-attribute DESCRIPTION]...\n  node dist/moonldif.js --help | --version\nReview/compare: --page N --page-size 1..200 --query TEXT --kind CODE, or --all for a complete report (32 MiB maximum). Defaults remain first 200 items.\n--profile FILE loads a local JSON configuration (64 KiB maximum); cannot combine with analysis flags or inspect. Configuration reports use schema 3, limits are per file.\nUse -- before an input filename starting with '-'.\nExit: 0 complete; 1 risk policy blocked; 2 invalid, incomplete or execution failure. Compare: 0 no differences, 1 differences, 2 incomplete/error. Exact DN strings and byte values, not LDAP matching or an executable patch.\nCompare exclusions match exact canonical attribute descriptions including options; none by default, at most 64. They never skip input validation or whole-entry changes.\nFiles are local, maximum 8 MiB. Batch accepts 1-50 explicit files, 32 MiB analysed bytes, in argument order; no glob or directory expansion. Batch reports include basenames and DNs. URL values are never fetched. Format refuses overwrites.\nChecks cover supported LDIF structure and DN/RDN syntax, not directory schema or server acceptance. --compat only permits a missing version; --legacy-dn-spaces permits separator padding with warnings and preserves the original names.\n"
}

///|
#export_name("cli_plan")
pub fn cli_plan(args_json : String) -> String {
  let raw = @json.parse(args_json) catch {
    _ => return host_error("Invalid argument transport.", "text")
  }
  let args : Array[String] = []
  if raw is Array(items) {
    for item in items {
      if item is String(s) {
        args.push(s)
      } else {
        return host_error("Invalid argument transport.", "text")
      }
    }
  } else {
    return host_error("Invalid argument transport.", "text")
  }
  if args == ["--help"] {
    return envelope(0, help())
  }
  if args == ["--version"] {
    return envelope(0, @ldif.version() + "\n")
  }
  let mut format = "text"
  for i in 0..<(args.length() - 1) {
    if args[i] == "--format" && args[i + 1] == "json" {
      format = "json"
    }
  }
  if args.is_empty() ||
    !["check", "inspect", "review", "format", "batch", "compare"].contains(
      args[0],
    ) {
    return host_error("Invalid command.\n" + help(), format)
  }
  let inputs : Array[String] = []
  let mut input : String? = None
  let mut output : String? = None
  let mut compat = false
  let mut deny = false
  let mut deny_clear = false
  let mut deny_rename = false
  let mut legacy_spaces = false
  let mut positional = false
  let mut i = 1
  let mut seen_format = false
  let ignored_attributes : Array[String] = []
  let paging : Map[String, String] = Map([])
  let mut all_items = false
  let mut profile : String? = None
  while i < args.length() {
    let arg = args[i]
    if !positional && arg == "--" {
      positional = true
    } else if !positional && arg == "--profile" {
      if profile != None || i + 1 >= args.length() || args[i + 1].is_empty() {
        return host_error("Missing or duplicate --profile.", format)
      }
      i += 1
      profile = Some(args[i])
    } else if !positional && arg == "--compat" {
      if compat {
        return host_error("Duplicate --compat.", format)
      }
      compat = true
    } else if !positional && arg == "--deny-delete" {
      if deny {
        return host_error("Duplicate --deny-delete.", format)
      }
      deny = true
    } else if !positional && arg == "--deny-clear" {
      if deny_clear {
        return host_error("Duplicate --deny-clear.", format)
      }
      deny_clear = true
    } else if !positional && arg == "--deny-rename" {
      if deny_rename {
        return host_error("Duplicate --deny-rename.", format)
      }
      deny_rename = true
    } else if !positional && arg == "--legacy-dn-spaces" {
      if legacy_spaces {
        return host_error("Duplicate --legacy-dn-spaces.", format)
      }
      legacy_spaces = true
    } else if !positional && (arg == "--format" || arg == "--output") {
      if i + 1 >= args.length() {
        return host_error("Missing option value.", format)
      }
      i = i + 1
      if arg == "--format" {
        if seen_format || !["text", "json", "markdown"].contains(args[i]) {
          return host_error("Invalid or duplicate --format.", format)
        }
        seen_format = true
        format = args[i]
      } else {
        if output != None {
          return host_error("Duplicate --output.", format)
        }
        output = Some(args[i])
      }
    } else if !positional && arg == "--ignore-attribute" {
      if args[0] != "compare" ||
        i + 1 >= args.length() ||
        ignored_attributes.length() >= 64 {
        return host_error(
          "--ignore-attribute requires compare and one attribute description (at most 64 occurrences).",
          format,
        )
      }
      i += 1
      ignored_attributes.push(args[i])
    } else if !positional && arg == "--all" {
      if all_items {
        return host_error("Duplicate --all.", format)
      }
      all_items = true
    } else if !positional &&
      ["--page", "--page-size", "--query", "--kind"].contains(arg) {
      if i + 1 >= args.length() || paging.contains(arg) {
        return host_error("Missing or duplicate paging option.", format)
      }
      i += 1
      paging[arg] = args[i]
    } else if !positional && arg.has_prefix("-") {
      return host_error("Unknown option: " + arg, format)
    } else {
      if input != None && args[0] != "batch" && args[0] != "compare" {
        return host_error("Expected exactly one input file.", format)
      }
      if arg.is_empty() {
        return host_error("Input names cannot be empty.", format)
      }
      input = Some(arg)
      inputs.push(arg)
    }
    i = i + 1
  }
  if input == None ||
    input == Some("") ||
    (args[0] == "format" && (output == None || output == Some(""))) ||
    (args[0] != "format" && output != None) {
    return host_error(
      "Expected one input file; --output is required only for the format command.",
      format,
    )
  }
  if args[0] == "batch" && inputs.length() > 50 {
    return host_error("Batch accepts at most 50 explicit inputs.", format)
  }
  if profile != None &&
    (
      args[0] == "inspect" ||
      compat ||
      deny ||
      deny_clear ||
      deny_rename ||
      legacy_spaces ||
      !ignored_attributes.is_empty()
    ) {
    return host_error(
      "--profile cannot be combined with analysis flags or inspect. Use profile sections for analysis rules.",
      format,
    )
  }
  if args[0] == "compare" &&
    (inputs.length() != 2 || deny || deny_clear || deny_rename) {
    return host_error(
      "Compare requires BEFORE AFTER content exports; change-plan risk flags do not apply.",
      format,
    )
  }
  if format == "markdown" &&
    args[0] != "review" &&
    args[0] != "batch" &&
    args[0] != "compare" {
    return host_error(
      "Markdown is supported only by review, batch or compare.", format,
    )
  }
  let paged = all_items || !paging.is_empty()
  if paged && args[0] != "review" && args[0] != "compare" {
    return host_error("Paging is supported only by review and compare.", format)
  }
  if all_items && !paging.is_empty() {
    return host_error(
      "--all cannot be combined with page or filter options.", format,
    )
  }
  fn number_option(value : String) -> Int {
    if value.is_empty() || value.length() > 9 {
      return -1
    }
    let mut n = 0
    for c in value.iter() {
      if c < '0' || c > '9' {
        return -1
      }
      n = n * 10 + c.to_int() - 48
    }
    n
  }
  let page = number_option(paging.get("--page").unwrap_or("1"))
  let limit = number_option(paging.get("--page-size").unwrap_or("50"))
  let query = paging.get("--query").unwrap_or("")
  let kind = paging.get("--kind").unwrap_or("all")
  let kinds = if args[0] == "compare" {
    [
      "all", "entry-added", "entry-removed", "attribute-added", "attribute-removed",
      "values-changed",
    ]
  } else {
    [
      "all", "operation-control", "entry-add", "entry-delete", "attribute-add", "attribute-delete-all",
      "attribute-delete-values", "attribute-clear", "attribute-replace", "unsupported-modification",
      "entry-rename", "entry-move",
    ]
  }
  if page < 1 ||
    limit < 1 ||
    limit > 200 ||
    page > 2147483647 / limit ||
    query.length() > 256 ||
    !kinds.contains(kind) {
    return host_error("Invalid page, page size, query or kind.", format)
  }
  let result : Json = {
    "paged": paged.to_json(),
    "all": all_items.to_json(),
    "page_query": {
      "offset": ((page - 1) * limit).to_json(),
      "limit": limit.to_json(),
      "query": query.to_json(),
      "kind": kind.to_json(),
    },
    "action": (if args[0] == "batch" || args[0] == "compare" {
      args[0]
    } else {
      "read"
    }).to_json(),
    "inputs": inputs.to_json(),
    "command": args[0].to_json(),
    "input": input.unwrap().to_json(),
    "output_path": match output {
      Some(s) => s.to_json()
      None => Json::null()
    },
    "format": format.to_json(),
    "compat": compat.to_json(),
    "deny_delete": deny.to_json(),
    "deny_clear": deny_clear.to_json(),
    "deny_rename": deny_rename.to_json(),
    "legacy_dn_spaces": legacy_spaces.to_json(),
    "ignored_attributes": ignored_attributes.to_json(),
  }
  if profile is Some(path) {
    if result is Object(fields) {
      fields["profile_path"] = path.to_json()
    }
  }
  result.stringify()
}

///|
#export_name("analyse")
pub fn analyse(
  encoded : String,
  command : String,
  format : String,
  compat : Bool,
  deny_delete : Bool,
  legacy_dn_spaces : Bool,
) -> String {
  let bytes = @base64.decode(encoded[:], ignore_whitespace=false) catch {
    _ => return host_error("Invalid input transport.", format)
  }
  let r = @ldif.check(
    bytes,
    options={ allow_missing_version: compat, deny_delete, },
    legacy_dn_spaces~,
  )
  let output = if format == "json" {
    r
    .to_json(
      include_records=command == "inspect",
      include_review=command == "review",
    )
    .stringify(indent=2) +
    "\n"
  } else {
    r.to_text(include_records=command == "inspect") +
    (if command == "review" { r.review().to_text() } else { "" })
  }
  if command == "format" && r.exit_code() == 0 {
    let formatted = r.format() catch {
      _ => return host_error("Writer rejected this document.", format)
    }
    envelope(0, output, written=Some(formatted))
  } else {
    envelope(r.exit_code(), output)
  }
}

///|
/// Browser uses the same check, review and safe-writer implementation as CLI.
/// The host chooses when to request writing; no result is cached here.
#export_name("workbench")
pub fn workbench(
  encoded : String,
  compat : Bool,
  deny_delete : Bool,
  legacy_dn_spaces : Bool,
  write_output : Bool,
) -> String {
  let bytes = @base64.decode(encoded[:], ignore_whitespace=false) catch {
    _ => return host_error("Invalid input transport.", "json")
  }
  let report = @ldif.check(
    bytes,
    options={ allow_missing_version: compat, deny_delete, },
    legacy_dn_spaces~,
  )
  let output = report.to_json(include_review=true).stringify()
  if write_output && report.exit_code() == 0 {
    let written = report.format() catch {
      _ => return host_error("Writer rejected this document.", "json")
    }
    envelope(0, output, written=Some(written))
  } else {
    envelope(report.exit_code(), output)
  }
}

///|
#export_name("analyse_v2")
pub fn analyse_v2(
  encoded : String,
  command : String,
  format : String,
  compat : Bool,
  deny_delete : Bool,
  legacy_dn_spaces : Bool,
  deny_clear : Bool,
  deny_rename : Bool,
  input_sha256 : String,
) -> String {
  let bytes = @base64.decode(encoded[:], ignore_whitespace=false) catch {
    _ => return host_error("Invalid input transport.", format)
  }
  if input_sha256.length() != 64 ||
    !input_sha256
    .iter()
    .all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
    return host_error("Invalid source SHA-256 transport.", format)
  }
  let options : @ldif.Options = { allow_missing_version: compat, deny_delete, }
  let risk_policy : @ldif.RiskPolicy = { deny_clear, deny_rename, }
  let report = @ldif.check(bytes, options~, legacy_dn_spaces~, risk_policy~)
  let metadata : @ldif.ReviewMetadata = {
    input_sha256,
    input_byte_length: bytes.length(),
    options,
    legacy_dn_spaces,
    risk_policy,
  }
  let is_review = command == "review" ||
    command == "workbench" ||
    command == "workbench-write"
  let json = if is_review {
    report.review_json(metadata)
  } else {
    report.to_json(include_records=command == "inspect")
  }
  let markdown = if is_review {
    Some(report.review_markdown(metadata))
  } else {
    None
  }
  let output = if format == "markdown" {
    markdown.unwrap()
  } else if format == "json" {
    json.stringify(indent=2) + "\n"
  } else {
    report.to_text(include_records=command == "inspect") +
    (if is_review {
      "Source SHA-256: " +
      input_sha256 +
      "; bytes: " +
      bytes.length().to_string() +
      "\n" +
      "Options: compat=" +
      compat.to_string() +
      "; legacy_dn_spaces=" +
      legacy_dn_spaces.to_string() +
      "; deny_delete=" +
      deny_delete.to_string() +
      "; deny_clear=" +
      deny_clear.to_string() +
      "; deny_rename=" +
      deny_rename.to_string() +
      "\n" +
      report.review().to_text()
    } else {
      ""
    })
  }
  if (command == "format" || command == "workbench-write") &&
    report.exit_code() == 0 {
    let written = report.format() catch {
      _ => return host_error("Writer rejected this document.", format)
    }
    envelope(0, output, written=Some(written), markdown~)
  } else {
    envelope(report.exit_code(), output, markdown~)
  }
}

///|
#export_name("batch_start")
pub fn batch_start(
  compat : Bool,
  deny_delete : Bool,
  legacy_dn_spaces : Bool,
  deny_clear : Bool,
  deny_rename : Bool,
) -> @ldif.BatchReview {
  @ldif.BatchReview::new(
    options={ allow_missing_version: compat, deny_delete, },
    risk_policy={ deny_clear, deny_rename, },
    legacy_dn_spaces~,
  )
}

///|
#export_name("compare_exports")
pub fn compare_exports(
  before : String,
  after : String,
  before_sha256 : String,
  after_sha256 : String,
  compat : Bool,
  legacy_dn_spaces : Bool,
  format : String,
) -> String {
  compare_exports_v2(
    before, after, before_sha256, after_sha256, compat, legacy_dn_spaces, format,
    "[]",
  )
}

///|
#export_name("compare_exports_v2")
pub fn compare_exports_v2(
  before : String,
  after : String,
  before_sha256 : String,
  after_sha256 : String,
  compat : Bool,
  legacy_dn_spaces : Bool,
  format : String,
  ignored_json : String,
) -> String {
  let ignored_attributes : Array[String] = []
  let parsed = @json.parse(ignored_json) catch {
    _ => return host_error("Invalid exclusion transport.", format)
  }
  if parsed is Array(items) {
    for item in items {
      if item is String(s) {
        ignored_attributes.push(s)
      } else {
        return host_error("Invalid exclusion transport.", format)
      }
    }
  } else {
    return host_error("Invalid exclusion transport.", format)
  }
  let a = @base64.decode(before[:], ignore_whitespace=false) catch {
    _ => return host_error("Invalid before-byte transport.", format)
  }
  let b = @base64.decode(after[:], ignore_whitespace=false) catch {
    _ => return host_error("Invalid after-byte transport.", format)
  }
  let result = @ldif.compare_snapshots(
    a,
    b,
    allow_missing_version=compat,
    legacy_dn_spaces~,
    before_sha256=Some(before_sha256),
    after_sha256=Some(after_sha256),
    ignored_attributes~,
  )
  envelope(
    result.exit_code(),
    if format == "json" {
      result.to_json().stringify(indent=2) + "\n"
    } else if format == "markdown" {
      result.to_markdown()
    } else {
      result.to_text()
    },
    markdown=Some(result.to_markdown()),
  )
}

///|
#export_name("batch_remaining_bytes")
pub fn batch_remaining_bytes(batch : @ldif.BatchReview) -> Int {
  batch.remaining_bytes()
}

///|
#export_name("batch_add")
pub fn batch_add(
  batch : @ldif.BatchReview,
  label : String,
  encoded : String,
  sha256 : String,
) -> Unit {
  let data = @base64.decode(encoded[:], ignore_whitespace=false) catch {
    _ => {
      batch.add_unavailable(label)
      return
    }
  }
  batch.add_bytes(label, data, sha256)
}

///|
#export_name("batch_unavailable")
pub fn batch_unavailable(batch : @ldif.BatchReview, label : String) -> Unit {
  batch.add_unavailable(label)
}

///|
#export_name("batch_finish")
pub fn batch_finish(batch : @ldif.BatchReview, format : String) -> String {
  envelope(
    batch.exit_code(),
    if format == "json" {
      batch.to_json().stringify(indent=2) + "\n"
    } else if format == "markdown" {
      batch.to_markdown()
    } else {
      batch.to_text()
    },
  )
}
