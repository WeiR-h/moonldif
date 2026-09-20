# 0.5.0 当前验收对照

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
