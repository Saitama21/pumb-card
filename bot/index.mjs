import http from 'node:http';

const TOKEN = process.env.BOT_TOKEN;
const CARD_URL = 'https://saitama21.github.io/pumb-card/';
const PREVIEW_URL = 'https://raw.githubusercontent.com/Saitama21/pumb-card/main/pumb-telegram-card.jpg';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;
let cachedPhotoFileId = null;

if (!TOKEN) {
  console.error('BOT_TOKEN is not set');
  process.exit(1);
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
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

async function downloadPreview() {
  const response = await fetch(`${PREVIEW_URL}?v=${Date.now()}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Preview returned ${response.status}`);
  const bytes = await response.arrayBuffer();
  return new Blob([bytes], { type: 'image/jpeg' });
}

async function sendPhotoUpload(chatId, card) {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption(card));
  form.append('parse_mode', 'HTML');
  form.append('reply_markup', JSON.stringify(keyboard(card.raw)));
  form.append('photo', await downloadPreview(), 'pumb-card.jpg');
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
          id: 'pumb-card-photo-v6',
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
      id: 'pumb-card-article-v6',
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
      const updates = await bot('getUpdates', { offset, timeout: 50, allowed_updates: ['message', 'inline_query'] });
      for (const update of updates) {
        offset = update.update_id + 1;
        try { await handleUpdate(update); }
        catch (error) { console.error(`Update ${update.update_id} failed:`, error); }
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
