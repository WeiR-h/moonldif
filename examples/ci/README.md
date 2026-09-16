# 批量预检接入 CI

先构建 MoonLDIF，然后在项目根目录执行（所有例子是合成数据）：

```text
node examples/ci/check-plan.mjs verification/local/batch-ci.json examples/01-directory-export.ldif examples/02-account-changes.ldif examples/03-migration-plan.ldif
```

此例统一开启整条删除、属性清空、改名/移动拦截，预期退出 1，仍保存 JSON 报告。只检查第一个内容文件时为 0；混入缺失文件或不完整输入为 2，已发现的风险保留。指定的报告路径必须尚不存在；不会覆盖输入或上次报告。CI 可以按运行编号给输出命名。

下面工作流可复制到维护 LDIF 的项目，根据仓库实际文件修改最后一行输入列表。它固定 MoonLDIF 0.3.0 并保留失败报告。安装 CLI 使用源码构建，mooncakes 安装是另一种库接入方式。首次接入先用合成文件确认预期退出码。

```yaml
name: LDIF preflight
on: [push, pull_request]
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.1
      - uses: actions/setup-node@v7.0.0
        with:
          node-version: '24'
      - uses: actions/checkout@v7.0.1
        with:
          repository: WeiR-h/moonldif
          ref: v0.3.0
          path: .tools/moonldif
      - name: Install pinned MoonBit
        run: |
          set -euo pipefail
          curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash -s -- '0.10.11+6ff76a5f9'
          echo "$HOME/.moon/bin" >> "$GITHUB_PATH"
      - run: node .tools/moonldif/scripts/build.mjs
      - name: Review all planned files
        run: node .tools/moonldif/examples/ci/check-plan.mjs artifacts/ldif-review.json plans/01.ldif plans/02.ldif
      - uses: actions/upload-artifact@v7.0.1
        if: always()
        with:
          name: ldif-review
          path: artifacts/ldif-review.json
```

报告包含输入基本名和 DN。是否将 CI 产物公开，由维护者按数据用途决定；不会自动上传 LDAP 文件原文。每个文件独立分析，不保证不同文件之间的依赖顺序或服务器事务能够成功。`plans/01.ldif` 等是接入者应替换的路径，不假装有真实外部项目采用。
