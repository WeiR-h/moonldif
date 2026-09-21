# MoonLDIF 0.5.1 验证证据

本轮保留公共接口和输出合同，优化有界读取、折行复制、审阅说明构造与浏览器重复报告传递。

基线是 v0.5.0 精确源码 `0907c053b1c2d44e4b407c06dfe3524e5e886e90`，由同一工具链重新构建。`scripts/baseline-verify.py` 可复现；不使用注册表本地覆盖。

性能使用相同脚本、合成输入和固定指纹，独立进程预热一次再测量七次。批处理测真实 CLI，包含启动和文件 I/O；其子进程内存未测量。其他场景记录 RSS 前后值，不是峰值。

公开发布及安装结果在完成后补充；当前以 [STATUS](../../docs/STATUS.md) 为准。个人独立验收和组委会最终结果仍待确认。

开发失败和环境问题见 [development-notes.md](development-notes.md)。

## 已完成的发布前验证

- [候选源 CI](https://github.com/WeiR-h/moonldif/actions/runs/35553582957)：Windows、Ubuntu、Chromium/Firefox 全部通过。候选源码为 `321e364709a87421590ae30a6e4848452b8b55a6`，后续只补充测量工具选项与发布证据。
- 核心 JS/Wasm GC、17 组 CLI、5 组注入读取回归、228 组完整输出对照通过。未增加或改变公共 MoonBit API。
- Python、Java SDK、OpenLDAP、RFC、72 次完整/排除模型核对及 MoonLDAP 适配全部通过。
- 双浏览器各 50 次真实检查及 50 次取消，延迟旧回调与 20 秒超时验证通过。手机尺寸为桌面浏览器模拟，不是真机。
- 所有配对性能原始读数及触发门槛后的复测均保留；见 [性能说明](../../docs/PERFORMANCE.md)。

正式标签、发行包、注册表与公开工作台证据在发布完成后补充，实时状态以主分支 docs/STATUS.md 为准。
