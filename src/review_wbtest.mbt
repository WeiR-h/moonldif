///|
test "unsupported modifications never masquerade as replace or clear" {
  for operation in ["increment", "unknown"] {
    for value in ["", "uidNumber: 1\n"] {
      let report = check_text(
        "version: 1\ndn: cn=A\nchangetype: modify\ndelete: description\n-\n" +
        operation +
        ": uidNumber\n" +
        value +
        "-\n",
      )
      let review = report.review()
      assert_eq(report.exit_code(), 2)
      assert_true(!review.analysis_complete)
      assert_eq(review.items.map(i => i.code), [
        "attribute-delete-all", "unsupported-modification",
      ])
      assert_eq(review.items[1].span.line, 6)
      assert_true(review.items[1].reason.contains(operation))
      assert_true(!review.to_text().contains("This replaces the entire"))
    }
  }
}

///|
test "review distinguishes add selected delete whole delete and empty replace in order" {
  let report = check_text(
    "version: 1\ndn: cn=A\nchangetype: modify\nadd: description\ndescription: one\n-\ndelete: description\ndescription: two\n-\ndelete: mail\n-\nreplace: photo\n-\nreplace: cn\ncn: B\n-\n",
  )
  let r = report.review()
  assert_eq(r.total_items, 5)
  assert_eq(r.items.map(i => i.code), [
    "attribute-add", "attribute-delete-values", "attribute-delete-all", "attribute-clear",
    "attribute-replace",
  ])
  assert_eq(r.items.map(i => i.value_count), [1, 1, 0, 0, 1])
  assert_eq(r.items[0].span.line, 4)
  assert_eq(r.items[3].span.line, 12)
  assert_true(r.analysis_complete)
  assert_eq(report.exit_code(), 0)
  assert_true(!r.to_json().stringify().contains("two"))
}

///|
test "review preserves deletion policy and shows opaque controls without interpreting them" {
  let report = check_text(
    "version: 1\ndn: cn=A\ncontrol: 1.2.3 true:: c2VjcmV0\nchangetype: delete\n",
    options={ allow_missing_version: false, deny_delete: true, },
  )
  let r = report.review()
  assert_eq(r.items.map(i => i.code), ["operation-control", "entry-delete"])
  assert_eq(r.input_exit_code, 1)
  assert_true(!r.to_json().stringify().contains("c2VjcmV0"))
  assert_eq(report.exit_code(), 1)
}

///|
test "review labels partial inputs and truncation rather than claiming no further changes" {
  let partial = check_text(
    "version: 1\ndn: cn=A\nchangetype: delete\n\ndn: cn=B\nchangetype: add\nphoto:< file:///never-read\n",
  ).review()
  assert_eq(partial.total_items, 2)
  assert_true(!partial.analysis_complete)
  assert_eq(partial.input_exit_code, 2)
  let many = check_text(
    "version: 1\n" + "dn: cn=A\nchangetype: delete\n\n".repeat(205),
  ).review()
  assert_eq(many.total_items, 205)
  assert_eq(many.items.length(), 200)
  assert_true(many.truncated)
  assert_eq(many.items[199].record_index, 199)
}

///|
test "review reports moves and add entries while content documents remain content" {
  let r = check_text(
    "version: 1\ndn: cn=A\nchangetype: add\ncn: A\n\ndn: cn=A\nchangetype: moddn\nnewrdn: cn=B\ndeleteoldrdn: 0\nnewsuperior:\n",
  ).review()
  assert_eq(r.items.map(i => i.code), ["entry-add", "entry-move"])
  assert_true(r.items[1].reason.contains("retaining"))
  assert_eq(check_text("version: 1\ndn: cn=A\ncn: A\n").review().total_items, 0)
}
