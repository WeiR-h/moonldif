///|
test "snapshot ignores representation and ordering but compares bytes" {
  let a = b"version: 1\ndn: cn=A\nCN: Alice\nphoto:: /wAB\nmail: a\nmail: b\ndescription;lang-en;binary: he\n llo\n\ndn: cn=B\ncn: B\n"
  let b = b"# export\r\nversion: 1\r\ndn:: Y249Qg==\r\ncn: B\r\n\r\ndn: cn=A\r\nMAIL: b\r\nmail:: YQ==\r\nphoto:: /wAB\r\ncn:: QWxpY2U=\r\nDESCRIPTION;BINARY;LANG-EN: hello\r\n"
  let diff = compare_snapshots(a, b)
  assert_eq(diff.exit_code(), 0)
  let json = diff.to_json()
  assert_true(
    json is { "total_changes": Number(0, ..), "comparison_performed": True, .. },
  )
  assert_eq(diff.to_json(), compare_snapshots(a, b).to_json())
  assert_false(diff.to_text().contains("Alice"))
  assert_false(diff.to_markdown().contains("/wAB"))
}

///|
test "snapshot classifies changes and preserves value multiplicity" {
  let a = b"version: 1\ndn: cn=A\ncn: A\nmail: private-old\nmail: private-old\ndescription:\n\ndn: cn=Gone\ncn: Gone\n"
  let b = b"version: 1\ndn: cn=A\ncn: A\nmail: private-old\nmail: private-new\nphone: 123\n\ndn: cn=New\ncn: New\n"
  let result = compare_snapshots(a, b)
  assert_eq(result.exit_code(), 1)
  assert_true(
    result.to_json()
    is {
      "total_changes": Number(5, ..),
      "counts": {
        "entry-added": Number(1, ..),
        "entry-removed": Number(1, ..),
        "attribute-added": Number(1, ..),
        "attribute-removed": Number(1, ..),
        "values-changed": Number(1, ..),
        ..
      },
      ..
    },
  )
  assert_false(result.to_text().contains("private-old"))
  assert_false(result.to_markdown().contains("private-new"))
  if result.to_json() is { "changes": Array(items), .. } {
    assert_true(
      items[0]
      is {
        "code": String("values-changed"),
        "removed_value_count": Number(1, ..),
        "added_value_count": Number(1, ..),
        "before_span": { "line": Number(4, ..), "end_line": Number(5, ..), .. },
        ..
      },
    )
  } else {
    fail("missing changes")
  }
}

///|
test "incomplete snapshots cannot manufacture entry deletions" {
  let good = b"version: 1\ndn: cn=A\ncn: A\n"
  for
    bad in [
      b"version: 1\ndn: cn=A\nphoto:< file:///secret\n", b"version: 1\ndn: cn=A\nchangetype: delete\n",
      b"broken",
    ] {
    for pair in [(good, bad), (bad, good)] {
      let (a, b) = pair
      let r = compare_snapshots(a, b)
      assert_eq(r.exit_code(), 2)
      assert_true(
        r.to_json()
        is { "total_changes": Number(0, ..), "comparison_performed": False, .. },
      )
      assert_false(r.to_text().contains("file:///secret"))
    }
  }
}

///|
test "duplicate exact DNs are excluded but other changes survive" {
  let a = b"version: 1\ndn: cn=A\ncn: A\n\ndn: cn=A\ncn: second\n\ndn: cn=B\ncn: before\n"
  let b = b"version: 1\ndn: cn=A\ncn: third\n\ndn: cn=B\ncn: after\n"
  let r = compare_snapshots(a, b)
  assert_eq(r.exit_code(), 2)
  assert_true(
    r.to_json()
    is {
      "ambiguous_dn_count": Number(1, ..),
      "total_changes": Number(1, ..),
      "comparison_performed": True,
      ..
    },
  )
  assert_true(r.to_text().contains("snapshot-duplicate-dn"))
}

///|
test "DN case or escaping differences are not silently normalized" {
  let r = compare_snapshots(
    b"version: 1\ndn: cn=A\ncn: A\n", b"version: 1\ndn: CN=A\ncn: A\n",
  )
  assert_eq(r.exit_code(), 1)
  assert_true(r.to_json() is { "total_changes": Number(2, ..), .. })
  let binary = compare_snapshots(
    b"version: 1\ndn: cn=A\nphoto:: /wA=\n", b"version: 1\ndn: cn=A\nphoto:: /gA=\n",
  )
  assert_eq(binary.exit_code(), 1)
  let empty = compare_snapshots(
    b"version: 1\ndn: cn=A\nmail:\n", b"version: 1\ndn: cn=A\ncn: A\n",
  )
  assert_eq(empty.exit_code(), 1)
}

///|
test "snapshot limits findings but keeps complete totals" {
  let a = StringBuilder()
  let b = StringBuilder()
  a.write_string("version: 1\n")
  b.write_string("version: 1\n")
  for i in 0..<230 {
    let dn = "dn: cn=" + i.to_string() + "\n"
    a.write_string(dn + "mail: a\n\n")
    b.write_string(dn + "mail: b\n\n")
  }
  let r = compare_snapshots(
    @utf8.encode(a.to_string()),
    @utf8.encode(b.to_string()),
  )
  assert_eq(r.exit_code(), 1)
  assert_true(
    r.to_json()
    is {
      "total_changes": Number(230, ..),
      "reported_changes": Number(200, ..),
      "truncated": True,
      "analysis_complete": True,
      ..
    },
  )
  let excluded = compare_snapshots(
    @utf8.encode(a.to_string()),
    @utf8.encode(b.to_string()),
    ignored_attributes=["mail"],
  )
  assert_eq(excluded.exit_code(), 0)
  assert_true(
    excluded.to_json()
    is {
      "excluded_attribute_occurrences": {
        "before": Number(230, ..),
        "after": Number(230, ..),
        ..
      },
      ..
    },
  )
}

///|
test "snapshot compatibility and optional source identity are explicit" {
  let a = b"dn: cn=[demo]\ncn: private\n"
  assert_eq(compare_snapshots(a, a).exit_code(), 2)
  let r = compare_snapshots(
    a,
    a,
    allow_missing_version=true,
    before_sha256=Some("a".repeat(64)),
  )
  assert_eq(r.exit_code(), 0)
  assert_true(r.to_json() is { "after": { "sha256": Null, .. }, .. })
  assert_eq(
    compare_snapshots(
      a,
      a,
      allow_missing_version=true,
      after_sha256=Some("invalid"),
    ).exit_code(),
    2,
  )
  let changed = compare_snapshots(
    a,
    b"dn: cn=[demo]\ncn: other\n",
    allow_missing_version=true,
  )
  assert_true(changed.to_markdown().contains("&#91;demo&#93;"))
}

///|
test "snapshot exclusions are explicit exact descriptions with complete counts" {
  let a = b"version: 1\ndn: cn=A\nmodifyTimestamp: old\nmail;lang-en;binary: old\nmail: unchanged\nmail;lang-fr: old\n"
  let b = b"version: 1\ndn: cn=A\nmodifyTimestamp: new\nMAIL;BINARY;LANG-EN: new\nmail: unchanged\nmail;lang-fr: new\n"
  let r = compare_snapshots(a, b, ignored_attributes=[
    "MODIFYTIMESTAMP", "mail;BINARY;lang-en", "modifytimestamp",
  ])
  assert_eq(r.exit_code(), 1)
  assert_true(
    r.to_json()
    is {
      "options": {
        "ignored_attributes": Array(
          [String("modifytimestamp"), String("mail;binary;lang-en")]
        ),
        ..
      },
      "excluded_attribute_occurrences": {
        "before": Number(2, ..),
        "after": Number(2, ..),
        ..
      },
      "total_changes": Number(1, ..),
      "changes": Array([{ "attribute": String("mail;lang-fr"), .. }]),
      ..
    },
  )
  assert_true(
    r.to_markdown().contains(markdown_escape("excluded_attribute_occurrences")),
  )
  assert_eq(compare_snapshots(a, b, ignored_attributes=["mail"]).exit_code(), 1)
  assert_eq(
    compare_snapshots(a, b, ignored_attributes=[
      "modifyTimestamp", "mail;binary;lang-en", "mail;lang-fr",
    ]).exit_code(),
    0,
  )
}

///|
test "snapshot exclusion validation fails closed and does not expose supplied invalid text" {
  let a = b"version: 1\ndn: cn=A\nmail: a\n"
  for
    invalid in [
      "",
      "*",
      "mail ",
      "dn",
      "DN",
      "mail;",
      "<secret>",
      "a".repeat(257),
    ] {
    let r = compare_snapshots(a, a, ignored_attributes=[invalid])
    assert_eq(r.exit_code(), 2)
    assert_true(
      r.to_json()
      is {
        "comparison_performed": False,
        "excluded_attribute_occurrences": Null,
        ..
      },
    )
    assert_true(r.to_text().contains("snapshot-invalid-exclusion"))
    assert_false(r.to_text().contains("<secret>"))
  }
  assert_eq(
    compare_snapshots(a, a, ignored_attributes=Array::make(65, "mail")).exit_code(),
    2,
  )
  assert_eq(
    compare_snapshots(a, a, ignored_attributes=Array::make(64, "mail")).exit_code(),
    0,
  )
}

///|
test "excluded attributes do not hide malformed external or ambiguous snapshots" {
  let a = b"version: 1\ndn: cn=A\nmail: a\n"
  for
    b in [
      b"version: 1\ndn: cn=A\nmail:< file:///secret\n", b"version: 1\ndn: cn=A\nmail:: invalid!\n",
      b"version: 1\ndn: cn=A\nmail: a\n\ndn: cn=A\nmail: b\n",
    ] {
    let r = compare_snapshots(a, b, ignored_attributes=["mail"])
    assert_eq(r.exit_code(), 2)
    assert_false(r.to_text().contains("file:///secret"))
  }
  let removed = compare_snapshots(a, b"version: 1\ndn: cn=B\nmail: b\n", ignored_attributes=[
    "mail",
  ])
  assert_eq(removed.exit_code(), 1)
  assert_true(
    removed.to_json()
    is { "counts": { "entry-removed": Number(1, ..), .. }, .. },
  )
}

///|
test "snapshot result JSON is detached from reusable report" {
  let r = compare_snapshots(
    b"version: 1\ndn: cn=A\nmail: a\n", b"version: 1\ndn: cn=A\nmail: b\n",
  )
  let expected = r.to_text()
  let json = r.to_json()
  if json is Object(fields) {
    fields["exit_code"] = (99).to_json()
    if fields.get("changes") is Some(Array(items)) {
      if items[0] is Object(item) {
        item["dn"] = "tampered".to_json()
      }
      items.clear()
    }
  }
  assert_eq(r.exit_code(), 1)
  assert_eq(r.to_text(), expected)
  assert_false(r.to_markdown().contains("tampered"))
}

///|
test "snapshot options deduplicate many canonical attribute options" {
  let parts : Array[String] = []
  for i in 0..<3000 {
    parts.push("o" + i.to_string())
  }
  let forward = parts.join(";")
  for i in 0..<1500 {
    let saved = parts[i]
    parts[i] = parts[2999 - i]
    parts[2999 - i] = saved
  }
  let reverse = parts.join(";")
  let a = @utf8.encode("version: 1\ndn: cn=A\nmail;" + forward + ": a\n")
  let b = @utf8.encode("version: 1\ndn: cn=A\nMAIL;" + reverse + ";o1: a\n")
  assert_eq(compare_snapshots(a, b).exit_code(), 0)
}
