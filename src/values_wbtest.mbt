///|
test "fold comments and preserve exactly one continuation space with source span" {
  let ds : Array[Diagnostic] = []
  let lines = logical_lines(@utf8.encode("# comment\n folded comment\ndescription: one\n  two\r\n"), ds)
  assert_eq(ds.length(), 0)
  assert_eq(lines[0].text, "description: one two")
  assert_eq(lines[0].span.line, 3)
  assert_eq(lines[0].span.end_line, 4)
}

///|
test "inline values preserve binary bytes and trailing spaces" {
  let ds : Array[Diagnostic] = []
  let binary = parse_field({ text: "photo:: /wBB", span: single_line(1) }, ds).unwrap()
  assert_true(binary.value == Inline(Bytes::from_array([255, 0, 65])))
  let text = parse_field({ text: "cn: Alice ", span: single_line(2) }, ds).unwrap()
  assert_true(text.value == Inline(@utf8.encode("Alice ")))
  let empty = parse_field({ text: "description:", span: single_line(3) }, ds).unwrap()
  assert_true(empty.value == Inline(b""))
  assert_eq(ds.length(), 0)
}

///|
test "reject malformed base64 instead of accepting reference parser leniency" {
  for value in ["QQ!!==", "Q", "A===", "QQ=", "QQ==AA"] {
    let ds : Array[Diagnostic] = []
    ignore(parse_field({ text: "cn:: " + value, span: single_line(1) }, ds))
    assert_true(ds.any(d => d.code == "invalid-base64"))
  }
}

///|
test "bad physical input has clear errors and external values never resolve" {
  for data in [b" x\n", b"cn: a\rb\n", Bytes::from_array([255, 10])] {
    let ds : Array[Diagnostic] = []
    ignore(logical_lines(data, ds))
    assert_true(ds.any(d => d.severity == "error"))
  }
  let ds : Array[Diagnostic] = []
  let field = parse_field({ text: "photo:< file:///private/image", span: single_line(1) }, ds).unwrap()
  assert_true(field.value == External("file:///private/image"))
  assert_true(ds.any(d => d.severity == "unsupported"))
}

///|
test "attribute descriptions compare case and unordered options only" {
  assert_true(valid_attribute("1.2.840.113556.1.4.7000;binary"))
  assert_true(valid_attribute("cn;lang-en"))
  assert_true(!valid_attribute("cn;"))
  assert_true(!valid_attribute("1.cn"))
  assert_true(attribute_equal("CN;lang-en;binary", "cn;BINARY;LANG-EN"))
  assert_true(!attribute_equal("cn;lang-en", "cn;lang-fr"))
}
