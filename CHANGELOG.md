# Changelog

## 0.6.0 — 2026-09-22

- 新增 ReviewSession、SnapshotSession、PageQuery 与前向 ReportCursor；复用既有规则，按需生成条目说明。
- CLI review/compare 增加分页、全量查找、类型筛选与 --all；旧默认输出及格式版本 1 保持兼容，新报告使用版本 2。
- 工作台两种模式均支持分页定位和完整下载；单 Worker 保留本次分析，输入、选项或模式变化立即失效。
- 完整报告分块生成，限 32 MiB；先暂存再输出，失败不发布半份报告。筛选不改变退出码或不完整诊断。
- 增加尾部风险、重复 DN、输出边界、生命周期、双目标库消费及规模回归。发布状态见 docs/STATUS.md。

## 0.5.1 — 2026-09-21

- 按打开的文件大小分配读取缓冲区，有限扩容检测文件增长；保留单文件/批次限制、实际字节指纹与异常关闭。
- 普通行不再经过额外拼接缓冲区，遇到续行才建立缓冲区；保留全部位置与错误语义。
- 审阅截断后仅累计完整数量，避免构造被丢弃的说明；全部记录仍执行风险策略。
- Worker 不再重复发送报告 JSON 字符串；增加双浏览器 50 次检查及取消、延迟旧回调和超时验证。
- 增加精确 v0.5.0 源码构建对照、当前桥接与真实批处理规模观测、文件竞态注入；API、报告字段及资源上限兼容。

## 0.5.0 — 2026-09-20

- 新增可选 ignored_attributes / --ignore-attribute，规范化列表及命中出现次数进入报告；不跳过输入验证、重复 DN 或整条增减。旧 API 保持兼容。
- 工作台增加排除项、差异类型及 DN / 属性查找、明确的筛选与截断提示、停止核对；下载保持完整有界报告，旧任务返回不能恢复下载。
- SnapshotDiff JSON 返回独立副本；属性描述选项使用映射去重，避免大量选项时的线性反复查找。
- 固定生态依赖下载支持有限重试、固定哈希验证与原子缓存；证书、哈希、永久错误不放宽。增加离线故障注入及独立比较模型覆盖。

## 0.4.0 — 2026-09-17

- 新增 MoonBit compare_snapshots / SnapshotDiff 公共接口，比较两份内容导出；完整处理字节多重集合、精确 DN、属性描述、重复 DN 歧义和报告截断。
- 新增 compare CLI 和浏览器双文件核对、双侧行号定位、Markdown/JSON 下载，延续 Worker、超时、资源上限及旧结果失效保护。
- 增加独立 Python LDIF 写入/解析与 36 组固定种子模型对照、三档规模记录；不执行 LDAP 操作或生成补丁。
- compare 退出码 0=当前规则下无差异，1=有差异，2=不完整/错误。现有检查策略接口保持不变。


## 0.3.0 — 2026-09-16

- Add ordered multi-file offline preflight with the reusable, opaque BatchReview MoonBit API. Preserve individual reports and 2-over-1 exit priority across missing, invalid, incomplete and policy-blocked files.
- Add batch text/JSON/Markdown reports with per-file source identity, safe display basenames, input ordinals and explicit coverage counts. No cross-file LDAP transaction is inferred.
- Bound batches to 50 inputs, 8 MiB per file and 32 MiB of cumulative accepted bytes. Empty batches and unanalysed tails fail closed.
- Add a tested CI integration example that saves blocked/error reports while preserving status and refusing overwrites. Extend fresh archive and registry consumers to exercise the batch public API.


## 0.2.0 — 2026-09-16

- Add opt-in attribute-clear and rename/move policies while preserving Options and prior calls. Scan every parsed record, independent of the review display limit.
- Add deterministic MoonBit Markdown/JSON review reports with host-computed source SHA-256, byte length, options, diagnostics and truncation. Reports omit attribute values but include target DNs.
- Add browser policy controls and report downloads for completed pass, blocked and incomplete outcomes; stale, running and failed tasks cannot download old results.
- Fix source selection offsets for CRLF files in the browser.
- Add Chromium/Firefox desktop and mobile-viewport checks, timeout and stale-response injection, downloaded-LDIF CLI verification, and stable-tag-only GitHub Pages deployment.
- Retain bounded offline processing, independent interoperability checks, Apache-2.0, and exact registry consumer verification.


## 0.1.0 — 2026-09-16

- Freeze the dev.5 public library and local workbench as the initial stable baseline.
- Add isolated, exact-version mooncakes consumer verification on Windows and Ubuntu.
- Record preliminary application acceptance separately from final contest acceptance.


## 0.1.0-dev.5 — 2026-09-15

GitHub delivery iteration; mooncakes not published.

- Include attribute names and supplied-value counts in text review without exposing attribute bytes.
- Show target DNs directly for each browser attribute operation, making similar operations on different entries distinguishable.
- Add batch review and CLI regressions; verify source navigation for the second entry on desktop and mobile layouts.
- Verify a source-only clean workspace and publish the public GitHub repository with passing Windows/Ubuntu CI; preserve historical failures and unsupported profiles.
- Update official CI actions to Node 24 releases after observing deprecation warnings in the initial successful run.

## 0.1.0-dev.4 — 2026-09-15

Unpublished correctness follow-up using upstream OpenLDAP test data.

- Fix unsupported modifications such as increment being mislabeled as replace/clear in review. Parsing already blocked export; review now explicitly states that effects were not analyzed.
- Add regression coverage for populated/empty unknown operations and the actual browser bridge; keep incomplete status and export refusal.
- Add six pinned, unmodified OpenLDAP test files: four content fixtures pass three-way Python interoperability with explicit missing-header compatibility; two retain documented rejection and write refusal.
- Update Chinese review labels and verify the rendered failure-to-repair flow. No new LDAP operations are supported by this change.

## 0.1.0-dev.3 — 2026-09-15

Third local development iteration; not published.

- Add ordered, source-linked operation review without exposing attribute values or changing input/policy status; retain incomplete results and bound review output.
- Add review CLI and MoonBit browser bridge using the same analysis and checked writer.
- Add a local React workbench with worker isolation, file/edit revision guards, diagnostic navigation and checked downloads.
- Verify desktop/mobile layouts and actual file import, repair, policy, export and failure flows; independently compare the downloaded file through the CLI.
- Expand to 30 core tests on JS/Wasm GC and 9 CLI groups; rerun Python, Java SDK, RFC and moonldap comparisons.
- Add locked browser dependencies and production build to the prepared dual-platform CI. Remote CI remains unverified.

## 0.1.0-dev.2 — 2026-09-15

Second local development iteration; not published.

- Add RFC 4514 DN/RDN syntax diagnostics and an explicit legacy separator-space mode; preserve physical locations and original names.
- Add independent UnboundID SDK comparisons across all change types, with two control encoding differences reported explicitly.
- Verify all seven RFC examples, separating original publication errors from documented prepared variants.
- Write empty control values using interoperable Base64; report whole-control encoding as unsupported.
- Verify the core on JS and Wasm GC; add repeatable scale measurements through 10,000 records.
- Compare writer round-trips directly without duplicate JSON trees; avoid allocating unused location reports.
- Document official award project benchmarks, remaining competitive gates and precise support limits.

## 0.1.0-dev.1 — 2026-09-15

First local development iteration; not published.

- Add byte-preserving LDIF content and basic change parsing with physical line spans.
- Add bounded unfolding, explicit unsupported diagnostics and an entry-deletion policy.
- Add deterministic semantic serialization with a reparse-and-compare gate.
- Add check, inspect and no-overwrite format CLI commands, JSON/text reports and three synthetic scenarios.
- Verify content interoperability with a pinned independent Python implementation.
- Add an optional moonldap 0.3.0 model adapter with real BER round-trip tests; reject operation controls and implicit content-to-add conversion.
- Prepare Windows/Ubuntu CI and local verification evidence. Remote CI, registry publication and organizer review remain pending.
