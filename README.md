# MoonLDIF

MoonBit 原生 LDIF 读写与离线结构预检库。

状态：`0.1.0-dev.1` 本地开发版。已完成第一轮实现，尚未公开发布或提交赛事。开发与验证结果记录在 [交付状态](docs/STATUS.md)。

范围：LDIF 内容与基本变更记录、字节属性、源位置、确定性写回和结构报告。目录 Schema、DN 语义相等、权限及真实服务器执行结果不在检查范围内。

已有 `hbYlj/moonldap` 提供 LDAP 网络与操作模型。本项目补充 LDIF 文件层，不宣称 LDAP 协议能力为原创。依据 RFC 2849 与官方勘误实现，独立参考工具只用于验证。

许可：Apache-2.0。

## 现在能做什么

- 读取目录导出的 LDIF 内容文件，包括中文、二进制属性、多值属性、空值与折行。
- 解析新增、删除、修改、重命名计划；给出错误代码与物理行号，保留修改顺序。
- 运行 `--deny-delete`，在导入前发现删除整条记录的计划并返回非零退出码。
- 安全整理为新文件：写出后重新读取比较，保留属性字节和操作顺序，拒绝覆盖已有文件。
- 可选接入 `hbYlj/moonldap 0.3.0` 的操作模型，已做离线 BER 编解码往返测试。

核心解析、规则、写回、报告和参数判断都用 MoonBit 实现。Node.js 只负责读取本地文件、传递参数、写出文件和设置进程退出码。Python 只在独立验证或下载测试依赖时使用。

## 本机立即试用

在这个项目文件夹打开终端。当前机器已构建好 `dist`，可直接运行：

```text
node scripts/demo.mjs
```

会依次演示目录导出检查、账号删除拦截、迁移计划检查。第二个场景出现退出码 `1` 是预期拦截，演示脚本会判断是否符合预期。三个文件均为人工构造，不是真实企业案例。

```text
node dist/moonldif.js check examples/01-directory-export.ldif
node dist/moonldif.js inspect examples/03-migration-plan.ldif --format json
node dist/moonldif.js check examples/02-account-changes.ldif --deny-delete
node dist/moonldif.js format examples/01-directory-export.ldif --output normalized.ldif
```

最后一个命令要求 `normalized.ldif` 尚不存在。路径包含空格时使用引号。`inspect` 会显示属性内容；普通 `check` 只显示统计和诊断。

| 退出码 | 解释 |
|---|---|
| 0 | 支持范围内检查完成，启用的策略未拦截 |
| 1 | 检查完成，删除策略拦截 |
| 2 | 输入或运行错误，或存在未能完整分析的结构/外部值；优先于 1 |

**检查通过不等于服务器能成功导入。** 完整 DN 语法、目录 Schema、权限、服务端状态和控制语义未检查。URL 引用绝不读取，会使结果为 incomplete。详见 [支持矩阵与边界](docs/SUPPORT.md)。

## 从源码构建与验收

需要 Node.js 24 和官方 MoonBit 工具链。本轮验证版本为 `moonc v0.10.11+6ff76a5f9`，其他工具链版本暂未验证。新机器按 [MoonBit 官方工具链说明](https://docs.moonbitlang.com/en/latest/toolchain/moon/index.html) 安装，并将 `moon` 加入 PATH，或设置 `MOON_HOME`。

```text
npm run build
npm test
npm run verify
```

无需安装 npm 依赖。`verify` 包含格式、类型、19 个核心测试、构建、5 组 CLI 集成测试和三个场景；实际输出与时间记录在 `verification/local/`。这是本地结果，GitHub Actions 的 Windows/Ubuntu 配置已准备，但还未在远端运行。

本机使用忽略提交的 `.local-toolchain.json` 指向已有 MoonBit 工具链；它不是项目源代码依赖。换机器时安装工具链即可，不需要 MoonAPI Check 工程。

## 独立对照与生态适配

需要 Python 3.10+。首次运行会下载固定版本的公开参考源码/包归档并检查 SHA-256；都存于忽略提交的本地目录，不会打开 LDIF 中的 URL。

```text
python scripts/reference-verify.py
python scripts/prepare-moonldap.py
node scripts/test-moonldap.mjs
```

参考对照覆盖七组内容数据的三个读写方向和一组 modify 顺序；它不覆盖所有变更类型或真实目录行为。moonldap 适配另有两个测试：四种实际模型及 BER 往返、拒绝不支持的输入。适配是单独的本地工作区，普通核心构建不下载这些依赖。

## MoonBit 库接口

尚未发布到 mooncakes，当前通过本地 `moon.work` 引用模块 `WeiR-h/moonldif`。可选适配工作区提供了实际示例。

```moonbit
let report = @ldif.parse_text("version: 1\ndn: cn=Demo\ncn: Demo\n")
println(report.to_text())
if report.exit_code() == 0 {
  let normalized = report.format() // 可抛出 WriteError
  println(normalized)
}
```

公共接口包括 `parse(Bytes)`、`parse_text(String)`、`write(Document)`、`Report::format()`、文本/JSON 报告及 `document_json`。完整签名见 [公共 API](src/pkg.generated.mbti)。属性原始值用 `Bytes` 存储；源位置与诊断可直接访问。

## 项目资料

- [支持矩阵](docs/SUPPORT.md)：范围、限制与退出码。
- [三个使用场景](docs/SCENARIOS.md)：用户问题、输入、操作、预期结果。
- [交付状态](docs/STATUS.md)：完成、验证和未完成事项。
- [下一轮计划](docs/NEXT.md)：完善为可申报候选的优先顺序。
- [来源声明](THIRD_PARTY.md)、[变更记录](CHANGELOG.md)、[许可证](LICENSE)。
