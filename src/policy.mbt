///|
/// Opt-in file-intent checks. These do not query directory state or schema.
pub(all) struct RiskPolicy {
  deny_clear : Bool
  deny_rename : Bool
} derive(Eq, ToJson)

///|
pub fn RiskPolicy::default() -> RiskPolicy {
  { deny_clear: false, deny_rename: false, }
}

///|
fn check_risks(
  document : Document,
  ds : Array[Diagnostic],
  policy : RiskPolicy,
) -> Unit {
  // Always traverse parsed records, never the bounded presentation/review list.
  for record in document.records {
    match record.body {
      Modify(modifications) =>
        for modification in modifications {
          if policy.deny_clear &&
            modification.values.is_empty() &&
            (
              modification.operation == "delete" ||
              modification.operation == "replace"
            ) {
            diagnose(
              ds,
              "clear-denied",
              "policy",
              modification.span,
              "Removing all attribute values is blocked by --deny-clear.",
            )
          }
        }
      Rename(_, _, _) =>
        if policy.deny_rename {
          diagnose(
            ds,
            "rename-denied",
            "policy",
            record.span,
            "Renaming or moving a directory entry is blocked by --deny-rename.",
          )
        }
      _ => ()
    }
  }
}
