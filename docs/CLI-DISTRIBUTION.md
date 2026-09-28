# MoonLDIF CLI 0.7.4

安装 Node.js 24，解压 `moonldif-cli-v0.7.4.zip`，在解压目录打开终端即可运行。无需 MoonBit、npm install 或联网分析文件。

```text
node dist/moonldif.js --version
node dist/moonldif.js --help
node dist/moonldif.js review examples/02-account-changes.ldif --deny-delete --all --format json
node dist/moonldif.js compare examples/snapshots/before.ldif examples/snapshots/after.ldif --all --format markdown
node examples/profiles/check-ci.mjs reports/preflight.json examples/profiles/rules.json examples/profiles/within.ldif
```

退出码：0 为支持范围内完成且通过，1 为风险拦截或发现迁移差异，2 为错误或分析不完整。必须检查退出码；不能只判断是否产生报告。

网页中的“在本机复现”会提供本次输入、配置和命令。将下载的文件放在本目录，使用同版本 CLI 执行。原文含属性值；审阅报告不含原始属性值，但仍包含 DN。原文保存不代表检查通过。整理导出只允许通过的输入，且会重新解析核对。

```text
node dist/moonldif.js format examples/01-directory-export.ldif --output normalized.ldif
```

输出文件必须不存在。CI 辅助脚本以 UTF-8 保存报告，拒绝覆盖已有文件，原样传递 0/1/2。不要依赖 Windows PowerShell 的文本重定向来保持报告编码。多个批次文件的数量限制分别计算，不是总量限制。

先核对发行页的 SHA256SUMS，再解压；BUILD.json 记录来源提交、工具链与每个文件的校验和，指纹不等同数字签名。库开发者应另用 `moon add WeiR-h/moonldif@0.7.4`，本包是编译后的命令行发行物。

源代码与支持范围：https://github.com/WeiR-h/moonldif
