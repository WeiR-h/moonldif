# 来源与边界

- 格式依据：RFC 2849 https://www.rfc-editor.org/info/rfc2849/ 及官方勘误 https://errata.rfc-editor.org/search/?rfc_number=2849&presentation=records 。
- 名称依据：RFC 4514 https://www.rfc-editor.org/rfc/rfc4514.html 与 RFC 4512 属性类型语法。旧分隔空格选项是明确声明的有限兼容配置，不是完整旧版标准实现。
- 第二独立参考：Ping Identity / UnboundID LDAP SDK 7.0.5，Apache-2.0（归档 LICENSE.txt 已核对），https://github.com/pingidentity/ldapsdk 。仅测试时下载执行，归档及 SHA-256 固定于 `scripts/sdk-verify.py`；解析实现未移植或封装其代码。Java 测试适配器由本项目编写；SDK 异常及扩展语法差异详见 `docs/INTEROPERABILITY.md`。
- RFC 示例验证：从官方公开文本下载并校验，在本地缓存提取；不将整份 RFC 改标为 Apache-2.0。原刊缺陷和编辑修订分别保存，修订来源/性质逐项说明；不是用户或企业数据。
- 相邻项目：hbYlj/MoonLDAP，Apache-2.0，https://github.com/hbYlj/MoonLDAP ，核查提交 7475db606e5de118896a7c35a0c8c77583a87e59。文件解析核心自行实现，协议模型接入另行注明。
- 实际适配依赖：mooncakes `hbYlj/moonldap 0.3.0`、其依赖 `moonbitlang/async 0.20.3`，均为 Apache-2.0。归档地址和 SHA-256 固定在 `scripts/prepare-moonldap.py`；不复制进本项目提交。模型与 BER 协议能力属于上游，本项目实现 LDIF 到模型的有界映射。
- 独立行为参考：[python-ldap ldif 模块](https://github.com/python-ldap/python-ldap/blob/7ffae5b4f16eed9dae4ed3ab682396cd678acd5d/Lib/ldif.py)，提交 `7ffae5b4f16eed9dae4ed3ab682396cd678acd5d`，SHA-256 `4bfd6cc743c4651e54a7a8e673586ccc42c5c632a0381f4775240aed4d7c080a`。来源许可见 [上游 LICENSE](https://github.com/python-ldap/python-ldap/blob/7ffae5b4f16eed9dae4ed3ab682396cd678acd5d/LICENSE)。其源码不作为本项目解析器，不随本项目提交。验证仅覆盖内容读写与 modify 回调；没有把参考实现的宽松 Base64 接受行为当作标准。
- 工程运行脚本参考作者已有 MoonAPI Check 的本地工具链/Node.js 运行方式；不复用 OpenAPI 分析逻辑。
- 示例为人工构造，不是企业用户案例。没有全球首创、官方审核通过或获奖声明。
- 外部测试数据：OpenLDAP 官方镜像提交 `725ae5b0e583a1b2a3c3c445e6d3d45cf9fea972` 的六份 `tests/data` 文件，OpenLDAP Public License 2.8。只下载到忽略提交的缓存，保留上游 LICENSE 并核验文件 SHA-256；不复制为本项目 Apache-2.0 源码或产品示例。原始文件不改写，明确保留两份的配置拒绝结果。范围与发现见 `docs/OPENLDAP.md`。
- 浏览器界面使用 React / React DOM 19.3.0（MIT），构建使用 Vite 8.3.0（MIT）；实际直接与传递依赖版本固定于 `web/package-lock.json`，来源为 npm 官方包注册表。项目 Apache-2.0 许可不替代依赖许可；浏览器发行物应附带依赖许可文本。
- 工作台设计参照由内置 Image Gen 生成，记录于 `web/docs/design/`；界面通过 HTML/CSS/React 与自有 SVG 图标实现，未把生成图片作为产品 UI 或第三方用户案例。
- 实施使用 AI 辅助编写、调试和文档整理；可复验的结果单独记录。原创性陈述仅指本项目文件模型、解析、诊断、写回和适配代码，不能据此推出生态中绝无同类项目。
