# 0.7.0 验证证据

2026-09-24：v0.7.0 工程发布与安装复验已完成。个人验收、演示录制、第三方真实反馈与组委会最终结果仍待实际执行或收到通知。

## 正式发行与安装复验

- 正式源：`9c25eecd6ed2759b677dfe4698fe02662879a016`。
- [GitHub v0.7.0](https://github.com/WeiR-h/moonldif/releases/tag/v0.7.0)、[mooncakes 0.7.0](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.0/)、[同版本工作台](https://weir-h.github.io/moonldif/) 已上线。
- [正式标签 CI](https://github.com/WeiR-h/moonldif/actions/runs/36009571956)：Windows、Ubuntu、双浏览器、Pages 构建与部署成功。
- [注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/36010608640)：Windows / Ubuntu 各自在外部临时工程安装精确 0.7.0，并在 JS / Wasm GC 各通过 7 项公共接口用例；没有本地覆盖。本机首轮拉取注册表超过 180 秒超时，保留 [首次记录](registry-local-first-attempt.json)；新建消费工程重试后通过相同注册表复验。
- 官方包页面 HTTP 200，0.7.0 和 Profile / check_with_profile / with_profile 接口可见。消费工程的 unused_package 警告源于仅在测试中使用导入，实际测试已执行通过。
- 公开 Chromium / Firefox 配置、下载和失效恢复复验通过，见 [浏览器 QA](BROWSER-QA.md)。
- 发行 ZIP：3,803,098 字节；SHA-256 `b750be931ccc71cc3a4f3b102163b9ce89dbb3a2ea004ce586d0c06419bbab3f`，GitHub 资产摘要一致。归档固定于正式源；发布后补充收据不改写标签或同版本归档。

## 已执行检查

- JS / Wasm GC 核心各 64 项；CLI、读取边界、分页和 6 组配置集成用例通过。
- 与精确 v0.6.0 比较 306 组输出，覆盖旧默认报告、写出及 v2 分页/完整 JSON、Markdown、text；仅归一化工具版本。
- 独立 Python、72 组快照模型、27 组 SDK、6 组 OpenLDAP、7 组 RFC 通过。MoonLDAP 新增配置超限拒绝，4 项离线映射回归通过。
- 本地 Chromium / Firefox 验证配置加载、6/5 拦截、越界定位、修改为 6 后通过、配置下载、有效指纹、错误配置和慢读取竞态；原有每浏览器 50 次检查/取消与超时继续通过。
- 手机视口为 390×844 模拟，不是真机；自动化验证不算第三方试用。
- 发行包在独立消费工程验证新增 Profile、ReviewSession、SnapshotSession、BatchReview 和 check_with_profile；这一步不是注册表安装。

## 性能解释

同机同工具链与 v0.6.0 交替顺序测量三轮，每场景预热一次、测量七次。大量折行首测 +19.6%，触发三轮独立复验 +2.2%；其余主要场景未持续超过 10% 门槛。首测与复测均保存，不将波动隐藏成普遍提速。

配置规模另覆盖审阅/比较 100、1000、5000、10000 条，计入配置验证、源/配置 SHA-256、传输、分页与报告解析。记录的内存为进程前后 RSS，不是峰值或无泄漏证明。所有性能输入均为合成数据。

## 本轮发现并处理的问题

标准 JSON 数字解析可能舍入非常接近整数的小数；配置层现在检查原始数字写法，只接受无符号十进制整数。v2 Markdown 输出对照曾只因版本字段不同失败，已将这个明确的工具版本字段纳入归一化，不修改诊断或用户数据。上述失败与后续结果不混为同一次通过。

README 中列出的测试用于说明覆盖范围，测试数量不是正确性的替代证明。个人验收、演示录制及官方最终结果仍待实际执行或收到通知。
