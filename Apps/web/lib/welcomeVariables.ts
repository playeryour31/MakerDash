export type WelcomeVariableGroup = 'member' | 'server' | 'memberInfo';

export type WelcomeVariable = {
  key: string;
  token: string;
  labelKey: string;
  group: WelcomeVariableGroup;
  preview: string;
};

export const WELCOME_VARIABLES: WelcomeVariable[] = [
  { key: 'user', token: '{user}', labelKey: 'varUser', group: 'member', preview: '@Amina' },
  { key: 'mention', token: '{mention}', labelKey: 'varMention', group: 'member', preview: '@Amina' },
  { key: 'username', token: '{username}', labelKey: 'varUsername', group: 'member', preview: 'Amina' },
  { key: 'displayname', token: '{displayname}', labelKey: 'varDisplayName', group: 'member', preview: 'Amina' },
  { key: 'userid', token: '{userid}', labelKey: 'varUserId', group: 'member', preview: '1234567890' },
  { key: 'useravatar', token: '{useravatar}', labelKey: 'varUserAvatar', group: 'member', preview: 'https://…' },
  { key: 'tag', token: '{tag}', labelKey: 'varTag', group: 'member', preview: 'Amina#0001' },
  { key: 'server', token: '{server}', labelKey: 'varServer', group: 'server', preview: 'Volyx Hub' },
  { key: 'serverid', token: '{serverid}', labelKey: 'varServerId', group: 'server', preview: '9876543210' },
  { key: 'servericon', token: '{servericon}', labelKey: 'varServerIcon', group: 'server', preview: 'https://…' },
  { key: 'serverowner', token: '{serverowner}', labelKey: 'varServerOwner', group: 'server', preview: 'Owner' },
  { key: 'membercount', token: '{membercount}', labelKey: 'varMemberCount', group: 'server', preview: '128' },
  { key: 'joinedat', token: '{joinedat}', labelKey: 'varJoinedAt', group: 'memberInfo', preview: 'Aug 14, 2026' },
  { key: 'accountcreated', token: '{accountcreated}', labelKey: 'varAccountCreated', group: 'memberInfo', preview: 'Jan 1, 2020' },
];

export function fillWelcomePreview(template: string): string {
  let out = String(template || '');
  for (const v of WELCOME_VARIABLES) {
    const re = new RegExp(v.token.replace(/[{}]/g, '\\$&'), 'gi');
    out = out.replace(re, v.preview);
  }
  return out;
}

export function insertAtCursor(
  el: HTMLTextAreaElement | HTMLInputElement,
  token: string,
  value: string,
  onChange: (next: string) => void,
) {
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + token.length;
    el.setSelectionRange(pos, pos);
  });
}
