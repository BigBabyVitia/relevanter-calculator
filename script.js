/* ==============================
   Relevanter Calculator — Logic
   ============================== */

// ---- Pricing ----
const SUBSCRIPTION_PRICE = 12000;
const SCORING_PRICE = 1;
const DIALOG_PRICE = 20;
const INTERVIEW_PRICE = 80;

const BONUS_TIERS = [
  { threshold: 3_000_000, bonus: 0.10 },
  { threshold: 1_500_000, bonus: 0.07 },
  { threshold:   700_000, bonus: 0.05 },
  { threshold:   500_000, bonus: 0.03 },
  { threshold:   300_000, bonus: 0.015 },
];

const PERIODS = [
  { months: 1,  label: 'Месяц' },
  { months: 3,  label: 'Квартал' },
  { months: 6,  label: 'Полугодие' },
  { months: 12, label: 'Год' },
];

// ---- DOM refs ----
const inputs = {
  recruiters: document.getElementById('recruiters_count'),
  scoring:    document.getElementById('scoring_count'),
  dialogs:    document.getElementById('dialogs_count'),
  interviews: document.getElementById('interviews_count'),
};

const resultEls = {
  bonusBarFill:       document.getElementById('bonus-bar-fill'),
  bonusInfo:          document.getElementById('bonus-info'),
  totalFinal:         document.getElementById('total-final'),
  bonusDetail:        document.getElementById('bonus-detail'),
  savingsDetail:      document.getElementById('savings-detail'),
  subFormula:         document.getElementById('sub-formula'),
};

function pluralRecruiters(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'рекрутер';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'рекрутера';
  return 'рекрутеров';
}

// ---- Number formatting ----
function formatNumber(n) {
  return n.toLocaleString('ru-RU');
}

function formatCurrency(n) {
  return formatNumber(n) + ' ₽';
}

// Safe math expression evaluator (no eval, supports parentheses)
function safeCalc(expr) {
  const clean = expr.replace(/[^0-9*/+\-()]/g, '');
  if (!clean) return 0;
  try {
    return Math.max(0, Math.round(evalExpr(clean)));
  } catch {
    return 0;
  }
}

// Recursive descent parser: expr → term ((+|-) term)*
// term → factor ((*|/) factor)*
// factor → number | '(' expr ')'
function evalExpr(str) {
  let pos = 0;

  function parseExpr() {
    let result = parseTerm();
    while (pos < str.length && (str[pos] === '+' || str[pos] === '-')) {
      const op = str[pos++];
      const right = parseTerm();
      result = op === '+' ? result + right : result - right;
    }
    return result;
  }

  function parseTerm() {
    let result = parseFactor();
    while (pos < str.length && (str[pos] === '*' || str[pos] === '/')) {
      const op = str[pos++];
      const right = parseFactor();
      if (op === '*') result *= right;
      else result = right === 0 ? 0 : result / right;
    }
    return result;
  }

  function parseFactor() {
    if (str[pos] === '(') {
      pos++; // skip '('
      const result = parseExpr();
      if (str[pos] === ')') pos++; // skip ')'
      return result;
    }
    let numStr = '';
    while (pos < str.length && /\d/.test(str[pos])) {
      numStr += str[pos++];
    }
    return parseInt(numStr, 10) || 0;
  }

  return parseExpr();
}

// Check if string contains a math operator or parenthesis
function hasOperator(str) {
  return /[*/+\-()]/.test(str) && /\d/.test(str);
}

// Parse number from formatted input (supports math expressions)
function parseInputValue(input) {
  const raw = input.value.replace(/\s/g, '');
  if (hasOperator(raw)) {
    return safeCalc(raw);
  }
  return parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;
}

// Format input value with thousand separators
function formatInputDisplay(input) {
  const raw = input.value.replace(/\s/g, '');
  // Don't format while user is typing an expression
  if (hasOperator(raw)) return;

  const pos = input.selectionStart;
  const oldLen = input.value.length;
  const val = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0;

  if (val === 0 && input.value === '') return;

  const formatted = val === 0 ? '' : formatNumber(val);
  input.value = formatted;

  // Adjust cursor position
  const diff = formatted.length - oldLen;
  const newPos = Math.max(0, pos + diff);
  input.setSelectionRange(newPos, newPos);
}

// Resolve expression to formatted number (on blur/Enter)
function resolveExpression(input) {
  const raw = input.value.replace(/\s/g, '');
  if (hasOperator(raw)) {
    const result = safeCalc(raw);
    input.value = result === 0 ? '' : formatNumber(result);
  }
}

// ---- Calculator logic ----
function calcPeriod(recruiters, scoringPerRec, dialogsPerRec, interviewsPerRec, months) {
  const subscriptionCost = recruiters * SUBSCRIPTION_PRICE; // always annual
  const scoringCost = scoringPerRec * SCORING_PRICE * recruiters * months;
  const dialogsCost = dialogsPerRec * DIALOG_PRICE * recruiters * months;
  const interviewsCost = interviewsPerRec * INTERVIEW_PRICE * recruiters * months;
  const monthlyOpsPerRec = scoringPerRec * SCORING_PRICE + dialogsPerRec * DIALOG_PRICE + interviewsPerRec * INTERVIEW_PRICE;
  const operationsCost = monthlyOpsPerRec * recruiters * months;
  const totalBeforeBonus = subscriptionCost + operationsCost;
  const tier = BONUS_TIERS.find(t => totalBeforeBonus >= t.threshold);
  const bonusRate = tier ? tier.bonus : 0;
  const bonusAmount = Math.round(totalBeforeBonus * bonusRate);
  const totalFinal = totalBeforeBonus - bonusAmount;
  // Operations after proportional bonus share
  const opsBonusShare = operationsCost > 0 && totalBeforeBonus > 0
    ? Math.round(bonusAmount * (operationsCost / totalBeforeBonus)) : 0;
  const opsAfterBonus = operationsCost - opsBonusShare;
  const firstPayment = subscriptionCost - (bonusAmount - opsBonusShare) + opsAfterBonus;
  return { subscriptionCost, scoringCost, dialogsCost, interviewsCost, operationsCost, totalBeforeBonus, bonusRate, bonusAmount, totalFinal, opsAfterBonus, firstPayment };
}

function setCell(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = formatCurrency(value);
}

function setBonusCell(id, bonusRate, bonusAmount) {
  const el = document.getElementById(id);
  if (!el) return;
  if (bonusRate > 0) {
    const pct = (bonusRate * 100).toFixed(1).replace('.0', '');
    el.textContent = `−${formatCurrency(bonusAmount)} (${pct}%)`;
  } else {
    el.textContent = '—';
  }
}

function calculate() {
  const recruiters    = parseInputValue(inputs.recruiters) || 1;
  const scoringPerRec = parseInputValue(inputs.scoring);
  const dialogsPerRec = parseInputValue(inputs.dialogs);
  const interviewsPerRec = parseInputValue(inputs.interviews);

  // Calculate all periods
  const results = {};
  PERIODS.forEach(p => {
    results[p.months] = calcPeriod(recruiters, scoringPerRec, dialogsPerRec, interviewsPerRec, p.months);
  });

  // Update subscription banner
  const subscriptionTotal = recruiters * SUBSCRIPTION_PRICE;
  resultEls.subFormula.textContent =
    `${formatCurrency(SUBSCRIPTION_PRICE)} × ${recruiters} ${pluralRecruiters(recruiters)} = ${formatCurrency(subscriptionTotal)}`;

  // Update all views
  PERIODS.forEach(p => {
    const m = p.months;
    const r = results[m];
    const opsBonusShare = r.operationsCost > 0 && r.totalBeforeBonus > 0
      ? Math.round(r.bonusAmount * (r.operationsCost / r.totalBeforeBonus)) : 0;
    // Table — breakdown + operations
    setCell(`t-scoring-${m}`, r.scoringCost);
    setCell(`t-dialogs-${m}`, r.dialogsCost);
    setCell(`t-interviews-${m}`, r.interviewsCost);
    setCell(`t-ops-${m}`, r.operationsCost);
    setBonusCell(`t-bonus-${m}`, r.bonusRate, opsBonusShare);
    setCell(`t-ops-total-${m}`, r.opsAfterBonus);
    // First payment summary
    setCell(`fp-${m}`, r.firstPayment);
  });

  // Bonus bar — based on annual total
  const annual = results[12];
  const annualTotal = annual.totalBeforeBonus;

  const tierThresholds = [300_000, 500_000, 700_000, 1_500_000, 3_000_000];
  const tierCount = tierThresholds.length;
  let fillPercent = 0;

  if (annualTotal >= tierThresholds[tierCount - 1]) {
    fillPercent = 100;
  } else if (annualTotal <= 0) {
    fillPercent = 0;
  } else {
    for (let i = 0; i < tierCount; i++) {
      const segStart = i === 0 ? 0 : tierThresholds[i - 1];
      const segEnd = tierThresholds[i];
      const posStart = i === 0 ? 0 : (i / tierCount) * 100;
      const posEnd = ((i + 1) / tierCount) * 100;
      if (annualTotal < segEnd) {
        const progress = (annualTotal - segStart) / (segEnd - segStart);
        fillPercent = posStart + progress * (posEnd - posStart);
        break;
      }
    }
  }

  resultEls.bonusBarFill.style.width = fillPercent + '%';

  // Highlight active tiers
  document.querySelectorAll('.bonus-tier').forEach(el => {
    const threshold = parseInt(el.dataset.threshold);
    el.classList.toggle('active', annualTotal >= threshold);
  });

  // Bonus info text (annual)
  if (annual.bonusRate > 0) {
    const bonusPercent = (annual.bonusRate * 100).toFixed(1).replace('.0', '');
    resultEls.bonusInfo.textContent =
      `При годовом бюджете ${formatCurrency(annualTotal)} бонус +${bonusPercent}% — это ${formatCurrency(annual.bonusAmount)} дополнительно`;
    resultEls.bonusDetail.textContent =
      `Из которых ${formatCurrency(annual.bonusAmount)} — начисляется бонусом`;
    resultEls.savingsDetail.textContent =
      `Экономия: ${bonusPercent}% от годового бюджета`;
  } else {
    const nextTier = BONUS_TIERS.slice().reverse().find(t => annualTotal < t.threshold);
    if (nextTier) {
      const diff = nextTier.threshold - annualTotal;
      const nextPercent = (nextTier.bonus * 100).toFixed(1).replace('.0', '');
      resultEls.bonusInfo.textContent =
        `До бонуса +${nextPercent}% не хватает ${formatCurrency(diff)}`;
    } else {
      resultEls.bonusInfo.textContent = '';
    }
    resultEls.bonusDetail.textContent = 'Бонус не применён — годовой бюджет ниже 300 000 ₽';
    resultEls.savingsDetail.textContent = '';
  }

  // Animate annual total final
  animateValue(resultEls.totalFinal, annual.totalFinal, formatCurrency);
}

// ---- Animated number counter ----
const animationTimers = new WeakMap();

function animateValue(el, targetValue, formatter) {
  // Cancel previous animation
  if (animationTimers.has(el)) {
    cancelAnimationFrame(animationTimers.get(el));
  }

  const currentText = el.textContent.replace(/[^\d]/g, '');
  const startValue = parseInt(currentText) || 0;
  const duration = 300;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startValue + (targetValue - startValue) * eased);
    el.textContent = formatter(current);

    if (progress < 1) {
      animationTimers.set(el, requestAnimationFrame(step));
    }
  }

  animationTimers.set(el, requestAnimationFrame(step));
}

// ---- Input event handlers ----
Object.values(inputs).forEach(input => {
  input.addEventListener('input', () => {
    formatInputDisplay(input);
    calculate();
  });

  input.addEventListener('focus', () => {
    if (input.value === '0') input.value = '';
  });

  input.addEventListener('blur', () => {
    resolveExpression(input);
    if (input.value === '') {
      input.value = input.id === 'recruiters_count' ? '1' : '0';
    }
    formatInputDisplay(input);
  });

  // Enter resolves expression
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      resolveExpression(input);
      if (input.value === '') {
        input.value = input.id === 'recruiters_count' ? '1' : '0';
      }
      formatInputDisplay(input);
      calculate();
      return;
    }
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    // Allow digits, math operators and parentheses
    if (/^[\d*/+\-()]$/.test(e.key)) return;
    e.preventDefault();
  });
});


// ---- Lead form ----
const leadForm = document.getElementById('lead-form');
const leadSubmit = document.getElementById('lead-submit');
const toast = document.getElementById('toast');

// ---- Validation helpers ----
function validatePhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function setFieldError(fieldId, errorId, hasError) {
  const group = document.getElementById(fieldId).closest('.input-group');
  if (hasError) {
    group.classList.add('has-error');
  } else {
    group.classList.remove('has-error');
  }
}

// Clear errors on input
document.querySelectorAll('.lead-form .input-group__input').forEach(input => {
  input.addEventListener('input', () => {
    const group = input.closest('.input-group');
    if (group) group.classList.remove('has-error');
  });
});

// Phone formatting
const phoneInput = document.getElementById('lead-phone');
if (phoneInput) {
  phoneInput.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('8')) val = '7' + val.slice(1);
    if (val.length > 0) {
      let formatted = '+' + val.slice(0, 1);
      if (val.length > 1) formatted += ' (' + val.slice(1, 4);
      if (val.length > 4) formatted += ') ' + val.slice(4, 7);
      if (val.length > 7) formatted += '-' + val.slice(7, 9);
      if (val.length > 9) formatted += '-' + val.slice(9, 11);
      e.target.value = formatted;
    }
  });
}

if (leadForm) {
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect values
    const name      = document.getElementById('lead-name').value.trim();
    const company   = document.getElementById('lead-company').value.trim();
    const employees = document.getElementById('lead-employees').value.trim();
    const phone     = document.getElementById('lead-phone').value.trim();
    const contact   = document.getElementById('lead-contact').value.trim();
    const comment   = document.getElementById('lead-comment').value.trim();

    // Validate
    let valid = true;

    if (!name) { setFieldError('lead-name', 'error-name', true); valid = false; }
    else { setFieldError('lead-name', 'error-name', false); }

    if (!company) { setFieldError('lead-company', 'error-company', true); valid = false; }
    else { setFieldError('lead-company', 'error-company', false); }

    if (!employees) { setFieldError('lead-employees', 'error-employees', true); valid = false; }
    else { setFieldError('lead-employees', 'error-employees', false); }

    if (!phone || !validatePhone(phone)) { setFieldError('lead-phone', 'error-phone', true); valid = false; }
    else { setFieldError('lead-phone', 'error-phone', false); }

    if (!contact || !validateEmail(contact)) { setFieldError('lead-contact', 'error-contact', true); valid = false; }
    else { setFieldError('lead-contact', 'error-contact', false); }

    if (!valid) return;

    // Gather calculator data
    const recruiters  = parseInputValue(inputs.recruiters) || 1;
    const scoring     = parseInputValue(inputs.scoring);
    const dialogs     = parseInputValue(inputs.dialogs);
    const interviews  = parseInputValue(inputs.interviews);

    const annual = calcPeriod(recruiters, scoring, dialogs, interviews, 12);

    const payload = {
      name,
      company,
      employees,
      phone,
      contact,
      comment,
      calculator: {
        recruiters,
        scoringPerMonth: scoring,
        dialogsPerMonth: dialogs,
        interviewsPerMonth: interviews,
        annualTotal: annual.totalFinal,
      },
    };

    // Disable button
    leadSubmit.disabled = true;
    leadSubmit.textContent = 'Отправка...';

    try {
      const res = await fetch('/api/send-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Server error');

      // Success
      leadSubmit.textContent = '✓ Заявка отправлена';
      leadSubmit.classList.add('success');
      leadForm.reset();
      showToast();

      setTimeout(() => {
        leadSubmit.disabled = false;
        leadSubmit.textContent = 'Отправить заявку';
        leadSubmit.classList.remove('success');
      }, 4000);

    } catch (err) {
      console.error('Form submit error:', err);
      leadSubmit.disabled = false;
      leadSubmit.textContent = 'Ошибка — попробуйте ещё раз';
      setTimeout(() => {
        leadSubmit.textContent = 'Отправить заявку';
      }, 3000);
    }
  });
}

function showToast() {
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ---- Admin settings integration ----
function loadAdminSettings() {
  const STORAGE_PREFIX = 'relevanter_';
  const ctaBtn = document.querySelector('.header__cta');

  if (ctaBtn) {
    const tgLink = localStorage.getItem(STORAGE_PREFIX + 'tg_link');
    const ctaText = localStorage.getItem(STORAGE_PREFIX + 'cta_text');

    if (tgLink) {
      ctaBtn.href = tgLink;
      ctaBtn.target = '_blank';
    }
    if (ctaText) {
      ctaBtn.textContent = ctaText;
    }
  }

  const copyrightEl = document.querySelector('.contact-section__copyright');
  if (copyrightEl) {
    const copyright = localStorage.getItem(STORAGE_PREFIX + 'copyright');
    if (copyright) copyrightEl.textContent = copyright;
  }
}


// ---- Init ----
calculate();
loadAdminSettings();
