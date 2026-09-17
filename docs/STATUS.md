# 当前交付状态：0.4.0

2026-09-17：迁移前后核对已完成 MoonBit 核心、CLI、浏览器和独立模型验证，并发布 GitHub、mooncakes 与同版本 Pages。精确正式源 affcd7ab5051922de76879f33bb9ed5655fb90b1；双平台 CI/注册表安装与公开 Chromium/Firefox 通过，[完整证据](../verification/2026-09-17-v0.4.0/README.md)。

可展示的连续流程为：变更前预检 → 风险审阅 → 导出内容 → 迁移前后快照核对 → 下载报告。实际迁移由使用者自己的工具完成，MoonLDIF 不执行服务器写入。

49 个核心双目标测试、16 组 CLI 和 36 组独立导出模型对照通过。比较仅做精确 DN/字节合同，不实现 LDAP 名称匹配。初审通知已收到，个人独立验收与最终组委会结果仍待确认；9 月 23 日冻结新增功能安排保留。

# 0.3.0 及此前历史状态

此前正式版本为 **0.3.0**，新增批量预检、MoonBit API 和 CI 接入示例，已完成发布与公开复验。[本轮证据](../verification/2026-09-16-v0.3.0/README.md)。

2026-09-16：报名初审已通过，依据参赛者提供的组委会通知。最终验收、奖金及优秀项目评选未确认。原申报书和个人联系方式保留在仓库外。

## 已交付基线

[v0.1.0 GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.1.0) 和 mooncakes `WeiR-h/moonldif@0.1.0` 已发布。注册表文档页面已在浏览器查看，显示 0.1.0、Apache-2.0 和公共 API。指定版本在独立消费工程安装成功，Windows/Ubuntu、JS/Wasm GC 全部通过：[注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/35083934784)。证据见 verification/2026-09-16-v0.1.0。

## 0.2.0 已完成工程交付

新增属性清空、重命名/移动策略、带源字节指纹的 Markdown/JSON 报告和浏览器下载。已完成本地 38 个核心测试（JS/Wasm GC）、10 组 CLI 测试、3 个 MoonLDAP 适配测试，以及独立 Python / SDK / RFC / OpenLDAP 对照。Chromium、Firefox 的打开、编辑、策略、定位、报告下载和 LDIF 往返通过；手机视口并非真机。

0.2.0 GitHub / mooncakes 已发布，Pages 同版本已上线，Windows/Ubuntu 注册表独立安装及 JS/Wasm GC 运行通过。公开网址 Chromium/Firefox 操作、下载文件 CLI 复核均通过，见 [验收对照表](ACCEPTANCE.md) 和 [证据快照](../verification/2026-09-16-v0.2.0/README.md)。0.1.0 保留为历史正式基线。

## 保留边界

- 独立 SDK 的扩展语法差异和 RFC 示例修订性质继续单独记录，没有删除不兼容样本。
- 离线有界完整缓冲区，不支持完整流式处理、Schema、服务器写入、自动修复、外部 URL 读取或 DN 语义匹配。
- 无真实企业导入承诺，无其他使用者试用记录；参赛者个人验收待执行。
- 9 月 23 日冻结新增功能，只处理验收阻断问题。

## 0.3.0 已完成工程交付

本轮新增批量 CLI、MoonBit BatchReview API 与 CI 接入示例。正式源 54491bb1fa6fbf31e8e2fd2ba400cc0862371900 已完成 GitHub/mooncakes 发布、Windows/Ubuntu 的 JS/Wasm GC 注册表安装和同版本公开网页复验。42 个核心测试、14 组 CLI/CI 回归、全部独立对照与生态适配通过；详细链接和明确边界见 [0.3.0 证据](../verification/2026-09-16-v0.3.0/README.md)。0.1.0 / 0.2.0 历史基线保留。
