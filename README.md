# MoonLDIF

MoonBit 原生 LDIF 读写与离线结构预检库。

版本：`0.7.0`。新增可复用 JSON 检查配置和每文件变更数量限制；旧 API 和默认 CLI 输出保持兼容。正式发布、注册表安装和公开网页结果以[最新交付状态](https://github.com/WeiR-h/moonldif/blob/main/docs/STATUS.md)为准。报名初审已通过，个人验收和组委会最终结果分别记录。

范围：LDIF 内容与基本变更记录、字节属性、源位置、确定性写回和结构报告。目录 Schema、DN 语义相等、权限及真实服务器执行结果不在检查范围内。

已有 `hbYlj/moonldap` 提供 LDAP 网络与操作模型。本项目补充 LDIF 文件层，不宣称 LDAP 协议能力为原创。依据 RFC 2849 与官方勘误实现，独立参考工具只用于验证。

许可：Apache-2.0。

## 现在能做什么

- 读取目录导出的 LDIF 内容文件，包括中文、二进制属性、多值属性、空值与折行。
- 解析新增、删除、修改、重命名计划；给出错误代码与物理行号，保留修改顺序。
- 检查 DN/RDN 转义和组成，定位原始行；旧分隔空格需显式兼容，名称不自动改写。
- 可分别启用 `--deny-delete`、`--deny-clear`、`--deny-rename`，拦截整条删除、属性清空、改名与移动；错误或不完整结果优先返回 2。
- 使用 `--profile` 复用工作台、CLI 与 CI 的规则，限制变更记录、整条删除和属性清空数量；见[配置说明](docs/PROFILES.md)与[可运行场景](examples/profiles/README.md)。
- 安全整理为新文件：写出后重新读取比较，保留属性字节和操作顺序，拒绝覆盖已有文件。
- 可选接入 `hbYlj/moonldap 0.3.0` 的操作模型，已做离线 BER 编解码往返测试。
- 审阅删除指定值、删除整个属性、清空、替换、移动和控制项；保留操作顺序与位置，不展开属性值。
- 在浏览器中打开文件、定位问题、编辑复检和导出新文件；处理留在本机，过期结果禁止下载；完成的 0/1/2 结果可下载审阅报告，只有 0 可导出整理后的 LDIF。

核心解析、规则、写回、报告和参数判断都用 MoonBit 实现。Node.js 只负责本地文件操作、参数传输、源字节 SHA-256 和进程退出；浏览器负责文件、SHA-256 和下载。规则和报告正文由 MoonBit 生成。Python 只在独立验证或下载测试依赖时使用。

## 核对迁移前后的导出

```text
node dist/moonldif.js compare examples/snapshots/before.ldif examples/snapshots/after.ldif --format markdown
```

预期退出 1，定位缺失条目、缺失邮箱、成员值减少和新增条目。将 after.ldif 换成 reordered.ldif 返回 0，忽略顺序和编码表示变化。浏览器点击“迁移前后核对”可体验同一核心。两侧输入的行号和 SHA-256 随报告保存，不附加属性原值。[比较合同、库 API 与边界](docs/SNAPSHOTS.md)。compare 的 1 表示发现差异；2 表示核对不完整，优先于 1。

排除已经确认不需要核对的易变字段时，可重复使用 `--ignore-attribute modifyTimestamp`。默认不排除；报告保留排除列表及命中次数。工作台支持同样选项，以及差异类型 / DN / 属性查找；显示筛选不会改变下载报告。

## 一次检查多份文件

```text
node dist/moonldif.js batch examples/01-directory-export.ldif examples/02-account-changes.ldif examples/03-migration-plan.ldif --deny-delete --deny-clear --deny-rename --format json
```

此合成例预期返回 1。任一文件错误/不完整优先返回 2，并继续保留其他文件风险。报告包含文件基本名、DN、源字节指纹和逐文件结果；不会读取外部 URL。最多 50 份、单份 8 MiB、累计 32 MiB。详见 [批量说明与库 API](docs/BATCH.md)、[可复用 CI 示例](examples/ci/README.md)。

## 完整审阅与查找

工作台支持全部已识别项目的查找、类型筛选、翻页、跳页和完整报告下载。CLI 使用 `review/compare --page N --query TEXT` 或 `--all`。筛选不改变风险和不完整状态；报告包含 DN，不展开原始属性值。完整输出上限 32 MiB，超过时明确失败。详见[分页及库 API](docs/PAGINATION.md)。

## 安装 MoonBit 库

在自己的 MoonBit 工程执行 `moon add WeiR-h/moonldif@0.7.0`，并在 `moon.pkg` 导入 `"WeiR-h/moonldif" @ldif`。注册表安装验证使用 `python scripts/registry-verify.py --version 0.7.0`，创建没有本地覆盖的独立消费工程。

安装 MoonBit 库不会安装 Node.js CLI。CLI 使用下文的源码构建方式；浏览器工作台另按以下步骤启动。

## 浏览器试用

公开入口：[MoonLDIF 工作台](https://weir-h.github.io/moonldif/)。只部署通过双平台与浏览器 CI 的正式版本；在线版本以页脚和[发布证据](https://github.com/WeiR-h/moonldif/blob/main/docs/STATUS.md)为准。页面提供整条删除、属性清空、改名与移动、不完整输入四类合成示例。

从项目根目录执行以下命令，再打开 `http://127.0.0.1:4178/`：

```text
npm --prefix web ci
npm --prefix web run build
npm --prefix web run preview
```

默认合成示例展示删除拦截。点击“定位原文”，修订内容后重新检查；检查完成且策略允许时导出新文件。浏览器入口上限 1 MiB / 10,000 行。详见 [工作台说明](web/README.md) 与 [浏览器验证说明](docs/BROWSER_QA.md)。React 仅负责界面，分析和写回使用同一个 MoonBit 核心。

## 本机立即试用

首次使用请先按下文“从源码构建与验收”克隆并构建。然后在项目文件夹执行：

```text
node scripts/demo.mjs
```

会依次演示目录导出检查、账号删除拦截、迁移计划检查。第二个场景出现退出码 `1` 是预期拦截，演示脚本会判断是否符合预期。三个文件均为人工构造，不是真实企业案例。

```text
node dist/moonldif.js check examples/01-directory-export.ldif
node dist/moonldif.js inspect examples/03-migration-plan.ldif --format json
node dist/moonldif.js review examples/02-account-changes.ldif --deny-delete --deny-clear --format markdown
node dist/moonldif.js check examples/02-account-changes.ldif --deny-delete
node dist/moonldif.js format examples/01-directory-export.ldif --output normalized.ldif
```

最后一个命令要求 `normalized.ldif` 尚不存在。路径包含空格时使用引号。`inspect` 会显示属性内容；普通 `check` 只显示统计和诊断。

| 退出码 | 解释 |
|---|---|
| 0 | 支持范围内检查完成，启用的策略未拦截 |
| 1 | 检查完成，启用的风险策略拦截 |
| 2 | 输入或运行错误，或存在未能完整分析的结构/外部值；优先于 1 |

**检查通过不等于服务器能成功导入。** DN/RDN 字符串语法已检查；目录 Schema、名称匹配语义、权限、服务端状态和控制语义未检查。URL 引用绝不读取，会使结果为 incomplete。详见 [支持矩阵与边界](docs/SUPPORT.md)。

## 从源码构建与验收

需要 Node.js 24 和官方 MoonBit 工具链。本轮验证版本为 `moonc v0.10.11+6ff76a5f9`，其他工具链版本暂未验证。新机器按 [MoonBit 官方工具链说明](https://docs.moonbitlang.com/en/latest/toolchain/moon/index.html) 安装，并将 `moon` 加入 PATH，或设置 `MOON_HOME`。

```text
git clone https://github.com/WeiR-h/moonldif.git
cd moonldif
npm run build
npm test
npm run verify
```

核心与 CLI 无需安装 npm 依赖；浏览器工作台的依赖由 `web/package-lock.json` 固定。`verify` 包含格式、类型、JS / Wasm GC 两个目标的核心回归测试、构建、CLI 集成测试和三个场景；实际输出与时间记录在 `verification/local/`。[远端双平台 CI](https://github.com/WeiR-h/moonldif/actions/workflows/ci.yml) 已执行通过，另包含工作台构建、归档公共 API、独立参考和生态适配验证；对应提交和完整证据见 [公开交付记录](docs/PUBLICATION.md)。

本机使用忽略提交的 `.local-toolchain.json` 指向已有 MoonBit 工具链；它不是项目源代码依赖。换机器时安装工具链即可，不需要 MoonAPI Check 工程。

## 独立对照与生态适配

需要 Python 3.10+。首次运行会下载固定版本的公开参考源码/包归档并检查 SHA-256；都存于忽略提交的本地目录，不会打开 LDIF 中的 URL。

```text
python scripts/reference-verify.py
python scripts/snapshot-verify.py
python scripts/openldap-verify.py
python scripts/sdk-verify.py
python scripts/rfc-verify.py
python scripts/package-verify.py
node scripts/benchmark.mjs
python scripts/prepare-moonldap.py
node scripts/test-moonldap.mjs
```

Python 对照覆盖七组内容数据和一组 modify 顺序；新增 Java/JDK 17+ 的 SDK 对照覆盖四类变更等 27 组输入，其中一组的 SDK 输出需显式转换扩展语法，其余 26 组三个方向直接通过。七个 RFC 示例分别记录原刊与修订结果，外部值不记为完整通过。详见 [互操作证据](docs/INTEROPERABILITY.md) 和 [规范覆盖表](docs/CONFORMANCE.md)。moonldap 适配另有三个测试：四种实际模型及 BER 往返、拒绝不支持的输入、拒绝新增风险策略拦截的报告。适配是单独的本地工作区，普通核心构建不下载这些依赖。

## MoonBit 库接口

dev.4 增加 [OpenLDAP 原始测试样本验证](docs/OPENLDAP.md)：六份固定文件不做修订，四份在显式 `--compat` 下通过独立 Python 三方向对照，两份保留拒绝和写出阻断。此验证发现并修正了未知修改操作被错误解释成替换的审阅问题；不代表支持全部 OpenLDAP 输入或服务器导入。

mooncakes 模块为 `WeiR-h/moonldif`。默认按上面的指定版本从注册表安装；可选 MoonLDAP 适配工作区单独提供实际示例。

`package-verify.py` 将实际发行归档解压到新工作区，以公共 API 在 JS/Wasm GC 两个目标验证字节写回、操作审阅、策略和不完整状态。它没有从注册表下载，不代替 `registry-verify.py` 的注册表安装验收。

```moonbit
let report = @ldif.check_text("version: 1\ndn: cn=Demo\ncn: Demo\n")
println(report.to_text())
if report.exit_code() == 0 {
  let normalized = report.format() // 可抛出 WriteError
  println(normalized)
}
```

公共接口包括 `check(Bytes)`、`check_text(String)`、`parse_dn(String)`、`parse_rdn(String)`、`parse(Bytes)`、`parse_text(String)`、`write(Document)`、`Report::format()`、文本/JSON 报告及 `document_json`。`parse` 只解析结构；`check` 额外检查名称。旧 DN 分隔空格可单独启用 `--legacy-dn-spaces` 并产生警告，详见 [名称检查](docs/NAMES.md)。完整签名见 [公共 API](src/pkg.generated.mbti)。属性原始值用 `Bytes` 存储；源位置与诊断可直接访问。

## 项目资料

- [获奖项目对标与交付目标](docs/AWARD_TARGET.md)：官方依据、实际差距和后续门槛。
- [规范覆盖表](docs/CONFORMANCE.md)：RFC 示例、勘误与限制。
- [支持矩阵](docs/SUPPORT.md)：范围、限制与退出码。
- [变更审阅](docs/REVIEW.md)：操作分类、输出字段、截断与诊断边界。
- [三分钟演示与个人复验](docs/DEMO.md)、[核心实现解释](docs/ARCHITECTURE.md)、[生态互补复查](docs/ECOSYSTEM.md)。
- [三个使用场景](docs/SCENARIOS.md)：用户问题、输入、操作、预期结果。
- [交付状态](docs/STATUS.md)：完成、验证和未完成事项。
- [风险策略与报告](docs/RISK_POLICY.md)、[初审后计划](docs/POST_REVIEW_PLAN.md)、[最终验收对照表](docs/ACCEPTANCE.md)。
- [来源声明](THIRD_PARTY.md)、[变更记录](CHANGELOG.md)、[许可证](LICENSE)。
