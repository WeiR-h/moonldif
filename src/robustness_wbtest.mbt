///|
test "every byte survives supported writer and reader without lossy conversion" {
  let bytes = Bytes::from_array(Array::makei(256, i => i.to_byte()))
  let d : Document = {
    mode: "content",
    records: [
      {
        dn: "cn=bytes",
        controls: [],
        body: Entry([
          { name: "data", value: Inline(bytes), span: single_line(1), },
        ]),
        span: single_line(1),
      },
    ],
  }
  let r = parse_text(write(d))
  assert_eq(r.exit_code(), 0)
  assert_true(document_json(r.document) == document_json(d))
}

///|
test "bounded arbitrary byte corpus returns structured status instead of panicking" {
  for n in 0..<256 {
    let bytes = Bytes::from_array(
      Array::makei(37, i => ((i * 31 + n) % 256).to_byte()),
    )
    let r = parse(bytes)
    assert_eq(r.exit_code(), 2)
    assert_true(r.diagnostics.length() <= 101)
  }
}

///|
test "resource limits and repeated small folds" {
  let text = "version: 1\ndn: cn=A\ndescription: start\n" + " x\n".repeat(20000)
  let r = parse_text(text)
  assert_eq(r.exit_code(), 0)
  match r.document.records[0].body {
    Entry(a) =>
      assert_true(
        a[0].value == Inline(@utf8.encode(("start" + "x".repeat(20000))[:])),
      )
    _ => fail("entry expected")
  }
  let too_long = parse_text("version: 1\ndn: a\ncn: " + "a".repeat(1024 * 1024))
  assert_eq(too_long.exit_code(), 2)
  assert_true(too_long.diagnostics.any(d => d.code == "line-limit"))
  let too_many = parse_text("version: 1\n" + "dn: a\ncn: A\n\n".repeat(10001))
  assert_eq(too_many.exit_code(), 2)
  assert_eq(too_many.document.records.length(), 10000)
  let diagnostics = parse_text("version: 1\ndn: a\n" + "invalid\n".repeat(1000))
  assert_eq(diagnostics.diagnostics.length(), 101)
}

///|
test "unsupported-only input stays incomplete and invalid UTF8 DN is rejected" {
  assert_eq(
    parse_text("version: 1\ndn: a\nchangetype: increment\n").status(),
    "incomplete",
  )
  let invalid = parse_text("version: 1\ndn:: /w==\ncn: A\n")
  assert_eq(invalid.exit_code(), 2)
  assert_true(invalid.diagnostics.any(d => d.code == "invalid-text-value"))
}
