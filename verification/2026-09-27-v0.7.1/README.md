# 0.7.1 验证证据

2026-09-27：工程发布与独立安装复验已完成。个人验收、真实反馈与官方结果仍待实际执行或收到通知。

## 正式发布与安装复验

- 固定源码 `bf20584b7f6f626655a8fc6682a1b855c0abf0eb`；[GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.7.1)、[mooncakes 0.7.1](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.1/) 与 [Pages](https://weir-h.github.io/moonldif/) 同版本发布。
- [正式版本 CI](https://github.com/WeiR-h/moonldif/actions/runs/36305183485)：Windows、Ubuntu、双浏览器、Pages 构建与部署全部成功。
- [独立注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/36305296213)：两平台均从注册表精确安装 0.7.1，在 JS / Wasm GC 各通过 8 项公共接口测试，包含新增 validate_profile；本机独立安装也通过，没有工作区覆盖。
- mooncakes 页面 HTTP 200，0.7.1、validate_profile 和 ProfileIssue 可见。
- 公开 Chromium / Firefox 完成即时错误、恢复、迟到校验与 CLI 对照；见 [浏览器证据](BROWSER-QA.md)。
- 发布 ZIP 为 4,353,600 字节，SHA-256 `d01e3bce044d450310a820b0a2c26a30260ed3d72b145996e42e4213127efe66`；与 GitHub 资产摘要一致。标签和同版本归档不随发布后文档补充而改写。

- JS / Wasm GC 各 66 项核心测试；CLI、读取边界、分页、配置集成回归通过。
- 与精确 v0.7.0 对照 317 组接口输出，包括原有 v1/v2、配置校验结果与 v3 分页/完整报告，仅归一化工具版本。
- 独立 Python、72 组快照模型、27 组 SDK、6 组 OpenLDAP、7 组 RFC 和 4 项 MoonLDAP 离线对照通过。
- 本地 Chromium / Firefox 验证即时字段错误、键盘恢复、加载失败不可绕过、停用后恢复、模式隔离、来源指纹、旧结果失效与原有 50 次检查/取消。
- 对照 v0.7.0 的 12 场景性能结果见 performance-paired.json；全部未超过 10% 中位退化。内存观察不代表峰值或无泄漏证明。
- 更新旧浏览器测试：非法排除项现在在输入阶段阻止检查；CLI 原有错误报告和退出码仍保持兼容。

所有输入均为合成样例。手机尺寸是模拟，不是真机验证。个人操作验收、演示录制、真实第三方试用与组委会结果仍待实际执行或收到通知。
