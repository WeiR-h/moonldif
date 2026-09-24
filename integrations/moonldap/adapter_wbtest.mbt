///|
test "all four changes map to real moonldap objects and BER round trip" {
  let source = "version: 1\ndn: cn=A\nchangetype: add\ncn: A\nCN: B\nphoto:: /wBB\n\ndn: cn=A\nchangetype: modify\ndelete: cn\ncn: A\n-\nadd: cn\ncn: B\n-\nreplace: description\n-\n\ndn: cn=A\nchangetype: moddn\nnewrdn: cn=B\ndeleteoldrdn: 1\nnewsuperior: ou=People\n\ndn: cn=B\nchangetype: delete\n"
  let mapped = to_messages(@ldif.parse_text(source)).unwrap()
  assert_eq(mapped.length(), 4)
  let expected_add = @ldap.ProtocolOp::AddRequest(@ldap.AddRequest::new("cn=A", [@ldap.Attribute::new("cn", [b"A", b"B"]), @ldap.Attribute::new("photo", [Bytes::from_array([255, 0, 65])])]))
  assert_true(mapped[0] == @ldap.LdapMessage::new(1, expected_add))
  let expected_mod = @ldap.ProtocolOp::ModifyRequest(@ldap.ModifyRequest::new("cn=A", [
    @ldap.ModifyRequestChange::new(@ldap.ModifyOperation::Delete, @ldap.PartialAttribute::new("cn", [b"A"])),
    @ldap.ModifyRequestChange::new(@ldap.ModifyOperation::Add, @ldap.PartialAttribute::new("cn", [b"B"])),
    @ldap.ModifyRequestChange::new(@ldap.ModifyOperation::Replace, @ldap.PartialAttribute::new("description", [])),
  ]))
  assert_true(mapped[1] == @ldap.LdapMessage::new(2, expected_mod))
  assert_true(mapped[2] == @ldap.LdapMessage::new(3, @ldap.ProtocolOp::ModifyDnRequest(@ldap.ModifyDnRequest::new("cn=A", "cn=B", true, Some("ou=People")))))
  assert_true(mapped[3] == @ldap.LdapMessage::new(4, @ldap.ProtocolOp::DelRequest(@ldap.DelRequest::new("cn=B"))))
  for msg in mapped {
    let encoded = @ldap.encode_message(msg).unwrap()
    let decoded = @ldap.decode_message(encoded, None).unwrap()
    assert_true(decoded == msg)
  }
}

///|
test "adapter rejects controls, content and incomplete reports" {
  for source in [
    "version: 1\ndn: a\ncontrol: 1.2.3\nchangetype: delete\n",
    "version: 1\ndn: a\ncn: A\n",
    "version: 1\ndn: a\nchangetype: add\nphoto:< file:///never-read\n",
  ] {
    assert_true(match to_messages(@ldif.parse_text(source)) { Err(_) => true; Ok(_) => false })
  }
}

///|
test "adapter refuses clear and rename policies" {
  for source in [
    "version: 1\ndn: cn=Demo\nchangetype: modify\nreplace: mail\n-\n",
    "version: 1\ndn: cn=Demo\nchangetype: moddn\nnewrdn: cn=New\ndeleteoldrdn: 1\n",
  ] {
    let report = @ldif.check_text(source, risk_policy={deny_clear: true, deny_rename: true})
    assert_true(match to_messages(report) { Err(_) => true; Ok(_) => false })
  }
}

///|
test "adapter refuses profile change limits" {
  let p = @ldif.parse_profile(b"{\"profile_version\":1,\"review\":{\"limits\":{\"max_delete_records\":0}}}")
  let report = @ldif.check_with_profile(b"version: 1\ndn: cn=Demo\nchangetype: delete\n", p)
  assert_eq(report.exit_code(), 1)
  assert_true(match to_messages(report) { Err(_) => true; Ok(_) => false })
}
