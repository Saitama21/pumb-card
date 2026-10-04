import http from 'node:http';

const TOKEN = process.env.BOT_TOKEN;
const CARD_URL = 'https://saitama21.github.io/pumb-card/';
const PREVIEW_URL = 'https://saitama21.github.io/pumb-card/og-preview.png?v=2';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

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

async function loadCard() {
  const response = await fetch(CARD_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Card page returned ${response.status}`);
  const html = await response.text();

  const numberMatch = html.match(/id=["']number["'][^>]*>([0-9 ]+)</i);
  const holderMatch = html.match(/id=["']card-title["'][^>]*>([^<]+)</i);
  if (!numberMatch) throw new Error('Card number not found on card page');

  const number = numberMatch[1].trim();
  const raw = number.replace(/\D/g, '');
  const holder = holderMatch?.[1]?.trim() || 'Получатель';
  return { number, raw, holder };
}

function keyboard(raw) {
  return {
    inline_keyboard: [
      [
        {
          text: '📋 Скопировать номер',
          copy_text: { text: raw },
        },
      ],
      [
        {
          text: '🌐 Открыть карточку',
          url: CARD_URL,
        },
      ],
    ],
  };
}

function caption(card) {
  return [
    '💳 <b>ПУМБ</b>',
    '',
    `<b>${escapeHtml(card.holder)}</b>`,
    `<code>${escapeHtml(card.number)}</code>`,
    '',
    'Нажмите кнопку ниже, чтобы скопировать номер карты.',
  ].join('\n');
}

async function sendCard(chatId) {
  const card = await loadCard();
  await bot('sendPhoto', {
    chat_id: chatId,
    photo: PREVIEW_URL,
    caption: caption(card),
    parse_mode: 'HTML',
    reply_markup: keyboard(card.raw),
  });
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const text = message.text?.trim() ?? '';
  const command = text.startsWith('/') ? text.split(/[@\s]/, 1)[0] : '';

  if (command === '/start' || command === '/card' || text) {
    await sendCard(message.chat.id);
  }
}

async function handleInlineQuery(query) {
  const card = await loadCard();

  await bot('answerInlineQuery', {
    inline_query_id: query.id,
    cache_time: 1,
    is_personal: true,
    results: [
      {
        type: 'photo',
        id: 'pumb-card-main',
        photo_url: PREVIEW_URL,
        thumbnail_url: PREVIEW_URL,
        photo_width: 600,
        photo_height: 315,
        title: `ПУМБ • ${card.holder}`,
        description: card.number,
        caption: caption(card),
        parse_mode: 'HTML',
        reply_markup: keyboard(card.raw),
      },
    ],
  });
}

async function handleUpdate(update) {
  if (update.inline_query) {
    await handleInlineQuery(update.inline_query);
    return;
  }
  if (update.message) {
    await handleMessage(update.message);
  }
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
          console.error('Update failed:', error);
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
