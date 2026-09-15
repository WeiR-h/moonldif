# 0.1.0-dev.3 本地验证快照

2026-09-15，Windows x64 / Node 24.13.0 / MoonBit 0.10.11+6ff76a5f9。不是远端 CI、公开发布或赛事验收结果。

- `core-verification.json` 及日志：30 个核心测试分别在 JS 和 Wasm GC 通过，9 组 CLI 测试、格式、类型、构建及三场景通过。
- `reference.json`、`sdk-reference.json`、`rfc-reference.json`：本轮重新运行。SDK 27 组中一组需显式转换其扩展语法；RFC 的外部引用样例仍为 incomplete。详见各记录，不声称全部直接兼容。
- `moonldap.json`：本轮两项离线适配测试通过，不连接 LDAP。
- `browser-qa.json`：真实 IAB 操作记录，人工编排，不是 CI 自动浏览器测试；`browser/` 为桌面及两个手机视口截图。
- `browser-download.json`：实际下载文件以 CLI 对照完整模型一致；观察下载事件超时，磁盘内容验证是单独证据。
- `web-build.json`：锁定依赖重装与生产构建结果。首次重装因预览服务锁住 Windows 原生模块而失败；停止本项目预览后再复验，不将失败隐去。
- `source-manifest.json`：对应源码及配置 SHA-256；不含依赖、工具链、构建产物或凭据。

dev.2 性能数据保留在其原快照，不冒称本轮重新测试。浏览器处理上限为 1 MiB / 10,000 行，当前只测 IAB 模拟视口。仓库公开、远端 CI、包发布、第三方试用及主办方审核另行记录。
