///|
test "batch per-file results equal standalone review and share all risk options" {
  let opts : Options = { allow_missing_version: false, deny_delete: true, }
  let policy : RiskPolicy = { deny_clear: true, deny_rename: true, }
  let batch = BatchReview::new(options=opts, risk_policy=policy)
  let sources = [
    "version: 1\r\ndn: cn=Demo\r\ncn: PRIVATE-VALUE\r\nphoto:: /wBB\r\n", "version: 1\ndn: cn=Demo\nchangetype: delete\n",
    "version: 1\ndn: cn=Demo\nchangetype: modify\nreplace: mail\n-\n", "version: 1\ndn: cn=Demo\nchangetype: modrdn\nnewrdn: cn=New\ndeleteoldrdn: 1\nnewsuperior: ou=People\n",
    "version: 1\ndn: cn=Demo\nphoto:< file:///never-read\n",
  ]
  for i, source in sources {
    let data = @utf8.encode(source)
    // Synthetic identity: platform SHA calculation is covered by real CLI tests.
    batch.add_bytes("same.ldif", data, "a".repeat(64))
    let r = check(data, options=opts, risk_policy=policy)
    assert_eq(batch.items[i].code, r.exit_code())
    assert_eq(
      batch.items[i].report,
      r.review_json({
        input_sha256: "a".repeat(64),
        input_byte_length: data.length(),
        options: opts,
        risk_policy: policy,
        legacy_dn_spaces: false,
      }),
    )
  }
  assert_eq(batch.exit_code(), 2)
  assert_eq(batch.items.map(i => i.code), [0, 1, 1, 1, 2])
  assert_true(!batch.to_json().stringify().contains("PRIVATE-VALUE"))
  assert_true(!batch.to_markdown().contains("PRIVATE-VALUE"))
  assert_eq(batch.to_json(), batch.to_json())
  assert_eq(batch.to_markdown(), batch.to_markdown())
}

///|
test "batch unavailable and later files cannot turn a failure into success" {
  let batch = BatchReview::new(options={
    allow_missing_version: false,
    deny_delete: true,
  })
  assert_eq(batch.exit_code(), 2)
  batch.add_unavailable("missing.ldif")
  assert_true(batch.to_text().contains("deny_delete"))
  assert_true(batch.to_markdown().contains("deny&#95;delete"))
  assert_true(batch.to_markdown().contains("true"))
  batch.add_bytes(
    "valid.ldif",
    b"version: 1\ndn: cn=Demo\ncn: Demo\n",
    "b".repeat(64),
  )
  batch.add_bytes(
    "delete.ldif",
    b"version: 1\ndn: cn=Demo\nchangetype: delete\n",
    "b".repeat(64),
  )
  assert_eq(batch.items.map(i => i.code), [2, 0, 1])
  assert_eq(batch.exit_code(), 2)
  assert_true(batch.to_text().contains("delete-denied"))
  assert_true(batch.to_markdown().contains("Incomplete batch"))
}

///|
test "batch count rejects omitted tail and escape labels for review output" {
  let batch = BatchReview::new()
  for _ in 0..<51 {
    batch.add_bytes(
      "[a]&evil\n\u{202e}/secret",
      b"version: 1\ndn: cn=Demo\ncn: Demo\n",
      "c".repeat(64),
    )
  }
  assert_eq(batch.items.length(), 50)
  assert_eq(batch.exit_code(), 2)
  assert_true(batch.to_json().stringify().contains("\"unreported_files\":1"))
  assert_true(batch.to_markdown().contains("&#91;a&#93;&#38;evil"))
  assert_true(!batch.to_text().contains("evil\n"))
  assert_true(!batch.to_text().contains("\u{202e}"))
}

///|
test "batch byte and digest limits cannot be hidden by a valid later file" {
  let batch = BatchReview::new()
  let eight_mib = @utf8.encode("x".repeat(8 * 1024 * 1024))
  for _ in 0..<4 {
    batch.add_bytes("invalid-digest.ldif", eight_mib, "bad")
  }
  assert_eq(batch.remaining_bytes(), 0)
  batch.add_bytes("beyond-budget.ldif", b"version: 1\n", "a".repeat(64))
  assert_eq(batch.exit_code(), 2)
  assert_eq(batch.items.length(), 5)
  assert_true(batch.to_json().stringify().contains("32 MiB batch limit"))
  let large = BatchReview::new()
  large.add_bytes(
    "too-large.ldif",
    @utf8.encode("x".repeat(8 * 1024 * 1024 + 1)),
    "a".repeat(64),
  )
  assert_eq(large.remaining_bytes(), 32 * 1024 * 1024)
  assert_eq(large.exit_code(), 2)
}
