///|
pub(all) struct ReviewItem {
  code : String
  level : String
  record_index : Int
  dn : String
  attribute : String?
  value_count : Int
  span : Span
  title : String
  reason : String
  action : String
} derive(Eq)

///|
pub(all) struct Review {
  items : Array[ReviewItem]
  total_items : Int
  truncated : Bool
  analysis_complete : Bool
  input_exit_code : Int
  record_count : Int
} derive(Eq)

///|
pub fn Review::to_json(self : Review) -> Json {
  {
    "total_items": self.total_items.to_json(),
    "truncated": self.truncated.to_json(),
    "analysis_complete": self.analysis_complete.to_json(),
    "input_exit_code": self.input_exit_code.to_json(),
    "record_count": self.record_count.to_json(),
    "scope": "File operation intent only; no LDAP execution or schema approval",
    "items": self.items
    .map(item => {
      "code": item.code.to_json(),
      "level": item.level.to_json(),
      "record_index": item.record_index.to_json(),
      "dn": item.dn.to_json(),
      "attribute": match item.attribute {
        Some(s) => s.to_json()
        None => Json::null()
      },
      "value_count": item.value_count.to_json(),
      "span": ToJson::to_json(item.span),
      "title": item.title.to_json(),
      "reason": item.reason.to_json(),
      "action": item.action.to_json(),
    })
    .to_json(),
  }
}

///|
fn push_review(
  items : Array[ReviewItem],
  code : String,
  level : String,
  index : Int,
  r : Record,
  span : Span,
  attribute : String?,
  values : Int,
  title : String,
  reason : String,
  action : String,
) -> Unit {
  if items.length() < 200 {
    items.push({
      code,
      level,
      record_index: index,
      dn: r.dn,
      attribute,
      value_count: values,
      span,
      title,
      reason,
      action,
    })
  }
}

///|
/// File-level operation intent only. Review never executes LDAP or approves an
/// import, never changes parser/policy status, and exposes no attribute values.
/// Item order follows records and operations. The first 200 items are retained.
pub fn Report::review(self : Report) -> Review {
  let items : Array[ReviewItem] = []
  let mut count = 0
  for i in 0..<self.document.records.length() {
    let r = self.document.records[i]
    // Once the retained list is full, only count intent items. Policy checking
    // already traversed every record in check(); no risk decision is skipped.
    if items.length() >= 200 {
      count += r.controls.length()
      count += match r.body {
        Entry(_) => 0
        Modify(mods) => mods.length()
        _ => 1
      }
      continue
    }
    for c in r.controls {
      count = count + 1
      if items.length() >= 200 {
        continue
      }
      push_review(
        items,
        "operation-control",
        if c.critical {
          "high"
        } else {
          "caution"
        },
        i,
        r,
        c.span,
        None,
        0,
        "Operation control requires review",
        "Control " +
        c.oid +
        (if c.critical { " is critical." } else { " is non-critical." }) +
        " Its value and server behavior are not interpreted.",
        "Confirm server support and the control's effect before executing this operation.",
      )
    }
    match r.body {
      Entry(_) => ()
      Add(attrs) => {
        count = count + 1
        push_review(
          items,
          "entry-add",
          "notice",
          i,
          r,
          r.span,
          None,
          attrs.length(),
          "Add directory entry",
          "Requests a new entry with the supplied attribute values.",
          "Check the parent, object classes and required attributes against the target directory schema.",
        )
      }
      Delete => {
        count = count + 1
        push_review(
          items,
          "entry-delete",
          "high",
          i,
          r,
          r.span,
          None,
          0,
          "Delete directory entry",
          "Requests deletion of this DN. The server state and effects of attached controls are unknown.",
          "Verify the target and recovery plan. The optional deletion policy can block this file.",
        )
      }
      Modify(mods) =>
        for m in mods {
          count = count + 1
          if items.length() >= 200 {
            continue
          }
          let empty = m.values.is_empty()
          let (code, level, title, reason, action) = match m.operation {
            "add" =>
              (
                "attribute-add",
                if empty {
                  "caution"
                } else {
                  "notice"
                },
                "Add attribute values",
                if empty {
                  "This add modification supplies no values; the server may reject it."
                } else {
                  "Requests adding the supplied values to this attribute."
                },
                "Check schema constraints and whether these values already exist.",
              )
            "delete" =>
              if empty {
                (
                  "attribute-delete-all", "high", "Delete entire attribute", "No values were supplied, so this requests removal of the attribute and all its values.",
                  "Confirm that all values should be removed and that the attribute is not required.",
                )
              } else {
                (
                  "attribute-delete-values", "caution", "Delete selected attribute values",
                  "Only the supplied values are requested for removal.", "Check that the values exist and are the intended removal targets.",
                )
              }
            "replace" =>
              if empty {
                (
                  "attribute-clear", "high", "Clear attribute values", "An empty replace requests removal of this attribute's values.",
                  "Confirm that an empty replacement is intentional and permitted by the schema.",
                )
              } else {
                (
                  "attribute-replace", "caution", "Replace attribute values", "This replaces the entire value set rather than appending to it.",
                  "Include any old values that must be retained in the replacement set.",
                )
              }
            _ =>
              (
                "unsupported-modification",
                "high",
                "Unsupported modification requires review",
                "The modification '" +
                m.operation +
                "' is outside the supported profile; its effect has not been interpreted.",
                "Use a tool that supports this operation or revise the source intentionally. Do not treat it as replace or clear.",
              )
          }
          push_review(
            items,
            code,
            level,
            i,
            r,
            m.span,
            Some(m.attribute),
            m.values.length(),
            title,
            reason,
            action,
          )
        }
      Rename(rdn, delete_old, superior) => {
        count = count + 1
        push_review(
          items,
          if superior == None {
            "entry-rename"
          } else {
            "entry-move"
          },
          "high",
          i,
          r,
          r.span,
          None,
          0,
          if superior == None {
            "Rename directory entry"
          } else {
            "Rename with a new parent DN"
          },
          "New RDN: " +
          rdn +
          ". " +
          (if delete_old {
            "Requests removal of the old RDN attribute values."
          } else {
            "Requests retaining the old RDN attribute values."
          }) +
          (match superior {
            Some(s) => " New parent DN: " + s + "."
            None => " No new parent DN was supplied."
          }),
          "Review dependent names and child entries; confirm target-parent and permission requirements on the server.",
        )
      }
    }
  }
  {
    items,
    total_items: count,
    truncated: count > items.length(),
    analysis_complete: self.status() == "complete",
    input_exit_code: self.exit_code(),
    record_count: self.document.records.length(),
  }
}

///|
pub fn Review::to_text(self : Review) -> String {
  let out = StringBuilder()
  out.write_string(
    "Operation review: " +
    self.total_items.to_string() +
    " items; file intent only, not server execution results.\n",
  )
  if !self.analysis_complete {
    out.write_string(
      "Partial analysis: some input could not be interpreted. Missing review items are not proof of no impact.\n",
    )
  }
  if self.truncated {
    out.write_string(
      "Showing first 200 review items. Full review required before acting.\n",
    )
  }
  for item in self.items {
    out.write_string(
      item.level +
      " " +
      item.code +
      " line " +
      item.span.line.to_string() +
      "-" +
      item.span.end_line.to_string() +
      " " +
      item.dn +
      ": " +
      item.title +
      "\n" +
      (match item.attribute {
        Some(attribute) =>
          "Attribute: " +
          attribute +
          "; supplied values: " +
          item.value_count.to_string() +
          "\n"
        None => ""
      }) +
      item.reason +
      "\nAction: " +
      item.action +
      "\n",
    )
  }
  out.to_string()
}
