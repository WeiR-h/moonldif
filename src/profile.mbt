///|
pub suberror ProfileError {
  InvalidProfile(String)
}

///|
/// Validated, immutable rules. Construct only through parse_profile.
pub struct Profile {
  priv options : Options
  priv risk : RiskPolicy
  priv legacy : Bool
  priv ignored : Array[String]
  priv limits : Array[Int?]
}

///|
fn profile_keys(
  value : Json,
  allowed : Array[String],
) -> Unit raise ProfileError {
  match value {
    Object(fields) =>
      for key, _ in fields {
        if !allowed.contains(key) {
          raise InvalidProfile("Unknown configuration field.")
        }
      }
    _ => raise InvalidProfile("Expected a configuration object.")
  }
}

///|
fn profile_section(value : Json, key : String) -> Json {
  if value is Object(fields) {
    fields.get(key).unwrap_or(Json::object(Map([])))
  } else {
    Json::null()
  }
}

///|
fn profile_bool(value : Json, key : String) -> Bool raise ProfileError {
  if value is Object(fields) {
    match fields.get(key) {
      None => false
      Some(True) => true
      Some(False) => false
      _ => raise InvalidProfile("Configuration flags must be booleans.")
    }
  } else {
    raise InvalidProfile("Expected a configuration object.")
  }
}

///|
fn profile_limit(value : Json, key : String) -> Int? raise ProfileError {
  if value is Object(fields) {
    match fields.get(key) {
      None => None
      Some(Number(n, repr~)) => {
        if repr is Some(raw) {
          if !raw.iter().all(c => c >= '0' && c <= '9') {
            raise InvalidProfile(
              "Use unsigned decimal integer notation for limits and version.",
            )
          }
        }
        if n < 0 || n > 2147483647 || n != n.to_int().to_double() {
          raise InvalidProfile("Limits must be integers from 0 to 2147483647.")
        }
        Some(n.to_int())
      }
      _ => raise InvalidProfile("Limits must be integers from 0 to 2147483647.")
    }
  } else {
    raise InvalidProfile("Expected a limits object.")
  }
}

///|
/// Run after the bounded standard parser. Decoding each key catches escaped duplicates.
fn profile_unique_keys(text : String) -> Unit raise ProfileError {
  let objects : Array[Map[String, Bool]] = []
  let mut i = 0
  let mut depth = 0
  while i < text.length() {
    if text[i] == '{' || text[i] == '[' {
      depth += 1
      if depth > 16 {
        raise InvalidProfile("Configuration nesting exceeds 16.")
      }
      if text[i] == '{' {
        objects.push(Map([]))
      }
      i += 1
    } else if text[i] == '}' || text[i] == ']' {
      depth -= 1
      if text[i] == '}' {
        ignore(objects.pop())
      }
      i += 1
    } else if text[i] == '"' {
      let start = i
      i += 1
      while i < text.length() && text[i] != '"' {
        if text[i] == '\\' {
          i += 1
        }
        i += 1
      }
      i += 1
      let end = i
      while i < text.length() &&
            (
              text[i] == ' ' ||
              text[i] == '\t' ||
              text[i] == '\r' ||
              text[i] == '\n'
            ) {
        i += 1
      }
      if i < text.length() && text[i] == ':' && !objects.is_empty() {
        let key = @json.parse(text[start:end].to_owned()) catch {
          _ => raise InvalidProfile("Invalid configuration key.")
        }
        if key is String(s) {
          let seen = objects[objects.length() - 1]
          if seen.contains(s) {
            raise InvalidProfile("Duplicate configuration key.")
          }
          seen[s] = true
        }
      }
    } else if text[i] == '-' || (text[i] >= '0' && text[i] <= '9') {
      while i < text.length() &&
            text[i] != ',' &&
            text[i] != '}' &&
            text[i] != ']' &&
            text[i] != ' ' &&
            text[i] != '\t' &&
            text[i] != '\r' &&
            text[i] != '\n' {
        if text[i] < '0' || text[i] > '9' {
          raise InvalidProfile(
            "Use unsigned decimal integer notation for limits and version.",
          )
        }
        i += 1
      }
    } else {
      i += 1
    }
  }
}

///|
pub fn parse_profile(data : Bytes) -> Profile raise ProfileError {
  if data.length() > 65536 {
    raise InvalidProfile("Configuration exceeds 64 KiB.")
  }
  let text = @utf8.decode(data) catch {
    _ => raise InvalidProfile("Configuration must be UTF-8.")
  }
  profile_unique_keys(text)
  let raw = @json.parse(text) catch {
    _ => raise InvalidProfile("Invalid configuration JSON.")
  }
  profile_keys(raw, ["profile_version", "common", "review", "compare"])
  if profile_limit(raw, "profile_version") != Some(1) {
    raise InvalidProfile("Expected profile_version 1.")
  }
  let common = profile_section(raw, "common")
  let review = profile_section(raw, "review")
  let compare = profile_section(raw, "compare")
  let limits = profile_section(review, "limits")
  profile_keys(common, ["allow_missing_version", "legacy_dn_spaces"])
  profile_keys(review, ["deny_delete", "deny_clear", "deny_rename", "limits"])
  profile_keys(compare, ["ignored_attributes"])
  profile_keys(limits, [
    "max_change_records", "max_delete_records", "max_clear_operations",
  ])
  let names : Map[String, Bool] = Map([])
  if compare is Object(fields) {
    match fields.get("ignored_attributes") {
      None => ()
      Some(Array(attrs)) => {
        if attrs.length() > 64 {
          raise InvalidProfile("At most 64 ignored attributes.")
        }
        for attr in attrs {
          if attr is String(s) {
            if s.length() > 256 || !valid_attribute(s) || ascii_lower(s) == "dn" {
              raise InvalidProfile(
                "Invalid ignored attribute description; DN cannot be excluded.",
              )
            }
            names[snapshot_attribute_key(s)] = true
          } else {
            raise InvalidProfile("Ignored attributes must be strings.")
          }
        }
      }
      _ => raise InvalidProfile("Ignored attributes must be an array.")
    }
  }
  let ignored = names.keys().to_array()
  ignored.sort()
  {
    options: {
      allow_missing_version: profile_bool(common, "allow_missing_version"),
      deny_delete: profile_bool(review, "deny_delete"),
    },
    risk: {
      deny_clear: profile_bool(review, "deny_clear"),
      deny_rename: profile_bool(review, "deny_rename"),
    },
    legacy: profile_bool(common, "legacy_dn_spaces"),
    ignored,
    limits: [
      profile_limit(limits, "max_change_records"),
      profile_limit(limits, "max_delete_records"),
      profile_limit(limits, "max_clear_operations"),
    ],
  }
}

///|
pub fn Profile::to_json(self : Profile) -> Json {
  let limits : Map[String, Json] = Map([])
  for
    i, key in [
      "max_change_records", "max_delete_records", "max_clear_operations",
    ] {
    if self.limits[i] is Some(n) {
      limits[key] = n.to_json()
    }
  }
  {
    "profile_version": 1,
    "common": {
      "allow_missing_version": self.options.allow_missing_version.to_json(),
      "legacy_dn_spaces": self.legacy.to_json(),
    },
    "review": {
      "deny_delete": self.options.deny_delete.to_json(),
      "deny_clear": self.risk.deny_clear.to_json(),
      "deny_rename": self.risk.deny_rename.to_json(),
      "limits": Json::object(limits),
    },
    "compare": { "ignored_attributes": self.ignored.to_json() },
  }
}

///|
/// Canonical UTF-8 input for the platform's effective-configuration SHA-256.
pub fn Profile::canonical(self : Profile) -> String {
  self.to_json().stringify()
}

///|
/// Only rules applied by this mode participate in its effective fingerprint.
pub fn Profile::effective_json(
  self : Profile,
  section : String,
) -> Json raise ProfileError {
  if section != "review" && section != "compare" {
    raise InvalidProfile("Expected review or compare configuration section.")
  }
  let config = self.to_json()
  let fields : Map[String, Json] = Map([])
  fields["profile_version"] = (1).to_json()
  fields["common"] = snapshot_field(config, "common")
  fields[section] = snapshot_field(config, section)
  Json::object(fields)
}

///|
fn profile_evaluate(report : Report, profile : Profile) -> Json {
  let counts = [0, 0, 0]
  let first : Array[Span?] = [None, None, None]
  fn count(i : Int, span : Span) -> Unit {
    counts[i] += 1
    if profile.limits[i] is Some(limit) {
      if counts[i] > limit && first[i] == None {
        first[i] = Some(span)
      }
    }
  }
  for r in report.document.records {
    match r.body {
      Entry(_) => ()
      _ => count(0, r.span)
    }
    match r.body {
      Delete => count(1, r.span)
      Modify(mods) =>
        for m in mods {
          if (m.operation == "delete" || m.operation == "replace") &&
            m.values.is_empty() {
            count(2, m.span)
          }
        }
      _ => ()
    }
  }
  let complete = report.exit_code() != 2
  let applicable = report.document.mode != "content"
  let metrics : Array[Json] = []
  for
    i, key in [
      "max_change_records", "max_delete_records", "max_clear_operations",
    ] {
    let code = [
        "change-record-limit", "delete-record-limit", "clear-operation-limit",
      ][i]
    metrics.push({
      "rule": key.to_json(),
      "code": code.to_json(),
      "actual": counts[i].to_json(),
      "limit": profile.limits[i].to_json(),
      "first_exceeded_span": first[i].to_json(),
    })
    if first[i] is Some(span) {
      diagnose(
        report.diagnostics,
        code,
        "policy",
        span,
        "Observed " +
        counts[i].to_string() +
        " operations; configured maximum " +
        profile.limits[i].unwrap().to_string() +
        ". Counts cover all parsed records per file.",
      )
    }
  }
  if !applicable && profile.limits.any(n => n != None) {
    diagnose(
      report.diagnostics,
      "profile-limits-not-applicable",
      "error",
      single_line(1),
      "Change limits require a change plan, not a content export.",
    )
  }
  {
    "scope": "per_file",
    "applicable": applicable.to_json(),
    "counts_complete": (complete && applicable).to_json(),
    "counts_are_lower_bounds": (!complete).to_json(),
    "metrics": metrics.to_json(),
  }
}

///|
pub fn check_with_profile(data : Bytes, profile : Profile) -> Report {
  let r = check(
    data,
    options=profile.options,
    risk_policy=profile.risk,
    legacy_dn_spaces=profile.legacy,
  )
  ignore(profile_evaluate(r, profile))
  r
}

///|
fn profile_metadata(
  profile : Profile,
  section : String,
  source_sha : String,
  effective_sha : String,
) -> Json raise QueryError {
  for hash in [source_sha, effective_sha] {
    if hash != "" &&
      (
        hash.length() != 64 ||
        !hash.iter().all(c => (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f'))
      ) {
      raise InvalidQuery("Invalid configuration SHA-256.")
    }
  }
  let config = profile.effective_json(section) catch {
    _ => raise InvalidQuery("Invalid configuration section.")
  }
  {
    "applied_section": section.to_json(),
    "source_sha256": source_sha.to_json(),
    "effective_sha256": effective_sha.to_json(),
    "effective": config,
  }
}
