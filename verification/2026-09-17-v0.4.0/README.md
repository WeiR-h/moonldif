# MoonLDIF 0.4.0 发布与验收证据

日期：2026-09-17。正式源：`affcd7ab5051922de76879f33bb9ed5655fb90b1`。

| 层次 | 已验证结果 |
|---|---|
| [精确源 CI](https://github.com/WeiR-h/moonldif/actions/runs/35193790150) | Windows/Ubuntu 核心、CLI、独立对照、生态适配以及 Chromium/Firefox 通过 |
| [正式标签及 Pages](https://github.com/WeiR-h/moonldif/actions/runs/35194009327) | 复验后构建、部署成功，精确标签 v0.4.0 获准部署 |
| [注册表安装 CI](https://github.com/WeiR-h/moonldif/actions/runs/35194142676) | Windows/Ubuntu 全新消费工程，精确 0.4.0，无本地覆盖，JS/Wasm GC 各 4 项公共 API 测试通过 |
| [GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.4.0) | 206 文件、2,062,069 字节，公开资产摘要与实际包一致 |
| [mooncakes](https://mooncakes.io/docs/WeiR-h/moonldif@0.4.0) | 发布返回 200，页面实际显示 0.4.0 latest、SnapshotDiff 和 compare_snapshots、Apache-2.0；本机独立安装通过 |
| [公开工作台](https://weir-h.github.io/moonldif/) | 同版本 Chromium/Firefox 真实操作与下载通过，含新核对和原有文件预检 |

发行包 SHA-256：`dce9ce0a0ec44d3bac5edfaf80adfc4990f5e4b0067fbf1531f271164be6926e`。工具链、缓存、凭据、本地配置和个人申报材料排除；所检查的凭据模式无匹配。

49 项核心测试（JS/Wasm GC）、16 组真实 CLI 测试、归档消费工程及原有 Python/SDK/OpenLDAP/RFC/MoonLDAP 对照通过。新增 36 组固定种子模型使用独立 Python LDIF 写入/读取，再用字节 Counter 差集对照；三档规模为每侧 100/1000/5000 条合成记录，耗时含 Node 启动，仅为本次观察，不证明海量数据或服务器性能。

## 浏览器 QA

Browser 插件未提供，采用项目已有 Playwright。公开入口标题、非空内容、无错误覆盖层、资源加载、控制台及真实交互通过；只有同源静态 GET，没有上传请求。Chromium 151 与 Firefox 153 在桌面 1440×1080 和手机尺寸 390×844 检查；手机尺寸不是真机。

核对路径：切换模式 → 合成示例显示四项差异 → 定位邮箱旧行 → 两份本地 CRLF/Base64 文件显示无差异且指纹正确 → 二进制值变化 → Markdown/JSON 下载 → 编辑和选项使旧报告失效 → 外部值返回 2 且不伪造删除 → 大文件/坏 UTF-8 拒绝。注入延迟旧 Worker 和超时均保持旧下载失效。原有 LDIF 导出仍由 CLI 往返核验。

Firefox 的 scroll-linked positioning 警告是原有行号与高亮随 textarea 滚动的提示，定位已验证；其他应用错误及失败资源请求未发现。早期使用 4190 端口时 Firefox 显示 Blocked Page，原始失败记录保留；换回现有 CI 的 4188 后原测试全部通过，没有弱化断言。注册表消费工程的空非测试包产生 unused_package 别名警告，四项真实测试实际执行通过，不记为零警告。

## 边界与后续

DN 精确字符串匹配、属性原始字节多重集合；不声称 LDAP 名称语义相等、重命名识别或服务端导入。两份导出过滤范围由使用者核实；报告包含 DN，不能当匿名数据。最多展示 200 项，但统计完整；歧义与不完整返回 2。

原申报书不改写。个人验收、真实第三方反馈、组委会最终验收与奖项均待实际发生。注册表归档保留发布时文档快照；最新完成状态以 [GitHub STATUS](https://github.com/WeiR-h/moonldif/blob/main/docs/STATUS.md) 为准，文档证据更新不改写正式标签或重复发布同版本。
