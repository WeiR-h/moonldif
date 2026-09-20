# 开发阶段记录

2026-09-20，四轮迭代基于 v0.4.0，正式源 0907c053b1c2d44e4b407c06dfe3524e5e886e90。

- 首次写文件时 C 盘剩余空间为 0；仅清理项目内已忽略的旧 cleanroom / npm 缓存和无头测试不需要的 Chromium 完整安装。保留源码、证据、所需 headless shell / Firefox，恢复约 519 MiB。
- 新核心测试首次发现测试预期不符：仅版本头没有记录仍拒绝，Markdown 转义下划线仍保留；修正测试预期，未放松解析规则。所有 54 个核心测试在 JS / Wasm GC 通过，17 组 CLI 通过。
- 属性排除用 36 组固定种子双输入模型分别做全范围与排除范围比较，共 72 次对照；5000 条每侧为单次规模观察，不作性能承诺。
- 第一次浏览器预览进程漏设 PAGES_BASE，资源 404。修复预览环境后原断言全部通过；development-browser.json 使用发布前版本标签 0.4.0，正式 0.5.0 另以 CI / 公开页证据为准。
- 开发者临时诊断脚本最初在静态导入 Playwright 后才设置缓存路径，因而找不到浏览器；改为进程启动前设置环境后定位了上述 404。没有另行下载浏览器或放宽断言。
- nine local download fault-injection tests passed (reset/reuse, partial response, bounded timeout, certificate errors, HTTP classes, hash mismatch, corrupt cache, size/HTTPS limits, atomic-replace failure). Existing pinned dependencies also verified. No actual remote reliability claim.
- moon publish --dry-run 返回服务端 202 Accepted / Dry run completed successfully / No changes were made，包名 WeiR-h/moonldif、版本 0.5.0；CLI 同时以非零退出，按客户端异常保留记录，不将干跑当成发布成功。
- 既有独立 Python、OpenLDAP、Java SDK、RFC、MoonLDAP 离线适配通过。固定上游 async 依赖有编译器警告；本项目核心 deny-warn 通过，不声称第三方依赖零警告。

这是 AI 开发自测记录，不是参赛者个人验收、第三方试用或官方最终验收。

发布后在注册表页面发现 README 的历史测试数量仍写为 49 / 16。main 文档改为不绑定数量的回归范围描述；已发布 0.5.0 包和标签保持不变。实际正式源及 CI 为 54 / 17，安装测试每目标 5 项。此为文档数字修正，不改变已验证功能。
