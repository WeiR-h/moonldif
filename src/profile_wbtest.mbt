///|
test "profile limits apply to all records and safe writer rejects violations" {
  let p = parse_profile(
    b"{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":200}}}",
  )
  let text = StringBuilder()
  text.write_string("version: 1\n")
  for i in 0..<201 {
    text.write_string("dn: cn=" + i.to_string() + "\nchangetype: delete\n\n")
  }
  let r = check_with_profile(@utf8.encode(text.to_string()), p)
  assert_eq(r.exit_code(), 1)
  assert_eq(r.diagnostics[r.diagnostics.length() - 1].span.line, 602)
  let refused = try {
    ignore(r.format())
    false
  } catch {
    _ => true
  }
  assert_true(refused)
  let session = ReviewSession::with_profile(@utf8.encode(text.to_string()), p)
  let page = session.page({
    offset: 0,
    limit: 50,
    query: "not-present",
    kind: "all",
  })
  assert_eq(snapshot_field(page, "exit_code"), (1).to_json())
  assert_eq(snapshot_field(page, "report_schema_version"), (3).to_json())
}

///|
test "profile counts modifications separately and preserves error precedence" {
  let p = parse_profile(
    b"{\"profile_version\":1,\"review\":{\"limits\":{\"max_change_records\":1,\"max_clear_operations\":1}}}",
  )
  let data = b"version: 1\ndn: cn=a\nchangetype: modify\ndelete: mail\n-\nreplace: cn\ncn:\n-\nreplace: sn\n-\n"
  let r = check_with_profile(data, p)
  assert_eq(r.exit_code(), 1)
  assert_eq(r.diagnostics.length(), 1)
  assert_eq(r.diagnostics[0].code, "clear-operation-limit")
  let bad = check_with_profile(b"version: 1\ndn: cn=a\ncn: test\n", p)
  assert_eq(bad.exit_code(), 2)
  assert_true(
    bad.diagnostics.any(d => d.code == "profile-limits-not-applicable"),
  )
}

///|
test "profile decoding rejects ambiguous keys and normalizes isolated copies" {
  for
    text in [
      "{\"profile_version\":1,\"profile_version\":1}", "{\"profile_version\":1,\"profile_vers\\u0069on\":1}",
      "{\"profile_version\":1,\"review\":{\"deny_clear\":null}}", "{\"profile_version\":1,\"review\":{\"limits\":{\"max_change_records\":-1}}}",
      "{\"profile_version\":1,\"review\":{\"limits\":{\"max_change_records\":1.5}}}",
      "{\"profile_version\":1,\"review\":{\"limits\":{\"max_change_records\":2147483648}}}",
      "{\"profile_version\":2}", "{\"profile_version\":1,\"extra\":1}",
    ] {
    let rejected = try {
      ignore(parse_profile(@utf8.encode(text)))
      false
    } catch {
      _ => true
    }
    assert_true(rejected)
  }
  let p = parse_profile(
    b"{\"profile_version\":1,\"compare\":{\"ignored_attributes\":[\"CN;X;X\",\"cn;x\"]}}",
  )
  let original = p.canonical()
  let copy = p.to_json()
  if snapshot_field(copy, "compare") is Object(fields) {
    fields["ignored_attributes"] = Json::array([])
  }
  assert_eq(p.canonical(), original)
  assert_eq(parse_profile(@utf8.encode(original)).canonical(), original)
}

///|
test "profile snapshot and batch share validated configuration" {
  let p = parse_profile(
    b"{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":1}},\"compare\":{\"ignored_attributes\":[\"cn\"]}}",
  )
  let s = SnapshotSession::with_profile(
    b"version: 1\ndn: cn=a\ncn: old\n", b"version: 1\ndn: cn=a\ncn: new\n", p,
  )
  assert_eq(s.exit_code(), 0)
  let batch = BatchReview::with_profile(p)
  for _ in 0..<2 {
    batch.add_bytes(
      "same.ldif",
      b"version: 1\ndn: cn=a\nchangetype: delete\n",
      "a".repeat(64),
    )
  }
  assert_eq(batch.exit_code(), 0)
  assert_eq(
    snapshot_field(batch.to_json(), "limit_scope"),
    "per_file".to_json(),
  )
  batch.add_unavailable("missing")
  assert_eq(batch.exit_code(), 2)
}

///|
test "structured profile validation preserves legacy errors and field paths" {
  let cases = [
    (
      "{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":\"-1\"}}}",
      "limit-value", "/review/limits/max_delete_records",
    ),
    (
      "{\"profile_version\":1,\"review\":{\"deny_delete\":1}}", "boolean-type", "/review/deny_delete",
    ),
    (
      "{\"profile_version\":1,\"compare\":{\"ignored_attributes\":[\"cn\",\"dn\"]}}",
      "ignored-attribute", "/compare/ignored_attributes/1",
    ),
    ("{\"profile_version\":1,\"a~/b\":true}", "unknown-field", "/a~0~1b"),
    ("{\"profile_version\":2}", "version", "/profile_version"),
    ("{\"profile_version\":1,\"profile_vers\\u0069on\":1}", "duplicate-key", ""),
    ("{\"profile_version\":1,\"common\":[]}", "object-type", "/common"),
    ("{\"profile_version\":1,\"unfinished", "json", ""),
  ]
  for item in cases {
    let (text, code, path) = item
    let data = @utf8.encode(text)
    match validate_profile(data) {
      Valid(_) => fail("Expected invalid configuration")
      Invalid(issue) => {
        assert_eq(issue.code, code)
        assert_eq(issue.path, path)
        let message = try {
          ignore(parse_profile(data))
          "unexpected"
        } catch {
          InvalidProfile(m) => m
        }
        assert_eq(message, issue.message)
      }
    }
  }
}

///|
test "structured validation byte and integer boundaries" {
  for
    text in [
      "{\"profile_version\":1}", "{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":0}}}",
      "{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":2147483647}}}",
    ] {
    let bytes = @utf8.encode(text)
    match validate_profile(bytes) {
      Valid(p) => assert_eq(p.canonical(), parse_profile(bytes).canonical())
      Invalid(_) => fail("Expected valid profile")
    }
  }
  for value in ["2147483648", "-1", "1.5", "1e2", "null", "\"abc\"", "\" \""] {
    let text = "{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":" +
      value +
      "}}}"
    assert_true(validate_profile(@utf8.encode(text)) is Invalid(_))
  }
  assert_true(validate_profile(b"\xff") is Invalid({ code: "encoding", .. }))
  assert_true(
    validate_profile(@utf8.encode(" ".repeat(65537)))
    is Invalid({ code: "size", .. }),
  )
}
