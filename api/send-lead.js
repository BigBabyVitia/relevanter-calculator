// Vercel Serverless Function — Send lead to Telegram
// Environment variables (set in Vercel Dashboard):
//   TELEGRAM_BOT_TOKEN — your bot token from @BotFather
//   TELEGRAM_CHAT_ID   — chat/group ID to receive messages

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { name, company, employees, phone, contact, comment, calculator } = req.body;

  if (!name || !company || !phone || !contact) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { recruiters, scoring, dialogs, interviews, total } = calculator || {};

  // Format message
  const message = [
    '🚀 Новая заявка — Relevanter',
    '',
    `👤 Имя: ${name}`,
    `🏢 Компания: ${company}`,
    `👥 Сотрудников: ${employees || '—'}`,
    `📞 Телефон: ${phone}`,
    `📬 Email: ${contact}`,
    comment ? `💬 Комментарий: ${comment}` : '',
    '',
    '📊 Расчёт из калькулятора:',
    `• Рекрутеров: ${recruiters ?? '—'}`,
    `• Scoring резюме: ${scoring ? scoring.toLocaleString('ru-RU') : '0'}`,
    `• AI-диалоги: ${dialogs ? dialogs.toLocaleString('ru-RU') : '0'}`,
    `• AI-интервью: ${interviews ? interviews.toLocaleString('ru-RU') : '0'}`,
    `• Итого к оплате: ${total ? total.toLocaleString('ru-RU') : '0'} ₽`,
  ].filter(Boolean).join('\n');

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML',
        }),
      }
    );

    if (!tgRes.ok) {
      const err = await tgRes.text();
      console.error('Telegram API error:', err);
      return res.status(502).json({ error: 'Failed to send to Telegram' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram send error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
