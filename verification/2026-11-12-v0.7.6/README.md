# v0.7.6 兼容维护证据

- 实际工具链：moon/moonrun0.1.20261104，moonc0.10.20+65efd5b93，Node24.13.0，Windows x86_64。
- 官方Windows归档SHA-256与官方校验文件一致。
- 原17阶段核心验证通过，JS与Wasm GC各66项核心测试通过。
- 精确v0.7.4旧源用原工具链重建，317项输出对照通过。
- 新库归档独立公共API消费通过，CLI ZIP独立消费19项通过。
- Pages基路径网页构建通过；MoonLDAP固定依赖四项适配通过（上游弃用警告单独记录）。
- [Windows/Ubuntu与Chromium/Firefox源码CI](https://github.com/WeiR-h/moonldif/actions/runs/43179204727)全部通过。
- [精确标签CI与Pages部署](https://github.com/WeiR-h/moonldif/actions/runs/43181018433)全部通过。
- [双平台注册表精确安装](https://github.com/WeiR-h/moonldif/actions/runs/43181052647)和[公开CLI下载消费](https://github.com/WeiR-h/moonldif/actions/runs/43181058519)通过。本机全新注册表消费也通过JS/Wasm GC。
- 独立参考、72组快照模型、6份OpenLDAP样本、27组SDK、7份RFC与原有规模场景均通过。
- [GitHub Release](https://github.com/WeiR-h/moonldif/releases/tag/v0.7.6)、mooncakes0.7.6和[Pages](https://weir-h.github.io/moonldif/)交付完成；公开网页资源包含0.7.6，指纹见summary.json。
- 正式源：`bf6a69e909489f99d17fa6c25ee2e14b8b81b38d`。公开附件校验值见[发行清单](../distributions.json)。

本机Windows浏览器下载过慢已中止，不将其记为本机浏览器通过。双浏览器功能与手机尺寸模拟证据来自已成功的Ubuntu CI；未进行真机测试。

复现入口见[维护说明](../../docs/MAINTENANCE-2026-11.md)。机器临时路径、账号凭据及个人材料不包含在本轮证据内。
