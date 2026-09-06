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
      [{
        text: '📤 Поделиться реквизитами',
        switch_inline_query_chosen_chat: {
          query: 'card',
          allow_user_chats: true,
          allow_bot_chats: true,
          allow_group_chats: true,
          allow_channel_chats: true,
        },
      }],
    ],
  };
}

function caption() {
  return `<b>${escapeHtml(VISUAL_HOLDER)}</b>\n<code>${VISUAL_NUMBER}</code>`;
}

const GLYPHS = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
  0: ['01110','10001','10011','10101','11001','10001','01110'],
  1: ['00100','01100','00100','00100','00100','00100','01110'],
  2: ['01110','10001','00001','00010','00100','01000','11111'],
  3: ['11110','00001','00001','01110','00001','00001','11110'],
  4: ['00010','00110','01010','10010','11111','00010','00010'],
  5: ['11111','10000','10000','11110','00001','00001','11110'],
  6: ['01110','10000','10000','11110','10001','10001','01110'],
  7: ['11111','00001','00010','00100','01000','01000','01000'],
  8: ['01110','10001','10001','01110','10001','10001','01110'],
  9: ['01110','10001','10001','01111','00001','00001','01110'],
};

function pixelGlyph(char, x, y, unit, fill = '#ffffff', opacity = 1) {
  const rows = GLYPHS[char.toUpperCase()];
  if (!rows) return '';
  const radius = Math.max(1, unit * 0.24);
  let out = '';
  for (let row = 0; row < rows.length; row += 1) {
    for (let col = 0; col < rows[row].length; col += 1) {
      if (rows[row][col] !== '1') continue;
      out += `<rect x="${(x + col * unit).toFixed(2)}" y="${(y + row * unit).toFixed(2)}" width="${(unit * 0.82).toFixed(2)}" height="${(unit * 0.82).toFixed(2)}" rx="${radius.toFixed(2)}" fill="${fill}" opacity="${opacity}"/>`;
    }
  }
  return out;
}

function pixelText(text, x, y, unit, options = {}) {
  const fill = options.fill ?? '#ffffff';
  const opacity = options.opacity ?? 1;
  const gap = options.gap ?? unit * 1.25;
  const space = options.space ?? unit * 3.2;
  let cursor = x;
  let out = '';

  for (const char of text) {
    if (char === ' ') {
      cursor += space;
      continue;
    }
    out += pixelGlyph(char, cursor, y, unit, fill, opacity);
    cursor += 5 * unit + gap;
  }
  return out;
}

function mixedCasePixelText(text, x, y, unit, fill = '#ffffff') {
  let cursor = x;
  let out = '';

  for (const char of text) {
    if (char === ' ') {
      cursor += unit * 3.8;
      continue;
    }

    const isLower = char >= 'a' && char <= 'z';
    const localUnit = isLower ? unit * 0.72 : unit;
    const localY = isLower ? y + unit * 1.95 : y;
    out += pixelGlyph(char, cursor, localY, localUnit, fill, 0.98);
    cursor += 5 * localUnit + localUnit * 1.45;
  }
  return out;
}

async function renderCardJpeg() {
  const numberVector = pixelText(VISUAL_NUMBER, 246, 278, 7.25, { gap: 8.4 });
  const nameVector = mixedCasePixelText(VISUAL_HOLDER, 96, 427, 6.7);
  const pumbVector = pixelText('PUMB', 162, 102, 4.75, { gap: 6.2 });

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#070910"/>
        <stop offset="0.52" stop-color="#101019"/>
        <stop offset="1" stop-color="#1c0b14"/>
      </linearGradient>
      <radialGradient id="redGlow" cx="0.12" cy="0.06" r="0.92">
        <stop offset="0" stop-color="#ff2b61" stop-opacity="0.82"/>
        <stop offset="0.42" stop-color="#d31343" stop-opacity="0.36"/>
        <stop offset="1" stop-color="#7d0829" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.17"/>
        <stop offset="0.30" stop-color="#ffffff" stop-opacity="0.075"/>
        <stop offset="0.72" stop-color="#ff416d" stop-opacity="0.055"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.025"/>
      </linearGradient>
      <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#ff7897" stop-opacity="0.22"/>
      </linearGradient>
      <linearGradient id="redPill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff285c"/>
        <stop offset="1" stop-color="#b80c35"/>
      </linearGradient>
      <filter id="blur" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="48"/>
      </filter>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000" flood-opacity="0.44"/>
      </filter>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>
    <ellipse cx="130" cy="70" rx="390" ry="290" fill="url(#redGlow)" filter="url(#blur)"/>
    <ellipse cx="1040" cy="575" rx="340" ry="235" fill="#b40d38" opacity="0.24" filter="url(#blur)"/>

    <rect x="54" y="44" width="1092" height="542" rx="56" fill="#0d1018" fill-opacity="0.68" filter="url(#shadow)"/>
    <rect x="54" y="44" width="1092" height="542" rx="56" fill="url(#glass)"/>
    <rect x="55" y="45" width="1090" height="540" rx="55" fill="none" stroke="url(#stroke)" stroke-width="2"/>

    <path d="M70 248 C270 90 482 76 706 135 C890 183 1010 157 1143 84 L1143 44 L54 44 L54 327 Z" fill="#fff" opacity="0.025"/>
    <path d="M420 586 C650 430 870 432 1146 502 L1146 586 Z" fill="#e61143" opacity="0.12"/>

    <g>
      <rect x="92" y="82" width="205" height="66" rx="22" fill="url(#redPill)"/>
      <circle cx="122" cy="115" r="11" fill="#fff" opacity="0.96"/>
      <circle cx="134" cy="115" r="11" fill="none" stroke="#fff" stroke-width="4" opacity="0.96"/>
      ${pumbVector}
    </g>

    <g>
      <rect x="892" y="88" width="212" height="54" rx="20" fill="#fff" fill-opacity="0.07" stroke="#fff" stroke-opacity="0.14"/>
      <circle cx="922" cy="115" r="7" fill="#ff4068"/>
      <circle cx="957" cy="115" r="7" fill="#fff" opacity="0.18"/>
      <circle cx="992" cy="115" r="7" fill="#fff" opacity="0.18"/>
    </g>

    <rect x="92" y="228" width="1016" height="150" rx="36" fill="#fff" fill-opacity="0.075" stroke="#fff" stroke-opacity="0.11"/>

    <g>
      <rect x="112" y="250" width="92" height="102" rx="28" fill="#fff" fill-opacity="0.07" stroke="#fff" stroke-opacity="0.12"/>
      <circle cx="158" cy="301" r="22" fill="#ff285a" fill-opacity="0.16" stroke="#ff7897" stroke-opacity="0.28"/>
      <path d="M146 294h24M146 302h24M146 310h24" stroke="#ffd578" stroke-width="4.5" stroke-linecap="round" opacity="0.94"/>
      <path d="M158 285v34" stroke="#ffd578" stroke-width="3.5" stroke-linecap="round" opacity="0.70"/>
    </g>

    ${numberVector}
    <rect x="246" y="352" width="748" height="2" rx="1" fill="#fff" opacity="0.08"/>

    ${nameVector}

    <g>
      <rect x="94" y="520" width="476" height="46" rx="18" fill="#fff" fill-opacity="0.06" stroke="#fff" stroke-opacity="0.10"/>
      <circle cx="118" cy="543" r="6" fill="#ff3159"/>
      <rect x="140" y="539" width="312" height="7" rx="3.5" fill="#fff" opacity="0.20"/>
      <rect x="140" y="551" width="214" height="5" rx="2.5" fill="#fff" opacity="0.10"/>
    </g>

    <g>
      <circle cx="990" cy="536" r="50" fill="#fff" fill-opacity="0.055" stroke="#fff" stroke-opacity="0.12"/>
      <path d="M967 536h43M991 512l22 24-22 24" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.86"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4', progressive: false })
    .toBuffer();
}

async function sendPhotoUpload(chatId) {
  const image = await renderCardJpeg();
  console.log(`Rendered JPEG: ${image.length} bytes; magic=${image.subarray(0, 3).toString('hex')}`);

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
    const sent = cachedPhotoFileId
      ? await bot('sendPhoto', {
          chat_id: chatId,
          photo: cachedPhotoFileId,
          caption: caption(),
          parse_mode: 'HTML',
          reply_markup: keyboard(),
        })
      : await sendPhotoUpload(chatId);

    console.log(`Photo card sent to ${chatId}; message=${sent.message_id}`);
  } catch (error) {
    console.error('Photo card failed:', error.message);
    await bot('sendMessage', {
      chat_id: chatId,
      text: caption(),
      parse_mode: 'HTML',
      reply_markup: keyboard(),
    });
  }
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const text = message.text?.trim() ?? '';
  const command = text.startsWith('/') ? text.split(/[@\s]/)[0] : '';
  console.log(`Message from ${message.chat.id}: ${text || '[non-text]'}`);

  if (command === '/start' || command === '/card') {
    await sendCard(message.chat.id);
  }
}

async function handleInlineQuery(query) {
  const queryText = query.query?.trim().toLowerCase() ?? '';
  console.log(`Inline query from ${query.from?.id ?? 'unknown'}: ${queryText || '[empty]'}`);

  if (cachedPhotoFileId) {
    try {
      await bot('answerInlineQuery', {
        inline_query_id: query.id,
        cache_time: 1,
        is_personal: true,
        results: [{
          type: 'cached_photo',
          id: 'pumb-payment-photo-v13',
          photo_file_id: cachedPhotoFileId,
          caption: caption(),
          parse_mode: 'HTML',
          reply_markup: keyboard(),
        }],
      });
      return;
    } catch (error) {
      console.warn('Inline cached photo failed:', error.message);
    }
  }

  await bot('answerInlineQuery', {
    inline_query_id: query.id,
    cache_time: 1,
    is_personal: true,
    results: [{
      type: 'article',
      id: 'pumb-payment-article-v13',
      title: `PUMB • ${VISUAL_HOLDER}`,
      description: VISUAL_NUMBER,
      input_message_content: {
        message_text: caption(),
        parse_mode: 'HTML',
      },
      reply_markup: keyboard(),
    }],
  });
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
      const updates = await bot('getUpdates', {
        offset,
        timeout: 50,
        allowed_updates: ['message', 'inline_query'],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handleUpdate(update);
        } catch (error) {
          console.error(`Update ${update.update_id} failed:`, error);
        }
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