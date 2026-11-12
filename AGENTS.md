# MoonLDIF 开发说明

先读 README.md、docs/STATUS.md、docs/SUPPORT.md及当前维护记录。实际版本以 package.json、moon.mod、web/package.json 为准；工具链以 scripts/toolchain.json 为准，不把历史证据当成当前状态。

- 核心库、规则、参数判断、写回与报告正文保持MoonBit实现；Node和浏览器负责文件、指纹、下载及界面。
- 使用 `node scripts/moon.mjs` 调用工程工具链。MOON_HOME优先于忽略提交的.local-toolchain.json；不同版本工具链不能共用标准库。
- 核心与CLI无npm依赖。网页依赖按 `npm --prefix web ci` 恢复。
- 常用验证：`npm run check`、`npm run build`、`npm test`、`npm run verify`。浏览器、独立参考、库/CLI归档消费及真实注册表消费按README和CI分别验证，不能互相代替。
- 冻结旧输出对照通过MOONLDIF_BASELINE_MOON_HOME指定历史编译器。保留失败记录，不修改冻结输入或放松断言来隐藏不兼容。
- 保持退出码0/1/2及2优先、资源上限、稳定排序、全量风险检查、完整报告上限、过期结果禁止下载和写回后的重新解析/语义核对。
- 继续保持离线LDIF文件层边界。不要把检查通过称为服务器成功导入、Schema认证或LDAP执行结果。
- 更新当前入口、安装命令、验收对照和后续计划；保留带日期的历史发行与证据。运行scripts/version-verify.mjs防止入口版本滞后。
- 凭据、依赖缓存、构建产物和个人材料不提交。审阅报告不含原始属性值及本机绝对路径；明确保存原文的现有入口另按合同处理。
- 正式发布按当前任务授权及项目CI门槛推进，核对WeiR-h发布身份。GitHub、mooncakes、CLI和Pages按同一正式源码交付，不覆盖已发布标签或附件。
