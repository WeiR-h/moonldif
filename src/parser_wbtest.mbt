///|
test "content values, comments and spans" {
  let r = parse_text(
    "version: 1\n# comment\ndn: cn=Alice,dc=example\ncn: Alice\ncn:: 5L2g5aW9\ndescription:\n\n",
  )
  assert_eq(r.status(), "complete")
  assert_eq(r.document.mode, "content")
  assert_eq(r.document.records.length(), 1)
  assert_eq(r.document.records[0].span.line, 3)
  match r.document.records[0].body {
    Entry(a) => {
      assert_eq(a.length(), 3)
      assert_true(a[1].value == Inline(@utf8.encode("你好")))
    }
    _ => fail("expected entry")
  }
}

///|
test "all base change types and modification ordering" {
  let r = parse_text(
    "version: 1\ndn: cn=A\nchangetype: add\ncn: A\n\ndn: cn=A\nchangetype: modify\ndelete: cn\ncn: A\n-\nadd: cn\nCN: B\n-\nreplace: description\n-\n\ndn: cn=A\nchangetype: moddn\nnewrdn: cn=B\ndeleteoldrdn: 1\nnewsuperior: ou=People\n\ndn: cn=B\nchangetype: delete\n",
  )
  assert_eq(r.exit_code(), 0)
  assert_eq(r.document.records.length(), 4)
  match r.document.records[1].body {
    Modify(m) => {
      assert_eq(m.map(v => v.operation), ["delete", "add", "replace"])
      assert_eq(m[2].values.length(), 0)
    }
    _ => fail("expected modify")
  }
  assert_true(
    r.document.records[2].body == Rename("cn=B", true, Some("ou=People")),
  )
}

///|
test "controls preserve missing and explicitly empty values" {
  let r = parse_text(
    "version: 1\ndn: cn=A\ncontrol: 1.2.3 true\ncontrol: 1.2.4 false:\ncontrol: 1.2.5:: /wA=\nchangetype: delete\n",
  )
  assert_eq(r.exit_code(), 0)
  let c = r.document.records[0].controls
  assert_true(c[0].value == None)
  assert_true(c[1].value == Some(Inline(b"")))
  assert_true(c[2].value == Some(Inline(Bytes::from_array([255, 0]))))
}

///|
test "invalid syntax and unsupported structures never pass" {
  for
    input in [
      "version: 1\ndn: a\ncn: A\ndn: b\ncn: B\n", "version: 1\ndn: a\nchangetype: modify\nreplace: cn\nsn: A\n-\n",
      "version: 1\ndn: a\nchangetype: modify\nreplace: cn\ncn: A\n", "version: 1\ndn: a\nchangetype: modrdn\nnewrdn: cn=B\ndeleteoldrdn: 2\n",
      "version: 1\ndn: a\nchangetype:: ZGVsZXRl\n", "version: 1\ndn: a\ncn: A\n\ndn: b\nchangetype: delete\n",
    ] {
    assert_eq(parse_text(input).exit_code(), 2)
  }
  let r = parse_text(
    "version: 1\ndn: a\nchangetype: delete\n\ndn: b\nchangetype: increment\n",
    options={ allow_missing_version: false, deny_delete: true, },
  )
  assert_eq(r.status(), "incomplete")
  assert_eq(r.exit_code(), 2)
  assert_eq(r.document.records.length(), 1)
  assert_true(r.diagnostics.any(d => d.code == "delete-denied"))
}

///|
test "strict version and explicit compatibility and delete policy" {
  assert_eq(parse_text("dn: a\ncn: A\n").exit_code(), 2)
  assert_eq(
    parse_text("dn: a\ncn: A\n", options={
      allow_missing_version: true,
      deny_delete: false,
    }).exit_code(),
    0,
  )
  assert_eq(parse_text("version: 2\ndn: a\ncn: A\n").exit_code(), 2)
  assert_eq(
    parse_text("version: 1\ndn: a\nchangetype: delete\n", options={
      allow_missing_version: false,
      deny_delete: true,
    }).exit_code(),
    1,
  )
}

///|
test "root DN, encoded rename and unordered attribute options" {
  let r = parse_text(
    "version: 1\ndn:\nchangetype: modify\nreplace: cn;lang-en;binary\nCN;BINARY;LANG-EN: A\n-\n",
  )
  assert_eq(r.exit_code(), 0)
  let rename = parse_text(
    "version: 1\ndn: cn=A\nchangetype: modrdn\nnewrdn:: Y2495L2g5aW9\ndeleteoldrdn: 0\n",
  )
  assert_eq(rename.exit_code(), 0)
  assert_true(
    rename.document.records[0].body == Rename("cn=你好", false, None),
  )
}
