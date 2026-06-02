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

  const calculatorData = calculator || {};
  const recruiters = calculatorData.recruiters;
  const scoringMonthly = calculatorData.scoringMonthly ?? calculatorData.scoringPerMonth ?? calculatorData.scoring ?? 0;
  const dialogsMonthly = calculatorData.dialogsMonthly ?? calculatorData.dialogsPerMonth ?? calculatorData.dialogs ?? 0;
  const interviewsMonthly = calculatorData.interviewsMonthly ?? calculatorData.interviewsPerMonth ?? calculatorData.interviews ?? 0;
  const annualOperationsTotal = calculatorData.annualOperationsTotal ?? calculatorData.annualTotal ?? calculatorData.total ?? 0;
  const annualBonusAmount = calculatorData.annualBonusAmount ?? 0;
  const annualBalanceTotal = calculatorData.annualBalanceTotal ?? annualOperationsTotal + annualBonusAmount;

  const formatNumber = value => Number(value || 0).toLocaleString('ru-RU');

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
    `• Рекрутеров: ${recruiters ? formatNumber(recruiters) : '—'}`,
    `• Оценка резюме на 1 рекрутера в месяц: ${formatNumber(scoringMonthly)}`,
    `• AI-диалоги на 1 рекрутера в месяц: ${formatNumber(dialogsMonthly)}`,
    `• AI-интервью на 1 рекрутера в месяц: ${formatNumber(interviewsMonthly)}`,
    `• Годовой бюджет операций: ${formatNumber(annualOperationsTotal)} ₽`,
    `• Бонус на баланс: ${formatNumber(annualBonusAmount)} ₽`,
    `• На балансе за год: ${formatNumber(annualBalanceTotal)} ₽`,
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
