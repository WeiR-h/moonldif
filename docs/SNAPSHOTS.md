# 迁移前后快照核对

0.4.0 新增只读内容导出比较，适用于迁移前后核对、备份抽查和目录导出漂移检测。示例是合成数据，不表示已有企业使用。

```text
node dist/moonldif.js compare examples/snapshots/before.ldif examples/snapshots/after.ldif --format markdown
node dist/moonldif.js compare examples/snapshots/before.ldif examples/snapshots/reordered.ldif --format json
```

第一条预期返回 1，包含缺失条目、缺失属性、值减少和新增条目；第二条返回 0，证明换行、属性/条目/值顺序和 Base64 表示不影响比较。CLI 输出到 stdout，不自动覆盖或生成 LDIF。

## 明确的比较合同

- 只接收 LDIF 内容导出，不接收 add/delete/modify/moddn 变更计划。每份最多 8 MiB / 10,000 条记录，沿用原始解析器其他限制。
- 使用 LDIF 解码后的 DN 原字符串作为键，包括大小写与转义拼写。没有 Schema 和目录匹配规则时，不声称名称语义相等；DN 改写表现为新增和缺失，不推测重命名。
- 属性名称忽略 ASCII 大小写；分号选项忽略顺序和重复拼写。OID 与别名不互相转换，也不合并语言标签不同的属性。
- 属性值按原始字节和出现次数比较，忽略排列顺序。空值、缺失属性、重复值和大小写不同的值分别处理。二进制字节不会解码成替代字符后比较。
- 不检查导出过滤条件、权限、服务器状态或 LDAP Schema；使用者必须先确认两份导出范围一致。不能把结果作为可执行迁移补丁。

[RFC 4514](https://www.rfc-editor.org/rfc/rfc4514.html) 不规定 DN 的规范字符串表示；DN 相等依赖 distinguishedNameMatch。[RFC 4512](https://www.rfc-editor.org/rfc/rfc4512.html) 定义属性描述及匹配上下文。本项目实现明确的文件比较合同，不代替这些目录语义。

## 退出码与不完整状态

| 退出码 | 含义 |
|---|---|
| 0 | 两份内容完整解析，当前比较规则下未发现差异 |
| 1 | 比较完成，发现差异；不等于破坏性操作或服务器错误 |
| 2 | 输入不可读、超限、解析无效/不完整、变更计划、无效指纹或重复 DN 歧义 |

任一侧无效或不完整时不执行差异比较，避免将未读到的条目误报为删除。重复的精确 DN 只排除对应键，其他明确键继续比较；仍返回 2。所有统计遍历完整受支持输入。旧 API 与默认 CLI 展示前 200 项变化，超过上限明确 truncated=true；0.6.0 新会话 API、分页选项与工作台支持全量查找及完整导出，见 [分页说明](PAGINATION.md)。重复 DN 诊断最多 100 项，另有总数及截断标志。排序使用 MoonBit String 顺序，输出不加入当前时间。

`--compat` 允许缺版本头，`--legacy-dn-spaces` 允许旧 DN 分隔空格并保留警告与原名。三种变更计划风险开关在 compare 下拒绝，避免误以为策略已应用。任何 URL 值保持不完整，不访问外部地址。

## 可复用 MoonBit API

```moonbit
let diff = @ldif.compare_snapshots(before_bytes, after_bytes)
println(diff.exit_code())
println(diff.to_markdown())
```

可选参数 allow_missing_version / legacy_dn_spaces 默认 false；before_sha256 / after_sha256 默认为 None。库使用者可传入基于实际输入字节计算的 SHA-256，格式必须为 64 位小写十六进制。库只校验指纹格式，平台负责计算，指纹不是签名。CLI 和浏览器始终计算实际分析字节的指纹。JSON 包含两侧源长度、指纹、诊断和逐项 before_span/after_span；不包含原始属性值或本机目录。

## 浏览器与演示

进入工作台“迁移前后核对”，加载默认合成示例 → 开始核对 → 定位缺失邮箱的迁移前行 → 下载 Markdown/JSON → 修改后重新核对。每份上限 1 MiB / 10,000 行，独立 Worker，20 秒超时。任一编辑、选项或输入变化立即使旧报告失效；完成的 0/1/2 均可下载报告。浏览器不生成执行补丁。默认合成 CN 的 Base64 表示改变不会报为值变化。

## 验证

核心双目标测试覆盖表示等价、五类差异、值重复次数、二进制、空值、重复 DN、无效/不完整输入和超过 200 项变化。CLI 使用真实文件核对 SHA-256、中文路径、选项误用、超限和稳定性。

`python scripts/reference-verify.py` 后执行 `python scripts/snapshot-verify.py`：使用固定版本 python-ldap 独立写入/解析 36 组固定种子模型，再用 Python Counter 的差集核对 MoonBit 输出。另记录每侧 100/1000/5000 条记录的单次耗时（含 Node 启动，不是吞吐量基准或服务器性能证明）。参考源码不加入项目，实现逻辑没有依赖 Python。
## 显式排除易变属性（0.5.0）

导出时间戳等字段可能每次变化。仅在已确认用途后，显式排除对应的属性描述：

```text
node dist/moonldif.js compare before.ldif after.ldif --ignore-attribute modifyTimestamp --ignore-attribute entryCSN --format markdown
```

MoonBit：`compare_snapshots(before, after, ignored_attributes=["modifyTimestamp", "entryCSN"])`。旧调用保持有效，默认不排除。

可复现实例：将两份输入换成 `examples/snapshots/volatile-before.ldif` 和 `volatile-after.ldif`。默认有 2 项差异；仅排除 `modifyTimestamp` 后仍返回 1 并保留邮箱差异。示例是合成数据。

- 描述按 ASCII 大小写、选项顺序和重复选项规范化；精确匹配整个描述。`mail` 不会排除 `mail;lang-en`；不支持通配符、属性别名或服务端 Schema 推断。
- 最多 64 个描述，每个最多 256 字符。空白、非法描述或 `dn` 返回 2，绝不静默忽略；所有输入仍完整解析，外部值、无效 Base64 和重复 DN 仍会阻止通过。
- 报告 `options.ignored_attributes` 保留规范化去重列表；`excluded_attribute_occurrences` 计数两侧所有已解析条目的命中属性出现次数，包含重复值行与后来排除的重复 DN，**不是忽略了多少差异**。输入不满足比较前提时为 null。
- 整条条目新增或缺失仍会报告；排除所有属性并不隐藏缺失条目。退出 0 只表示在报告注明的比较范围内没有差异。
- JSON 返回独立副本，调用者修改已返回的数组或对象不会改变后续报告与退出码。

工作台提供相同排除功能。修改排除项需重新核对。0.6.0 工作台的差异类型和 DN / 属性查找覆盖全部已知项；默认每页 50 项，不影响总数、退出码或完整下载报告。列表为空不等于无差异。点击“停止核对”会使正在读取或计算的任务失效，旧回调不能重新启用下载。
