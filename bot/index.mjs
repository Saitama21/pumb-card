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
    const raw = numberMatch?.[1]?.replace(/\D/g, '') || VISUAL_NUMBER;

    return {
      holder: holderMatch?.[1]?.trim() || VISUAL_HOLDER,
      number: numberMatch?.[1]?.trim() || VISUAL_NUMBER,
      raw,
    };
  } catch (error) {
    console.warn(`Card page unavailable, using embedded payment data: ${error.message}`);
    return {
      holder: VISUAL_HOLDER,
      number: VISUAL_NUMBER,
      raw: VISUAL_NUMBER,
    };
  }
}

function keyboard(raw) {
  return {
    inline_keyboard: [
      [{ text: '📋 Скопировать номер', copy_text: { text: raw || VISUAL_NUMBER } }],
      [{ text: '🌐 Открыть карточку', url: CARD_URL }],
    ],
  };
}

function caption(card) {
  const raw = card?.raw || VISUAL_NUMBER;
  return `<b>${escapeHtml(VISUAL_HOLDER)}</b>\n<code>${escapeHtml(raw)}</code>`;
}

async function renderCardJpeg(card) {
  const compactNumber = escapeXml(card?.raw || VISUAL_NUMBER);
  const displayNumber = compactNumber.replace(/(.{4})/g, '$1 ').trim();
  const latinHolder = escapeXml(VISUAL_HOLDER);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#070910"/>
        <stop offset="0.50" stop-color="#111019"/>
        <stop offset="1" stop-color="#1b0b14"/>
      </linearGradient>

      <radialGradient id="glowA" cx="0.12" cy="0.03" r="0.88">
        <stop offset="0" stop-color="#ff2b61" stop-opacity="0.82"/>
        <stop offset="0.38" stop-color="#d51345" stop-opacity="0.36"/>
        <stop offset="1" stop-color="#7f092b" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="glowB" cx="0.90" cy="0.95" r="0.68">
        <stop offset="0" stop-color="#ff174d" stop-opacity="0.32"/>
        <stop offset="1" stop-color="#7f092b" stop-opacity="0"/>
      </radialGradient>

      <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.17"/>
        <stop offset="0.30" stop-color="#ffffff" stop-opacity="0.075"/>
        <stop offset="0.72" stop-color="#ff426c" stop-opacity="0.055"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.025"/>
      </linearGradient>

      <linearGradient id="glassStroke" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.30"/>
        <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#ff7897" stop-opacity="0.20"/>
      </linearGradient>

      <linearGradient id="redPill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff285c"/>
        <stop offset="1" stop-color="#b50b35"/>
      </linearGradient>

      <linearGradient id="infoPanel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.115"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0.045"/>
      </linearGradient>

      <filter id="blur28" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="28"/>
      </filter>

      <filter id="blur52" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="52"/>
      </filter>

      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>

    <rect width="1200" height="630" fill="url(#bg)"/>

    <ellipse cx="120" cy="70" rx="390" ry="290" fill="url(#glowA)" filter="url(#blur52)"/>
    <ellipse cx="1060" cy="570" rx="350" ry="245" fill="url(#glowB)" filter="url(#blur52)"/>
    <ellipse cx="780" cy="20" rx="260" ry="120" fill="#ff315f" opacity="0.10" filter="url(#blur28)"/>

    <rect x="54" y="44" width="1092" height="542" rx="56" fill="#0d1018" fill-opacity="0.68" filter="url(#shadow)"/>
    <rect x="54" y="44" width="1092" height="542" rx="56" fill="url(#glass)"/>
    <rect x="55" y="45" width="1090" height="540" rx="55" fill="none" stroke="url(#glassStroke)" stroke-width="2"/>

    <path d="M72 250 C270 88 480 74 704 134 C888 184 1010 156 1142 82 L1142 44 L54 44 L54 326 Z" fill="#ffffff" opacity="0.026"/>
    <path d="M420 586 C650 430 872 432 1146 502 L1146 586 Z" fill="#e61243" opacity="0.12"/>

    <g transform="translate(92 82)">
      <rect width="172" height="66" rx="22" fill="url(#redPill)"/>
      <circle cx="30" cy="33" r="11" fill="#ffffff" opacity="0.96"/>
      <circle cx="42" cy="33" r="11" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.96"/>
      <text x="66" y="43" font-family="DejaVu Sans, Arial, sans-serif" font-size="31" font-weight="700" fill="#ffffff">PUMB</text>
    </g>

    <g transform="translate(868 88)">
      <rect width="236" height="54" rx="20" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.14"/>
      <circle cx="28" cy="27" r="6" fill="#ff4068"/>
      <text x="47" y="35" font-family="DejaVu Sans, Arial, sans-serif" font-size="21" font-weight="600" fill="#ffffff" opacity="0.88">LIQUID PAYMENT</text>
    </g>

    <text x="94" y="202" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" font-weight="600" fill="#ffffff" opacity="0.48" letter-spacing="2">PAYMENT DETAILS</text>

    <rect x="92" y="228" width="1016" height="146" rx="36" fill="url(#infoPanel)" stroke="#ffffff" stroke-opacity="0.11"/>

    <g transform="translate(112 250)">
      <rect width="92" height="102" rx="28" fill="#ffffff" fill-opacity="0.07" stroke="#ffffff" stroke-opacity="0.12"/>
      <circle cx="46" cy="51" r="22" fill="#ff285a" fill-opacity="0.16" stroke="#ff7897" stroke-opacity="0.28"/>
      <path d="M34 44h24M34 52h24M34 60h24" stroke="#ffd578" stroke-width="4.5" stroke-linecap="round" opacity="0.92"/>
      <path d="M46 35v33" stroke="#ffd578" stroke-width="3.5" stroke-linecap="round" opacity="0.68"/>
    </g>

    <text x="238" y="270" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="600" fill="#ffffff" opacity="0.42" letter-spacing="2">NUMBER</text>
    <text x="238" y="330" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="49" font-weight="700" fill="#ffffff" letter-spacing="2">${displayNumber}</text>
    <text x="238" y="355" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="20" font-weight="600" fill="#ffffff" opacity="0.42" letter-spacing="1.2">${compactNumber}</text>

    <text x="94" y="426" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="600" fill="#ffffff" opacity="0.46" letter-spacing="2">RECIPIENT</text>
    <text x="94" y="478" font-family="DejaVu Sans, Arial, sans-serif" font-size="40" font-weight="700" fill="#ffffff">${latinHolder}</text>

    <g transform="translate(94 516)">
      <rect width="510" height="48" rx="18" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.10"/>
      <circle cx="24" cy="24" r="6" fill="#ff3159"/>
      <text x="44" y="31" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" font-weight="500" fill="#ffffff" opacity="0.68">Use the button below to copy the number</text>
    </g>

    <g transform="translate(935 492)">
      <circle cx="54" cy="44" r="50" fill="#ffffff" fill-opacity="0.055" stroke="#ffffff" stroke-opacity="0.12"/>
      <path d="M31 44h43M55 20l22 24-22 24" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.86"/>
    </g>
  </svg>`;

  return sharp(Buffer.from(svg))
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4', progressive: false })
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
  form.append('photo', new Blob([image], { type: 'image/jpeg' }), 'pumb-payment-widget.jpg');

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

  if (command === '/start' || command === '/card') {
    await sendCard(message.chat.id);
  }
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
          id: 'pumb-payment-photo-v10',
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
      id: 'pumb-payment-article-v10',
      title: `PUMB • ${VISUAL_HOLDER}`,
      description: card.raw || VISUAL_NUMBER,
      input_message_content: {
        message_text: caption(card),
        parse_mode: 'HTML',
      },
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
