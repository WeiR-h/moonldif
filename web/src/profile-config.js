// Small, explicit configuration only. LDIF analysis remains in the single worker.
let corePromise;
export function encodedProfile(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 65536) throw new Error('配置最多 64 KiB。');
  const parts=[];
  for(let i=0;i<bytes.length;i+=8192) parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return btoa(parts.join(''));
}
export async function validateProfile(text) {
  const encoded=encodedProfile(text);
  corePromise ||= import('../../dist/core.mjs');
  const core=await corePromise.catch(error=>{corePromise=null;throw error;});
  const result=JSON.parse(core.profile_validate_detailed(encoded));
  if(result.exit_code!==0) {const error=new Error(profileIssueText(result.issue));error.issue=result.issue;throw error;}
  return {...result,encoded};
}

export function effectiveProfile(base, mode, flags, ignoredText, limits) {
  const p = structuredClone(base || {profile_version:1});
  p.common={allow_missing_version:flags.compat,legacy_dn_spaces:flags.legacySpaces};
  if(mode==='review') {
    p.review={deny_delete:flags.denyDelete,deny_clear:flags.denyClear,deny_rename:flags.denyRename,limits:{}};
    for(const [key,value] of Object.entries(limits)) if(value!=='') p.review.limits[key]=/^\d+$/.test(value)?Number(value):value;
  } else p.compare={ignored_attributes:ignoredText.trim()===''?[]:ignoredText.split(',').map(s=>s.trim())};
  return p;
}

const issueMessages = {
  size:'配置最多 64 KiB。', encoding:'配置必须使用有效 UTF-8 编码。',
  nesting:'配置嵌套不能超过 16 层。', json:'JSON 格式不正确，请检查引号、逗号和括号。',
  'duplicate-key':'配置包含重复字段，包括转义后同名的字段。',
  'number-notation':'数字须使用非负十进制整数，不接受负数、小数或指数写法。',
  'unknown-field':'配置包含不支持的字段。', 'object-type':'此处应为 JSON 对象。',
  version:'profile_version 必须为 1。', 'boolean-type':'此项必须为 true 或 false。',
  'limit-value':'请输入 0–2147483647 的整数；清空输入表示不限。',
  'ignored-count':'最多排除 64 项属性。', 'ignored-attribute':'属性名称无效或超过 256 字符；不能排除 DN。',
  'ignored-type':'排除项必须为属性名称字符串。', 'ignored-array':'排除项必须为数组。',
  transport:'配置传输无效，请重新加载。',
};
export function profileIssueText(issue) {return issueMessages[issue?.code] || '配置校验失败，请重新加载或恢复配置。';}
