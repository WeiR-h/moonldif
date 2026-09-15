# 来源与边界

- 格式依据：RFC 2849 https://www.rfc-editor.org/info/rfc2849/ 及官方勘误 https://errata.rfc-editor.org/search/?rfc_number=2849&presentation=records 。
- 相邻项目：hbYlj/MoonLDAP，Apache-2.0，https://github.com/hbYlj/MoonLDAP ，核查提交 7475db606e5de118896a7c35a0c8c77583a87e59。文件解析核心自行实现，协议模型接入另行注明。
- 独立行为参考：python-ldap 的 ldif 模块。其源码不作为本项目解析器，若运行对照会锁定版本并注明覆盖限制。
- 工程运行脚本参考作者已有 MoonAPI Check 的本地工具链/Node.js 运行方式；不复用 OpenAPI 分析逻辑。
- 示例为人工构造，不是企业用户案例。没有全球首创、官方审核通过或获奖声明。
