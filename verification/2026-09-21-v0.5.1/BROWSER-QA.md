# 0.5.1 公开工作台复验

地址 https://weir-h.github.io/moonldif/ ，预期版本 0.5.1。使用已有 Playwright 自动化测试；任务未提供 Browser 插件，保留常规 Playwright 路径说明。注册表页面另由应用内浏览器实际查看。

| 范围 | Chromium 151.0.7922.34 / Firefox 153.0 |
|---|---|
| 打开、策略、定位、编辑复检 | 通过，旧结果失效 |
| JSON / Markdown 下载 | 指纹、特殊字符与属性值省略通过 |
| 整理导出 | 实际下载后 CLI 往返核对通过 |
| 快照比较 | 退出 0/1/2、双输入指纹、位置、排除范围通过 |
| 恢复与资源边界 | 延迟旧响应、检查超时、大文件、无效编码、连续编辑通过 |
| 重复运行 | 每引擎 50 次检查及 50 次取消；仅一个活动 Worker，无旧导出可用 |
| 视口 | 1440×1080 桌面及 390×844 手机尺寸，无横向溢出；未验证真机 |

[完整结果](public-result.json)记录网络请求和错误。请求为同源静态资源及 Worker；没有文件上传请求或运行错误。Firefox 有滚动同步性能提示，行号与高亮跟随文本滚动，原始提示保留，不声称零警告。

[Chromium 循环观察](public-chromium-stability.json)和 [Firefox 循环观察](public-firefox-stability.json)记录耗时及可用的主线程堆数据，不包含 Worker 堆或进程 RSS，也不是峰值或泄漏证明。

[桌面截图](public-chromium-desktop.png)、[手机视口截图](public-chromium-mobile.png)、[风险报告](public-chromium-blocked.md)、[迁移差异报告](public-chromium-snapshot-drift.md)、[整理 LDIF](public-chromium-normalized.ldif)均来自合成测试。
