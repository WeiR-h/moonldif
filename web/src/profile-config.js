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
  const core=await corePromise;
  const result=JSON.parse(core.profile_validate(encoded));
  if(result.exit_code!==0) throw new Error(JSON.parse(result.output).diagnostics[0].reason);
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
