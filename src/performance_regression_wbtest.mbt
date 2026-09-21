///|
test "plain and lazily folded lines preserve Unicode and physical spans" {
  for newline in ["\n", "\r\n"] {
    let text = [
      "version: 1", "# 中文 comment", " continued comment", "dn:: Y2495Lit5paH",
      "cn:: 5Lit", " 5paH", "description::", " 5Lit5paH",
    ].join(newline)
    let r = check_text(text)
    assert_eq(r.exit_code(), 0)
    assert_eq(r.document.records[0].dn, "cn=中文")
    match r.document.records[0].body {
      Entry(attrs) => {
        assert_true(attrs[0].span == { line: 5, end_line: 6, })
        assert_true(attrs[1].span == { line: 7, end_line: 8, })
        assert_true(attrs[0].value == Inline(@utf8.encode("中文")))
        assert_true(attrs[1].value == Inline(@utf8.encode("中文")))
      }
      _ => fail("content expected")
    }
    assert_eq(
      document_json(check_text(r.format()).document),
      document_json(r.document),
    )
  }
}

///|
test "late intent counting preserves controls modifications and policy diagnostics" {
  let input = "version: 1\n" +
    "dn: cn=A\nchangetype: modify\n" +
    "add: description\ndescription: value\n-\n".repeat(201) +
    "delete: mail\n-\n\n" +
    "dn: cn=B\ncontrol: 1.2.3 false\nchangetype: modrdn\nnewrdn: cn=C\ndeleteoldrdn: 1\n\n" +
    "dn: cn=D\nchangetype: modify\nreplace: mail\n-\nunknown: cn\n-\n"
  let r = check_text(input, risk_policy={ deny_clear: true, deny_rename: true, })
  let review = r.review()
  assert_eq(review.total_items, 206)
  assert_eq(review.items.length(), 200)
  assert_true(review.truncated)
  assert_eq(r.exit_code(), 2)
  assert_eq(r.diagnostics.filter(d => d.code == "clear-denied").length(), 2)
  assert_true(r.diagnostics.any(d => d.code == "rename-denied"))
  assert_true(!review.analysis_complete)
}

///|
test "unfolded limit and invalid continuation retain exact error locations" {
  let r = check_text(
    "version: 1\ndn: cn=A\ncn: " + "x".repeat(1024 * 1024 - 4) + "\n x\n",
  )
  assert_eq(r.exit_code(), 2)
  assert_true(
    r.diagnostics.any(d => d.code == "logical-line-limit" && d.span.line == 4),
  )
  let orphan = check_text("version: 1\n\n orphan\ndn: cn=A\ncn: A\n")
  assert_true(
    orphan.diagnostics.any(d => {
      d.code == "orphan-continuation" && d.span.line == 3
    }),
  )
}
