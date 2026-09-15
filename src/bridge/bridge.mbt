///|
fn envelope(code : Int, output : String, written? : String? = None) -> String {
  let result : Json = {
    "action": "report",
    "exit_code": code.to_json(),
    "output": output.to_json(),
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
  "\nUsage:\n  node dist/moonldif.js check INPUT [--format text|json] [--compat] [--deny-delete] [--legacy-dn-spaces]\n  node dist/moonldif.js inspect INPUT [--format text|json] [--compat] [--deny-delete] [--legacy-dn-spaces]\n  node dist/moonldif.js format INPUT --output NEW_FILE [--format text|json] [--compat] [--deny-delete] [--legacy-dn-spaces]\n  node dist/moonldif.js --help | --version\nUse -- before an input filename starting with '-'.\nExit: 0 complete; 1 deletion policy blocked; 2 invalid, incomplete or execution failure.\nFiles are local, maximum 8 MiB. URL values are never fetched. Format refuses overwrites.\nChecks cover supported LDIF structure and DN/RDN syntax, not directory schema or server acceptance. --compat only permits a missing version; --legacy-dn-spaces permits separator padding with warnings and preserves the original names.\n"
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
  if args.is_empty() || !["check", "inspect", "format"].contains(args[0]) {
    return host_error("Invalid command.\n" + help(), format)
  }
  let mut input : String? = None
  let mut output : String? = None
  let mut compat = false
  let mut deny = false
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
        if seen_format || !["text", "json"].contains(args[i]) {
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
      if input != None {
        return host_error("Expected exactly one input file.", format)
      }
      input = Some(arg)
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
  let result : Json = {
    "action": "read",
    "command": args[0].to_json(),
    "input": input.unwrap().to_json(),
    "output_path": match output {
      Some(s) => s.to_json()
      None => Json::null()
    },
    "format": format.to_json(),
    "compat": compat.to_json(),
    "deny_delete": deny.to_json(),
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
    r.to_json(include_records=command == "inspect").stringify(indent=2) + "\n"
  } else {
    r.to_text(include_records=command == "inspect")
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
