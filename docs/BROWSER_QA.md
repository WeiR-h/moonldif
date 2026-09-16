# 浏览器验证

执行 `node scripts/browser-verify.mjs` 验证生产预览的 `/moonldif/` 子路径；执行 `node scripts/browser-verify.mjs https://weir-h.github.io/moonldif/` 验证公开页面。先构建 CLI 与工作台；测试依赖为锁定的 Playwright，浏览器可用 `node web/node_modules/playwright/cli.js install chromium firefox` 安装。

- Chromium、Firefox 桌面：打开 CRLF 文件、实际字节指纹、策略切换、准确源行定位、编辑后旧结果失效、0/1/2 报告、Markdown 转义、隐私属性值省略、导出 LDIF 后 CLI 重新解析比较。
- 390 × 844 手机尺寸：布局无横向溢出，截图人工检查；不称作手机真机验证。
- 超限文件、无效 UTF-8 拒绝；Chromium 另注入延迟旧响应和 20 秒 Worker 超时，验证无可用旧导出按钮。
- 网络只允许同源静态资源 GET，无业务上传接口。截图和文件均使用合成资料。

测试发现 CRLF 文件的 textarea 选择偏移，已改为按 DOM 编辑器换行计算选区，同时保持分析字节不变。本机 Firefox 沙箱限制曾导致启动失败，授权环境下通过；Firefox 关于同步滚动的 scroll-linked positioning 提示保留为已解释警告，不隐藏应用错误。

本轮未列出 Browser 技能，采用常规 Playwright 覆盖指定浏览器矩阵。结果、请求记录和截图位于 verification/local/browser-local 或 browser-public；公开证据快照与 CI 链接见验收对照表。
