# 变更审阅

`Report::review()` 将已识别的操作转换为审阅项，保留记录顺序、modify 子操作顺序、物理行范围、目标 DN 和属性名称。不输出属性原始值或控制值，不连接 LDAP，不更改原解析状态或删除策略。

```text
node dist/moonldif.js review examples/02-account-changes.ldif --deny-delete
node dist/moonldif.js review examples/02-account-changes.ldif --format json
```

示例会列出替换 mail 值集合、删除整个 description 属性、删除 retired 条目。启用删除策略仍返回 1；无效或不完整输入仍返回 2。普通 check 不包含审阅列表，避免默认暴露目标 DN；review 属于主动查看文件细节的命令。

| 类型 | 审阅重点 |
|---|---|
| 添加条目 | 父目录、对象类、必填属性需由目标目录确认 |
| 删除条目 | 目标与恢复方式；不推测控制项或服务器的额外影响 |
| 添加属性值 | 重复值及约束；空添加单独提示可能被拒绝 |
| 删除指定值 | 只请求删除明确给出的值 |
| 删除整个属性 | 没有给定值，意味着请求删除整个属性及其值 |
| 非空替换 | 替换整个值集合，不是追加 |
| 空替换 | 请求清空属性值 |
| 重命名 / 指定新父 DN | 展示新名称、旧 RDN 值保留/删除意图以及目标父 DN |
| 操作控制项 | 显示 OID 与 criticality，不解释控制值 |
| 未知修改操作 | 明确表示效果未分析，不能将 increment 等操作误当作 replace / clear |

level 是审阅优先级，不是服务器错误或事故概率。内容文件不会隐式转换成新增操作。

文本报告显示目标 DN、属性名与给定值数量；网页在属性审阅项中直接显示目标 DN，便于区分批量文件中的同名属性。两种报告都不展开属性值，但 DN 本身可能包含用户数据，分享报告时需自行判断。

只保存前 200 个审阅项，但继续计算已识别操作的总数并设置 truncated。截断不改变 LDIF 格式检查结果；界面要求分段审阅，不能把列表尾部未显示当作没有其他影响。不完整输入明确标记 analysis_complete=false；已保留的项目不是对全部输入的完整审查。

接口提供 `Review::to_json()` 与 `Review::to_text()`；JSON 中可选 attribute 使用 string/null，index 从 0 开始，行号从 1 开始。现有 Report 也可使用 `to_json(include_review=true)`。

## 可下载审阅报告（0.2.0）

`review --format markdown` 与 `review --format json` 新增 `source`（sha256 / byte_length / identity_scope）、`options`、`report_schema_version`、`diagnostics_truncated`；保留原 JSON 字段。CLI text 同样显示输入指纹及选项。`Report::review_json(ReviewMetadata)`、`Report::review_markdown(ReviewMetadata)` 是 MoonBit 公共报告入口。

CLI 指纹针对原文件读入字节（含 CRLF），浏览器针对本次分析的当前编辑内容的 UTF-8 字节；打开文件后未编辑时保持原换行，编辑后使用编辑器实际内容。相同字节、配置和版本得到稳定报告，不含生成时间。宿主计算 SHA-256，核心生成报告正文。

报告仍包含 DN、属性名称、位置、诊断和风险原因；不展开属性字节或原文，不附加文件名或本机路径。Markdown 转义特殊字符。报告中的 DN 也可能识别人，分享前自行检查。完成的成功、拦截、不完整结果均能下载；过期、运行失败、检查中禁止旧报告下载。
