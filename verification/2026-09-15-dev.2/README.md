# 0.1.0-dev.2 本地验证快照

2026-09-15，Windows x64 / Node 24.13.0 / MoonBit 0.10.11+6ff76a5f9。不是远端 CI、发布或赛事审核结果。

- `core-verification.json` 与日志：26 个核心测试分别在 JS 和 Wasm GC 上通过，7 组 CLI 测试、格式、类型、构建及三场景通过。
- `reference.json`：Python 8 组独立对照通过。
- `sdk-reference.json`：SDK 27 组，含一组 SDK 输出需要测试侧扩展转换，不能写成全量直接兼容；已知失败差异单列。
- `rfc-reference.json`：七个官方示例原刊/准备版的预期行为。含外部引用时为 incomplete；样例修订性质、诊断与哈希保留。
- `moonldap.json`：本轮实际离线适配测试命令及输出，两项通过，无 LDAP 连接。
- `performance-before-direct-comparison.json` / `performance.json`：相同合成规模在优化前后的本机观测，含方法和局限，不是峰值内存或通用性能结论。
- `source-manifest.json`：本快照对应的源码文件校验值。后续修改不能沿用本次通过结论。

复验方式及不支持范围见项目 README、CONFORMANCE、INTEROPERABILITY、NAMES 与 PERFORMANCE。第一轮快照单独保留，不覆盖历史。
