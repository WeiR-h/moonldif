///|
test "semantic round trip preserves binary, leading/trailing spaces and folding" {
  let r = parse_text(
    "version: 1\ndn:: Y2495L2g5aW9\ncn:: 5L2g5aW9\nphoto:: /wBB\ndescription:: IG9uZSA=\nlong: " +
    "a".repeat(200) +
    "\n",
  )
  assert_eq(r.exit_code(), 0)
  let output = r.format()
  for line in output.split("\n") {
    assert_true(line.length() <= 76)
  }
  let again = parse_text(output)
  assert_eq(again.exit_code(), 0)
  assert_true(document_json(r.document) == document_json(again.document))
  assert_eq(again.format(), output)
}

///|
test "change serialization keeps order and control optional value" {
  let r = parse_text(
    "version: 1\ndn: a\ncontrol: 1.2.3 true\ncontrol: 1.2.4:\nchangetype: modify\ndelete: cn\ncn: A\n-\nadd: cn\ncn: B\n-\n\ndn: b\nchangetype: modrdn\nnewrdn: c\ndeleteoldrdn: 1\n",
  )
  let again = parse_text(r.format())
  assert_true(document_json(r.document) == document_json(again.document))
}

///|
test "writer refuses incomplete reports and fabricated invalid models" {
  let r = parse_text("version: 1\ndn: a\nphoto:< file:///never-read\n")
  let rejected = try {
    ignore(r.format())
    false
  } catch {
    _ => true
  }
  assert_true(rejected)
  let bad : Document = {
    mode: "content",
    records: [
      {
        dn: "a",
        controls: [],
        body: Entry([
          { name: "cn\nsn", value: Inline(b"A"), span: single_line(1), },
        ]),
        span: single_line(1),
      },
    ],
  }
  assert_true(
    try {
      ignore(write(bad))
      false
    } catch {
      _ => true
    },
  )
}

///|
test "ordinary control attribute in a content record is not an operation control" {
  let r = parse_text("version: 1\ndn: a\ncontrol: arbitrary attribute value\n")
  assert_eq(r.exit_code(), 0)
  assert_eq(r.document.records[0].controls.length(), 0)
  assert_eq(parse_text(r.format()).exit_code(), 0)
}
