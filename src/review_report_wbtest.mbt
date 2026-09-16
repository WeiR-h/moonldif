///|
test "review exports metadata and safely escapes untrusted names without attribute bytes" {
  let report = check_text(
    "version: 1\ndn: cn=[x](javascript:alert`1`)&evil\nchangetype: modify\nreplace: description\ndescription: SECRET-ATTRIBUTE-BYTES\n-\n",
  )
  assert_eq(report.exit_code(), 0)
  let metadata : ReviewMetadata = {
    input_sha256: "a".repeat(64),
    input_byte_length: 137,
    options: Options::default(),
    legacy_dn_spaces: false,
    risk_policy: RiskPolicy::default(),
  }
  let markdown = report.review_markdown(metadata)
  assert_true(markdown.contains("&#91;x&#93;"))
  assert_true(!markdown.contains("[x]("))
  assert_true(!markdown.contains("SECRET-ATTRIBUTE-BYTES"))
  assert_true(
    !report.review_json(metadata).stringify().contains("SECRET-ATTRIBUTE-BYTES"),
  )
  assert_eq(markdown, report.review_markdown(metadata))
  assert_eq(report.review_json(metadata), report.review_json(metadata))
}

///|
test "report export retains invalid status and diagnostic truncation" {
  let metadata : ReviewMetadata = {
    input_sha256: "b".repeat(64),
    input_byte_length: 1,
    options: Options::default(),
    legacy_dn_spaces: false,
    risk_policy: RiskPolicy::default(),
  }
  let invalid = check_text("not ldif")
  assert_true(
    invalid.review_markdown(metadata).contains("Partial or invalid analysis"),
  )
  assert_true(
    invalid.review_json(metadata).stringify().contains("\"exit_code\":2"),
  )
  assert_eq(
    markdown_escape("<script>\n# [bad]|` &"),
    "&#60;script&#62;&#10;&#35; &#91;bad&#93;&#124;&#96; &#38;",
  )
}
