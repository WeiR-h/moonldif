# dev.4：上游样本发现的审阅错误修正

2026-09-15，Windows / Node 24.13.0 / MoonBit 0.10.11+6ff76a5f9。本地结果；未公开、未运行远端 CI、未获得主办方验收。

- 核心检查：JS 和 Wasm GC 各 31 个测试、9 组 CLI、格式、类型、构建、三场景通过。
- `openldap-reference.json`：六份原始上游文件与完整配置结果。四份内容文件在显式缺头兼容下通过 Python 三方向对照；两份仍拒绝写出。
- `openldap-review-before-fix.json`：dev.3 的实际错误输出，101/104 行 increment 被解释为 replace；原报告已为 invalid，写出并未放行。此文件作为失败证据保留，不是当前结果。
- `dev4-version-expectation-failure.log`：版本更新后测试仍硬编码旧版本的失败；改为核对当前 package.json，重新运行全部核心验收后通过。
- `browser-qa.json` 和 `browser/`：本轮未知操作—定位—有意修改—复检真实交互，桌面及手机视口截图。没有把 increment → replace 称为语义等价修复。
- `package-consumer.json`：本轮发行归档从独立新工作区通过公共 API 测试；不是 mooncakes 注册表安装。
- `source-manifest.json`：本轮源码与配置哈希。旧快照保持原样。

dev.3 的完整浏览器流程、SDK/RFC 等证据没有复制为本轮复测结果；本轮改变审阅与显示分类，未修改解析和写回规则。发布授权仍待确认。
