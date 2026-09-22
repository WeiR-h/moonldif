# 完整审阅合成示例

这三个文件均为合成数据，不是真实目录或用户案例。

- changes.ldif：260 次属性替换后有 1 次整条删除。启用 deny-delete 时返回 1；第 6 页能看到尾部风险，搜索 tail-risk 能直接定位它。
- before.ldif / after.ldif：260 项 mail 属性变化；查找 demo-259 可找到旧前 200 项报告之外的差异。

```text
node dist/moonldif.js review examples/complete-review/changes.ldif --deny-delete --page 6 --format json
node dist/moonldif.js review examples/complete-review/changes.ldif --deny-delete --all --format markdown
node dist/moonldif.js compare examples/complete-review/before.ldif examples/complete-review/after.ldif --query demo-259 --format json
```

浏览器可直接打开同名文件。列表筛选不会改变风险状态，完整报告应分别含 261 项操作或 260 项差异。
