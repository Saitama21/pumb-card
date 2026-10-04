import { api } from 'sdk';

const CARD_NUMBER = '4314 1402 1172 6887';
const CARD_RAW = '4314140211726887';
const CARD_URL = 'https://saitama21.github.io/pumb-card/';

function keyboard() {
  return {
    inline_keyboard: [
      [
        {
          text: '📋 Скопировать номер',
          copy_text: { text: CARD_RAW },
        },
      ],
      [
        {
          text: '🌐 Открыть карточку',
          url: CARD_URL,
        },
      ],
      [
        {
          text: '↗️ Отправить в чат',
          switch_inline_query_chosen_chat: {
            query: '',
            allow_user_chats: true,
            allow_bot_chats: false,
            allow_group_chats: true,
            allow_channel_chats: false,
          },
        },
      ],
    ],
  };
}

function cardText() {
  return [
    '💳 <b>ПУМБ</b>',
    '',
    '<b>Ерошов Иван Сергеевич</b>',
    `<code>${CARD_NUMBER}</code>`,
    '',
    'Нажмите кнопку ниже, чтобы скопировать номер карты.',
  ].join('\n');
}

export default async function (message) {
  const chatId = message.chat?.id;
  const text = message.text?.trim() ?? '';
  if (!chatId) return;

  const command = text.startsWith('/') ? text.split(/[@\s]/, 1)[0] : null;

  if (command === '/start' || command === '/card' || !text) {
    await api.sendMessage({
      chat_id: chatId,
      text: cardText(),
      parse_mode: 'HTML',
      reply_markup: keyboard(),
      link_preview_options: { is_disabled: true },
    });
    return;
  }

  await api.sendMessage({
    chat_id: chatId,
    text: 'Напишите /start — покажу карту ПУМБ.',
  });
}
