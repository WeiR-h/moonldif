# MoonBit 实现范围

本项目以 MoonBit 实现 LDIF 库及全部分析规则。GitHub 的语言条同时计算浏览器界面和跨平台验证脚本，其 JavaScript 总字节略多，不等于核心分析由 JavaScript 完成。下面按实际执行责任列出来源；没有调整语言识别配置。

| 执行责任 | 实现 |
|---|---|
| 折行、字节值、Base64、记录及变更解析 | `src/lines.mbt`、`src/values.mbt`、`src/parser.mbt` |
| DN/RDN 语法、风险策略、配置及数量限制 | `src/names.mbt`、`src/policy.mbt`、`src/profile.mbt` |
| 审阅、完整遍历、筛选分页、报告分块 | `src/review.mbt`、`src/pagination.mbt`、`src/review_report.mbt` |
| 快照比较、字节语义写回和复检 | `src/snapshot.mbt`、`src/writer.mbt` |
| CLI 参数解释、退出码及平台桥接 | `src/bridge/*.mbt` |
| 文件读写、SHA-256、进程退出 | `cmd/*.mjs` |
| 编辑器、Worker 生命周期、页面交互和保存文件 | `web/src/*.js`、`web/src/*.jsx` |
| 发布/CI/独立验证和浏览器驱动 | `scripts/`、`tests/`，不作为运行时解析器 |

v0.7.3 的 Git 原始文件字节口径：MoonBit 正式实现 144,600 字节、MoonBit 核心测试 47,809 字节；JavaScript/React 正式宿主和界面 75,744 字节、JavaScript 验证及构建脚本 129,959 字节。该统计不包括文档、样式、Python/Java 独立参照、生成产物或依赖，并不宣称这是官方评分方法。完整文件清单见 [统计口径与源文件](../verification/2026-09-28-v0.7.3/implementation-scope.json)。

核心库可独立安装运行在 JS 与 Wasm GC 上；浏览器与 CLI 调用同一个编译核心。固定编译器为 moonc 0.10.14+7d59c7ec9，构建检查最低 0.10.14。具体发布及双平台消费证据见 [验收对照](ACCEPTANCE.md)。
