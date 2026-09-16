# 0.2.0 正式交付证据

日期：2026-09-16。正式源提交 `b3b19b0c95de8cf2358b9a8f0423d36ac7891e3b`；GitHub Release、mooncakes 和 Pages 均为 0.2.0。此目录为发布后的证据快照，不改写已发布标签。

- [GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.2.0)，发行归档 157 项，排除工具链、依赖缓存、本机配置和个人申报资料。哈希见 release-payload-0.2.0.json。
- [正式提交 CI](https://github.com/WeiR-h/moonldif/actions/runs/35087024388)，[正式标签及部署 CI](https://github.com/WeiR-h/moonldif/actions/runs/35087217741)：Windows/Ubuntu 和浏览器检查通过。
- [mooncakes API](https://mooncakes.io/docs/WeiR-h/moonldif@0.2.0) 已在浏览器查看，显示 0.2.0、RiskPolicy、ReviewMetadata、review_json、review_markdown 和 Apache-2.0。
- [双平台注册表安装](https://github.com/WeiR-h/moonldif/actions/runs/35087330813) 通过，下载记录确认指定版本，无 moon.work 或本地路径覆盖；JS/Wasm GC 两个目标通过。本机 consumer 中仅测试使用依赖产生 unused_package 提示，保留原日志；库本身禁止警告的检查通过。
- [公开工作台](https://weir-h.github.io/moonldif/) Chromium/Firefox 完整流程与版本核对通过。public-result.json 包含请求列表；只有同源静态 GET，无应用错误或失败 HTTP 响应。Firefox 同步滚动提示保留并解释。下载 LDIF 再由 CLI 比较模型通过。
- 手机尺寸为 390 × 844 桌面浏览器模拟，截图已人工查看，不记作真机。合成数据不记作真实企业用户。

## 发布故障与解决

首次 Pages 部署被环境规则拒绝：默认只有 main，v0.2.0 标签不在允许名单。此前构建和全部测试已通过。仅增加精确 v0.2.0 标签规则，重试失败的部署任务成功，保留 run 35087217741 的失败尝试；没有更改已发布代码或取消验证门槛。以后发布新正式版本时须显式允许对应标签。

浏览器此前 CRLF 源定位错误和环境相关失败保留在相邻 candidate 证据目录，最终回归覆盖修复。个人独立验收、其他用户反馈、最终组委会验收及奖项仍待实际发生。

公开 GitHub Release 附件 SHA-256 已与本机归档核对一致：bacf66f5e6d9c04ab34b2ea1e47032aed2c42b3f46ee94b927895b41f6449c73（1,676,668 字节）。
