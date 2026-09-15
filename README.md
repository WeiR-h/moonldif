# MoonLDIF

MoonBit 原生 LDIF 读写与离线结构预检库。

状态：`0.1.0-dev.3` 本地开发版。已完成核心、互操作、变更审阅和本地浏览器工作台，尚未公开发布或提交赛事。开发与验证结果记录在 [交付状态](docs/STATUS.md)。

范围：LDIF 内容与基本变更记录、字节属性、源位置、确定性写回和结构报告。目录 Schema、DN 语义相等、权限及真实服务器执行结果不在检查范围内。

已有 `hbYlj/moonldap` 提供 LDAP 网络与操作模型。本项目补充 LDIF 文件层，不宣称 LDAP 协议能力为原创。依据 RFC 2849 与官方勘误实现，独立参考工具只用于验证。

许可：Apache-2.0。

## 现在能做什么

- 读取目录导出的 LDIF 内容文件，包括中文、二进制属性、多值属性、空值与折行。
- 解析新增、删除、修改、重命名计划；给出错误代码与物理行号，保留修改顺序。
- 检查 DN/RDN 转义和组成，定位原始行；旧分隔空格需显式兼容，名称不自动改写。
- 运行 `--deny-delete`，在导入前发现删除整条记录的计划并返回非零退出码。
- 安全整理为新文件：写出后重新读取比较，保留属性字节和操作顺序，拒绝覆盖已有文件。
- 可选接入 `hbYlj/moonldap 0.3.0` 的操作模型，已做离线 BER 编解码往返测试。
- 审阅删除指定值、删除整个属性、清空、替换、移动和控制项；保留操作顺序与位置，不展开属性值。
- 在浏览器中打开文件、定位问题、编辑复检和导出新文件；处理留在本机，过期或不完整结果禁止导出。

核心解析、规则、写回、报告和参数判断都用 MoonBit 实现。Node.js 只负责读取本地文件、传递参数、写出文件和设置进程退出码。Python 只在独立验证或下载测试依赖时使用。

## 浏览器试用

从项目根目录执行以下命令，再打开 `http://127.0.0.1:4178/`：

```text
npm --prefix web ci
npm --prefix web run build
npm --prefix web run preview
```

默认合成示例展示删除拦截。点击“定位原文”，修订内容后重新检查；检查完成且策略允许时导出新文件。浏览器入口上限 1 MiB / 10,000 行。详见 [工作台说明](web/README.md) 与 [本轮浏览器验证](verification/2026-09-15-dev.3/browser-qa.json)。React 仅负责界面，分析和写回使用同一个 MoonBit 核心。

## 本机立即试用

在这个项目文件夹打开终端。当前机器已构建好 `dist`，可直接运行：

```text
node scripts/demo.mjs
```

会依次演示目录导出检查、账号删除拦截、迁移计划检查。第二个场景出现退出码 `1` 是预期拦截，演示脚本会判断是否符合预期。三个文件均为人工构造，不是真实企业案例。

```text
node dist/moonldif.js check examples/01-directory-export.ldif
node dist/moonldif.js inspect examples/03-migration-plan.ldif --format json
node dist/moonldif.js review examples/02-account-changes.ldif --deny-delete
node dist/moonldif.js check examples/02-account-changes.ldif --deny-delete
node dist/moonldif.js format examples/01-directory-export.ldif --output normalized.ldif
```

最后一个命令要求 `normalized.ldif` 尚不存在。路径包含空格时使用引号。`inspect` 会显示属性内容；普通 `check` 只显示统计和诊断。

| 退出码 | 解释 |
|---|---|
| 0 | 支持范围内检查完成，启用的策略未拦截 |
| 1 | 检查完成，删除策略拦截 |
| 2 | 输入或运行错误，或存在未能完整分析的结构/外部值；优先于 1 |

**检查通过不等于服务器能成功导入。** DN/RDN 字符串语法已检查；目录 Schema、名称匹配语义、权限、服务端状态和控制语义未检查。URL 引用绝不读取，会使结果为 incomplete。详见 [支持矩阵与边界](docs/SUPPORT.md)。

## 从源码构建与验收

需要 Node.js 24 和官方 MoonBit 工具链。本轮验证版本为 `moonc v0.10.11+6ff76a5f9`，其他工具链版本暂未验证。新机器按 [MoonBit 官方工具链说明](https://docs.moonbitlang.com/en/latest/toolchain/moon/index.html) 安装，并将 `moon` 加入 PATH，或设置 `MOON_HOME`。

```text
npm run build
npm test
npm run verify
```

核心与 CLI 无需安装 npm 依赖；浏览器工作台的依赖由 `web/package-lock.json` 固定。`verify` 包含格式、类型、JS / Wasm GC 两个目标的 30 个核心测试、构建、9 组 CLI 集成测试和三个场景；实际输出与时间记录在 `verification/local/`。这是本地结果，GitHub Actions 的 Windows/Ubuntu 配置已包含工作台构建，但还未在远端运行。

本机使用忽略提交的 `.local-toolchain.json` 指向已有 MoonBit 工具链；它不是项目源代码依赖。换机器时安装工具链即可，不需要 MoonAPI Check 工程。

## 独立对照与生态适配

需要 Python 3.10+。首次运行会下载固定版本的公开参考源码/包归档并检查 SHA-256；都存于忽略提交的本地目录，不会打开 LDIF 中的 URL。

```text
python scripts/reference-verify.py
python scripts/sdk-verify.py
python scripts/rfc-verify.py
python scripts/package-verify.py
node scripts/benchmark.mjs
python scripts/prepare-moonldap.py
node scripts/test-moonldap.mjs
```

Python 对照覆盖七组内容数据和一组 modify 顺序；新增 Java/JDK 17+ 的 SDK 对照覆盖四类变更等 27 组输入，其中一组的 SDK 输出需显式转换扩展语法，其余 26 组三个方向直接通过。七个 RFC 示例分别记录原刊与修订结果，外部值不记为完整通过。详见 [互操作证据](docs/INTEROPERABILITY.md) 和 [规范覆盖表](docs/CONFORMANCE.md)。moonldap 适配另有两个测试：四种实际模型及 BER 往返、拒绝不支持的输入。适配是单独的本地工作区，普通核心构建不下载这些依赖。

## MoonBit 库接口

尚未发布到 mooncakes，当前通过本地 `moon.work` 引用模块 `WeiR-h/moonldif`。可选适配工作区提供了实际示例。

`package-verify.py` 将实际发行归档解压到新工作区，以公共 API 在 JS/Wasm GC 两个目标验证字节写回、操作审阅、策略和不完整状态。它没有从注册表下载，不代替未来的 mooncakes 安装验收。

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
- [下一轮计划](docs/NEXT.md)：完善为可申报候选的优先顺序。
- [来源声明](THIRD_PARTY.md)、[变更记录](CHANGELOG.md)、[许可证](LICENSE)。
