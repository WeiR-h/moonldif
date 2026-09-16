# MoonLDIF 0.3.0 正式交付证据

正式源提交：`54491bb1fa6fbf31e8e2fd2ba400cc0862371900`。日期：2026-09-16。

| 验证层 | 实际结果 |
|---|---|
| [正式源 CI](https://github.com/WeiR-h/moonldif/actions/runs/35090176346) | Windows、Ubuntu、Chromium/Firefox 全部通过 |
| [正式标签 CI 与 Pages](https://github.com/WeiR-h/moonldif/actions/runs/35090424644) | 双平台、浏览器、构建与部署通过；仅允许精确 v0.3.0 标签 |
| [注册表双平台复验](https://github.com/WeiR-h/moonldif/actions/runs/35090551586) | 指定安装 0.3.0，JS/Wasm GC 公共 API 包含 BatchReview；无本地依赖覆盖 |
| [GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.3.0) | 177 项发行包；1,861,161 字节；公开附件 SHA-256 与本地一致 |
| [注册表文档](https://mooncakes.io/docs/WeiR-h/moonldif@0.3.0) | 浏览器实际显示 0.3.0、BatchReview 八个方法、Apache-2.0 |
| [公开工作台](https://weir-h.github.io/moonldif/) | 0.3.0 的 Chromium/Firefox 操作、报告下载、LDIF 下载后 CLI 往返通过 |

归档 SHA-256：f0c8008f0777f9b7f553e59e5d07a1acd1396fd9666090288a21180fbe60cfdb。

42 个核心测试在 JS/Wasm GC 通过；14 组真实 CLI/CI 集成测试通过。新增覆盖每文件与单独检查完全一致、混合 0/1/2、同名输入序号、CRLF 指纹、50/51 个文件、第 50 份危险操作、32 MiB 累计边界、全部不可读时的选项保留，以及 CI 报告拒绝覆盖。独立 Python / SDK / OpenLDAP / RFC 与 MoonLDAP 适配在完整 CI 继续通过；原有不兼容样例和 SDK 语法差异没有删除。

public-result.json 为公开网址真实自动操作的请求与结果，只有同源静态 GET。Firefox 同步滚动提示继续解释并保留，未发现应用错误或失败资源请求。两张截图人工查看通过；手机尺寸仍是桌面视口模拟。批量功能属于 CLI / 库，网页保持单文件流程。

synthetic-batch-review.* 来自三个已公开合成示例，统一开启三种风险策略，预期整批退出 1。不存在真实客户/第三方使用者验收声明。测试期的 Markdown 断言转义错误已单独保留，修正后全部通过。

随注册表归档发布的 README 保留发布前状态快照；当前交付状态以 [GitHub 状态页](https://github.com/WeiR-h/moonldif/blob/main/docs/STATUS.md) 为准。后续文档证据提交不改写正式标签或重复发布同版本包。

个人独立验收、真实反馈和组委会最终验收及奖项仍待实际发生。原申报书与联系方式保留在仓库外。
