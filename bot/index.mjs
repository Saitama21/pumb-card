import http from 'node:http';
import sharp from 'sharp';

const TOKEN = process.env.BOT_TOKEN;
const CARD_URL = 'https://saitama21.github.io/pumb-card/';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;
let cachedPhotoFileId = null;

if (!TOKEN) {
  console.error('BOT_TOKEN is not set');
  process.exit(1);
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function bot(method, params = {}) {
  const response = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(`${method}: ${payload.error_code ?? ''} ${payload.description ?? 'Telegram API error'}`);
  return payload.result;
}

async function botMultipart(method, form) {
  const response = await fetch(`${API}/${method}`, { method: 'POST', body: form });
  const payload = await response.json();
  if (!payload.ok) throw new Error(`${method}: ${payload.error_code ?? ''} ${payload.description ?? 'Telegram API error'}`);
  return payload.result;
}

async function loadCard() {
  const response = await fetch(CARD_URL, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Card page returned ${response.status}`);
  const html = await response.text();
  const numberMatch = html.match(/id=["']number["'][^>]*>([0-9 ]+)</i);
  const holderMatch = html.match(/id=["']card-title["'][^>]*>([^<]+)</i);
  if (!numberMatch || !holderMatch) throw new Error('Card data not found on card page');
  const number = numberMatch[1].trim();
  return { holder: holderMatch[1].trim(), number, raw: number.replace(/\D/g, '') };
}

function keyboard(raw) {
  return {
    inline_keyboard: [
      [{ text: '📋 Скопировать номер', copy_text: { text: raw } }],
      [{ text: '🌐 Открыть карточку', url: CARD_URL }],
    ],
  };
}

function caption(card) {
  return `<b>${escapeHtml(card.holder)}</b>\n<code>${escapeHtml(card.number)}</code>`;
}

async function renderCardJpeg(card) {
  const number = escapeXml(card.number);
  const latinHolder = 'Yeroshov Ivan Sergiyovich';

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#080b12"/>
        <stop offset="0.52" stop-color="#12111a"/>
        <stop offset="1" stop-color="#1b0b14"/>
      </linearGradient>
      <radialGradient id="redGlow" cx="0.18" cy="0.05" r="0.95">
        <stop offset="0" stop-color="#ff174b" stop-opacity="0.88"/>
        <stop offset="0.44" stop-color="#d20d3b" stop-opacity="0.50"/>
        <stop offset="1" stop-color="#7d0829" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="0.28" stop-color="#ffffff" stop-opacity="0.08"/>
        <stop offset="0.72" stop-color="#ff2c58" stop-opacity="0.07"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.03"/>
      </linearGradient>
      <linearGradient id="glassStroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.34"/>
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.09"/>
        <stop offset="1" stop-color="#ff5f7f" stop-opacity="0.24"/>
      </linearGradient>
      <linearGradient id="redPill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f01b4a"/>
        <stop offset="1" stop-color="#ae0c33"/>
      </linearGradient>
      <linearGradient id="numberPanel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.055"/>
      </linearGradient>
      <filter id="blur24" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="24"/>
      </filter>
      <filter id="blur48" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="48"/>
      </filter>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="26" stdDeviation="28" flood-color="#000000" flood-opacity="0.44"/>
      </filter>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>

    <ellipse cx="170" cy="80" rx="390" ry="300" fill="url(#redGlow)" filter="url(#blur48)"/>
    <ellipse cx="1040" cy="580" rx="360" ry="260" fill="#a70b35" opacity="0.28" filter="url(#blur48)"/>
    <ellipse cx="790" cy="40" rx="240" ry="120" fill="#ff2b59" opacity="0.12" filter="url(#blur24)"/>

    <rect x="56" y="44" width="1088" height="542" rx="54" fill="#0f1018" fill-opacity="0.66" filter="url(#shadow)"/>
    <rect x="56" y="44" width="1088" height="542" rx="54" fill="url(#glass)"/>
    <rect x="57" y="45" width="1086" height="540" rx="53" fill="none" stroke="url(#glassStroke)" stroke-width="2"/>

    <path d="M76 250 C280 70 520 76 712 138 C892 196 998 166 1134 92 L1134 44 L56 44 L56 330 Z" fill="#ffffff" opacity="0.022"/>
    <path d="M402 586 C610 420 830 410 1144 502 L1144 586 Z" fill="#e10f42" opacity="0.10"/>

    <g transform="translate(92 84)">
      <rect x="0" y="0" width="160" height="64" rx="22" fill="url(#redPill)"/>
      <circle cx="32" cy="32" r="11" fill="#ffffff" opacity="0.92"/>
      <circle cx="44" cy="32" r="11" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.92"/>
      <text x="66" y="42" font-family="DejaVu Sans, Arial, sans-serif" font-size="31" font-weight="700" fill="#ffffff">ПУМБ</text>
    </g>

    <g transform="translate(895 88)">
      <rect width="206" height="54" rx="19" fill="#ffffff" fill-opacity="0.075" stroke="#ffffff" stroke-opacity="0.14"/>
      <circle cx="28" cy="27" r="7" fill="#ff3b63"/>
      <text x="48" y="35" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="600" fill="#f8f8fb" opacity="0.92">PAYMENT INFO</text>
    </g>

    <text x="94" y="208" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="600" fill="#ffffff" opacity="0.56" letter-spacing="2">CARD DETAILS</text>

    <rect x="92" y="236" width="1016" height="128" rx="34" fill="url(#numberPanel)" stroke="#ffffff" stroke-opacity="0.12"/>
    <rect x="110" y="254" width="90" height="92" rx="28" fill="#ffffff" fill-opacity="0.075" stroke="#ffffff" stroke-opacity="0.13"/>
    <path d="M140 284h30M140 299h30M140 314h30" stroke="#ffd37c" stroke-width="5" stroke-linecap="round" opacity="0.94"/>
    <path d="M155 269v60" stroke="#ffd37c" stroke-width="4" stroke-linecap="round" opacity="0.62"/>

    <text x="238" y="319" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="55" font-weight="700" fill="#ffffff" letter-spacing="2">${number}</text>

    <text x="96" y="428" font-family="DejaVu Sans, Arial, sans-serif" font-size="21" font-weight="600" fill="#ffffff" opacity="0.46" letter-spacing="2">CARD HOLDER</text>
    <text x="94" y="482" font-family="DejaVu Sans, Arial, sans-serif" font-size="41" font-weight="700" fill="#ffffff">${latinHolder}</text>

    <g transform="translate(94 518)">
      <rect width="476" height="46" rx="18" fill="#ffffff" fill-opacity="0.065" stroke="#ffffff" stroke-opacity="0.10"/>
      <circle cx="24" cy="23" r="6" fill="#ff3159"/>
      <text x="44" y="30" font-family="DejaVu Sans, Arial, sans-serif" font-size="19" font-weight="500" fill="#ffffff" opacity="0.68">Tap the button below to copy the number</text>
    </g>

    <g transform="translate(914 504)">
      <circle cx="66" cy="30" r="54" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.11"/>
      <path d="M46 31h40M67 10l20 21-20 21" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.86"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4', progressive: false })
    .toBuffer();
}

async function sendPhotoUpload(chatId, card) {
  const image = await renderCardJpeg(card);
  console.log(`Rendered JPEG: ${image.length} bytes; magic=${image.subarray(0, 3).toString('hex')}`);

  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption(card));
  form.append('parse_mode', 'HTML');
  form.append('reply_markup', JSON.stringify(keyboard(card.raw)));
  form.append('photo', new Blob([image], { type: 'image/jpeg' }), 'pumb-card.jpg');

  const sent = await botMultipart('sendPhoto', form);
  const photos = sent.photo || [];
  if (photos.length) cachedPhotoFileId = photos[photos.length - 1].file_id;
  return sent;
}

async function sendCard(chatId) {
  const card = await loadCard();
  try {
    const sent = cachedPhotoFileId
      ? await bot('sendPhoto', {
          chat_id: chatId,
          photo: cachedPhotoFileId,
          caption: caption(card),
          parse_mode: 'HTML',
          reply_markup: keyboard(card.raw),
        })
      : await sendPhotoUpload(chatId, card);
    console.log(`Photo card sent to ${chatId}; message=${sent.message_id}`);
  } catch (error) {
    console.error('Photo card failed:', error.message);
    await bot('sendMessage', {
      chat_id: chatId,
      text: caption(card),
      parse_mode: 'HTML',
      reply_markup: keyboard(card.raw),
    });
  }
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const text = message.text?.trim() ?? '';
  const command = text.startsWith('/') ? text.split(/[@\s]/)[0] : '';
  console.log(`Message from ${message.chat.id}: ${text || '[non-text]'}`);
  if (command === '/start' || command === '/card') await sendCard(message.chat.id);
}

async function handleInlineQuery(query) {
  const card = await loadCard();
  if (cachedPhotoFileId) {
    try {
      await bot('answerInlineQuery', {
        inline_query_id: query.id,
        cache_time: 1,
        is_personal: true,
        results: [{
          type: 'cached_photo',
          id: 'pumb-card-photo-v8',
          photo_file_id: cachedPhotoFileId,
          caption: caption(card),
          parse_mode: 'HTML',
          reply_markup: keyboard(card.raw),
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
      id: 'pumb-card-article-v8',
      title: `ПУМБ • ${card.holder}`,
      description: card.number,
      input_message_content: { message_text: caption(card), parse_mode: 'HTML' },
      reply_markup: keyboard(card.raw),
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
