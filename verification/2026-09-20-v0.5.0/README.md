# MoonLDIF 0.5.0 交付证据

日期：2026-09-20。精确正式源：`0907c053b1c2d44e4b407c06dfe3524e5e886e90`。开发与发布已完成；参赛者个人验收、真实第三方试用和组委会最终验收仍单独等待反馈。

| 项目 | 实际证据 |
|---|---|
| 源码 | [v0.5.0 标签](https://github.com/WeiR-h/moonldif/tree/v0.5.0) |
| 发行 | [GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.5.0) |
| 正式库 | [mooncakes 0.5.0](https://mooncakes.io/docs/WeiR-h/moonldif@0.5.0)，发布返回 200 / exit 0；页面与新增 API 可见，见 registry-page.json |
| 正式源码检查 | [Windows / Ubuntu / 浏览器 CI 35480884482](https://github.com/WeiR-h/moonldif/actions/runs/35480884482) 全部 success |
| 正式标签与部署 | [CI / Pages 35481092716](https://github.com/WeiR-h/moonldif/actions/runs/35481092716) 全部 success |
| 双系统注册表消费 | [35481143767](https://github.com/WeiR-h/moonldif/actions/runs/35481143767) 全部 success；registry-windows.json / registry-ubuntu.json，各 JS / Wasm GC 5 个公共 API 测试 |
| 本机独立安装 | registry-0.5.0.json：临时工程安装精确版本，无 moon.work 或 path 覆盖 |
| 实际在线工作台 | [Pages](https://weir-h.github.io/moonldif/)，public-result.json，Chromium / Firefox、桌面 / 手机尺寸、延迟返回和超时注入通过 |
| 发行包内容 | release-payload-0.5.0.json；237 个文件，2,324,044 字节；排除缓存、工具链、凭据与个人材料 |

发行包 SHA-256：`f2f36beb931ded8c2d75271e72b659874f3d394131d1fce22cf117c731bdb875`，GitHub 附件 digest 一致。

## 四轮结果

1. **比较范围**：默认无排除；明确排除属性描述并在报告披露范围、命中次数。非法选项、不完整输入、重复 DN 仍返回 2；整条增减仍报告。返回 JSON 与原报告隔离，选项去重不再反复线性查找。
2. **审阅流程**：排除项即时使结果失效，按 DN / 属性及类型筛选，明确空列表、截断和下载边界；停止任务阻止旧回调恢复下载。
3. **依赖准备**：临时下载故障最多三次尝试，哈希验证后原子缓存；九组本地故障注入通过，证书与完整性检查未放松。
4. **正式交付**：JS / Wasm GC 各 54 个核心测试、17 组 CLI、36 组输入模型的 72 次完整 / 排除对照；原有 Python / SDK / OpenLDAP / RFC / MoonLDAP 适配通过，并完成正式发布、双系统注册表与公开页面复验。

数量用于定位测试结果，不代替正确性。规模测试为单次观察，不是性能保证。页面与模型均使用合成数据；没有企业采用证据。报告含 DN，指纹不是签名；不读取外部 URL，不检查服务器 Schema / 权限 / 执行结果，不生成执行补丁。

[BROWSER-QA.md](BROWSER-QA.md) 记录具体浏览器流程。开发中的磁盘不足、预览路径错误、CLI 干跑状态异常及 README 历史数量修正见 development-notes.md；失败记录保留，没有通过弱化断言消除失败。已发布标签与注册表包未重写；后续提交仅补充文档证据。
