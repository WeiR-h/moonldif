///|
test "risk policies distinguish all-value removal from selected and empty byte values" {
  let head = "version: 1\ndn: cn=Demo\nchangetype: modify\n"
  for
    entry in [
      ("delete: mail\n-\n", 1),
      ("replace: mail\n-\n", 1),
      ("delete: mail\nmail: old@example.org\n-\n", 0),
      ("replace: mail\nmail:\n-\n", 0),
      ("replace: mail\nmail::\n-\n", 0),
      ("add: mail\nmail: new@example.org\n-\n", 0),
    ] {
    let (operation, expected) = entry
    assert_eq(check_text(head + operation).exit_code(), 0)
    let report = check_text(head + operation, risk_policy={
      deny_clear: true,
      deny_rename: false,
    })
    assert_eq(report.exit_code(), expected)
    if expected == 1 {
      assert_true(
        try {
          ignore(report.format())
          false
        } catch {
          _ => true
        },
      )
      assert_eq(report.diagnostics[0].span.line, 4)
    }
  }
}

///|
test "rename aliases and moves are optional policies" {
  for change in ["moddn", "modrdn"] {
    for extra in ["", "newsuperior: ou=People\n"] {
      let source = "version: 1\ndn: cn=Demo\nchangetype: " +
        change +
        "\nnewrdn: cn=New\ndeleteoldrdn: 1\n" +
        extra
      assert_eq(check_text(source).exit_code(), 0)
      assert_eq(
        check_text(source, risk_policy={ deny_clear: false, deny_rename: true, }).exit_code(),
        1,
      )
    }
  }
  let deletion = "version: 1\ndn: cn=Demo\nchangetype: delete\n"
  assert_eq(
    check_text(deletion, risk_policy={ deny_clear: true, deny_rename: true, }).exit_code(),
    0,
  )
  assert_eq(
    check_text(deletion, options={
      allow_missing_version: false,
      deny_delete: true,
    }).exit_code(),
    1,
  )
}

///|
test "policies inspect beyond the first 200 review items and preserve partial diagnostics" {
  let source = StringBuilder()
  source.write_string("version: 1\ndn: cn=Demo\nchangetype: modify\n")
  for _ in 0..<205 {
    source.write_string("add: description\ndescription: sample\n-\n")
  }
  source.write_string("replace: mail\n-\n")
  let text = source.to_string()
  let policy = { deny_clear: true, deny_rename: true, }
  let report = check_text(text, risk_policy=policy)
  assert_eq(report.exit_code(), 1)
  assert_true(report.review().truncated)
  assert_eq(report.diagnostics[0].span.line, 619)
  for
    extra in [
      "increment: count\ncount: 1\n-\n", "add: photo\nphoto:< file:///never-read\n-\n",
    ] {
    let partial = check_text(text + extra, risk_policy=policy)
    assert_eq(partial.exit_code(), 2)
    assert_true(partial.diagnostics.any(d => d.code == "clear-denied"))
    assert_true(
      try {
        ignore(partial.format())
        false
      } catch {
        _ => true
      },
    )
  }
}

///|
test "risk diagnosis limits fail closed and line numbers survive CRLF and folding" {
  let source = "version: 1\r\ndn:: Y249RGVt\r\n bw==\r\nchangetype: modify\r\nreplace: mail\r\n-\r\n"
  let r = check_text(source, risk_policy={
    deny_clear: true,
    deny_rename: true,
  })
  assert_eq(r.exit_code(), 1)
  assert_eq(r.diagnostics[0].span.line, 5)
  let large = StringBuilder()
  large.write_string("version: 1\ndn: cn=Demo\nchangetype: modify\n")
  for _ in 0..<105 {
    large.write_string("replace: mail\n-\n")
  }
  let bounded = check_text(large.to_string(), risk_policy={
    deny_clear: true,
    deny_rename: false,
  })
  assert_eq(bounded.exit_code(), 2)
  assert_eq(bounded.diagnostics.length(), 101)
}
