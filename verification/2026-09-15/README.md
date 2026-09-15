# 第一轮验证快照

此目录为本地开发验证摘要，不是赛事认可、生产可靠性或未来版本的证明。

- `core-verification.json`：本地验证脚本生成，包含实际命令、退出码、运行环境与时间。
- `reference.json`：独立对照脚本实际生成，固定参考源码提交及 SHA-256，列出八个案例结果。
- `summary.json`：汇总本轮工具输出，记录源码提交、测试结果及未做事项。

对应原始本地日志保存在忽略提交的 `verification/local/`。重新运行 `node scripts/verify.mjs`、`python scripts/reference-verify.py` 和 `node scripts/test-moonldap.mjs` 可产生新记录；可选适配需先运行 `python scripts/prepare-moonldap.py`。

已观测结果：核心 19/19；CLI 5/5；独立对照 8/8；生态适配 2/2；三个场景退出码 0、1、0。详细覆盖限制见 `docs/SUPPORT.md` 和 `docs/STATUS.md`。

未观测结果：远端 CI、真实 LDAP 服务端导入、注册表发布安装、真实企业用户应用以及赛事审核。
