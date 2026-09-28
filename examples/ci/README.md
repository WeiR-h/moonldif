# 批量预检接入 CI

下载并解压同版本 CLI 包（或从源码构建），然后在项目根目录执行（所有例子是合成数据）：

```text
node examples/ci/check-plan.mjs verification/local/batch-ci.json examples/01-directory-export.ldif examples/02-account-changes.ldif examples/03-migration-plan.ldif
```

此例统一开启整条删除、属性清空、改名/移动拦截，预期退出 1，仍保存 JSON 报告。只检查第一个内容文件时为 0；混入缺失文件或不完整输入为 2，已发现的风险保留。指定的报告路径必须尚不存在；不会覆盖输入或上次报告。CI 可以按运行编号给输出命名。

下面工作流可复制到维护 LDIF 的项目，根据仓库实际文件修改最后一行输入列表。它固定 MoonLDIF 0.7.3 并保留失败报告。安装 CLI 使用已编译 ZIP，mooncakes 安装是另一种库接入方式。首次接入先用合成文件确认预期退出码。

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
      - name: Download verified CLI
        run: |
          set -euo pipefail
          mkdir -p .tools/moonldif
          cd .tools/moonldif
          base=https://github.com/WeiR-h/moonldif/releases/download/v0.7.3
          curl -fLO "$base/moonldif-cli-v0.7.3.zip"
          curl -fLO "$base/SHA256SUMS"
          awk '$2 == "moonldif-cli-v0.7.3.zip"' SHA256SUMS > CLI.sha256
          test -s CLI.sha256
          sha256sum -c CLI.sha256
          unzip -q moonldif-cli-v0.7.3.zip
      - name: Review all planned files
        run: node .tools/moonldif/examples/ci/check-plan.mjs artifacts/ldif-review.json plans/01.ldif plans/02.ldif
      - uses: actions/upload-artifact@v7.0.1
        if: always()
        with:
          name: ldif-review
          path: artifacts/ldif-review.json
```

报告包含输入基本名和 DN。是否将 CI 产物公开，由维护者按数据用途决定；不会自动上传 LDAP 文件原文。每个文件独立分析，不保证不同文件之间的依赖顺序或服务器事务能够成功。`plans/01.ldif` 等是接入者应替换的路径，不假装有真实外部项目采用。
