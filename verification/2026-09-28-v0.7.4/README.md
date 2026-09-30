# v0.7.4 验证记录

固定发行源码：`7afc7bb18a71a41ca103e15b13e11fcdbea4e418`。本轮修复浏览器启动停滞和下载受阻后的恢复流程；MoonBit 核心、公开 API、CLI 参数、报告格式和资源边界保持兼容。

## 核心、兼容与独立消费

- 固定 `moonc v0.10.14+7d59c7ec9`。JS/Wasm GC 各 66 项核心测试、检查、构建和 CLI 回归通过，见 [本机流程](verification.json)。测试数量仅标识本次运行，不代表穷尽证明。
- 冻结 v0.7.3 的 [317 项完整输出对照](compatibility.json)通过。版本归一化仅针对工具元数据，保留输入、写回字节、诊断及顺序。测试程序原有硬编码版本正则漏掉 0.7.4，已修正为按工具字段归一化。
- 独立 Python、快照模型、OpenLDAP、LDAP SDK、RFC 示例与 MoonLDAP 离线适配继续通过。对应 reference JSON 和正式 CI 保留具体输入、预期及局限。
- [库归档消费](package-consumer.json)、[注册表实际安装](registry-0.7.4.json)均在独立工程通过 JS/Wasm GC；注册表没有本地覆盖。[CLI 公开下载消费](cli-consumer.json)只需 Node.js，19 个场景通过。
- SDK 和 Firefox 初次在受限本机进程下启动/读取失败，正常权限的测试进程复验通过；首次失败记录仍保存在本地。故障注入测试和真实本机对话框验证分别记录，见 [浏览器记录](BROWSER-QA.md)。

## 性能

同机、同工具链运行。12 个常规场景每场景独立进程、一次预热、七次测量、三轮交替配对，中位变化 -7.8% 至 +4.3%，见 [原始记录](performance-paired.json)。

完整审阅/比较的 100、1,000、5,000、10,000 项场景覆盖初次分析、尾页、全量搜索及分块导出。首次超过 10% 的四个细分步骤进行三轮复验，保留 [首次基线](pagination-v0.7.4-baseline.json)、[首次候选](pagination-v0.7.4-candidate.json)及 [复验](pagination-v0.7.4-recheck.json)。其中 compare-100 尾页仍有 +11.8% 的配对中位波动，实际单次约 0.5–0.9 毫秒，未将该记录改写为通过。

对此增加每计时块 500 次查询的诊断，减少单次短耗时和调度噪声影响；三轮配对变化约 +0.8%。同时确认编译核心除版本字符串外逐字节相同，归一化 SHA-256 为 `0f3ce6218e12a2f6a4a5abcb9efbd41cd28296ddbc7221e30f44d6e387b49023`。见 [诊断证据](pagination-v0.7.4-tail-diagnostic.json)、[复验程序](paging-recheck-074.py)、[批次诊断程序](tail-diagnostic-074.mjs)。诊断程序首次遗漏桥接要求的指纹参数，修正测试准备后才取得有效测量。没有据此宣称性能提升；内存是前后值而非峰值或泄漏证明。

## 发布与公开复验

- [候选源码 CI](https://github.com/WeiR-h/moonldif/actions/runs/36430190061)通过 Windows、Ubuntu、Chromium、Firefox。
- [正式标签 CI / Pages](https://github.com/WeiR-h/moonldif/actions/runs/36431757755)。
- [双平台注册表安装](https://github.com/WeiR-h/moonldif/actions/runs/36431860355)、[双平台公开 CLI 消费](https://github.com/WeiR-h/moonldif/actions/runs/36431866337)均通过。
- [GitHub v0.7.4](https://github.com/WeiR-h/moonldif/releases/tag/v0.7.4)、[mooncakes 0.7.4](https://mooncakes.io/docs/WeiR-h/moonldif@0.7.4/)已发布。内置浏览器确认注册表显示 `0.7.4 (latest)`。
- [公开附件校验](release-assets.json)：库 ZIP SHA-256 `03a3f65b2edff546fe04a69cba674c759e9d6847afe4ba6b36281314ce229192`；CLI ZIP SHA-256 `dbe00ca21569f80f879f19aa9a5e2f6eb9d0f9069d7082dc16f4ef53b17ffe08`。CLI 内 `BUILD.json` 指向同一干净源码和固定编译器。

Pages 正式构建、Windows/Ubuntu 与浏览器检查均通过。首次部署被环境允许列表拒绝：`v0.7.4` 尚未登记，部署步骤尚未开始；保留 [首次回执](ci074-tag-first-attempt.json)。2026-09-30 补充：精确登记后仅重跑失败任务因历史 Pages 构建产物过期失败；全流程重跑通过，公开工作台显示 0.7.4 并完成默认示例检查。见 [最终部署回执](ci074-pages-completed.json) 与 [过期产物回执](ci074-artifact-expired.json)。

此处只记录工程证据，全部输入为合成数据；不代替个人完整操作、真实使用者反馈或组委会最终结论。
