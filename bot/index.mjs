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
  const holder = escapeXml(card.holder);
  const number = escapeXml(card.number);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#11141d"/>
        <stop offset="1" stop-color="#241720"/>
      </linearGradient>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d7193f"/>
        <stop offset="1" stop-color="#a70f31"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.35"/>
      </filter>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>
    <circle cx="150" cy="120" r="260" fill="#d7193f" opacity="0.12"/>
    <circle cx="1080" cy="560" r="280" fill="#d7193f" opacity="0.08"/>

    <rect x="80" y="70" width="1040" height="490" rx="44" fill="url(#card)" filter="url(#shadow)"/>
    <rect x="80" y="70" width="1040" height="490" rx="44" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2"/>

    <text x="132" y="155" font-family="DejaVu Sans, Arial, sans-serif" font-size="66" font-weight="700" fill="#ffffff">ПУМБ</text>
    <text x="134" y="205" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" fill="#ffeef2">Реквізити картки</text>

    <rect x="132" y="270" width="118" height="82" rx="14" fill="#f1d28a"/>
    <path d="M191 270v82M132 311h118" stroke="#9b753e" stroke-width="4" opacity="0.75"/>
    <path d="M151 292h80M151 330h80" stroke="#9b753e" stroke-width="3" opacity="0.55"/>

    <text x="305" y="325" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="54" font-weight="700" fill="#ffffff" letter-spacing="1">${number}</text>
    <text x="305" y="410" font-family="DejaVu Sans, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${holder}</text>

    <rect x="900" y="120" width="160" height="58" rx="18" fill="#ffffff" fill-opacity="0.13"/>
    <text x="936" y="159" font-family="DejaVu Sans, Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">PUMB</text>

    <text x="132" y="500" font-family="DejaVu Sans, Arial, sans-serif" font-size="25" fill="#ffe8ee">Натисніть кнопку нижче, щоб скопіювати номер</text>
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', progressive: false })
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
          id: 'pumb-card-photo-v7',
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
      id: 'pumb-card-article-v7',
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
