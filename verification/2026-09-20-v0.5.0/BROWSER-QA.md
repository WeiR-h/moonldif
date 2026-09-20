# 0.5.0 公开工作台交互验收

环境：https://weir-h.github.io/moonldif/ 。浏览器：chromium 151.0.7922.34, chromium 151.0.7922.34, firefox 153.0。桌面 1440×1080，手机尺寸 390×844（非真机）。Browser plugin not available; regular Playwright，沿用已授权的跨浏览器回归脚本。

流程：进入迁移核对 → 分析合成快照 → 筛选 Alice 缺失邮箱并定位 → 下载完整报告 → 排除指定属性再核对 → 错误排除 / 外部值仍拒绝 → 停止与编辑使旧报告失效。

| 检查 | 结果 |
|---|---|
| 页面标识及版本 | 标题与页脚 MoonLDIF 0.5.0 通过 |
| 非空与主流程 | 预检及迁移核对正常渲染 |
| 框架错误覆盖层 | 未发现 |
| 控制台和资源 | 无相关应用错误或失败资源；Firefox 同步滚动警告已解释 |
| 截图 | 桌面排除 / 筛选控件可读，手机尺寸无横向溢出 |
| 交互 | 排除、筛选、空列表提示、定位、0/1/2 下载、编辑失效、停止、超时通过 |

筛选后的 JSON 与筛选前完整报告相等；排除 photo 后只在该范围内返回 0，报告披露两侧命中数。排除 dn 返回 2；外部值即使被排除也返回 2。全部请求为同源静态 GET；CSP connect-src none 保留。

执行入口：scripts/browser-verify.mjs 和 scripts/snapshot-browser.mjs。详见 public-result.json、public-chromium-snapshot-filtered.json、public-chromium-snapshot-excluded.json、public-chromium-snapshot-invalid-exclusion.json。截图：public-chromium-snapshot-desktop.png、public-chromium-snapshot-excluded.png、public-firefox-snapshot-mobile.png。

未验证：真实手机、Safari、真实企业目录导入和真实用户使用。仍限制每份浏览器输入 1 MiB / 10,000 行，报告前 200 项；筛选不搜索未保留项。截图使用合成数据。
