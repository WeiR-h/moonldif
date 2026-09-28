# 0.7.4 当前验收对照

按提供的九项验收指南核对。声明范围是 LDIF 读写与离线预检，不包含 LDAP 服务器写入、Schema 验证或导入成功保证。

| 要求 | 对应实现及证据 | 核查结果 |
|---|---|---|
| MoonBit 为主要实现，moonc 不低于 0.10.14 | [实现职责及文件清单](IMPLEMENTATION.md)，[实际构建记录](../verification/2026-09-28-v0.7.4/verification.json) | 核心解析、规则、比较、报告与写回均为 MoonBit；固定实际编译器 0.10.14+7d59c7ec9，有最低版本检查 |
| GitHub 公开可访问、提交清晰 | [仓库](https://github.com/WeiR-h/moonldif)、[正式源码](https://github.com/WeiR-h/moonldif/commit/7afc7bb18a71a41ca103e15b13e11fcdbea4e418)、[版本记录](https://github.com/WeiR-h/moonldif/releases) | 公开，按实际功能及修复阶段提交，历史版本保留 |
| 结构清晰、声明核心功能完成 | [架构](ARCHITECTURE.md)、[支持矩阵](SUPPORT.md)、[公共 API](../src/pkg.generated.mbti) | 核心与宿主职责清楚，支持范围内回归通过 |
| README 完整且可复现 | [README](../README.md)、[独立 CLI](CLI-DISTRIBUTION.md)、[注册表安装](../verification/2026-09-28-v0.7.4/registry-0.7.4.json) | 库、CLI、工作台及源码开发入口分开；双平台外部消费通过 |
| CI 覆盖检查、构建、测试 | [工作流](../.github/workflows/ci.yml)、[正式源 CI](https://github.com/WeiR-h/moonldif/actions/runs/36430190061) | Windows/Ubuntu 检查、构建、核心与集成测试和双浏览器验证通过 |
| 至少一个可运行示例 | [三个场景](SCENARIOS.md)、[合成文件](../examples)、[CI 示例](../examples/ci/README.md) | 示例和下载包中的 CI 接入实际运行通过 |
| 测试覆盖核心路径 | [本轮证据](../verification/2026-09-28-v0.7.4/README.md)、[浏览器恢复](../verification/2026-09-28-v0.7.4/BROWSER-QA.md) | 正反例、边界、317 项旧输出对照、独立参照与失败恢复覆盖；不以数量宣称绝无缺陷 |
| 发布 mooncakes.io | [WeiR-h/moonldif 0.7.4](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.4/)、[双平台注册表消费](https://github.com/WeiR-h/moonldif/actions/runs/36431860355) | 公开包可访问；指定版本在独立工程 JS/Wasm GC 安装运行通过 |
| OSI 许可及参考项目合规 | [Apache-2.0](../LICENSE)、[OSI 条目](https://opensource.org/license/apache-2-0)、[来源声明](../THIRD_PARTY.md) | 项目许可及参考来源明确，CLI/网页包含实际打包依赖的许可证 |

九项技术核查未发现未满足项；这不是组委会结论。v0.7.4 网页部署及公开复验进度见 [状态](STATUS.md)，个人完整验收与官方最终结果单独记录。

# 0.7.3 历史验收对照

| 要求 | 对应实现及证据 | 当前状态 |
|---|---|---|
| MoonBit 主要实现，moonc ≥ 0.10.14 | [核心实现分工](IMPLEMENTATION.md)，固定 0.10.14+7d59c7ec9，构建最低版本检查 | 固定编译器的本机及双平台 CI 通过 |
| 公开 GitHub、清晰提交 | [仓库](https://github.com/WeiR-h/moonldif)、[提交](https://github.com/WeiR-h/moonldif/commits/main/) | v0.7.3 已公开推送 |
| 结构清晰、声明功能完成 | [架构](ARCHITECTURE.md)、[支持范围](SUPPORT.md) | 核心回归通过 |
| README 安装、使用、示例可复现 | [README](../README.md)、[CLI](CLI-DISTRIBUTION.md)、[恢复说明](RECOVERY.md) | 本地独立消费通过 |
| CI 检查、构建、测试 | [.github/workflows/ci.yml](../.github/workflows/ci.yml) | [正式标签 CI 全部通过](https://github.com/WeiR-h/moonldif/actions/runs/36410151774) |
| 可运行样例 | [examples](../examples)、[CI 示例](../examples/ci/README.md) | 样例及独立 CLI 通过 |
| 核心测试完整 | JS/Wasm GC、独立对照、两浏览器及失败注入 | [本轮证据](../verification/2026-09-28-v0.7.3/README.md) |
| 发布 mooncakes | `WeiR-h/moonldif` | [0.7.3 已发布](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.3/)，JS/Wasm GC 双平台独立安装通过 |
| OSI 开源许可、来源合规 | [Apache-2.0](../LICENSE)、[来源和许可](../THIRD_PARTY.md)、发行物内运行许可 | 保持并复核 |

最终验收结论由主办方给出。下面保留历史证据。

# 0.7.2 历史验收对照

- 独立 CLI 安装：[快速开始](CLI-DISTRIBUTION.md)、[CI 示例](../examples/ci/README.md)。
- 网页到 CLI 复现：[工作台](https://weir-h.github.io/moonldif/)、[配置合同](PROFILES.md)。
- 核心、基线、参考工具、性能和发布：[证据索引](../verification/2026-09-28-v0.7.2/README.md)。
- 当前发布状态：[STATUS](STATUS.md)。个人操作验收在仓库外清单中记录，不由自动化代替。

# 0.7.1 历史验收对照

- 新增 API、错误代码及恢复合同：[配置说明](PROFILES.md)。
- 核心、317 组版本兼容、独立对照、性能与发布：[证据](../verification/2026-09-27-v0.7.1/README.md)。
- 公开工作台、键盘/错误恢复、下载与 CLI 一致性：[浏览器 QA](../verification/2026-09-27-v0.7.1/BROWSER-QA.md)。
- 本人验收：仓库外 0.7.1 清单，待本人执行；演示录制、真实反馈与组委会结论分别记录。

# 0.7.0 历史验收对照

| 验收项 | 证据 |
|---|---|
| 配置合同、数量规则与库复用 | [PROFILES.md](PROFILES.md)、[核心](../src/profile.mbt)、[三种场景](../examples/profiles/README.md) |
| 旧输出兼容、独立对照与性能 | [306 组对照及实测](../verification/2026-09-24-v0.7.0/README.md)、[性能记录](PERFORMANCE.md) |
| 双平台、发行、独立注册表安装 | [完整发布链](../verification/2026-09-24-v0.7.0/README.md) |
| 在线操作和失效恢复 | [工作台](https://weir-h.github.io/moonldif/)、[公开 QA](../verification/2026-09-24-v0.7.0/BROWSER-QA.md) |
| 开源与来源 | [Apache-2.0](../LICENSE)、[THIRD_PARTY.md](../THIRD_PARTY.md) |
| 本人验收与演示 | 仓库外 0.7.0 个人验收清单，待本人执行；[演示脚本](DEMO.md) |

工程交付已完成，个人/第三方/组委会结果继续分别记录。

# 0.6.0 历史验收对照

| 验收项 | 可复核入口 |
|---|---|
| 全量查找、分页、完整报告 | [接口说明](PAGINATION.md)、[MoonBit 核心](../src/pagination.mbt)、[尾部合成示例](../examples/complete-review/README.md) |
| 风险与旧接口兼容 | [正式源 Windows / Ubuntu CI](https://github.com/WeiR-h/moonldif/actions/runs/35702850428)、[旧输出对照](../verification/2026-09-22-v0.6.0/compatibility.json) |
| 性能与资源限制 | [配对测量](PERFORMANCE.md)、[分页集成验证](../tests/pagination.test.mjs) |
| 公开工作台及失效恢复 | [在线入口](https://weir-h.github.io/moonldif/)、[双浏览器 QA](../verification/2026-09-22-v0.6.0/BROWSER-QA.md) |
| 正式发行与独立消费 | [发布证据](../verification/2026-09-22-v0.6.0/README.md)、[双平台注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/35703485254) |
| 开源与来源 | [Apache-2.0](../LICENSE)、[来源声明](../THIRD_PARTY.md) |
| 个人验收及演示 | 仓库外 0.6.0 的 15 分钟清单，待本人执行；[三分钟脚本](DEMO.md) |

工程交付完成；个人验收、第三方真实反馈、组委会最终验收及奖项分别记录，尚未完成的项目不以自动化验证代替。

# 0.5.1 历史验收对照

| 验收项 | 可复核入口 |
|---|---|
| 核心与输出兼容 | [正式源 CI](https://github.com/WeiR-h/moonldif/actions/runs/35553887038)、[完整输出对照](../scripts/compatibility-verify.mjs) |
| 性能与读取边界 | [性能实测](PERFORMANCE.md)、[有界读取](../cmd/read-bounded.mjs) |
| 浏览器与重复任务 | [公开验证](../verification/2026-09-21-v0.5.1/BROWSER-QA.md)、[工作台](https://weir-h.github.io/moonldif/) |
| 发行、包及安装 | [发布链与证据](../verification/2026-09-21-v0.5.1/README.md)、[双平台注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/35554828779) |
| 开源与来源 | [Apache-2.0](../LICENSE)、[来源声明](../THIRD_PARTY.md) |
| 本人验收与演示 | 仓库外《0.5.1 个人验收与展示》15 分钟清单，待本人执行；[演示脚本](DEMO.md) |

工程交付已完成。本人验收、第三方反馈及组委会最终结果仍待实际执行或收到通知。以下为历史记录。

# 0.5.0 历史验收对照

| 验收项 | 可核对入口 |
|---|---|
| 核心范围及兼容性 | [snapshot.mbt](../src/snapshot.mbt)、[公共 API](../src/pkg.generated.mbti)、[范围说明](SNAPSHOTS.md) |
| CLI 与浏览器实用流程 | [CLI](../cmd/moonldif.mjs)、[工作台](https://weir-h.github.io/moonldif/)、[浏览器证据](../verification/2026-09-20-v0.5.0/BROWSER-QA.md) |
| 下载与稳定性 | [固定依赖恢复说明](DEPENDENCY-RELIABILITY.md)、[故障注入](../scripts/test_pinned_download.py) |
| 代码质量与对照 | [双平台正式源 CI](https://github.com/WeiR-h/moonldif/actions/runs/35480884482)、[独立模型](../scripts/snapshot-verify.py) |
| 发布、安装、许可 | [版本证据](../verification/2026-09-20-v0.5.0/README.md)、[Apache-2.0](../LICENSE)、[来源](../THIRD_PARTY.md) |
| 演示与本人验收 | [三分钟脚本](DEMO.md)；仓库外 0.5.0 个人验收清单，待本人执行 |

工程交付已完成，不代表组委会最终验收或获奖。以下是历史验收记录。

# 0.4.0 当前验收对照

| 项目 | 证据 |
|---|---|
| 可复用 MoonBit 核心 | [snapshot.mbt](../src/snapshot.mbt)、[边界测试](../src/snapshot_wbtest.mbt) |
| CLI/浏览器完整体验 | [比较合同及使用说明](SNAPSHOTS.md)、[工作台](https://weir-h.github.io/moonldif/) |
| 独立验证 | [固定种子模型对照程序](../scripts/snapshot-verify.py)、[实际结果](../verification/2026-09-17-v0.4.0/ci-ubuntu-snapshot-reference.json) |
| 精确源码、发行、注册表、Pages | [统一证据入口](../verification/2026-09-17-v0.4.0/README.md) |
| 个人/第三方/最终官方验收 | 仍待实际执行或收到结果，不以 AI 自测代替 |

下面保留此前历史验收记录。

# 0.3.0 历史验收对照

| 交付项 | 实际证据 |
|---|---|
| 批量核心与公共 API | [BatchReview](../src/batch.mbt)、[核心边界测试](../src/batch_wbtest.mbt)、[使用说明](BATCH.md) |
| 实际 CI 接入 | [示例](../examples/ci/README.md)、[报告保存程序](../examples/ci/check-plan.mjs)、[真实文件回归](../tests/cli.test.mjs) |
| 正式源双平台与浏览器 | [CI 35090176346](https://github.com/WeiR-h/moonldif/actions/runs/35090176346) |
| 正式标签及 Pages | [CI 35090424644](https://github.com/WeiR-h/moonldif/actions/runs/35090424644) |
| 指定版本注册表安装 | [CI 35090551586](https://github.com/WeiR-h/moonldif/actions/runs/35090551586)，Windows/Ubuntu、JS/Wasm GC、新 API 通过 |
| GitHub / mooncakes | [v0.3.0 Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.3.0)、[注册表 API](https://mooncakes.io/docs/WeiR-h/moonldif@0.3.0) |
| 同版本公开网页 | [工作台](https://weir-h.github.io/moonldif/)，Chromium/Firefox 下载与 CLI 往返通过 |
| 证据与合成报告 | [0.3.0 快照](../verification/2026-09-16-v0.3.0/README.md) |
| 个人/官方最终验收 | 待参赛者独立操作、待组委会最终结果；不由自测代替 |

以下保留 0.2.0 历史基线，最新发布以本节为准。

# 0.2.0 历史验收对照表

日期：2026-09-16。此表区分代码验证、公开发布、个人验收和组委会验收。

| 交付项 | 可复核入口 | 当前证据 |
|---|---|---|
| 源码与有效历史 | https://github.com/WeiR-h/moonldif | 按真实开发阶段提交；Apache-2.0，来源声明完整 |
| 基线正式发行 | https://github.com/WeiR-h/moonldif/releases/tag/v0.1.0 | 已发布 |
| 基线注册表 | https://mooncakes.io/docs/WeiR-h/moonldif@0.1.0 | 页面可访问，双平台指定安装完成；CI 35083934784 |
| 0.2.0 正式发行 | https://github.com/WeiR-h/moonldif/releases/tag/v0.2.0 | 已发布；正式提交 b3b19b0c95de8cf2358b9a8f0423d36ac7891e3b |
| 0.2.0 注册表 | https://mooncakes.io/docs/WeiR-h/moonldif@0.2.0 | 已发布且页面可访问；[双平台 JS/Wasm GC 注册表 CI](https://github.com/WeiR-h/moonldif/actions/runs/35087330813) 通过 |
| 公开工作台 | https://weir-h.github.io/moonldif/ | 0.2.0 已上线；公开 Chromium/Firefox 流程和下载 CLI 往返通过 |
| 跨平台及浏览器 CI | https://github.com/WeiR-h/moonldif/actions/workflows/ci.yml | [正式提交 CI](https://github.com/WeiR-h/moonldif/actions/runs/35087024388) 与 [标签部署 CI](https://github.com/WeiR-h/moonldif/actions/runs/35087217741) 通过 |
| 三类策略与 201 项后风险 | [策略实现](../src/policy.mbt)、[边界回归](../src/policy_wbtest.mbt) | 本地 JS/Wasm GC、CLI 通过 |
| 报告字节指纹、稳定性与隐私 | [报告实现](../src/review_report.mbt)、[CLI 回归](../tests/cli.test.mjs) | 本地通过；MoonBit 生成正文，宿主计算指纹 |
| 浏览器与过期导出保护 | [浏览器回归](../scripts/browser-verify.mjs)、[验证说明](BROWSER_QA.md) | 本地、Ubuntu CI 和公开地址 Chromium/Firefox 通过 |
| 独立对照与生态接入 | [互操作](INTEROPERABILITY.md)、[OpenLDAP](OPENLDAP.md)、[MoonLDAP 适配](../integrations/moonldap) | 本地对照通过，远端继续复核；不连接 LDAP |
| 演示与支持边界 | [三分钟演示](DEMO.md)、[支持范围](SUPPORT.md) | 演示步骤已更新；尚未录制视频 |
| 初审通知 | 参赛者提供，原文在仓库外 | 初审通过；不代替最终验收 |
| 个人验收/真实反馈 | 仓库外个人验证资料 | 待参赛者独立执行；暂无第三方试用 |
| 最终验收、奖金、优秀项目 | 以组委会后续结果为准 | 未确认 |

历史证据不可冒称新版本结果。发布后补充精确提交与 CI 链接，不覆盖原失败记录或改写原申报材料。安装与发布遵循 [MoonBit 官方流程](https://docs.moonbitlang.com/en/latest/toolchain/moon/package-manage-tour.html)，Pages 子路径及产物配置依据 [Vite 官方说明](https://vite.dev/guide/static-deploy.html#github-pages)。

## 最终证据快照

[0.2.0 交付证据](../verification/2026-09-16-v0.2.0/README.md) 包含精确 CI、双平台指定版本安装记录、公开网页请求、合成报告、下载 LDIF 和截图。首次 Pages 部署的环境规则拒绝已记录并修复。原申报材料未覆盖。
