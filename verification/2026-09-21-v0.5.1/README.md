# MoonLDIF 0.5.1 正式交付证据

2026-09-21：代码、正式发行、注册表安装和同版本公开网页验证已完成。初审通过按参赛者提供的通知记录；本人独立验收、演示录制、真实第三方试用及组委会最终结论仍待完成或收到结果。

## 可复核的发布链

| 项目 | 实际结果 |
|---|---|
| 正式源码 | `3dbe27b707797f7425895b6c1cc116d3a840f21a`，标签 v0.5.1 |
| Windows / Ubuntu / 浏览器 | [正式源 CI](https://github.com/WeiR-h/moonldif/actions/runs/35553887038) 与 [标签 CI / Pages](https://github.com/WeiR-h/moonldif/actions/runs/35553887067) 成功 |
| GitHub 发行 | [v0.5.1 Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.5.1)，[发行元数据](github-release-0.5.1.json) |
| mooncakes | [WeiR-h/moonldif@0.5.1](https://mooncakes.io/docs/WeiR-h/moonldif@0.5.1)，[页面核对](registry-page.json)，发布返回 200 OK |
| 注册表安装 | [双平台 CI](https://github.com/WeiR-h/moonldif/actions/runs/35554828779)，[Windows](registry-windows.json)、[Ubuntu](registry-ubuntu.json)、[本机](registry-0.5.1.json) |
| 公开工作台 | [Pages](https://weir-h.github.io/moonldif/)，[实际浏览器结果](public-result.json)、[验证说明](BROWSER-QA.md) |

当前 GitHub 发行 ZIP 为 2,810,011 字节，SHA-256 `c2810f0071916e87c2767dd9e10701a96694e48c262cc2cf18f2243c23be01d6`。各版本下载地址、源码与发行包指纹见 [发行清单](../distributions.json)。历史测试结果保留运行时的版本、提交及包标识；当前分支验证见 [CI](https://github.com/WeiR-h/moonldif/actions/runs/35557000611)。

注册表验证均使用仓库之外新建的独立消费工程，无本地依赖覆盖，指定安装 0.5.1；JS 与 Wasm GC 各通过 5 个公共 API 用例，覆盖读写、风险、批处理、快照和排除范围。MoonBit 对只有测试使用的包导入给出 unused_package 警告，测试本身已实际执行并通过，原始输出完整保留。

## 正确性与稳定性

保持公共 API、参数、报告字段、退出码和资源限制。核心 JS/Wasm GC 各 57 个测试、17 组 CLI、5 组可注入读取回归通过；228 组完整输出与 v0.5.0 比较仅归一化版本号，包括诊断顺序、JSON、Markdown 及整理 LDIF。Python、Java SDK、OpenLDAP、RFC、快照模型与 MoonLDAP 对照继续通过。双平台原始结果以 `ci-windows-*` / `ci-ubuntu-*` 保存，不以测试数量代替边界说明。

Chromium / Firefox 公网流程、下载后 CLI 复核、旧任务回调与超时验证通过；两种浏览器分别完成 50 次真实检查和 50 次取消。手机尺寸只是桌面视口模拟。内存观察不是峰值，也不构成无泄漏证明。

## 性能复现与失败记录

基线是 v0.5.0 精确源码 `0907c053b1c2d44e4b407c06dfe3524e5e886e90`，同机同工具链重建。每个场景独立进程，预热一次、测量七次，三轮交替先后顺序；哈希、版本、环境及 RSS 前后值完整保留。真实 CLI 批处理包含启动及文件 I/O，子进程内存未测量。

50 个合成小文件批处理中位耗时约减少 25%；多数核心场景接近原版。check-1000 首轮配对 +11.8%，三对复测 +3.8%，未持续超过 10% 门槛。较慢读数未删除，不宣称普遍提速。见 [性能说明](../../docs/PERFORMANCE.md)、[完整配对](performance-paired.json)、[触发后复测](performance-paired-recheck.json)。

开发失败、环境问题、首次部署和身份问题及其解决均见 [development-notes.md](development-notes.md)。所有示例和浏览器输入为合成数据，不是企业采用或第三方试用记录。
