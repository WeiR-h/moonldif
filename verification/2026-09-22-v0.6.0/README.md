# MoonLDIF 0.6.0 验证证据

v0.6.0 工程交付已完成，正式源 `96e5516b3bf9858b117a52fb6d4ea74f9663d565`。个人验收、演示录制、第三方真实反馈及组委会结果仍待实际执行或收到通知。

## 正式发布与复验

| 项目 | 可复核入口 |
|---|---|
| 发行与源码 | [GitHub v0.6.0](https://github.com/WeiR-h/moonldif/releases/tag/v0.6.0) |
| MoonBit 包与 API | [WeiR-h/moonldif@0.6.0](https://mooncakes.io/docs/WeiR-h/moonldif@0.6.0/)，官方页面 HTTP 200，版本及新增公共 API 可见 |
| 正式源双平台、浏览器及 Pages 部署 | [CI 35702850428](https://github.com/WeiR-h/moonldif/actions/runs/35702850428)，全部成功 |
| 独立注册表安装 | [Windows / Ubuntu CI 35703485254](https://github.com/WeiR-h/moonldif/actions/runs/35703485254)，每个平台的 JS / Wasm GC 各 6 项公共 API 测试通过 |
| 公开工作台 | [Pages](https://weir-h.github.io/moonldif/)，0.6.0；[双浏览器 QA](BROWSER-QA.md) |

本机也在新的外部临时工程安装指定版本并运行 JS / Wasm GC，未覆盖为本地依赖。消费工程仅在测试中使用导入，工具链给出 unused_package 警告；实际测试正常执行并通过。测试数量不是正确性的替代证明。

发行文件 `WeiR-h-moonldif-0.6.0.zip` 为 3,287,522 字节；SHA-256：`c25924e0fe2c43615a5a2e53900bfd14b3b901b5533a94a2ed23823c030fb555`。GitHub 资产摘要与本地归档一致。归档固定于正式源，发布后补充的验证收据存于主分支，不改写标签或同版本发行包。

## 回归与性能

- 候选源码 a4e1c4bf719f39935299163fa1f4c8de3db574aa：[Windows / Ubuntu / 浏览器 CI](https://github.com/WeiR-h/moonldif/actions/runs/35702167142) 成功。
- 核心：JS/Wasm GC 各 60 个测试、旧 CLI 与有界读取、5 组完整分页集成用例通过；264 组既有输出与 v0.5.1 对照一致（仅版本元数据归一化）。
- 独立验证：Python、72 组快照模型、6 组 OpenLDAP、27 组 SDK、7 组 RFC 与 3 组 MoonLDAP 往返继续通过。
- 浏览器：Chromium/Firefox 本地实际操作、尾部查找、分页与定位、全量下载、手机尺寸模拟、旧任务回调、超时、各 50 次检查与取消通过；手机视口不是真机，AI 自测不算第三方试用。
- 分页规模：100/1,000/5,000/10,000 条操作和差异，包含实际哈希、传输及报告解析。完整输出上限 32 MiB；超限先丢弃临时输出，再返回错误。
- 性能：首次三轮配对中 compare +19.5%，触发独立三轮复测 -6.8%，未持续越过 10% 门槛。其余场景未超过门槛。首测与复测都保留，RSS 前后值不是峰值。

## 文件说明

verification.json 为本地核心检查；compatibility.json 为完整旧输出对照；*-reference.json 为独立参考对照；package-consumer.json 为本地发行包消费，不能当作注册表安装；browser-result.json 和稳定性记录为本地网页结果；分页性能和配对结果分别保存。所有输入均为合成或已有固定参考样本。

## 开发中解决的问题

手机尺寸的新增停止按钮曾出现溢出，已改为换行。Windows 沙箱下 Java 依赖路径访问与 Firefox 初始化失败，沙箱外重新验证通过；原环境错误不计为通过。磁盘空间不足曾中断一次性能记录，该次不是有效比较，恢复空间后完整重跑。新跨模式保留输入使旧浏览器测试仍读到上一场景，已明确载入合成示例再断言，保留行为本身不回退。

ci-release.json / ci-registry.json 保存最终工作流结果；ci-*-verification.json 为正式源检查；registry-*.json 为实际注册表复验及页面记录。public-* 文件来自公开 Pages，包含双浏览器操作、循环和截图；完整网络清单见 public-browser-result.json。
