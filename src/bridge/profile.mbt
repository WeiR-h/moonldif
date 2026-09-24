///|
#export_name("profile_validate")
pub fn profile_validate(encoded : String) -> String {
  let p = @ldif.parse_profile(
    @base64.decode(encoded[:], ignore_whitespace=false),
  ) catch {
    @ldif.InvalidProfile(message) => return host_error(message, "json")
    _ => return host_error("Invalid configuration transport.", "json")
  }
  let result : Json = {
    "exit_code": 0,
    "canonical": p.canonical(),
    "profile": p.to_json(),
    "canonical_review": (p.effective_json("review") catch { _ => Json::null() })
    .stringify()
    .to_json(),
    "canonical_compare": (p.effective_json("compare") catch {
      _ => Json::null()
    })
    .stringify()
    .to_json(),
  }
  result.stringify()
}

///|
#export_name("profile_batch_start")
pub fn profile_batch_start(
  encoded : String,
  source_sha : String,
  effective_sha : String,
) -> @ldif.BatchReview? {
  try {
    let p = @ldif.parse_profile(
      @base64.decode(encoded[:], ignore_whitespace=false),
    )
    Some(
      @ldif.BatchReview::with_profile(
        p,
        profile_source_sha256=source_sha,
        profile_effective_sha256=effective_sha,
      ),
    )
  } catch {
    _ => None
  }
}

///|
#export_name("paged_write")
pub fn paged_write(session : PagingSession) -> String {
  match session {
    Review(s) => {
      if s.exit_code() != 0 {
        return envelope(s.exit_code(), "")
      }
      let written = s.format() catch {
        _ => return host_error("Writer rejected this document.", "json")
      }
      envelope(0, "", written=Some(written))
    }
    _ => host_error("Only checked change/content input can be written.", "json")
  }
}
