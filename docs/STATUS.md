# 当前交付状态

2026-09-16：报名初审已通过，依据参赛者提供的组委会通知。最终验收、奖金及优秀项目评选未确认。原申报书和个人联系方式保留在仓库外。

## 已交付基线

[v0.1.0 GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.1.0) 和 mooncakes `WeiR-h/moonldif@0.1.0` 已发布。注册表文档页面已在浏览器查看，显示 0.1.0、Apache-2.0 和公共 API。指定版本在独立消费工程安装成功，Windows/Ubuntu、JS/Wasm GC 全部通过：[注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/35083934784)。证据见 verification/2026-09-16-v0.1.0。

## 0.2.0 候选与发布门槛

新增属性清空、重命名/移动策略、带源字节指纹的 Markdown/JSON 报告和浏览器下载。已完成本地 38 个核心测试（JS/Wasm GC）、10 组 CLI 测试、3 个 MoonLDAP 适配测试，以及独立 Python / SDK / RFC / OpenLDAP 对照。Chromium、Firefox 的打开、编辑、策略、定位、报告下载和 LDIF 往返通过；手机视口并非真机。

0.2.0 正式发布、同版本 Pages 以及注册表双平台复验以 [验收对照表](ACCEPTANCE.md) 的实际证据为准。未达到门槛时继续使用已交付的 0.1.0。

## 保留边界

- 独立 SDK 的扩展语法差异和 RFC 示例修订性质继续单独记录，没有删除不兼容样本。
- 离线有界完整缓冲区，不支持完整流式处理、Schema、服务器写入、自动修复、外部 URL 读取或 DN 语义匹配。
- 无真实企业导入承诺，无其他使用者试用记录；参赛者个人验收待执行。
- 9 月 23 日冻结新增功能，只处理验收阻断问题。
