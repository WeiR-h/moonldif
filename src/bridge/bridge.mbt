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
  "\nUsage:\n  node dist/moonldif.js check INPUT [--format text|json] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js review INPUT [--format text|json|markdown] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js inspect INPUT [--format text|json] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js format INPUT --output NEW_FILE [--format text|json] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js batch INPUT... [--format text|json|markdown] [--compat] [--deny-delete] [--deny-clear] [--deny-rename] [--legacy-dn-spaces]\n  node dist/moonldif.js --help | --version\nUse -- before an input filename starting with '-'.\nExit: 0 complete; 1 risk policy blocked; 2 invalid, incomplete or execution failure.\nFiles are local, maximum 8 MiB. Batch accepts 1-50 explicit files, 32 MiB analysed bytes, in argument order; no glob or directory expansion. Batch reports include basenames and DNs. URL values are never fetched. Format refuses overwrites.\nChecks cover supported LDIF structure and DN/RDN syntax, not directory schema or server acceptance. --compat only permits a missing version; --legacy-dn-spaces permits separator padding with warnings and preserves the original names.\n"
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
    !["check", "inspect", "review", "format", "batch"].contains(args[0]) {
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
  while i < args.length() {
    let arg = args[i]
    if !positional && arg == "--" {
      positional = true
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
    } else if !positional && arg.has_prefix("-") {
      return host_error("Unknown option: " + arg, format)
    } else {
      if input != None && args[0] != "batch" {
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
  if format == "markdown" && args[0] != "review" && args[0] != "batch" {
    return host_error("Markdown is supported only by review or batch.", format)
  }
  let result : Json = {
    "action": (if args[0] == "batch" { "batch" } else { "read" }).to_json(),
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
