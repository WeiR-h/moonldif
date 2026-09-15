# DN/RDN 名称检查

`check(Bytes)`、`check_text(String)` 和 CLI 的三个文件命令会检查 DN、newrdn、newsuperior 的 RFC 4514 字符串语法。`parse` / `parse_text` 仅作 LDIF 结构解析，可用于保留待修订的数据；它们返回 `names_checked: false`。直接调用 `parse(...).format()` 也不会自动增加名称检查，导入准备流程应使用 `check`。

名称模型提供 `parse_dn` 和 `parse_rdn`。DN 是从叶到根的 RDN 序列；每个 RDN 可以有多个 `+` 连接的断言。断言值保留转义解码后的字节，`#` 十六进制形式单独保留为不解释的 BER 字节。

| 输入 | 结果与处理 |
|---|---|
| `cn=Alice,dc=example` | 两级 DN |
| `cn=Alice+uid=42,dc=example` | 第一层含两个断言 |
| `cn=A\, B,dc=example` | 值内逗号经转义保留 |
| `cn=\ Alice\ ` | 前后空格明确保留 |
| 空字符串 DN | 根 DN，允许；空 newrdn 不允许 |
| `cn=A,` | 定位尾部分隔符后的空组件 |
| `cn= A` | 前导空格需要转义，不自动删掉 |
| `cn;lang-en=A` | DN 属性类型不允许属性选项 |
| `cn=#04024869` | 检查十六进制形式；不声称 BER 语义或目录 Schema 有效 |

CLI 诊断包含原始物理行范围。对于折行或 Base64 字段，错误位置还会说明“解码后值的 0 起始字节偏移”，不能把这个偏移误当作原始文件列号。

不会将属性值强制转小写、去空格、排序或合并；这些可能改变含义。RFC 4514 本身不定义可代替目录匹配规则的规范化字符串。名称语法通过不证明 DN 存在、两个 DN 相等、属性允许该值、ACL 允许操作或服务器可成功导入。

限制：每个解码后 DN 最大 16 KiB、最多 256 层 RDN。测试含 RFC 4514 示例、转义 Unicode、二进制转义字节、非法语法、折行位置、Base64 定位与策略并存。

## 旧文件的分隔空格

RFC 2849 的示例含 `cn=A, dc=example` 一类旧格式。默认检查会指出属性类型前的空格；对明确使用这种格式的文件可加 `--legacy-dn-spaces`，库接口对应 `check(..., legacy_dn_spaces=true)`。此时仅接受逗号或加号之后的 ASCII 空格，给出 `legacy-name-separator-spaces` 警告，JSON `name_profile` 标记实际用了扩展。

此选项不接受引号包围值、分号分隔符、前后未转义的属性值空格或任意坏转义，也不代表完整 RFC 2253/LDAPv2 支持。`--compat` 仍然只允许缺版本头。写回保留原始 DN，不自动删除空格；因此输出可能仍需以同一旧格式配置读取。警告受总诊断上限约束，超过上限时不会静默通过。

依据：[RFC 4514](https://www.rfc-editor.org/rfc/rfc4514.html) 的字符串语法与转义规则、[RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html) 的属性类型描述符与数字 OID 语法。
