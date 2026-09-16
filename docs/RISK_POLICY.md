# 可选风险策略

在 0.2.0 开发版中，`--deny-clear` 拦截 modify 的无值 delete / replace；给定一个空字节值仍是“给定值”，不是清空。`--deny-rename` 拦截 moddn/modrdn 及移动。原 `--deny-delete` 只拦截整条删除。

库入口：`check` / `check_text` 的可选 `risk_policy` 参数接收 `RiskPolicy { deny_clear, deny_rename }`，默认均为 false，原 `Options` 保持不变。`parse` 仍是结构解析入口，不执行新增策略。

策略直接检查全部已解析记录，不依赖 200 项审阅显示上限。命中策略为 1；无效、不完整或诊断上限为 2 优先。Report.format 和 MoonLDAP 适配仍拒绝非零结果。

`review --format markdown` 或 JSON 报告包含源字节 SHA-256、长度、配置、诊断及截断说明。指纹由入口平台计算，仅标识本次字节，不认证作者。公开库调用者须正确提供 ReviewMetadata；不自动校验外部提供的指纹与原文关系。报告不包含原始属性值，仍包含目标 DN。
