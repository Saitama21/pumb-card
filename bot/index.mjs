import http from 'node:http';

const TOKEN = process.env.BOT_TOKEN;
const CARD_URL = 'https://saitama21.github.io/pumb-card/';
const PREVIEW_URL = 'https://saitama21.github.io/pumb-card/og-preview.png?v=2';
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

const FALLBACK_CARD = {
  holder: 'Ерошов Иван Сергеевич',
  number: '4314 1402 1172 6887',
  raw: '4314140211726887',
};

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
    const error = new Error(`${method}: ${payload.error_code ?? ''} ${payload.description ?? 'Telegram API error'}`);
    error.code = payload.error_code;
    throw error;
  }
  return payload.result;
}

async function loadCard() {
  try {
    const response = await fetch(CARD_URL, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Card page returned ${response.status}`);
    const html = await response.text();

    const numberMatch = html.match(/id=["']number["'][^>]*>([0-9 ]+)</i);
    const holderMatch = html.match(/id=["']card-title["'][^>]*>([^<]+)</i);
    if (!numberMatch) throw new Error('Card number not found on card page');

    const number = numberMatch[1].trim();
    return {
      number,
      raw: number.replace(/\D/g, ''),
      holder: holderMatch?.[1]?.trim() || FALLBACK_CARD.holder,
    };
  } catch (error) {
    console.warn('Card page unavailable, using fallback:', error.message);
    return FALLBACK_CARD;
  }
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

function linkKeyboard() {
  return {
    inline_keyboard: [
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
  const text = caption(card);

  try {
    await bot('sendPhoto', {
      chat_id: chatId,
      photo: PREVIEW_URL,
      caption: text,
      parse_mode: 'HTML',
      reply_markup: keyboard(card.raw),
    });
    console.log(`Card sent as photo to ${chatId}`);
    return;
  } catch (error) {
    console.warn('sendPhoto failed, falling back to sendMessage:', error.message);
  }

  try {
    await bot('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard(card.raw),
    });
    console.log(`Card sent as message to ${chatId}`);
    return;
  } catch (error) {
    console.warn('sendMessage with copy button failed:', error.message);
  }

  await bot('sendMessage', {
    chat_id: chatId,
    text: `${text}\n\nНомер без пробелов: <code>${card.raw}</code>`,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: linkKeyboard(),
  });
  console.log(`Card sent with safe fallback to ${chatId}`);
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const text = message.text?.trim() ?? '';
  const command = text.startsWith('/') ? text.split(/[@\s]/)[0] : '';
  console.log(`Message from ${message.chat.id}: ${text || '[non-text]'}`);

  if (command === '/start' || command === '/card') {
    await sendCard(message.chat.id);
    return;
  }

  if (text) {
    await sendCard(message.chat.id);
  }
}

async function handleInlineQuery(query) {
  console.log(`Inline query from ${query.from?.id ?? 'unknown'}: ${query.query ?? ''}`);
  const card = await loadCard();

  const result = {
    type: 'article',
    id: 'pumb-card-main-v2',
    title: `ПУМБ • ${card.holder}`,
    description: card.number,
    input_message_content: {
      message_text: caption(card),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    },
    reply_markup: keyboard(card.raw),
  };

  try {
    await bot('answerInlineQuery', {
      inline_query_id: query.id,
      cache_time: 1,
      is_personal: true,
      results: [result],
    });
  } catch (error) {
    console.warn('Inline result with copy button failed:', error.message);
    result.reply_markup = linkKeyboard();
    await bot('answerInlineQuery', {
      inline_query_id: query.id,
      cache_time: 1,
      is_personal: true,
      results: [result],
    });
  }
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
