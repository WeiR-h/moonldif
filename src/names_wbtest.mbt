///|
test "RFC 4514 examples include multi-valued RDNs and escaped delimiters" {
  for
    text in [
      "UID=jsmith,DC=example,DC=net", "OU=Sales+CN=J. Smith,DC=example,DC=net", "CN=James \\\"Jim\\\" Smith\\, III,DC=example,DC=net",
      "CN=Before\\0dAfter,DC=example,DC=net", "1.3.6.1.4.1.1466.0=#04024869", "CN=Lu\\C4\\8Di\\C4\\87",
      "cn=Lučić", "cn=", "", "cn=\\ Alice\\ ", "cn=a=b", "cn=\\#literal", "cn=\\FF",
    ] {
    assert_true(
      match parse_dn(text) {
        Ok(_) => true
        Err(_) => false
      },
    )
  }
  let name = parse_dn("OU=Sales+CN=J. Smith,DC=example").unwrap()
  assert_eq(name.rdns.length(), 2)
  assert_eq(name.rdns[0].assertions.length(), 2)
  assert_true(
    parse_dn("cn=Lu\\C4\\8Di\\C4\\87").unwrap().rdns[0].assertions[0].value ==
    Text(@utf8.encode("Lučić")),
  )
  assert_true(
    parse_dn("cn=\\FF").unwrap().rdns[0].assertions[0].value ==
    Text(Bytes::from_array([255])),
  )
  assert_true(
    parse_dn("cn=#04024869").unwrap().rdns[0].assertions[0].value ==
    Ber(Bytes::from_array([4, 2, 72, 105])),
  )
}

///|
test "DN grammar rejects ambiguous whitespace, attribute options and malformed escapes" {
  for
    text in [
      "plain name", "cn=a,", "cn=a+", "cn=a,,dc=x", "cn=a++uid=x", "cn= a", "cn=a ",
      "cn=\\q", "cn=\\", "cn=\\A", "cn=\\AZ", "cn=#", "cn=#0", "cn=#00GG", "cn=\"quoted\"",
      "cn=a;dc=x", "cn;lang-en=A", "01.2=A", "1.02=A", "cn =A", "=A", "cn=a\u{0000}b",
    ] {
    assert_true(
      match parse_dn(text) {
        Err(_) => true
        Ok(_) => false
      },
    )
  }
  assert_true(
    match parse_rdn("") {
      Err(_) => true
      _ => false
    },
  )
  assert_true(
    match parse_rdn("cn=a,dc=x") {
      Err(_) => true
      _ => false
    },
  )
  assert_true(
    match parse_rdn("cn=a+uid=b") {
      Ok(_) => true
      _ => false
    },
  )
}

///|
test "name diagnostics locate folded rename fields and preserve policy errors" {
  let r = check_text(
    "version: 1\ndn: cn=A,\n dc=example\nchangetype: moddn\nnewrdn: cn=B,\n dc=other\ndeleteoldrdn: 1\nnewsuperior: ou=People,\n",
  )
  assert_eq(r.exit_code(), 2)
  assert_eq(r.diagnostics.length(), 2)
  assert_eq(r.diagnostics[0].span.line, 5)
  assert_eq(r.diagnostics[0].span.end_line, 6)
  assert_eq(r.diagnostics[1].span.line, 8)
  let invalid_dn = check_text(
    "version: 1\ndn:: " +
    @base64.encode(@utf8.encode("cn=A,")[:]) +
    "\nchangetype: delete\n",
    options={ allow_missing_version: false, deny_delete: true, },
  )
  assert_eq(invalid_dn.exit_code(), 2)
  assert_true(invalid_dn.diagnostics.any(d => d.code == "delete-denied"))
  assert_true(
    invalid_dn.diagnostics.any(d => {
      d.code == "name-empty-component" &&
      d.span.line == 2 &&
      d.span.end_line == 2
    }),
  )
}

///|
test "structural parser and preflight explicitly report their different scopes" {
  let input = "version: 1\ndn: not-a-dn\ncn: A\n"
  assert_eq(parse_text(input).exit_code(), 0)
  assert_true(!parse_text(input).names_checked)
  assert_eq(check_text(input).exit_code(), 2)
  assert_true(check_text(input).names_checked)
  assert_true(parse_text(input).not_checked().contains("DN/RDN string syntax"))
  assert_true(!check_text(input).not_checked().contains("DN/RDN string syntax"))
}

///|
test "names are bounded without folding or rewriting values" {
  assert_true(
    match parse_dn("cn=" + "x".repeat(16384)) {
      Err(e) => e.code == "name-limit"
      _ => false
    },
  )
  assert_true(
    match parse_dn("cn=x,".repeat(256) + "cn=x") {
      Err(e) => e.code == "name-rdn-limit"
      _ => false
    },
  )
  let ordinary = parse_dn("CN=Alice").unwrap().rdns[0].assertions[0]
  let different = parse_dn("cn=alice").unwrap().rdns[0].assertions[0]
  assert_true(ordinary.value != different.value)
}
