///|
test "paged library works on JS and Wasm GC and does not expose session state" {
  let text = StringBuilder()
  text.write_string("version: 1\n")
  for i in 0..<240 {
    text.write_string("dn: cn=" + i.to_string() + "\nchangetype: delete\n\n")
  }
  let session = ReviewSession::new(@utf8.encode(text.to_string()))
  let page = session.page({ offset: 200, limit: 50, query: "", kind: "all", })
  assert_eq(
    snapshot_field(snapshot_field(page, "page"), "returned_items"),
    (40).to_json(),
  )
  if snapshot_field(page, "summary") is Object(fields) {
    fields["exit_code"] = (123).to_json()
  }
  assert_eq(session.exit_code(), 0)
  assert_eq(
    snapshot_field(session.page(PageQuery::default()), "exit_code"),
    (0).to_json(),
  )
  let diff = SnapshotSession::new(
    b"version: 1\ndn: cn=a\ncn: old\n", b"version: 1\ndn: cn=a\ncn: value\n",
  )
  assert_eq(diff.exit_code(), 1)
  assert_eq(
    snapshot_field(
      snapshot_field(diff.page(PageQuery::default()), "page"),
      "total_items",
    ),
    (1).to_json(),
  )
}

///|
test "cursor byte ceiling accepts exact boundary and rejects one byte beyond" {
  let cursor = report_cursor(Json::null(), 0, 0, _ => Json::null(), "json")
  cursor.position = 0
  cursor.bytes = 32 * 1024 * 1024 - 3
  assert_eq(cursor.next(), Some("]}\n"))
  assert_eq(cursor.next(), None)
  let overflow = report_cursor(Json::null(), 0, 0, _ => Json::null(), "json")
  overflow.position = 0
  overflow.bytes = 32 * 1024 * 1024 - 2
  let failed = try {
    ignore(overflow.next())
    false
  } catch {
    ExportLimit => true
    _ => false
  }
  assert_true(failed)
}

///|
test "invalid page limits fail without changing session exit code" {
  let s = ReviewSession::new(b"version: 1\ndn: cn=a\nchangetype: delete\n", options={
    allow_missing_version: false,
    deny_delete: true,
  })
  for
    q in [
      { offset: -1, limit: 50, query: "", kind: "all", },
      { offset: 0, limit: 201, query: "", kind: "all", },
    ] {
    let failed = try {
      ignore(s.page(q))
      false
    } catch {
      InvalidQuery(_) => true
      _ => false
    }
    assert_true(failed)
    assert_eq(s.exit_code(), 1)
  }
}
