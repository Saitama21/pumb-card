import http from 'node:http';
import sharp from 'sharp';

const TOKEN = process.env.BOT_TOKEN;
const CARD_URL = 'https://saitama21.github.io/pumb-card/';
const VISUAL_HOLDER = 'Yeroshov Ivan Sergiyovich';
const VISUAL_NUMBER = '4314140211726887';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;
let cachedPhotoFileId = null;

if (!TOKEN) {
  console.error('BOT_TOKEN is not set');
  process.exit(1);
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

async function bot(method, params = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`${method}: ${payload.error_code ?? ''} ${payload.description ?? 'Telegram API error'}`);
  }
  return payload.result;
}

async function botMultipart(method, form) {
  const response = await fetch(`${API}/${method}`, { method: 'POST', body: form });
  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`${method}: ${payload.error_code ?? ''} ${payload.description ?? 'Telegram API error'}`);
  }
  return payload.result;
}

function keyboard(raw = VISUAL_NUMBER) {
  return {
    inline_keyboard: [
      [{ text: '📋 Скопировать номер', copy_text: { text: raw } }],
      [{ text: '🌐 Открыть карточку', url: CARD_URL }],
    ],
  };
}

function caption() {
  return `<b>${escapeHtml(VISUAL_HOLDER)}</b>\n<code>${VISUAL_NUMBER}</code>`;
}

const PUMB_PATH = 'M168.85,127.44L168.85,104.40L177.69,104.40Q182.54,104.40 185.14,106.58Q187.73,108.76 187.73,112.81Q187.73,116.88 185.14,119.06Q182.54,121.23 177.69,121.23L174.05,121.23L174.05,127.44ZM174.05,117.48L177.10,117.48Q179.24,117.48 180.42,116.27Q181.60,115.07 181.60,112.81Q181.60,110.57 180.42,109.37Q179.24,108.16 177.10,108.16L174.05,108.16ZM190.95,118.60L190.95,104.40L196.15,104.40L196.15,118.41Q196.15,121.34 197.29,122.71Q198.44,124.08 200.88,124.08Q203.34,124.08 204.49,122.71Q205.64,121.34 205.64,118.41L205.64,104.40L210.85,104.40L210.85,118.60Q210.85,123.31 208.25,125.69Q205.65,128.06 200.88,128.06Q196.13,128.06 193.54,125.69Q190.95,123.31 190.95,118.60ZM215.29,127.44L215.29,104.40L222.04,104.40L226.72,115.40L231.43,104.40L238.16,104.40L238.16,127.44L233.15,127.44L233.15,110.13L228.38,121.26L225.10,121.26L220.32,110.13L220.32,127.44ZM242.59,127.44L242.59,104.40L251.43,104.40Q256.28,104.40 258.88,106.58Q261.47,108.76 261.47,112.81Q261.47,116.88 258.88,119.06Q256.28,121.23 251.43,121.23L247.79,121.23L247.79,127.44ZM247.79,117.48L250.84,117.48Q252.98,117.48 254.16,116.27Q255.34,115.07 255.34,112.81Q255.34,110.57 254.16,109.37Q252.98,108.16 250.84,108.16L247.79,108.16Z';
const HOLDER_PATH = 'M123.62,478.00L123.62,465.79L113.80,446.09L123.10,446.09L128.05,457.83L133.05,446.09L142.25,446.09L132.50,465.79L132.50,478.00ZM143.42,478.00L143.42,454.39L151.26,454.39L151.26,458.22Q153.05,455.88 155.10,454.72Q157.15,453.56 159.80,453.56Q164.17,453.56 166.59,456.37Q169.02,459.18 169.02,464.27L169.02,478.00L161.17,478.00L161.17,465.58Q161.17,462.42 160.10,461.12Q159.03,459.82 156.92,459.82Q154.50,459.82 152.88,461.62Q151.26,463.42 151.26,466.11L151.26,478.00ZM172.82,466.20Q172.82,460.34 176.08,456.95Q179.34,453.56 184.89,453.56Q190.43,453.56 193.69,456.95Q196.95,460.34 196.95,466.20Q196.95,472.05 193.69,475.44Q190.43,478.83 184.89,478.83Q179.34,478.83 176.08,475.44Q172.82,472.05 172.82,466.20ZM180.85,466.20Q180.85,469.63 181.87,471.24Q182.89,472.85 184.89,472.85Q186.91,472.85 187.93,471.24Q188.95,469.63 188.95,466.20Q188.95,462.75 187.93,461.14Q186.91,459.53 184.89,459.53Q182.89,459.53 181.87,461.14Q180.85,462.75 180.85,466.20ZM199.86,478.00L199.86,454.39L207.70,454.39L207.70,458.80Q209.31,456.19 211.42,454.88Q213.54,453.56 216.40,453.56L217.08,453.56L217.08,460.55Q216.19,460.26 215.31,460.12Q214.44,459.97 213.59,459.97Q210.94,459.97 209.32,461.80Q207.70,463.63 207.70,466.69L207.70,478.00ZM219.52,470.59L226.93,470.59Q227.27,472.05 228.40,472.83Q229.54,473.61 231.35,473.61Q233.03,473.61 233.94,473.08Q234.85,472.55 234.85,471.56Q234.85,470.44 233.96,469.88Q233.07,469.32 230.11,468.71Q224.55,467.61 222.35,465.78Q220.15,463.95 220.15,460.80Q220.15,457.39 222.97,455.48Q225.79,453.56 230.77,453.56Q235.45,453.56 238.18,455.47Q240.90,457.39 241.35,460.82L234.42,460.82Q234.08,459.55 233.10,458.89Q232.13,458.22 230.50,458.22Q229.03,458.22 228.22,458.73Q227.42,459.24 227.42,460.16Q227.42,461.19 228.29,461.72Q229.16,462.26 232.06,462.85Q237.65,464.00 239.93,465.89Q242.21,467.79 242.21,471.02Q242.21,474.66 239.28,476.74Q236.35,478.83 231.20,478.83Q226.12,478.83 223.09,476.68Q220.06,474.54 219.52,470.59ZM245.90,478.00L245.90,445.39L253.74,445.39L253.74,458.22Q255.53,455.88 257.58,454.72Q259.63,453.56 262.28,453.56Q266.65,453.56 269.08,456.37Q271.50,459.18 271.50,464.27L271.50,478.00L263.66,478.00L263.66,465.58Q263.66,462.42 262.59,461.12Q261.52,459.82 259.41,459.82Q256.99,459.82 255.37,461.62Q253.74,463.42 253.74,466.11L253.74,478.00ZM275.30,466.20Q275.30,460.34 278.56,456.95Q281.82,453.56 287.37,453.56Q292.91,453.56 296.17,456.95Q299.43,460.34 299.43,466.20Q299.43,472.05 296.17,475.44Q292.91,478.83 287.37,478.83Q281.82,478.83 278.56,475.44Q275.30,472.05 275.30,466.20ZM283.33,466.20Q283.33,469.63 284.35,471.24Q285.37,472.85 287.37,472.85Q289.39,472.85 290.41,471.24Q291.43,469.63 291.43,466.20Q291.43,462.75 290.41,461.14Q289.39,459.53 287.37,459.53Q285.37,459.53 284.35,461.14Q283.33,462.75 283.33,466.20ZM300.97,454.39L309.22,454.39L314.29,470.51L319.34,454.39L327.49,454.39L318.91,478.00L309.57,478.00ZM340.06,478.00L340.06,446.09L348.31,446.09L348.31,478.00ZM354.29,478.00L354.29,454.39L362.13,454.39L362.13,458.22Q363.92,455.88 365.97,454.72Q368.02,453.56 370.67,453.56Q375.04,453.56 377.47,456.37Q379.89,459.18 379.89,464.27L379.89,478.00L372.05,478.00L372.05,465.58Q372.05,462.42 370.98,461.12Q369.91,459.82 367.80,459.82Q365.38,459.82 363.76,461.62Q362.13,463.42 362.13,466.11L362.13,478.00ZM382.46,478.00L391.52,454.39L400.45,454.39L409.51,478.00L401.40,478.00L400.02,473.57L391.92,473.57L390.54,478.00ZM393.59,468.14L398.35,468.14L395.97,460.41ZM406.84,454.39L415.09,454.39L420.16,470.51L425.21,454.39L433.36,454.39L424.78,478.00L415.44,478.00ZM445.86,467.28L453.75,467.28Q453.75,469.94 455.29,471.38Q456.84,472.83 459.71,472.83Q462.08,472.83 463.41,471.79Q464.75,470.75 464.75,468.92Q464.75,467.26 463.57,466.42Q462.39,465.58 458.90,464.84Q452.65,463.52 449.90,461.16Q447.16,458.80 447.16,454.44Q447.16,450.18 450.45,447.63Q453.75,445.08 459.25,445.08Q464.72,445.08 468.00,447.62Q471.28,450.16 471.57,454.63L463.86,454.63Q463.57,452.58 462.36,451.52Q461.15,450.46 459.16,450.46Q457.13,450.46 456.03,451.37Q454.93,452.29 454.93,453.92Q454.93,455.50 456.10,456.33Q457.27,457.17 460.70,457.90Q467.05,459.24 469.84,461.66Q472.62,464.08 472.62,468.55Q472.62,473.19 469.21,476.01Q465.80,478.83 459.84,478.83Q453.70,478.83 450.04,475.82Q446.38,472.81 445.86,467.28ZM475.89,466.20Q475.89,460.34 479.15,456.95Q482.41,453.56 487.96,453.56Q493.50,453.56 496.76,456.95Q500.02,460.34 500.02,466.20Q500.02,472.05 496.76,475.44Q493.50,478.83 487.96,478.83Q482.41,478.83 479.15,475.44Q475.89,472.05 475.89,466.20ZM483.92,466.20Q483.92,469.63 484.94,471.24Q485.96,472.85 487.96,472.85Q489.98,472.85 491.00,471.24Q492.02,469.63 492.02,466.20Q492.02,462.75 491.00,461.14Q489.98,459.53 487.96,459.53Q485.96,459.53 484.94,461.14Q483.92,462.75 483.92,466.20ZM503.36,478.00L503.36,454.39L511.20,454.39L511.20,458.80Q512.81,456.19 514.92,454.88Q517.04,453.56 519.90,453.56L520.58,453.56L520.58,460.55Q519.69,460.26 518.81,460.12Q517.94,459.97 517.09,459.97Q514.44,459.97 512.82,461.80Q511.20,463.63 511.20,466.69L511.20,478.00ZM522.53,478.00L522.53,454.39L530.37,454.39L530.37,478.00ZM522.53,451.27L522.53,445.39L530.37,445.39L530.37,451.27ZM534.62,478.00L534.62,454.39L542.46,454.39L542.46,458.22Q544.25,455.88 546.30,454.72Q548.35,453.56 551.00,453.56Q555.37,453.56 557.80,456.37Q560.22,459.18 560.22,464.27L560.22,478.00L552.38,478.00L552.38,465.58Q552.38,462.42 551.31,461.12Q550.24,459.82 548.13,459.82Q545.71,459.82 544.09,461.62Q542.46,463.42 542.46,466.11L542.46,478.00ZM563.42,478.00L563.42,454.39L571.26,454.39L571.26,458.22Q573.05,455.88 575.10,454.72Q577.15,453.56 579.80,453.56Q584.17,453.56 586.60,456.37Q589.02,459.18 589.02,464.27L589.02,478.00L581.18,478.00L581.18,465.58Q581.18,462.42 580.11,461.12Q579.04,459.82 576.93,459.82Q574.51,459.82 572.89,461.62Q571.26,463.42 571.26,466.11L571.26,478.00ZM592.83,466.20Q592.83,460.34 596.09,456.95Q599.35,453.56 604.90,453.56Q610.44,453.56 613.70,456.95Q616.96,460.34 616.96,466.20Q616.96,472.05 613.70,475.44Q610.44,478.83 604.90,478.83Q599.35,478.83 596.09,475.44Q592.83,472.05 592.83,466.20ZM600.86,466.20Q600.86,469.63 601.88,471.24Q602.90,472.85 604.90,472.85Q606.92,472.85 607.94,471.24Q608.96,469.63 608.96,466.20Q608.96,462.75 607.94,461.14Q606.92,459.53 604.90,459.53Q602.90,459.53 601.88,461.14Q600.86,462.75 600.86,466.20ZM618.50,454.39L626.75,454.39L631.82,470.51L636.87,454.39L645.02,454.39L636.44,478.00L627.10,478.00ZM645.19,454.39L653.44,454.39L658.51,470.51L663.56,454.39L671.71,454.39L663.13,478.00L653.79,478.00ZM671.90,466.20Q671.90,460.34 675.16,456.95Q678.42,453.56 683.97,453.56Q689.51,453.56 692.77,456.95Q696.03,460.34 696.03,466.20Q696.03,472.05 692.77,475.44Q689.51,478.83 683.97,478.83Q678.42,478.83 675.16,475.44Q671.90,472.05 671.90,466.20ZM679.93,466.20Q679.93,469.63 680.95,471.24Q681.97,472.85 683.97,472.85Q685.99,472.85 687.01,471.24Q688.03,469.63 688.03,466.20Q688.03,462.75 687.01,461.14Q685.99,459.53 683.97,459.53Q681.97,459.53 680.95,461.14Q679.93,462.75 679.93,466.20ZM699.37,478.00L699.37,445.39L707.21,445.39L707.21,458.22Q709.00,455.88 711.05,454.72Q713.10,453.56 715.75,453.56Q720.12,453.56 722.55,456.37Q724.97,459.18 724.97,464.27L724.97,478.00L717.13,478.00L717.13,465.58Q717.13,462.42 716.06,461.12Q714.99,459.82 712.88,459.82Q710.46,459.82 708.84,461.62Q707.21,463.42 707.21,466.11L707.21,478.00Z';
const NUMBER_PATH = 'M124.43,337.36L124.43,329.25L144.44,309.92L153.97,309.92L153.97,328.70L160.18,328.70L160.18,337.36L153.97,337.36L153.97,350.00L143.88,350.00L143.88,337.36ZM134.00,328.70L143.88,328.70L143.88,319.15ZM164.06,350.00L164.06,341.39L176.86,341.39L176.86,321.04L165.14,321.04L165.14,313.61Q172.14,312.71 176.18,309.92L186.98,309.92L186.98,341.39L197.20,341.39L197.20,350.00ZM202.23,337.36L202.23,329.25L222.24,309.92L231.77,309.92L231.77,328.70L237.98,328.70L237.98,337.36L231.77,337.36L231.77,350.00L221.68,350.00L221.68,337.36ZM211.80,328.70L221.68,328.70L221.68,319.15ZM241.86,350.00L241.86,341.39L254.66,341.39L254.66,321.04L242.94,321.04L242.94,313.61Q249.94,312.71 253.98,309.92L264.78,309.92L264.78,341.39L275.00,341.39L275.00,350.00ZM280.03,337.36L280.03,329.25L300.04,309.92L309.57,309.92L309.57,328.70L315.78,328.70L315.78,337.36L309.57,337.36L309.57,350.00L299.48,350.00L299.48,337.36ZM289.60,328.70L299.48,328.70L299.48,319.15ZM319.66,350.00L319.66,341.39L332.46,341.39L332.46,321.04L320.74,321.04L320.74,313.61Q327.74,312.71 331.78,309.92L342.58,309.92L342.58,341.39L352.80,341.39L352.80,350.00ZM357.83,337.36L357.83,329.25L377.84,309.92L387.37,309.92L387.37,328.70L393.58,328.70L393.58,337.36L387.37,337.36L387.37,350.00L377.28,350.00L377.28,337.36ZM367.40,328.70L377.28,328.70L377.28,319.15ZM397.46,350.00L397.46,341.39L410.26,341.39L410.26,321.04L398.54,321.04L398.54,313.61Q405.54,312.71 409.58,309.92L420.38,309.92L420.38,341.39L430.60,341.39L430.60,350.00ZM435.63,337.36L435.63,329.25L455.64,309.92L465.17,309.92L465.17,328.70L471.38,328.70L471.38,337.36L465.17,337.36L465.17,350.00L455.08,350.00L455.08,337.36ZM445.20,328.70L455.08,328.70L455.08,319.15ZM475.26,350.00L475.26,341.39L488.06,341.39L488.06,321.04L476.34,321.04L476.34,313.61Q483.34,312.71 487.38,309.92L498.18,309.92L498.18,341.39L508.40,341.39L508.40,350.00ZM513.43,337.36L513.43,329.25L533.44,309.92L542.97,309.92L542.97,328.70L549.18,328.70L549.18,337.36L542.97,337.36L542.97,350.00L532.88,350.00L532.88,337.36ZM523.00,328.70L532.88,328.70L532.88,319.15ZM553.06,350.00L553.06,341.39L565.86,341.39L565.86,321.04L554.14,321.04L554.14,313.61Q561.14,312.71 565.18,309.92L575.98,309.92L575.98,341.39L586.20,341.39L586.20,350.00ZM591.23,337.36L591.23,329.25L611.24,309.92L620.77,309.92L620.77,328.70L626.98,328.70L626.98,337.36L620.77,337.36L620.77,350.00L610.68,350.00L610.68,337.36ZM600.80,328.70L610.68,328.70L610.68,319.15ZM630.86,350.00L630.86,341.39L643.66,341.39L643.66,321.04L631.94,321.04L631.94,313.61Q638.94,312.71 642.98,309.92L653.78,309.92L653.78,341.39L664.00,341.39L664.00,350.00ZM669.03,337.36L669.03,329.25L689.04,309.92L698.57,309.92L698.57,328.70L704.78,328.70L704.78,337.36L698.57,337.36L698.57,350.00L688.48,350.00L688.48,337.36ZM678.60,328.70L688.48,328.70L688.48,319.15ZM708.66,350.00L708.66,341.39L721.46,341.39L721.46,321.04L709.74,321.04L709.74,313.61Q716.74,312.71 720.78,309.92L731.58,309.92L731.58,341.39L741.80,341.39L741.80,350.00';

async function renderCardJpeg() {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#080910"/><stop offset="0.52" stop-color="#131019"/><stop offset="1" stop-color="#1d0a15"/></linearGradient>
      <radialGradient id="g1" cx="0.08" cy="0.02" r="0.82"><stop offset="0" stop-color="#ff2d62" stop-opacity="0.78"/><stop offset="0.40" stop-color="#d81446" stop-opacity="0.32"/><stop offset="1" stop-color="#7c0829" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="0.92" cy="0.92" r="0.64"><stop offset="0" stop-color="#ff174d" stop-opacity="0.30"/><stop offset="1" stop-color="#7c0829" stop-opacity="0"/></radialGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="0.30" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="0.70" stop-color="#ff426d" stop-opacity="0.05"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.025"/></linearGradient>
      <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/><stop offset="0.50" stop-color="#ffffff" stop-opacity="0.07"/><stop offset="1" stop-color="#ff7897" stop-opacity="0.20"/></linearGradient>
      <linearGradient id="red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff285d"/><stop offset="1" stop-color="#b70b35"/></linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.045"/></linearGradient>
      <filter id="blur48" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="48"/></filter>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.46"/></filter>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <ellipse cx="135" cy="75" rx="390" ry="285" fill="url(#g1)" filter="url(#blur48)"/>
    <ellipse cx="1060" cy="565" rx="350" ry="245" fill="url(#g2)" filter="url(#blur48)"/>
    <rect x="52" y="42" width="1096" height="546" rx="58" fill="#0d1018" fill-opacity="0.70" filter="url(#shadow)"/>
    <rect x="52" y="42" width="1096" height="546" rx="58" fill="url(#glass)"/>
    <rect x="53" y="43" width="1094" height="544" rx="57" fill="none" stroke="url(#stroke)" stroke-width="2"/>
    <path d="M70 248 C265 88 486 74 710 134 C895 184 1015 154 1144 82 L1144 42 L52 42 L52 325 Z" fill="#ffffff" opacity="0.027"/>
    <path d="M410 588 C645 430 875 430 1148 500 L1148 588 Z" fill="#e61243" opacity="0.13"/>
    <g transform="translate(0 0)"><rect x="92" y="78" width="204" height="68" rx="23" fill="url(#red)"/><circle cx="123" cy="112" r="12" fill="#ffffff" opacity="0.96"/><circle cx="137" cy="112" r="12" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.96"/><path d="${PUMB_PATH}" fill="#ffffff"/></g>
    <g transform="translate(902 86)"><rect width="196" height="54" rx="20" fill="#ffffff" fill-opacity="0.065" stroke="#ffffff" stroke-opacity="0.12"/><circle cx="31" cy="27" r="6" fill="#ff3f68"/><circle cx="55" cy="27" r="4" fill="#ffffff" opacity="0.26"/><circle cx="75" cy="27" r="4" fill="#ffffff" opacity="0.16"/></g>
    <rect x="92" y="212" width="1016" height="190" rx="38" fill="url(#panel)" stroke="#ffffff" stroke-opacity="0.11"/>
    <g transform="translate(116 250)"><rect width="92" height="112" rx="28" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.12"/><circle cx="46" cy="56" r="24" fill="#ff285a" fill-opacity="0.14" stroke="#ff7897" stroke-opacity="0.25"/><path d="M34 47h24M34 56h24M34 65h24" stroke="#ffd578" stroke-width="4.5" stroke-linecap="round" opacity="0.92"/><path d="M46 39v34" stroke="#ffd578" stroke-width="3.5" stroke-linecap="round" opacity="0.70"/></g>
    <path d="${NUMBER_PATH}" fill="#ffffff"/>
    <rect x="122" y="375" width="600" height="3" rx="1.5" fill="#ffffff" opacity="0.08"/>
    <path d="${HOLDER_PATH}" fill="#ffffff"/>
    <g transform="translate(94 520)"><rect width="470" height="48" rx="18" fill="#ffffff" fill-opacity="0.055" stroke="#ffffff" stroke-opacity="0.09"/><circle cx="24" cy="24" r="6" fill="#ff3159"/><rect x="44" y="18" width="330" height="5" rx="2.5" fill="#ffffff" opacity="0.18"/><rect x="44" y="29" width="250" height="4" rx="2" fill="#ffffff" opacity="0.10"/></g>
    <g transform="translate(948 492)"><circle cx="52" cy="44" r="50" fill="#ffffff" fill-opacity="0.055" stroke="#ffffff" stroke-opacity="0.12"/><path d="M29 44h44M55 20l22 24-22 24" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.88"/></g>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 95, chromaSubsampling: '4:4:4', progressive: false }).toBuffer();
}

async function sendPhotoUpload(chatId) {
  const image = await renderCardJpeg();
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption());
  form.append('parse_mode', 'HTML');
  form.append('reply_markup', JSON.stringify(keyboard()));
  form.append('photo', new Blob([image], { type: 'image/jpeg' }), 'pumb-payment-widget.jpg');
  const sent = await botMultipart('sendPhoto', form);
  const photos = sent.photo || [];
  if (photos.length) cachedPhotoFileId = photos[photos.length - 1].file_id;
  return sent;
}

async function sendCard(chatId) {
  try {
    const sent = cachedPhotoFileId ? await bot('sendPhoto', { chat_id: chatId, photo: cachedPhotoFileId, caption: caption(), parse_mode: 'HTML', reply_markup: keyboard() }) : await sendPhotoUpload(chatId);
    console.log(`Photo card sent to ${chatId}; message=${sent.message_id}`);
  } catch (error) {
    console.error('Photo card failed:', error.message);
    await bot('sendMessage', { chat_id: chatId, text: caption(), parse_mode: 'HTML', reply_markup: keyboard() });
  }
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const text = message.text?.trim() ?? '';
  const command = text.startsWith('/') ? text.split(/[@\s]/)[0] : '';
  if (command === '/start' || command === '/card') await sendCard(message.chat.id);
}

async function handleInlineQuery(query) {
  if (cachedPhotoFileId) {
    try {
      await bot('answerInlineQuery', { inline_query_id: query.id, cache_time: 1, is_personal: true, results: [{ type: 'cached_photo', id: 'pumb-payment-photo-v11', photo_file_id: cachedPhotoFileId, caption: caption(), parse_mode: 'HTML', reply_markup: keyboard() }] });
      return;
    } catch (error) {
      console.warn('Inline cached photo failed:', error.message);
    }
  }
  await bot('answerInlineQuery', { inline_query_id: query.id, cache_time: 1, is_personal: true, results: [{ type: 'article', id: 'pumb-payment-article-v11', title: `PUMB • ${VISUAL_HOLDER}`, description: VISUAL_NUMBER, input_message_content: { message_text: caption(), parse_mode: 'HTML' }, reply_markup: keyboard() }] });
}

async function handleUpdate(update) {
  if (update.inline_query) return handleInlineQuery(update.inline_query);
  if (update.message) return handleMessage(update.message);
}

let offset = 0;
async function pollingLoop() {
  await bot('deleteWebhook', { drop_pending_updates: false });
  const me = await bot('getMe');
  console.log(`Bot started: @${me.username}`);
  while (true) {
    try {
      const updates = await bot('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'inline_query'] });
      for (const update of updates) {
        offset = update.update_id + 1;
        try { await handleUpdate(update); } catch (error) { console.error(`Update ${update.update_id} failed:`, error); }
      }
    } catch (error) {
      console.error('Polling failed:', error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

const port = Number(process.env.PORT || 3000);
http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('vanek_pumb_bot is running\n');
}).listen(port, () => console.log(`Health server on :${port}`));

pollingLoop().catch((error) => {
  console.error('Fatal bot error:', error);
  process.exit(1);
});