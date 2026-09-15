# 三个完整场景

均为可运行的人工构造示例。说明预期用途，不冒充已经部署的企业案例。

## 1. 检查目录导出文件

对象：拿到 LDAP 导出文件的迁移人员。问题：中文、照片等二进制属性和折行容易被一般文本处理损坏。

输入：`examples/01-directory-export.ldif`，一条目录内容记录，含中文 Base64、二进制照片占位字节和折行描述。

操作：`node dist/moonldif.js inspect examples/01-directory-export.ldif --format json`。

结果：退出码 0，显示一条 content 记录；原始属性字节使用 Base64，UTF-8 文本仅作便利展示。可以继续通过 format 写到新的路径，并核对读取后的语义相同。

完成范围：证明这些文件字段能够被当前配置完整解析和写回，不证明照片是可显示图片或条目符合 inetOrgPerson Schema。

## 2. 在账号调整前拦截整条删除

对象：准备执行账号变更的管理员或 CI 流程。问题：一个文件中既有常规邮箱修改，也可能夹带整条记录删除。

输入：`examples/02-account-changes.ldif`，先修改邮箱和删除描述属性，再删除另一条目录记录。

操作：`node dist/moonldif.js check examples/02-account-changes.ldif --deny-delete`。

结果：退出码 1，报告 `delete-denied` 和删除记录的物理行范围。modify 内删除描述属性仍能解析，不会被误当作整条记录删除。如果同时出现错误或外部值，退出码 2 优先并保留删除诊断。

完成范围：离线列出并拦截文件计划，不连接服务器、回滚或修改真实账号。操作者修订计划后重新检查。

## 3. 将文件迁移计划接入 MoonBit LDAP 代码

对象：使用 MoonBit 编写目录迁移工具的开发者。问题：协议库已有 LDAP 操作类型，但文件输入仍需要正确解析、保留字节和保持操作顺序。

输入：`examples/03-migration-plan.ldif`，包含 add 与 modrdn；适配测试还覆盖 delete 和 modify。

操作：先运行 `node dist/moonldif.js inspect examples/03-migration-plan.ldif --format json`。开发者再调用可选适配的 `to_messages(report)`，对应验证运行 `node scripts/test-moonldap.mjs`。

结果：保留计划顺序，构造真实 moonldap 操作对象；四种操作已经验证 BER 编码后解码回同一对象。内容记录不会被自动视作 add，存在操作控制时明确拒绝。

完成范围：提供文件到协议模型的可复用连接层，不把已有协议编码当作原创，不实际发送迁移请求。父目录存在性、权限、Schema 与服务端行为由后续阶段验证。
