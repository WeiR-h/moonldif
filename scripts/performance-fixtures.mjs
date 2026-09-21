// Deterministic synthetic data shared by both versions; no private directory data.
export const cases = [
  ...[100, 1000, 5000, 10000].flatMap(records => ['check', 'format'].map(command => ({ id: `${command}-${records}`, command, records }))),
  { id: 'folded', command: 'format', records: 1 },
  { id: 'risk-review', command: 'review', records: 10000 },
  { id: 'compare', command: 'compare', records: 5000 },
  { id: 'batch-50', command: 'batch', records: 1 },
];
export function fixture(spec) {
  if (spec.id === 'folded') return Buffer.from('version: 1\ndn: cn=Fold\ncn: Fold\ndescription: start\n' + ' x\n'.repeat(20000));
  let text = 'version: 1\n\n';
  for (let i = 0; i < spec.records; i++) {
    text += `dn: uid=user-${i},ou=People,dc=example,dc=org\n`;
    text += spec.command === 'review'
      ? 'changetype: modrdn\nnewrdn: cn=New\ndeleteoldrdn: 1\nnewsuperior: ou=Moved,dc=example,dc=org\n\n'
      : `objectClass: inetOrgPerson\nuid: user-${i}\ncn: User ${i}\nsn: User\ndescription: ${'x'.repeat(80)}\nphoto:: /wAB\n\n`;
  }
  return Buffer.from(text);
}
