import com.unboundid.ldif.*;
import com.unboundid.ldap.sdk.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/** Independent test adapter only. No directory connection is created. */
public final class LdifOracle {
  static String b64(byte[] bytes) { return Base64.getEncoder().encodeToString(bytes); }
  static String key(String name) {
    String[] parts = name.toLowerCase(Locale.ROOT).split(";");
    Arrays.sort(parts, 1, parts.length);
    return String.join(";", parts);
  }
  static Object values(byte[][] input) {
    return Arrays.stream(input).map(LdifOracle::b64).toList();
  }
  static Object attributes(Collection<Attribute> attrs) {
    Map<String, List<String>> result = new TreeMap<>();
    for (Attribute attr : attrs) {
      List<String> group = result.computeIfAbsent(key(attr.getName()), ignored -> new ArrayList<>());
      for (byte[] value : attr.getValueByteArrays()) group.add(b64(value));
    }
    return result;
  }
  static Object record(LDIFRecord record) {
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("dn", record.getDN());
    List<Object> controls = new ArrayList<>();
    if (record instanceof LDIFChangeRecord change) {
      for (Control control : change.getControls()) {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("oid", control.getOID());
        c.put("critical", control.isCritical());
        c.put("value", control.hasValue() ? b64(control.getValue().getValue()) : null);
        controls.add(c);
      }
    }
    out.put("controls", controls);
    Map<String, Object> body = new LinkedHashMap<>();
    if (record instanceof Entry entry) {
      body.put("type", "entry");
      body.put("attributes", attributes(entry.getAttributes()));
    } else if (record instanceof LDIFAddChangeRecord add) {
      body.put("type", "add");
      body.put("attributes", attributes(Arrays.asList(add.getAttributes())));
    } else if (record instanceof LDIFDeleteChangeRecord) {
      body.put("type", "delete");
    } else if (record instanceof LDIFModifyChangeRecord modify) {
      body.put("type", "modify");
      List<Object> mods = new ArrayList<>();
      for (Modification modification : modify.getModifications()) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("operation", modification.getModificationType().getName().toLowerCase(Locale.ROOT));
        m.put("attribute", key(modification.getAttributeName()));
        m.put("values", values(modification.getValueByteArrays()));
        mods.add(m);
      }
      body.put("modifications", mods);
    } else if (record instanceof LDIFModifyDNChangeRecord rename) {
      body.put("type", "moddn");
      body.put("newrdn", rename.getNewRDN());
      body.put("deleteoldrdn", rename.deleteOldRDN());
      body.put("newsuperior", rename.getNewSuperiorDN());
    } else throw new IllegalArgumentException("Unexpected record type");
    out.put("body", body);
    return out;
  }
  static String json(Object value) {
    if (value == null) return "null";
    if (value instanceof Boolean || value instanceof Number) return value.toString();
    if (value instanceof Map<?, ?> map) {
      List<String> items = new ArrayList<>();
      map.forEach((k, v) -> items.add(json(k.toString()) + ":" + json(v)));
      return "{" + String.join(",", items) + "}";
    }
    if (value instanceof Collection<?> collection) return "[" + String.join(",", collection.stream().map(LdifOracle::json).toList()) + "]";
    StringBuilder out = new StringBuilder("\"");
    for (char c : value.toString().toCharArray()) {
      if (c == '"' || c == '\\') out.append('\\').append(c);
      else if (c < 32) out.append(String.format("\\u%04x", (int)c));
      else out.append(c);
    }
    return out.append('"').toString();
  }
  public static void main(String[] args) throws Exception {
    List<Object> result = new ArrayList<>();
    for (String arg : args) {
      Path path = Path.of(arg);
      String source = Files.readString(path, StandardCharsets.UTF_8);
      // Fail before the SDK sees any URL-valued data, including folded lines.
      String unfolded = source.replace("\r\n", "\n").replace("\n ", "");
      if (unfolded.lines().anyMatch(s -> !s.startsWith("#") && (s.contains(":<") || s.toLowerCase(Locale.ROOT).startsWith("control::"))))
        throw new IllegalArgumentException("External references are excluded from this offline oracle");
      List<Object> records = new ArrayList<>();
      StringBuilder written = new StringBuilder("version: 1\n\n");
      try (LDIFReader reader = new LDIFReader(new ByteArrayInputStream(source.getBytes(StandardCharsets.UTF_8)))) {
        LDIFRecord next;
        while ((next = reader.readLDIFRecord()) != null) {
          records.add(record(next));
          written.append(String.join("\n", next.toLDIF())).append("\n\n");
        }
      }
      result.add(Map.of("file", path.getFileName().toString(), "records", records,
        "written_base64", b64(written.toString().getBytes(StandardCharsets.UTF_8))));
    }
    System.out.println(json(result));
  }
}
