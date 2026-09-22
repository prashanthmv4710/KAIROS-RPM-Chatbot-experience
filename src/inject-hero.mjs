import fs from 'fs';

const filePath = '/Users/p0b05bu/dev/kairos-chat-experience/src/rpm-engine.js';
let js = fs.readFileSync(filePath, 'utf8');

const needle = '    <div class="chat-row"><div class="assistant-avatar">';
const pos = js.indexOf(needle);
if (pos !== -1) {
  const heroBlock = [
    '    <div style="margin: 4px 0 16px 0; padding: 14px 16px; background: white; border-radius: 14px; border: 1px solid var(--line-soft); box-shadow: var(--shadow);">',
    '      <div style="font-size: 26px; font-weight: 850; color: var(--blue-dark); line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 12px;">',
    '        Hi [\' + esc(p.rpm.split(\' \')[0]) + \'],<br>how can I help you today?',
    '      </div>',
    '      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;" role="group" aria-label="Suggested Prompts">',
    '        <button type="button" onclick="sendAssistantQuery(\'View my department schedule\')" class="chip" style="height: auto; padding: 8px 14px; border-radius: 20px; font-size: 12px; border: 1px solid #d9e8f8;">View my department schedule</button>',
    '        <button type="button" onclick="sendAssistantQuery(\'Obtain the necessary PTO sign-offs\')" class="chip" style="height: auto; padding: 8px 14px; border-radius: 20px; font-size: 12px; border: 1px solid #d9e8f8;">Obtain the necessary PTO sign-offs</button>',
    '        <button type="button" onclick="sendAssistantQuery(\'Who called in?\')" class="chip" style="height: auto; padding: 8px 14px; border-radius: 20px; font-size: 12px; border: 1px solid #d9e8f8;">Who called in?</button>',
    '        <button type="button" onclick="sendAssistantQuery(\'Team lead schedule\')" class="chip" style="height: auto; padding: 8px 14px; border-radius: 20px; font-size: 12px; border: 1px solid #d9e8f8;">Team lead schedule</button>',
    '        <button type="button" onclick="sendAssistantQuery(\'Team building some collaboration tools\')" class="chip" style="height: auto; padding: 8px 14px; border-radius: 20px; font-size: 12px; border: 1px solid #d9e8f8;">Team building some collaboration tools</button>',
    '      </div>',
    '    </div>'
  ].join('\n') + '\n';

  js = js.slice(0, pos) + heroBlock + js.slice(pos);
  fs.writeFileSync(filePath, js, 'utf8');
  console.log('Successfully injected Squiggly Hero into Home view!');
} else {
  console.error('Needle not found in rpm-engine.js');
}
