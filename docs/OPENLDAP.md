# OpenLDAP 原始测试样本验证

来源：[OpenLDAP 官方镜像的 tests/data](https://github.com/openldap/openldap/tree/725ae5b0e583a1b2a3c3c445e6d3d45cf9fea972/tests/data)，固定提交 `725ae5b0e583a1b2a3c3c445e6d3d45cf9fea972`，核查于 2026-09-15。六份文件按内容、名称、语言属性、修改、顺序与根 DSE 场景选取；不是完整测试集，也不是企业用户输入。

运行 `python scripts/openldap-verify.py`。首次下载六份数据及上游许可到忽略提交的 `.tools/openldap/`，逐文件核验 SHA-256；数据原文不编辑、不补版本头、不补终止符。独立 Python 参考与原有验证脚本使用同一固定提交及哈希。没有执行 OpenLDAP 二进制、连接目录服务器或打开 LDIF 中的 URL。

| 原始文件 | 记录数 | 默认严格结果 | 显式 --compat | 独立验证与边界 |
|---|---:|---|---|---|
| test.ldif | 19 | 缺头，退出 2 | 完整，退出 0 | 内容、注释、折行，Python 三方向对照 |
| test-ordered.ldif | 19 | 缺头，退出 2 | 完整，退出 0 | 有序内容输入，Python 三方向对照 |
| test-lang.ldif | 1 | 缺头，退出 2 | 完整，退出 0 | 大小写与语言选项，Python 三方向对照 |
| rootdse.ldif | 1 | 缺头，退出 2 | 完整，退出 0 | 空根 DN，Python 三方向对照 |
| test-dn.ldif | 35 | 缺头及不安全明文起始字符，退出 2 | 仍退出 2 | 原始 207/208 行值以 `<` 开头；当前配置要求 Base64；安全写出被阻断 |
| test-modify.ldif | 8 | 缺修改终止符和未知 increment，退出 2 | 仍退出 2 | 保留原始扩展/宽松语法差异；未知操作不能误标成 replace；安全写出被阻断 |

“三方向”分别指：同一原始文件的模型与独立 Python 读取结果比较、MoonLDIF 写出后由 Python 读取、Python 写出后由 MoonLDIF 读取。比较记录与每属性的字节值序列，不借此验证目录 Schema、名称匹配语义或服务端操作成功。

## 本次发现并修复的问题

原始 test-modify.ldif 的 101、104 行包含 increment。dev.3 解析层已返回非零并禁止写出，但审阅层的默认分支错误地把未知操作解释为 replace。dev.4 将未知操作单独归类 `unsupported-modification`，保留源位置和“效果未分析”的说明。

测试覆盖有值/无值的 increment 和未知关键字；浏览器实测确认不完整、禁止导出、定位 4–6 行、编辑后旧结果失效，且只有有意改为受支持操作并复检后才可导出。把 increment 改成 replace 会改变业务含义，不是自动修复建议。

结果与修改前错误证据在 `verification/2026-09-15-dev.4/`。原始拒绝结果保留，不将它们计为兼容通过，也不为了让验证变绿而放宽默认解析。
