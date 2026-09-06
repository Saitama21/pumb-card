import { api, fetch } from 'sdk';

const CARD_URL = 'https://saitama21.github.io/pumb-card/';
const PREVIEW_URL = 'https://saitama21.github.io/pumb-card/og-preview.png?v=2';

async function loadCard() {
  const response = await fetch(CARD_URL);
  if (!response.ok) throw new Error(`Card page returned ${response.status}`);
  const html = await response.text();

  const numberMatch = html.match(/id=["']number["'][^>]*>([0-9 ]+)</i);
  const holderMatch = html.match(/id=["']card-title["'][^>]*>([^<]+)</i);

  if (!numberMatch) throw new Error('Card number not found');

  const number = numberMatch[1].trim();
  const raw = number.replace(/\D/g, '');
  const holder = holderMatch?.[1]?.trim() || 'Получатель';
  return { number, raw, holder };
}

export default async function (inlineQuery) {
  const card = await loadCard();

  await api.answerInlineQuery({
    inline_query_id: inlineQuery.id,
    cache_time: 60,
    is_personal: true,
    results: [
      {
        type: 'article',
        id: 'pumb-card-main',
        title: `ПУМБ • ${card.holder}`,
        description: card.number,
        thumbnail_url: PREVIEW_URL,
        input_message_content: {
          message_text: [
            '💳 <b>ПУМБ</b>',
            '',
            `<b>${card.holder}</b>`,
            `<code>${card.number}</code>`,
            '',
            'Нажмите кнопку ниже, чтобы скопировать номер карты.',
          ].join('\n'),
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        },
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📋 Скопировать номер',
                copy_text: { text: card.raw },
              },
            ],
            [
              {
                text: '🌐 Открыть карточку',
                url: CARD_URL,
              },
            ],
          ],
        },
      },
    ],
  });
}
