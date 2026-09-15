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

level 是审阅优先级，不是服务器错误或事故概率。内容文件不会隐式转换成新增操作。

只保存前 200 个审阅项，但继续计算已识别操作的总数并设置 truncated。截断不改变 LDIF 格式检查结果；界面要求分段审阅，不能把列表尾部未显示当作没有其他影响。不完整输入明确标记 analysis_complete=false；已保留的项目不是对全部输入的完整审查。

接口提供 `Review::to_json()` 与 `Review::to_text()`；JSON 中可选 attribute 使用 string/null，index 从 0 开始，行号从 1 开始。现有 Report 也可使用 `to_json(include_review=true)`。
