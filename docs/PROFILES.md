# 可复用检查配置（0.7.0 候选）

配置功能尚在验证；当前正式版本以 [交付状态](STATUS.md) 为准。

显式使用本地 JSON 配置，不自动搜索目录，不读取 URL：

```text
node dist/moonldif.js review changes.ldif --profile rules.json --all --format json
node dist/moonldif.js batch a.ldif b.ldif --profile rules.json --format markdown
node dist/moonldif.js compare before.ldif after.ldif --profile rules.json --all --format json
```

`check`、`review`、`format`、`batch` 应用 common / review；`compare` 应用 common / compare。`inspect` 拒绝配置选项。使用配置时，不再接受显式分析开关或 `--ignore-attribute`，以免覆盖关系不明确；展示、分页参数不受影响。不使用配置的接口和默认报告维持原有行为。

```json
{
  "profile_version": 1,
  "common": {"allow_missing_version": false, "legacy_dn_spaces": false},
  "review": {
    "deny_delete": false, "deny_clear": true, "deny_rename": true,
    "limits": {"max_change_records": 100, "max_delete_records": 5}
  },
  "compare": {"ignored_attributes": ["modifyTimestamp"]}
}
```

数字仅为合成演示，不是生产风险建议。缺省布尔值 false、缺省排除数组为空、缺省限制关闭；0 表示不允许。版本和限制使用无符号十进制整数写法，不接受小数或指数形式，避免浮点舍入接受非整数。限制范围 0–2147483647。配置最多 64 KiB UTF-8、嵌套最多 16 层；错误类型、未知字段、重复键（含转义后重复）和不支持版本均返回 2，不回退默认值。

| 限制 | 定义 |
|---|---|
| max_change_records | 所有已解析变更记录数，一个 modify 只计一条 |
| max_delete_records | 整条 delete 记录数，不按 DN 去重 |
| max_clear_operations | modify 中无值 delete / replace 修改组数；一个空字节值仍为有值 |

数量超过阈值才拦截。遍历所有已解析记录，独立于分页、筛选或诊断展示上限。现有 deny 策略继续同时生效，不被较宽的数量限制解除。batch 的限制按文件独立计算（per_file），不提供整个批次的总量保护。内容文件启用变更数量限制返回 2；比较模式不执行 review 段。

错误或不完整返回 2，优先于风险拦截的 1。保留已知越界、计数及首次越界位置。不完整时计数仅为已知下界，不代表没有其他操作。诊断收集达到上限仍返回 2，不据截断后的诊断判定通过。

## 库接口及格式

`parse_profile(Bytes)` 返回不可变 Profile 或 ProfileError；`Profile::to_json()` 返回独立副本。`canonical()` 生成完整配置的规范 JSON，用于保存配置；`effective_json("review"|"compare")` 只包含格式版本、common 和对应模式规则。

新增 `check_with_profile`、`ReviewSession::with_profile`、`SnapshotSession::with_profile`、`BatchReview::with_profile`，不改变 Options / RiskPolicy 的字段要求。`ReviewSession::format()` 继续执行已有写出、重新解析与语义核对，策略未通过不能写出。MoonLDAP 适配接收 `check_with_profile` 的 Report 后同样拒绝非零结果。

配置报告使用格式版本 3；无配置继续使用版本 1/2。报告包含 `profile.applied_section`、`profile.effective`、源配置字节的 `source_sha256`、当前模式规范配置字节的 `effective_sha256`。平台计算哈希，库只验证哈希格式；缺省库哈希为空字符串，不宣称已核对原字节。有效指纹可通过 `effective_json(section).stringify()` 的 UTF-8 字节复算。浏览器手工修改后不再沿用原文件的 source_sha256；其他模式未生效段不参与有效指纹。

`change_limits` 包含 per_file、适用性、计数完整性、已知下界标记及三项 metrics；每项有 actual、limit、规则代码和 first_exceeded_span。未启用的限制为 null。报告不包含原始属性值或配置绝对路径；含目标 DN，不等同匿名报告。完整导出仍受 32 MiB 限制，生成成功后才提供输出；I/O 中断必须检查退出码。

## 工作台

加载配置后，下方选项显示实际生效规则。修改任何规则都会使旧结果和下载失效；修改后的配置标记为已修改，可下载后用于 CLI。错误配置阻止再次检查，需重新加载有效配置或明确停用配置。配置只保留在当前页面，不写入 localStorage。切换模式保留各模式输入与配置，但重新检查后才能下载结果。

配置下载包括两个模式的规则；预检与核对报告各自只展示当前模式实际生效规则。停用配置保留当前手工布尔选项，清除数量限制；核对模式保留当前显式排除项。
