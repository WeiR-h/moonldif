// Host-only reproduction data. Rules and reports still come from MoonBit.
export function captureReproduction(kind, payload) {
  const files = kind === 'compare'
    ? [{name:'before.ldif',text:payload.before},{name:'after.ldif',text:payload.after}]
    : [{name:'input.ldif',text:payload.text}];
  const flags = payload.options || payload;
  const args = [kind, ...files.map(f=>f.name)];
  let profile = null;
  if (payload.profileEncoded) {
    const encoded = payload.profileSourceEncoded || payload.profileEncoded;
    const bytes = !payload.profileSourceEncoded && payload.profileCanonical
      ? new TextEncoder().encode(payload.profileCanonical) : Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    profile = {name:'rules.json', bytes, original:Boolean(payload.profileSourceEncoded)};
    args.push('--profile','rules.json');
  } else {
    for (const [key,flag] of [['compat','--compat'],['legacySpaces','--legacy-dn-spaces'],['denyDelete','--deny-delete'],['denyClear','--deny-clear'],['denyRename','--deny-rename']]) {
      if (flags[key] && (kind==='review'||!key.startsWith('deny'))) args.push(flag);
    }
    if(kind==='compare') for(const name of payload.ignoredAttributes || []) args.push('--ignore-attribute',name);
  }
  args.push('--all','--format','json');
  return {kind,files,profile,args};
}

export function reproductionCommand(snapshot, shell) {
  const quote = value => shell==='powershell' ? "'"+value.replaceAll("'","''")+"'" : "'"+value.replaceAll("'", "'\"'\"'")+"'";
  return 'node dist/moonldif.js '+snapshot.args.map(quote).join(' ');
}

export function reproductionInstructions(snapshot, version, report) {
  const source = snapshot.kind==='review' ? [report.source] : [report.before,report.after];
  return `# MoonLDIF ${version} 本机复现\n\n安装 Node.js 24，下载并解压 https://github.com/WeiR-h/moonldif/releases/download/v${version}/moonldif-cli-v${version}.zip ，核对发行页 SHA256SUMS。\n\n将本次下载的文件放在解压目录；浏览器若重命名文件，请恢复下面的固定名称，不要使用旧下载。\n\n${snapshot.files.map((f,i)=>`- ${f.name}: ${source[i]?.byte_length} bytes; SHA-256 ${source[i]?.sha256}`).join('\n')}\n${snapshot.profile?'- rules.json: '+(snapshot.profile.original?'原始配置字节；来源指纹应一致。':'本次有效配置；CLI 将记录下载文件的新来源指纹，有效规则和有效指纹应一致。')+'\n':''}\n原文包含属性值，仅下载到本机。原文保存不代表检查通过。本次退出码：${report.exit_code}。指纹不是数字签名。\n\n## PowerShell\n\n\`\`\`powershell\n${reproductionCommand(snapshot,'powershell')}\n$LASTEXITCODE\n\`\`\`\n\n## Bash\n\n\`\`\`bash\n${reproductionCommand(snapshot,'bash')}\nprintf '%s\\n' "$?"\n\`\`\`\n\n0：支持范围内通过；1：风险拦截或发现差异；2：错误或分析不完整。命令展示所有已知项目，不受网页列表筛选影响。审阅报告不包含原始属性值，但含 DN。\n`;
}
