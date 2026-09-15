# 格式覆盖与验证依据

基准为 [RFC 2849](https://www.rfc-editor.org/rfc/rfc2849.html)、[官方勘误](https://errata.rfc-editor.org/search/?rfc_number=2849&presentation=records)，名称检查使用 RFC 4514，并提供明确启用的旧分隔空格兼容。这里的“覆盖”指当前配置与列出的验证，不等于完整 LDAP 认证。

| 能力 / 依据 | 支持与限制 | 可复验位置 |
|---|---|---|
| 内容或变更文件，互不混用 | 内容、四类变更；混用报错 | parser_wbtest、SDK 27 组对照 |
| version 1 / Note 1 | 严格头；缺头必须启用 --compat | parser_wbtest、CLI 参数测试 |
| 折行与注释 / Note 2、3 | 去一个续行空格，先展开后去注释；不删除值中空格 | values_wbtest、robustness_wbtest、RFC 例 2 |
| Base64、空值 / Note 4、5、10 | 保留字节，严格字符与填充；DN 文本须为 UTF-8 | 字节全集及有界随机样本、两种独立对照、RFC 例 3、4 |
| 外部 URL / Note 6 | 只保留引用，incomplete，禁止安全写出 | RFC 例 5、6；CLI、writer 拒绝测试 |
| modify 操作顺序 | add/delete/replace 与空值集保留；每组必须有 - | parser_wbtest、SDK 顺序对照 |
| 空 modify | 语法可解析且警告；不保证服务器接受 | parser_wbtest；独立 SDK 不列为等价支持 |
| moddn / modrdn | 新 RDN、删除旧 RDN 标志、可选新父 DN | RFC 例 6；SDK 根父 DN / 复合 RDN |
| 控制项 / Note 9 | OID、criticality、缺失/空/字节值；不解释控制语义 | parser/writer 测试；RFC 例 7；SDK 差异记录 |
| 整个 control 的 Base64 扩展 | 明确 unsupported，返回 2；不是静默丢弃 | parser 回归、SDK 写回差异 |
| DN / RDN | 严格字符串语法、字节转义、空根、复合 RDN、原行定位 | names_wbtest、CLI 名称阻断测试 |
| 旧 DN 分隔空格 | 单独选项，警告与范围标记，保留原值 | names_wbtest、CLI 兼容测试、RFC 示例 |
| 确定性写回 | 再解析并比较模型；不保留注释、布局、别名拼写 | writer_wbtest、CLI、两个独立读写工具 |
| 资源上限与稳定失败 | 8 MiB / 10,000 条等明确上限，结构诊断不崩溃 | robustness_wbtest、benchmark |
| 后端 | 同一核心在 JS 和 Wasm GC 本机验证；CLI 用 JS | scripts/verify.mjs 的分目标结果 |

## 七个官方示例

另有 [OpenLDAP 原始样本矩阵](OPENLDAP.md)：六份预先选定的固定上游文件，四份兼容配置的三方向独立对照、两份预期拒绝和写出阻断；不声称覆盖整个 OpenLDAP 测试集。

运行 `python scripts/rfc-verify.py`。脚本下载官方文本，要求 SHA-256 为 `ce2f125a7a765b1cd19ff23e14517ee4148f3ed29a825e3d22a57a3f119acb07`；只在忽略提交的缓存生成提取文件。分页删除规则保留第 10 页末尾的记录分隔，并连接第 8 页被分页打断的同一记录。

所有示例显式启用旧 DN 分隔空格，不改写 DN。原刊内容与修订内容分别运行、分别计算文件校验值。

| 示例 | 原刊提取结果 | 明示修订及其结果 |
|---|---|---|
| 1 双条目 | complete，2 条 | 无修订 |
| 2 折行 | complete，1 条 | 无修订 |
| 3 Base64 | invalid，续行缺空格 | 按勘误 2258 加三个续行空格后 complete；该勘误状态为 Held for Document Update，不能写成 Verified |
| 4 UTF-8/语言标签 | invalid，孤立注释续行 | 将孤立的 JapaneseGivenname 注释续行加 # 后 complete，2 条；这是本项目编辑修订 |
| 5 外部文件 | invalid，属性中间多一空行 | 去掉该空行后 incomplete，保留外部引用；不是完整通过 |
| 6 混合变更 | invalid，modify 中间多一空行且含外部值 | 去掉该空行后 incomplete，6 条变更保留；外部值仍未解析 |
| 7 删除控制项 | complete，1 条 | 无修订；不解释 tree-delete 控制语义 |

勘误 4009（Verified）的 deleteoldrdn=0/1 含义与当前布尔模型一致；4377（Verified）允许多段 OID。3646 为 Held for Document Update，当前选择 ASCII/Base64 LDIF 字段配置并明确标注，不能写成整个争议已经解决。4355 已被拒绝，不据此禁止值内或 FILL 内合法折行。

## 尚未声明覆盖

目录 Schema、DN 匹配规则与 BER 断言语义、服务端状态/ACL、控制项执行语义、URL 内容、完整旧版 LDAP 名称变体，以及超出当前配置的工具私有扩展。真实企业输入、服务端导入、远端 CI 仍需各自的证据。
