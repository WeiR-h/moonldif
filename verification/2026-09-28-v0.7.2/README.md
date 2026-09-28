# 0.7.2 验证证据

2026-09-28：v0.7.2 工程发布、独立消费及公开网页复验完成。固定源码 `cdfede73d8ead0cb6cfaa7459ebdccd7218eb393`。

## 正式交付

- [GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.7.2)、[mooncakes](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.2/)、[工作台](https://weir-h.github.io/moonldif/) 同版本发布。
- [候选 CI](https://github.com/WeiR-h/moonldif/actions/runs/36398302890) 和 [正式标签 CI / Pages](https://github.com/WeiR-h/moonldif/actions/runs/36399492135) 完成 Windows、Ubuntu、双浏览器检查。
- [公开 CLI 双平台消费](https://github.com/WeiR-h/moonldif/actions/runs/36399564496) 验证 SHA-256、干净来源提交及 Node-only 独立运行；[注册表双平台消费](https://github.com/WeiR-h/moonldif/actions/runs/36399560406) 在 JS/Wasm GC 验证公共接口，本机注册表安装也通过。
- 库 ZIP：5,010,729 字节，SHA-256 `92d74094d89565ba77fe712956bc5d6a3f493938da4531a67d66cfd3f217f3fa`。
- CLI ZIP：130,861 字节，SHA-256 `e6ced1dfcb28d8fbc8acbcfc30ee79a605f5a5f04763562f6de15e2c6f3c8af8`。
- 公开 Chromium/Firefox 完成下载、实际执行显示命令、规则与指纹核对，以及 50 次检查/取消。公开首次最后一个 Firefox 阶段在打开网页时网络超时；仅重试该阶段通过，原失败和合并验收结果分别保存。
- Pages 首次因环境尚未登记 v0.7.2 标签被拒；添加该精确标签规则后，仅重试部署成功。Git 推送两次 TLS 握手失败后使用 OpenSSL 且保留证书验证成功，不更改标签内容。

以下保留开发与候选验证过程。

- 新的 CLI ZIP 在独立中文及空格目录中只用 Node.js 运行，通过正常、拦截、不完整、整理、比较、批次及禁止覆盖检查。见 cli-consumer.json。
- 本地 JS/Wasm GC、CLI、读取边界、分页、配置与复现测试通过。冻结 v0.7.1 输出对照通过，见 compatibility.json；仅归一化工具版本。
- 独立 Python、快照模型、OpenLDAP、SDK、RFC 与 MoonLDAP 离线对照通过。
- 本地 Chromium/Firefox 已完成网页下载原文、配置、复现说明及实际执行显示的 PowerShell 命令，核对规则、输入指纹、诊断、顺序和退出码。手机尺寸为模拟，不是真机。
- 浏览器包含每种引擎 50 次检查与取消；主线程内存观察不代表峰值或无泄漏证明。
- 首轮本地预览因缺少 Pages 子路径配置失败；修正预览环境后通过。SDK 首次被本机文件沙箱阻止，允许读取已校验依赖后通过；首轮记录保留。
- 初次远端 CI 的 Windows/Ubuntu 均通过；浏览器新增断言忽略折叠区控件而超时。修正测试定位后重新提交；最终远端结果见以上正式交付链接。
- 性能首轮 12 个场景及 8 个分页场景均保存。折行首轮 +27.2%、10,000 项审阅完整流程 +12.7%，三轮交替顺序复验分别为 -3.9%、+0.7%；没有持续超过 10% 的主要场景退化。RSS 是前后观察值，不是峰值。没有改动核心算法，不宣称性能提升。

所有数据均为合成输入。工程发布、个人操作验收、真实反馈与官方最终结果分别记录。

第二次远端浏览器失败为快速连续下载时未收到下载事件；本机诊断复现 15 次极短间隔点击仅产生 10 次 Chromium 下载事件，间隔后 15 次均完成。回归将独立下载手势间隔设为 250 毫秒，仍逐份核对内容与指纹；见 download-burst-observation.json。
