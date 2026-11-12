# 2026-11 工具链兼容维护

检查日期：2026-11-12。远端基线提交 `595dea397558137310ce8538f58a5deb08e281bb`，修复版本0.7.6。

## 已验证的环境

- 官方稳定渠道：`https://cli.moonbitlang.com/binaries/latest/`；下载归档对照官方 `.sha256` 一致。
- `moon 0.1.20261104 (940aa18 2026-11-04)`。
- `moonc v0.10.20+65efd5b93 (2026-11-05)`。
- `moonrun 0.1.20261104 (940aa18 2026-11-04)`。
- 本机 Windows x86_64、Node.js24.13.0；正式跨平台结果以本轮CI链接为准。

## 问题与修复

旧源码在当前编译器下出现内建类型 `to_json` 方法缺失，`fmt --check` 也要求更新可选参数、类型名和派生语法。依据[官方更新](https://www.moonbitlang.com/updates)将转换改为 `ToJson::to_json(value)`，并使用官方格式器。新版源最低编译器为0.10.20；旧版0.10.14实测无法识别Int32及新派生语法，因此不继续宣称当前源码支持旧版。

`Report::to_json` 等公共方法仍保留。规则、报告结构、退出码、配置和安全写回合同均保持不变；冻结v0.7.4的317项输出对照已通过，只归一化工具版本信息。

## 验证与复现

安装官方工具链后先运行 `moon version --all`。源码根目录运行：

```text
npm run verify
npm --prefix web ci
npm --prefix web run build
python scripts/package-verify.py
python scripts/package-cli.py
python scripts/cli-consumer.py
```

本地已通过JS/Wasm GC的66项核心测试（每后端）、完整17阶段验证、独立库消费、19项Node-only CLI消费和Pages基路径网页构建。独立参考及浏览器完整结果见本轮证据，未完成项不计为通过。

历史基线使用 `MOONLDIF_BASELINE_MOON_HOME` 指向0.10.14工具链，再运行 `python scripts/baseline-verify.py`；候选继续使用当前工具链。两套工具链不共享标准库目录。

可选MoonLDAP适配仍使用原先锁定的两份哈希校验归档，四项离线适配测试通过；上游旧语法会产生弃用警告，未修改上游归档。项目自己的严格JS/Wasm GC检查维持 `--deny-warn`。

CI固定版本来自 `scripts/toolchain.json`，安装后核对实际moonc完整构建号。每周及手动任务额外检查官方当前稳定渠道，防止后续升级无人发现。CI仍包含Windows/Ubuntu、双浏览器、包消费、独立参考与生态适配。

## 交付状态

本地兼容修复已验证；GitHub CI、注册表、CLI附件与Pages逐项完成后更新[状态](STATUS.md)和[本轮证据](../verification/2026-11-12-v0.7.6/README.md)。此前0.7.5发行事实保留在历史记录中。
