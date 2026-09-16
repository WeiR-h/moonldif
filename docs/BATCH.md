# 批量离线预检（0.3.0）

典型问题：同一次目录维护提交有多份 LDIF，逐份手工检查容易漏文件，第一次出错后退出脚本又会漏掉后续危险操作。batch 按明确列出的输入逐份检查，生成可归档的统一报告，保留所有已发现的问题。

```text
node dist/moonldif.js batch examples/01-directory-export.ldif examples/02-account-changes.ldif examples/03-migration-plan.ldif --deny-delete --deny-clear --deny-rename --format json
node dist/moonldif.js batch examples/01-directory-export.ldif examples/02-account-changes.ldif --deny-delete --format markdown
```

前者预期退出 1，并列出每文件结果。路径含空格时加引号；以 - 开头的路径放在 -- 后面。无通配符/目录自动展开，空输入和多于 50 个输入拒绝；不要把空匹配当成检查通过。

## 结果语义

| 情况 | 整批退出码 | 行为 |
|---|---|---|
| 每份输入完成且策略允许 | 0 | 当前检查范围通过 |
| 至少一份触发策略，其余完成 | 1 | 仍检查其余文件并保留风险 |
| 文件不可读、超限、无效或不完整 | 2 | 优先于 1，保留其他文件结果 |
| 空批次/文件数超限 | 2 | CLI 在读取之前拒绝；公共 API 最多保留前 50 项并明确未分析的尾部 |

文件顺序按命令参数顺序，index 从 0 开始。重复路径不会去重，基本名相同时由序号及源字节指纹区分。每份文件独立分析：不拼接文档、不推断跨文件依赖、服务器事务或同一 DN 是否语义相等。批量入口不写回 LDIF。

JSON 根对象 kind=batch-review，包含 requested_files / reported_files / unreported_files、passed_files、blocked_files、incomplete_or_error_files、input_byte_budget_used、options、diagnostics 和 files。files 中每项包含 index、label 和 report；成功读入的 report 保留 0.2.0 单文件 review JSON 字段，读入失败的 source=null，不捏造指纹。

Markdown 包含总体状态和逐份完整的有界审阅报告；text 提供源指纹、逐文件状态与诊断。重复运行不加入动态时间戳。CLI 只显示文件基本名；控制字符和路径分隔符替换为下划线，显示名最多 200 字符，原参数序号不变。报告仍有 DN，不能当作匿名资料；原始属性值与绝对目录不加入报告。

## MoonBit 公共 API

`BatchReview` 的内部字段不公开。平台负责读取字节并计算真实 SHA-256，逐份调用 add_bytes；读入失败调用 add_unavailable。add_bytes 只校验指纹的十六进制格式，不重新计算哈希。以下 sha256 应由实际宿主针对 data 提供，不能在生产中填写示例常量。

```moonbit
let batch = @ldif.BatchReview::new(
  options={ allow_missing_version: false, deny_delete: true },
  risk_policy={ deny_clear: true, deny_rename: true },
)
batch.add_bytes("01.ldif", data, sha256)
batch.add_unavailable("02.ldif")
println(batch.to_json().stringify())
println(batch.exit_code()) // 因第二份未读入，返回 2
```

宿主逐份使用 remaining_bytes 限制后续读取。add_bytes 每份处理后仅保留有界报告，不保留原输入字节和 Document。最多 50 份，每份 8 MiB，累计接受字节 32 MiB；达到限制继续记为未分析，不会静默通过。单文件原有行数、记录数、诊断和前 200 审阅项上限继续适用。整个 LDIF 文件仍是有界缓冲区解析，未实现流式协议。

## 可复用 CI 示例

[CI 接入说明](../examples/ci/README.md) 和 [保存报告的示例程序](../examples/ci/check-plan.mjs) 把报告保存为 UTF-8，并原样保留 0/1/2 退出码；缺文件和拦截同样保存报告，报告保存失败返回 2。示例程序有 120 秒执行和 32 MiB 输出限制，超限视为执行失败；它不是新的解析器。

回归见 [核心测试](../src/batch_wbtest.mbt) 和 [真实 CLI/CI 示例测试](../tests/cli.test.mjs)。验证包括混合 0/1/2、同名文件、CRLF/SHA-256、晚出现的危险文件、50/51 文件、32 MiB 累计上限、特殊字符、不可读输入和报告拒绝覆盖。
