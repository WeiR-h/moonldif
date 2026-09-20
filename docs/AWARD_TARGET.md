# 2026-09-20 竞争力进展

新增可审计的比较范围与审阅筛选，让迁移核对可排除确认过的噪声且不隐藏输入问题；停止任务、报告隔离、选项去重及依赖故障恢复增强稳定性。[0.5.0 正式交付证据](../verification/2026-09-20-v0.5.0/README.md)已包含双系统 / 双浏览器 / 注册表复验。剩余竞争力缺口是本人验收、真实反馈和展示材料，不能据此承诺奖项。历史规则调研保留原日期，不称作今日再次核实。

# 2026-09-17 竞争力进展

新增迁移前后快照核对，补上“准备变更”和“核对结果”的文件流程。CLI、浏览器与公共库共享 MoonBit 核心；独立模型对照、正式发布和双平台安装已有 [可复验证据](../verification/2026-09-17-v0.4.0/README.md)。当前缺口仍是参赛者独立验收、真实使用者反馈与演示录制；没有官方获奖结论。以下调研保持原核查日期，不将其改称今日重新核实的规则。

# 以实际获奖项目为参照的提升目标

核查日期：2026-09-15。当前目标是把 MoonLDIF 做到具备认真参与优秀项目评选的工程与使用价值；获奖不是可以由本地测试证明的结果。

## 官方规则核对

本次已通过浏览器直接读取[九月章程](https://bxup9uklfcb.feishu.cn/wiki/Dx4Bwd6D1i3GfHkajQCcF7SznEd)，页面标示 9 月 3 日修改。

- 新项目通过验收后进入季度优秀项目评选，与活跃维护项目共同评估。核心维度为完成度、生态贡献和工程质量，章程没有给出可换算的获奖分数线。
- 验收要求 MoonBit 主实现、公开仓库、清晰开发记录、可复现 README、检查/构建/测试 CI、示例、核心测试、mooncakes 发布及 OSI 许可。
- 申报需至少三个完整预期场景和不少于 10 个有效提交；申报书须本人理解并人工撰写，不能用 AI 套话替代。
- 拒绝与维护良好的成熟项目高度重叠且无新增价值的选题。MoonLDIF 必须明确文件层与 moonldap 协议层的互补边界。
- 季度奖允许空缺；名额、奖金和赛程可能调整。九月申报/开发页写至 9 月 24 日 24 点，具体入口与通知仍以赛事群为准。

## 历届参照范围

[2024 官方获奖与开源页面](https://www.moonbitlang.cn/2024-mgpic/)列出了 Mini Moonbit Machine、摩卡猫猫、Segmentation Fault，以及游戏赛道项目。本轮查看了三个编译器仓库，摩卡猫猫的公开说明同时提供多后端运行、分层测试和技术讲解。借鉴点是完整链路、验证分层与解释能力，不能把其赛道评分套到生态库。

[2025 官方游戏获奖页](https://moonbitlang.github.io/MoonBit-Code-JAM-2025/)确认 Matchstick-Man-Battle 一等奖、CyberScavenger 和 Calculus Singularity 二等奖等。本轮检查展示页与可游玩/视频入口，借鉴低门槛体验和具体演示；没有将游戏奖项当作 LDIF 库的获奖依据。

最相关的是[2026 开源生态赛官方名单](https://moonbitlang.github.io/OSC2026/)。名单中四项标示“晋级决赛争夺一、二等奖”，不是已确定一等奖；九项为三等奖。下表基于其公开仓库当前状态，部分仓库已在获奖后继续更新。README 中性能与测试数字只是作者声明，本轮没有执行这些项目来替其认证。

| 官方名单项目 | 名单状态 | 本轮查到的项目形态/参考点 |
|---|---|---|
| [MoUI](https://github.com/wzzc-dev/MoUI) | 一、二等奖决赛候选 | 共享核心与平台适配层；明确正式支持和实验平台 |
| [aitne](https://github.com/Arcelyth/aitne) | 一、二等奖决赛候选 | 从初始化到运行的 CLI，示例与编辑器配套 |
| [MoonFrame](https://github.com/ihb2032/MoonFrame) | 一、二等奖决赛候选 | 实际 CSV 输入到分析和导出的连续工作流 |
| [Frontier Lab](https://github.com/shop1111/FrontierLab) | 一、二等奖决赛候选 | 可复用轨迹模型、诊断、比较及可视化 |
| [tokenizers-moonbit](https://github.com/howtomakeaname/tokenizers-moonbit) | 三等奖 | 加载行业通用文件、与独立实现对照、明确兼容矩阵 |
| [markitdown](https://github.com/ZSeanYves/markitdown) | 三等奖 | CLI/稳定 API、边界声明、带环境信息的性能证据 |
| [moon_graphql](https://github.com/Eisem/moon_graphql) | 三等奖 | parse/validate/print、规范覆盖清单、CI 使用方式 |
| [MoonBit Hex Editor](https://github.com/R00TK17/moonbit-HexEditor) | 三等奖 | 实际文件分析工具、交互与跨平台安装流程 |
| [moonsic](https://github.com/hyl-star/moonsic) | 三等奖 | 可复用中间表示、多个输出格式和应用演示 |
| [linear-algebra](https://github.com/Luna-Flow/linear-algebra) | 三等奖 | 分层 API、后端边界和使用者接入说明 |
| [MoonCharts](https://github.com/pxgt/mooncharts) | 三等奖 | 仓库含多图表算法、边界测试、示例和 web；标准 README 接口返回 404，实际文档名为 README.mbt.md |
| [raft-moonbit / moonraft](https://github.com/moonbitstack/moonraft) | 三等奖 | 上游测试移植清单、差分轨迹、交互故障演示 |
| [MoonMarkMind](https://github.com/Xiao-li-He/MoonMarkMind) | 三等奖 | 核心库与浏览器应用分开，输入到导出的完整体验 |

另外检查了 moon_graphql 的 CONFORMANCE.md、tokenizers 的 gen_parity.py 和 moonraft 的 PORTING.md，确认其对应文件实际存在并含验证结构，而不是只看首页徽章。调研原始文件留在忽略提交的 `verification/local/research`，不复制为本项目实现代码。

## 差距与必须交付的提升

这些是根据证据制定的项目完成目标，不是官方承诺的获奖条件，也不是按现有代码倒推的最低门槛。

| 工作项 | 需要证明的结果 | 本轮开始时的起点 |
|---|---|---|
| 格式正确性 | RFC 2849 支持能力逐项清单；官方示例及变体；两种独立工具对照覆盖内容与四类变更 | 只有 Python 内容及 modify 对照 |
| 名称诊断 | DN/RDN 转义、空根、复合 RDN、OID、位置诊断；不混淆语法与目录匹配语义 | 尚无完整名称语法检查 |
| 可用预检 | 能发现具体导入准备问题，并输出可采取行动的原因；危险删除及不完整结果持续阻断 | 只有删除策略和文件结构诊断 |
| 生态互补 | 可复用文件模型与 moonldap 实际操作映射；保留字节、顺序和控制项边界 | 已有离线四类映射，控制项暂拒绝 |
| 使用体验 | 第三方从真实格式文件开始，完成检查、定位、修订和导出；提供浏览器本地演示及 CLI | 三个 CLI 合成场景，无浏览器体验 |
| 数据和性能证据 | 来源可追溯的公开标准/工具样本、可复验差分、规模测试与内存/时间记录 | 仅小型合成数据和资源上限测试 |
| 多环境工程 | 独立核心至少 JS 与 Wasm-GC 实测；Windows/Ubuntu 远端 CI；正式包与干净安装 | Windows JS 本地通过，CI 仅配置 |
| 交付及解释 | 公开来源/版本/许可证/维护说明；演示材料和核心实现讲解；明确生态差异 | 初版文档已有，尚未公开发布 |

推进顺序：名称诊断及规范清单 → 扩展独立验证/预检 → 浏览器本地工作台和规模证据 → 发布/安装/远端 CI → 根据完成证据复核参赛材料。任何环节失败均保留记录，不把“未测”标成“通过”。

2026-09-15 dev.3 检查点：名称检查、规范覆盖表、第二独立工具对照、七个 RFC 示例、JS/Wasm GC 核心测试、初轮规模优化，以及操作审阅和浏览器本地连续工作流已有实测证据，详见 `STATUS.md`。公开交付、远端 CI、干净安装与第三方试用仍待推进；上述整体目标没有因局部通过而缩减。

## 本次再次查重

`moon search ldif` 与 GitHub `ldif language:MoonBit` 都只返回 bobzhang/ldiff（代码差异工具，与 LDIF 目录格式无关）。这支持继续开发，不证明生态绝对空白。发布与改报前还需核对 moonldap 最新公开能力和新出现的直接同类项目。
