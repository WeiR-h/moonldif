import content from '../../examples/01-directory-export.ldif?raw';
import changes from '../../examples/02-account-changes.ldif?raw';
import migration from '../../examples/03-migration-plan.ldif?raw';

export const samples = [
  { id: 'changes', label: '整条删除（合成示例）', filename: '02-account-changes.ldif', text: changes },
  { id: 'clear', label: '属性清空（合成示例）', filename: 'clear-attribute.ldif', text: 'version: 1\n\ndn: uid=demo,ou=People,dc=example\nchangetype: modify\nreplace: mail\n-\ndelete: description\n-\n' },
  { id: 'incomplete', label: '不完整输入（合成示例）', filename: 'external-value.ldif', text: 'version: 1\n\ndn: cn=Demo\ncn: Demo\nphoto:< file:///never-read\n' },
  { id: 'content', label: '目录导出文件（合成示例）', filename: '01-directory-export.ldif', text: content },
  { id: 'migration', label: '改名与移动（合成示例）', filename: '03-migration-plan.ldif', text: migration },
  { id: 'broken', label: '名称错误排查（合成示例）', filename: 'invalid-name.ldif', text: 'version: 1\n\ndn: cn=Alice,\nchangetype: moddn\nnewrdn: cn=Alice Smith\ndeleteoldrdn: 1\n' },
];
