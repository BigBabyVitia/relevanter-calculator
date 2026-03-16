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

// ---- DOM refs ----
const inputs = {
  recruiters: document.getElementById('recruiters_count'),
  scoring:    document.getElementById('scoring_count'),
  dialogs:    document.getElementById('dialogs_count'),
  interviews: document.getElementById('interviews_count'),
};

const resultEls = {
  subscription:       document.getElementById('result-subscription'),
  subscriptionDetail: document.getElementById('result-subscription-detail'),
  operations:         document.getElementById('result-operations'),
  operationsDetail:   document.getElementById('result-operations-detail'),
  total:              document.getElementById('result-total'),
  bonusBarFill:       document.getElementById('bonus-bar-fill'),
  bonusInfo:          document.getElementById('bonus-info'),
  totalFinal:         document.getElementById('total-final'),
  bonusDetail:        document.getElementById('bonus-detail'),
  savingsDetail:      document.getElementById('savings-detail'),
};

// ---- Number formatting ----
function formatNumber(n) {
  return n.toLocaleString('ru-RU');
}

function formatCurrency(n) {
  return formatNumber(n) + ' ₽';
}

// Parse number from formatted input
function parseInputValue(input) {
  const raw = input.value.replace(/\s/g, '').replace(/[^0-9]/g, '');
  return parseInt(raw, 10) || 0;
}

// Format input value with thousand separators
function formatInputDisplay(input) {
  const pos = input.selectionStart;
  const oldLen = input.value.length;
  const val = parseInputValue(input);

  if (val === 0 && input.value === '') return;

  const formatted = val === 0 ? '' : formatNumber(val);
  input.value = formatted;

  // Adjust cursor position
  const diff = formatted.length - oldLen;
  const newPos = Math.max(0, pos + diff);
  input.setSelectionRange(newPos, newPos);
}

// ---- Calculator logic ----
function calculate() {
  const recruiters  = parseInputValue(inputs.recruiters) || 1;
  const scoring     = parseInputValue(inputs.scoring);
  const dialogs     = parseInputValue(inputs.dialogs);
  const interviews  = parseInputValue(inputs.interviews);

  const subscriptionCost = recruiters * SUBSCRIPTION_PRICE;
  const scoringCost      = scoring * SCORING_PRICE;
  const dialogsCost      = dialogs * DIALOG_PRICE;
  const interviewsCost   = interviews * INTERVIEW_PRICE;
  const operationsCost   = scoringCost + dialogsCost + interviewsCost;
  const totalBeforeBonus = subscriptionCost + operationsCost;

  // Bonus
  const tier = BONUS_TIERS.find(t => operationsCost >= t.threshold);
  const bonusRate   = tier ? tier.bonus : 0;
  const bonusAmount = Math.round(operationsCost * bonusRate);
  const totalFinal  = totalBeforeBonus - bonusAmount;

  // Update result cards
  animateValue(resultEls.subscription, subscriptionCost, formatCurrency);
  resultEls.subscriptionDetail.textContent = `${formatNumber(recruiters)} × ${formatNumber(SUBSCRIPTION_PRICE)} ₽`;

  animateValue(resultEls.operations, operationsCost, formatCurrency);
  resultEls.operationsDetail.textContent =
    `${formatNumber(scoringCost)} + ${formatNumber(dialogsCost)} + ${formatNumber(interviewsCost)} ₽`;

  animateValue(resultEls.total, totalBeforeBonus, formatCurrency);

  // Bonus bar — fill aligned with evenly-spaced tier markers
  const tierThresholds = [300_000, 500_000, 700_000, 1_500_000, 3_000_000];
  const tierCount = tierThresholds.length;
  let fillPercent = 0;

  if (operationsCost >= tierThresholds[tierCount - 1]) {
    fillPercent = 100;
  } else if (operationsCost <= 0) {
    fillPercent = 0;
  } else {
    // Find which segment we're in
    for (let i = 0; i < tierCount; i++) {
      const segStart = i === 0 ? 0 : tierThresholds[i - 1];
      const segEnd = tierThresholds[i];
      const posStart = i === 0 ? 0 : (i / tierCount) * 100;
      const posEnd = ((i + 1) / tierCount) * 100;

      if (operationsCost < segEnd) {
        const progress = (operationsCost - segStart) / (segEnd - segStart);
        fillPercent = posStart + progress * (posEnd - posStart);
        break;
      }
    }
  }

  resultEls.bonusBarFill.style.width = fillPercent + '%';

  // Highlight active tiers
  const tierEls = document.querySelectorAll('.bonus-tier');
  tierEls.forEach(el => {
    const threshold = parseInt(el.dataset.threshold);
    el.classList.toggle('active', operationsCost >= threshold);
  });

  // Bonus info text
  if (bonusRate > 0) {
    const bonusPercent = (bonusRate * 100).toFixed(1).replace('.0', '');
    resultEls.bonusInfo.textContent =
      `При пополнении на ${formatCurrency(operationsCost)} вы получите бонус +${bonusPercent}% — это ${formatCurrency(bonusAmount)} дополнительно`;
    resultEls.bonusDetail.textContent =
      `Из которых ${formatCurrency(bonusAmount)} — начисляется бонусом`;
    resultEls.savingsDetail.textContent =
      operationsCost > 0
        ? `Экономия: ${bonusPercent}% от операционных расходов`
        : '';
  } else {
    // Find next tier
    const nextTier = BONUS_TIERS.slice().reverse().find(t => operationsCost < t.threshold);
    if (nextTier) {
      const diff = nextTier.threshold - operationsCost;
      const nextPercent = (nextTier.bonus * 100).toFixed(1).replace('.0', '');
      resultEls.bonusInfo.textContent =
        `До бонуса +${nextPercent}% не хватает ${formatCurrency(diff)}`;
    } else {
      resultEls.bonusInfo.textContent = '';
    }
    resultEls.bonusDetail.textContent = 'Бонус не применён — сумма операций ниже 300 000 ₽';
    resultEls.savingsDetail.textContent = '';
  }

  // Total final
  animateValue(resultEls.totalFinal, totalFinal, formatCurrency);
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
    if (input.value === '') {
      input.value = input.id === 'recruiters_count' ? '1' : '0';
    }
    formatInputDisplay(input);
  });

  // Prevent non-numeric input
  input.addEventListener('keydown', (e) => {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  });
});

// ---- Pareto chart animation (Intersection Observer) ----
const paretoCharts = document.getElementById('pareto-charts');

if (paretoCharts) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        paretoCharts.classList.add('animated');
        observer.unobserve(paretoCharts);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(paretoCharts);
}

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

    const subscriptionCost = recruiters * SUBSCRIPTION_PRICE;
    const operationsCost   = scoring * SCORING_PRICE + dialogs * DIALOG_PRICE + interviews * INTERVIEW_PRICE;
    const total = subscriptionCost + operationsCost;

    const payload = {
      name,
      company,
      employees,
      phone,
      contact,
      comment,
      calculator: {
        recruiters,
        scoring,
        dialogs,
        interviews,
        total,
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

// ---- Donut tooltip ----
const donutTooltip = document.createElement('div');
donutTooltip.className = 'donut-tooltip';
document.body.appendChild(donutTooltip);

document.querySelectorAll('.donut-segment[data-tooltip]').forEach(seg => {
  seg.addEventListener('mouseenter', (e) => {
    donutTooltip.textContent = seg.getAttribute('data-tooltip');
    donutTooltip.classList.add('visible');
  });

  seg.addEventListener('mousemove', (e) => {
    donutTooltip.style.left = e.clientX + 'px';
    donutTooltip.style.top = e.clientY + 'px';
  });

  seg.addEventListener('mouseleave', () => {
    donutTooltip.classList.remove('visible');
  });
});

// ---- Pareto toggle ----
document.querySelectorAll('.pareto-toggle__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;

    // Toggle buttons
    document.querySelectorAll('.pareto-toggle__btn').forEach(b => b.classList.remove('pareto-toggle__btn--active'));
    btn.classList.add('pareto-toggle__btn--active');

    // Toggle views
    document.querySelectorAll('.pareto-view').forEach(v => v.classList.remove('pareto-view--active'));
    const target = document.querySelector(`.pareto-view[data-view="${view}"]`);
    if (target) {
      target.classList.add('pareto-view--active');
      // Trigger animation for donut view
      if (view === 'donut') {
        target.classList.add('animated');
      }
    }
  });
});

// ---- Init ----
calculate();
loadAdminSettings();
