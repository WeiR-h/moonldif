///|
fn inline(value : @ldif.Value) -> Bytes {
  // Only called after the supported writer has validated all input values.
  match value { Inline(b) => b; External(_) => b"" }
}

///|
fn grouped(attrs : Array[@ldif.Attribute]) -> Array[@ldap.Attribute] {
  let names : Array[String] = []
  let values : Array[Array[Bytes]] = []
  for a in attrs {
    let mut found = -1
    for i in 0..<names.length() {
      if @ldif.same_attribute_description(a.name, names[i]) { found = i; break }
    }
    if found < 0 { names.push(a.name); values.push([inline(a.value)]) }
    else { values[found].push(inline(a.value)) }
  }
  names.mapi((i, name) => @ldap.Attribute::new(name, values[i]))
}

///|
/// Offline mapping only. This function neither binds nor connects to LDAP.
/// Rejects every operation control because moonldap 0.3.0 cannot represent the
/// absent/empty control value distinction in its public Control constructor.
pub fn to_messages(report : @ldif.Report) -> Result[Array[@ldap.LdapMessage], String] {
  if report.exit_code() != 0 || report.document.mode != "changes" {
    return Err("Expected a complete, unblocked changes document; content is not implicitly converted to add operations.")
  }
  try { ignore(report.format()) } catch { _ => return Err("Input model did not pass the safe writer validation.") }
  let messages : Array[@ldap.LdapMessage] = []
  for r in report.document.records {
    if !r.controls.is_empty() { return Err("Operation controls are unsupported by this adapter; no control is silently discarded.") }
    let op : @ldap.ProtocolOp = match r.body {
      Add(attrs) => @ldap.ProtocolOp::AddRequest(@ldap.AddRequest::new(r.dn, grouped(attrs)))
      Delete => @ldap.ProtocolOp::DelRequest(@ldap.DelRequest::new(r.dn))
      Modify(mods) => {
        let changes : Array[@ldap.ModifyRequestChange] = []
        for m in mods {
          let kind : @ldap.ModifyOperation = match m.operation {
            "add" => @ldap.ModifyOperation::Add
            "delete" => @ldap.ModifyOperation::Delete
            "replace" => @ldap.ModifyOperation::Replace
            _ => return Err("Unsupported modification operation.")
          }
          changes.push(@ldap.ModifyRequestChange::new(kind, @ldap.PartialAttribute::new(m.attribute, m.values.map(a => inline(a.value)))))
        }
        @ldap.ProtocolOp::ModifyRequest(@ldap.ModifyRequest::new(r.dn, changes))
      }
      Rename(rdn, delete_old, superior) => @ldap.ProtocolOp::ModifyDnRequest(@ldap.ModifyDnRequest::new(r.dn, rdn, delete_old, superior))
      Entry(_) => return Err("Content records are not change requests.")
    }
    messages.push(@ldap.LdapMessage::new(messages.length() + 1, op))
  }
  Ok(messages)
}
