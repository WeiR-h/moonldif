# 工作台验证

Browser plugin not available；使用项目已有 Playwright。生产构建预览地址 http://127.0.0.1:4188/moonldif/ ，桌面 1440×1080、手机尺寸模拟 390×844。

| 检查 | 本地结果 |
|---|---|
| 页面身份、非空、框架错误覆盖层、控制台与资源请求 | Chromium/Firefox 通过；Firefox 已记录滚动定位提示 |
| 原文与本次报告字节指纹一致 | 通过，包含 CRLF |
| 原配置来源与修改后有效规则 | 通过，实际执行页面显示命令核对 |
| 正常、拦截、不完整及迁移排除项 | 通过 |
| 编辑、模式切换、配置错误、取消及超时 | 旧导出失效；连续循环见 local-*-stability.json |
| 手机尺寸无横向溢出 | 模拟通过，不是真机 |

流程：导入合成输入与配置 → 检查 → 下载原文/配置/说明 → 在独立目录执行显示的命令 → 比较完整报告 → 修改配置复检 → 核对新来源指纹的合理差异。

截图：chromium-reproduce-desktop.png、firefox-reproduce-mobile.png。公开网页验证完成后另附 public 证据；本地结果不替代公开交付。

## 公开入口

https://weir-h.github.io/moonldif/ ，页脚及报告版本 0.7.2。Chromium、Firefox 的页面身份、非空、错误覆盖层、控制台、输入/配置/报告下载与真实 CLI 对照均通过。两种引擎各完成 50 次检查/取消，手机尺寸无溢出。原文含属性值，报告与说明不输出原始属性值。

公开 Firefox 最后稳定性阶段首次导航超时；同版本独立重试通过。public-first-attempt.json 保留失败，public-firefox-stability-retry.json 保留重试，public-result.json 明确记录合并依据。键盘展开成功，浏览器拒绝剪贴板时显示可手动复制的反馈，见 public-keyboard.json。

截图为 public-reproduce-panel.png、public-chromium-reproduce-desktop.png 和 public-firefox-reproduce-mobile.png。没有真机、真实 LDAP 写入或第三方用户采用验证；这些不属于自动化结果。
