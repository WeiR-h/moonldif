# 独立读写对照与已知差异

两套参考工具均是开发期测试依赖，核心库与 CLI 不调用它们完成解析。下载固定版本后先校验 SHA-256，源码或 JAR 不随本项目提交。测试不连接 LDAP，也不读取 LDIF 指向的 URL 或文件。

## Python 内容参考

`python scripts/reference-verify.py` 使用固定提交的 python-ldap `ldif` 模块。覆盖 7 组内容记录的三个方向及一组 modify 顺序。参考实现的宽松 Base64 行为不作为格式标准。版本及校验值见脚本与来源声明。

## Java 变更参考

需要 Java/JDK 17 或更新版本：

```text
python scripts/sdk-verify.py
```

可用 `--java`、`--javac` 指定完整可执行文件路径，`--jar` 指定已下载的固定版本归档。参考：UnboundID LDAP SDK 7.0.5，SHA-256 `463f0ee93f8046c6f72766f111fc27b18ab4727541968b9fa72699023e1b0ff0`。

27 组输入包括内容、add/delete/modify/moddn、根 DN、重命名目标父 DN 为空、modify 空值集、重复属性修改的顺序、选项顺序、控制项值缺失/为空/二进制以及固定种子的二进制长度变体。

每组比较：MoonLDIF 与 SDK 的解析模型、MoonLDIF 输出经 SDK 读取、SDK 输出经 MoonLDIF 读取。仅属性描述符大小写和选项顺序归一，并将同一属性的值分组；不归一 DN、不改变记录或修改顺序、不把字节解码成替代字符。属性值序列也比较，不声称已验证目录 Schema 的集合匹配语义。

**26 组为三个方向直接通过；1 组控制项样本的 SDK 输出含扩展语法，经测试适配器显式转换后比较通过。后者不是直接兼容通过。** JSON 证据分别记录结果。

## 实际发现的差异

1. SDK 7.0.5 读取 `control: 1.2.4 false:` 会抛出 `StringIndexOutOfBoundsException`。MoonLDIF 保留空字节值，写出时用等价的 `false::`，已验证 SDK 可读取。每次对照都重新确认该差异，避免更新工具后静默沿用旧结论。
2. SDK 写出空控制值时可能把整个控制项编码成 `control:: ...`。RFC 2849 的控制项语法只在 OID 与 criticality 后提供可编码的值。MoonLDIF 返回 `unsupported-control-encoding` 和退出码 2，禁止输出；测试适配器另行把整项解码为标准字段后比较，并明确记录这个转换。
3. 第一版测试适配器曾在属性选项顺序不同时覆盖已有分组值，造成对照失败；修正为追加分组值，不修改产品数据或放宽预期结果。
4. 本机 JDK 25 在受限沙箱关闭 JAR 文件时出现路径访问异常；完整权限的同一离线编译正常。脚本会把此类异常记为失败，即使编译器意外返回退出码 0，也不记成通过。

依据：[RFC 2849 控制项语法](https://www.rfc-editor.org/rfc/rfc2849.html)、[SDK LDIFReader API](https://docs.ldap.com/ldap-sdk/docs/javadoc/com/unboundid/ldif/LDIFReader.html)。这是限定样本的互操作证据，不是所有 LDAP 产品兼容认证或真实企业导入验收。
