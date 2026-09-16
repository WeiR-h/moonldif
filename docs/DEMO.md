# 三分钟演示与个人复验（0.2.0）

演示入口：https://weir-h.github.io/moonldif/ 。展示页脚版本；全部示例均为合成资料。检查通过只表示支持范围和已启用策略通过，不代表真实服务器导入成功。

| 时段 | 操作 | 应看到的结果与解释 |
|---|---|---|
| 0:00–0:35 | 选择“整条删除”，点击定位原文 | 默认拦截删除，目标 DN 与位置可核对；LDIF 导出不可用 |
| 0:35–1:05 | 选择“属性清空”，启用拦截属性清空并重新检查 | 无值 replace / delete 被拦截；指定值删除有不同语义 |
| 1:05–1:35 | 为 replace: mail 补一行 mail: demo@example.com，删除整个 delete: description 子操作并重新检查 | 内容已修改时旧报告失效；检查通过后可导出新文件 |
| 1:35–2:05 | 下载 Markdown 或 JSON 报告，展示源指纹、选项、位置 | 没有原始属性值；包含 DN；指纹用于核对内容而非签名 |
| 2:05–2:30 | 选择“改名与移动”启用拦截，再选择“不完整输入” | 分别为策略拦截 1、不完整 2；两者仍可下载报告但不能导出 LDIF |
| 2:30–3:00 | 展示 mooncakes API 页面和以下调用 | 库可直接接入 MoonBit；CLI 和浏览器复用同一核心 |

```moonbit
let report = @ldif.check_text(
  "version: 1\ndn: cn=Demo\nchangetype: modify\nreplace: mail\n-\n",
  risk_policy={ deny_clear: true, deny_rename: false },
)
println(report.exit_code()) // 1
```

CLI 复验：`node dist/moonldif.js check <导出的文件>` 应返回 0，再用 `inspect --format json` 检查语义。PowerShell 用 `$LASTEXITCODE` 查看退出码。

参赛者独立执行以上流程并记录日期、浏览器、实际结果和问题；当前 AI 开发自测不得写成第三方试用。演示脚本是可录制材料，不表示已有演示视频或完成答辩。
