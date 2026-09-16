# 最终验收对照表

日期：2026-09-16。此表区分代码验证、公开发布、个人验收和组委会验收。

| 交付项 | 可复核入口 | 当前证据 |
|---|---|---|
| 源码与有效历史 | https://github.com/WeiR-h/moonldif | 按真实开发阶段提交；Apache-2.0，来源声明完整 |
| 基线正式发行 | https://github.com/WeiR-h/moonldif/releases/tag/v0.1.0 | 已发布 |
| 基线注册表 | https://mooncakes.io/docs/WeiR-h/moonldif@0.1.0 | 页面可访问，双平台指定安装完成；CI 35083934784 |
| 0.2.0 正式发行 | https://github.com/WeiR-h/moonldif/releases/tag/v0.2.0 | 待发布及复验，见后续公开交付记录 |
| 0.2.0 注册表 | https://mooncakes.io/docs/WeiR-h/moonldif@0.2.0 | 待发布、Windows/Ubuntu 安装复验 |
| 公开工作台 | https://weir-h.github.io/moonldif/ | 等待正式标签通过 CI 后部署及公开复验 |
| 跨平台及浏览器 CI | https://github.com/WeiR-h/moonldif/actions/workflows/ci.yml | 发布候选正在远端验证 |
| 三类策略与 201 项后风险 | src/policy.mbt、src/policy_wbtest.mbt | 本地 JS/Wasm GC、CLI 通过 |
| 报告字节指纹、稳定性与隐私 | src/review_report.mbt、tests/cli.test.mjs | 本地通过；MoonBit 生成正文，宿主计算指纹 |
| 浏览器与过期导出保护 | scripts/browser-verify.mjs、docs/BROWSER_QA.md | 本地 Chromium/Firefox 通过；公开地址待复验 |
| 独立对照与生态接入 | docs/INTEROPERABILITY.md、docs/OPENLDAP.md、integrations/moonldap | 本地对照通过，远端继续复核；不连接 LDAP |
| 演示与支持边界 | docs/DEMO.md、docs/SUPPORT.md | 演示步骤已更新；尚未录制视频 |
| 初审通知 | 参赛者提供，原文在仓库外 | 初审通过；不代替最终验收 |
| 个人验收/真实反馈 | 仓库外个人验证资料 | 待参赛者独立执行；暂无第三方试用 |
| 最终验收、奖金、优秀项目 | 以组委会后续结果为准 | 未确认 |

历史证据不可冒称新版本结果。发布后补充精确提交与 CI 链接，不覆盖原失败记录或改写原申报材料。安装与发布遵循 [MoonBit 官方流程](https://docs.moonbitlang.com/en/latest/toolchain/moon/package-manage-tour.html)，Pages 子路径及产物配置依据 [Vite 官方说明](https://vite.dev/guide/static-deploy.html#github-pages)。
