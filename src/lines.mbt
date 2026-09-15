///|
/// Physical lines are folded before comments are discarded. Exactly one
/// leading ASCII space is removed from each continuation.
fn logical_lines(data : Bytes, ds : Array[Diagnostic]) -> Array[Line] {
  let lines : Array[Line] = []
  if data.length() > 8 * 1024 * 1024 {
    diagnose(
      ds,
      "input-too-large",
      "error",
      single_line(1),
      "Input exceeds 8 MiB.",
    )
    return lines
  }
  if data.length() >= 3 && data[0] == 239 && data[1] == 187 && data[2] == 191 {
    diagnose(
      ds,
      "unexpected-bom",
      "error",
      single_line(1),
      "UTF-8 BOM is not supported by this profile.",
    )
    return lines
  }
  let mut start = 0
  let mut line_number = 1
  let mut pending = StringBuilder()
  let mut active = false
  let mut logical_size = 0
  let mut first_line = 1
  let mut last_line = 1
  let length = data.length()
  for i in 0..<(length + 1) {
    if i == length && start == length {
      break
    }
    if i == length || data[i] == 10 {
      let end = if i > start && data[i - 1] == 13 && i < length {
        i - 1
      } else {
        i
      }
      let span = single_line(line_number)
      if line_number > 100000 || end - start > 1024 * 1024 {
        diagnose(
          ds, "line-limit", "error", span, "Too many physical lines or a line exceeds 1 MiB.",
        )
        return lines
      }
      let mut bare_cr = false
      for j in start..<end {
        if data[j] == 13 {
          bare_cr = true
        }
      }
      if bare_cr {
        diagnose(
          ds, "bare-cr", "error", span, "Expected LF or CRLF, not a bare carriage return.",
        )
      }
      let text = @utf8.decode(data[start:end]) catch {
        _ => {
          diagnose(
            ds, "invalid-utf8", "error", span, "The file contains invalid UTF-8; binary values must use Base64.",
          )
          ""
        }
      }
      if text.has_prefix(" ") {
        if !active || logical_size == 0 {
          diagnose(
            ds, "orphan-continuation", "error", span, "A continuation must follow a nonempty physical line.",
          )
        } else {
          if logical_size + end - start - 1 > 1024 * 1024 {
            diagnose(
              ds, "logical-line-limit", "error", span, "An unfolded line exceeds 1 MiB.",
            )
            return lines
          }
          pending.write_string(text[1:].to_owned())
          logical_size = logical_size + end - start - 1
          last_line = line_number
        }
      } else {
        if active {
          lines.push({
            text: pending.to_string(),
            span: { line: first_line, end_line: last_line, },
          })
        }
        pending = StringBuilder()
        pending.write_string(text)
        active = true
        logical_size = end - start
        first_line = line_number
        last_line = line_number
      }
      start = i + 1
      line_number = line_number + 1
    }
  }
  if active {
    lines.push({
      text: pending.to_string(),
      span: { line: first_line, end_line: last_line, },
    })
  }
  lines.filter(l => !l.text.has_prefix("#"))
}
