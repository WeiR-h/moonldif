# 完整审阅与分页（0.6.0）

操作计划和迁移差异均可查找第 201 项之后的内容。“全部”指当前支持范围内已识别的项目；未知语法和服务器行为仍不在保证范围内。

## CLI

```text
node dist/moonldif.js review changes.ldif --page 5 --page-size 50 --format json
node dist/moonldif.js review changes.ldif --query mail --kind attribute-clear --deny-clear --format markdown
node dist/moonldif.js review changes.ldif --all --format markdown
node dist/moonldif.js compare before.ldif after.ldif --query alice --format json
node dist/moonldif.js compare before.ldif after.ldif --all --format json
```

没有新选项时，旧命令及报告格式版本 1 保持前 200 项行为。新选项启用格式版本 2。CLI 页码从 1 开始，默认每页 50，最多 200；越界页为空。`--all` 与分页或筛选选项互斥。

查找 DN 或属性名的字面子串，去掉查询两端空白，ASCII 字母忽略大小写，其余字符原样匹配。查询最多 256 个 UTF-16 单元，不使用正则或 DN 语义归一化。`--kind` 使用报告中的 `code` 或 `all`。无匹配项目不会改变整体风险、差异或不完整状态；错误或不完整仍优先返回 2。

完整报告上限为 32 MiB UTF-8。CLI 先生成完整临时文件，再写标准输出；生成失败返回 2，不输出半份成功报告。最终写出期间的系统 I/O 故障仍可能中断输出，调用方必须检查退出码。

## MoonBit 库

- `ReviewSession::new` 接收字节、原有 Options、RiskPolicy、legacy_dn_spaces 及可选 SHA-256。未提供哈希时 source.sha256 为空字符串；库不计算或认证宿主提供的哈希。
- `SnapshotSession::new` 接收两份字节及原有 compare_snapshots 选项，包括排除属性与两侧哈希。
- 两种会话均提供 `page(PageQuery)`、`exit_code()`、`report(format)`。PageQuery 字段为 offset（从 0 开始）、limit、query、kind；默认构造为 0、50、空串、all。
- `QueryError` 表示非法查询或输出超限。`ReportCursor::next()` 前向返回字符串块，直到 None。调用方先暂存全部块，读到 None 才发布；报错时丢弃暂存内容。超限游标不能继续成功输出。
- 会话拥有本次分析的私有状态，返回 JSON 为独立副本；不缓存其他输入。翻页和报告生成不修改分析状态。

调用示例：`let session = @ldif.ReviewSession::new(input_bytes)`，随后使用 `session.page(@ldif.PageQuery::default())`。两个构造和查询接口均有独立消费工程的 JS/Wasm GC 测试。

## 报告格式版本 2

顶层包含 report_schema_version=2、exit_code、summary、page、items。summary 保留原有源指纹、分析状态、选项和诊断等元数据，不重复携带前 200 项列表。items 沿用原审阅项或差异项字段，并新增稳定的 item_index（从 0 开始）。

page 包含 total_items、matched_items、returned_items、offset、limit、has_more、query、kind、selection。selection=all 导出未经列表筛选的全部已知项目；分页为 page。不完整输入仍保留不完整状态，诊断上限及截断标志保持原有规则。

操作审阅按记录、控制项和修改顺序排列；差异按现有 DN、属性排序。相同输入、选项和版本输出稳定，不加时间戳。报告含目标 DN、属性名称、位置和数量，不含原始属性或控制项字节。

## 浏览器

每页 50 项，支持全量查找、类型筛选、翻页、跳页、定位和完整报告下载。下载不受列表筛选影响，但保留本次风险策略与排除属性。

编辑、策略变化、模式切换、取消或错误会使结果失效。切换模式保留输入和设置，但需重新检查。最多一个活动 Worker；完成分析后保留本次会话供翻页，失效时释放。每次处理仍限 20 秒，每份输入仍最多 1 MiB、10,000 行。只有退出码 0 可以整理写出 LDIF，并继续进行写出复检。
