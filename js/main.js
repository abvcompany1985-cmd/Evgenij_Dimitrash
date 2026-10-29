document.addEventListener('DOMContentLoaded', () => {

  // Header scroll effect
  const header = document.querySelector('.header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('header--scrolled', window.scrollY > 50);
  });

  // Mobile nav
  const burger = document.querySelector('.header__burger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileClose = document.querySelector('.mobile-nav__close');
  const mobileLinks = mobileNav.querySelectorAll('a');

  burger.addEventListener('click', () => mobileNav.classList.add('active'));
  mobileClose.addEventListener('click', () => mobileNav.classList.remove('active'));
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => mobileNav.classList.remove('active'));
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = header.offsetHeight + 20;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // Scroll animations
  const fadeElements = document.querySelectorAll(
    '.audience__card, .for-whom__card, .format__item, .module, .pricing-card, .advantages__card, .format__highlight, .problem__quote, .audience__final'
  );
  fadeElements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  fadeElements.forEach(el => observer.observe(el));

  // ── Booking widget ──────────────────────────────────────────────────────
  // Доступные даты: вторник и четверг, 10:00–12:00 (МСК), до конца 2026 года.
  // ВАЖНО: те же правила продублированы в боте (/opt/dimitrash-bot/bot.py).
  const BOOKING_DOWS = [2, 4]; // 2 = вторник, 4 = четверг
  const BOOKING_END = new Date(2026, 11, 31); // 31 декабря 2026
  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const AVAILABLE_DATES = new Set();
  (function buildAvailableDates() {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (; d <= BOOKING_END; d.setDate(d.getDate() + 1)) {
      if (BOOKING_DOWS.includes(d.getDay())) AVAILABLE_DATES.add(toDateStr(d));
    }
  })();
  const BOOKING_SLOTS = ['10:00','10:30','11:00','11:30'];
  const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const DOW_SHORT = ['вс','пн','вт','ср','чт','пт','сб'];
  const MONTH_GEN = ['','января','февраля','марта','апреля','мая','июня',
    'июля','августа','сентября','октября','ноября','декабря'];

  const booking = { duration: null, date: null, dateLabel: '', time: null, name: '', phone: '' };
  // Стартовый месяц календаря — текущий, в пределах окна записи (до декабря 2026).
  const CAL_MIN = { y: 2026, m: 9 }, CAL_MAX = { y: 2026, m: 11 }; // октябрь–декабрь 2026 (0-indexed)
  let calYear = new Date().getFullYear(), calMonth = new Date().getMonth();
  if (calYear * 12 + calMonth < CAL_MIN.y * 12 + CAL_MIN.m) { calYear = CAL_MIN.y; calMonth = CAL_MIN.m; }
  if (calYear * 12 + calMonth > CAL_MAX.y * 12 + CAL_MAX.m) { calYear = CAL_MAX.y; calMonth = CAL_MAX.m; }
  const fullyBookedDates = new Set();

  const calGrid = document.getElementById('calGrid');
  const calMonthEl = document.getElementById('calMonth');
  const timesContainer = document.getElementById('bookingTimes');
  const timeSection = document.getElementById('timeSection');
  const contactSection = document.getElementById('contactSection');
  const summaryCard = document.getElementById('bookingSummary');
  const summaryBody = document.getElementById('summaryBody');
  const submitBtn = document.getElementById('bookingSubmit');
  const bookingNameInput = document.getElementById('bookingName');
  const bookingPhoneInput = document.getElementById('bookingPhone');

  if (calGrid) {
    // Duration buttons
    document.querySelectorAll('.booking__dur').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.booking__dur').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        booking.duration = parseInt(btn.dataset.duration);
        updateSummary();
      });
    });

    // Calendar navigation
    document.getElementById('calPrev').addEventListener('click', () => {
      if (calYear * 12 + calMonth <= CAL_MIN.y * 12 + CAL_MIN.m) return;
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendar();
    });
    document.getElementById('calNext').addEventListener('click', () => {
      if (calYear * 12 + calMonth >= CAL_MAX.y * 12 + CAL_MAX.m) return;
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendar();
    });

    // Contact inputs
    const onContactChange = () => {
      booking.name = bookingNameInput.value.trim();
      booking.phone = bookingPhoneInput.value.trim();
      updateSummary();
    };
    bookingNameInput.addEventListener('input', onContactChange);
    bookingPhoneInput.addEventListener('input', onContactChange);

    submitBtn.addEventListener('click', submitBooking);

    preloadBookedDates();
    renderCalendar();
  }

  async function preloadBookedDates() {
    await Promise.all([...AVAILABLE_DATES].map(async (dateStr) => {
      try {
        const res = await fetch(`/api/booking/slots?date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          if (data.booked && data.booked.length >= BOOKING_SLOTS.length) {
            fullyBookedDates.add(dateStr);
          }
        }
      } catch {}
    }));
    renderCalendar();
  }

  function renderCalendar() {
    calMonthEl.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
    const prevBtn = document.getElementById('calPrev'), nextBtn = document.getElementById('calNext');
    if (prevBtn) prevBtn.disabled = calYear * 12 + calMonth <= CAL_MIN.y * 12 + CAL_MIN.m;
    if (nextBtn) nextBtn.disabled = calYear * 12 + calMonth >= CAL_MAX.y * 12 + CAL_MAX.m;
    calGrid.innerHTML = '';
    const firstDay = new Date(calYear, calMonth, 1);
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 1; i < startDow; i++) {
      const empty = document.createElement('div');
      empty.className = 'booking__cal-day';
      calGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const el = document.createElement('div');
      el.className = 'booking__cal-day';
      el.textContent = d;

      if (dateStr === todayStr) el.classList.add('today');

      if (AVAILABLE_DATES.has(dateStr)) {
        if (fullyBookedDates.has(dateStr)) {
          el.classList.add('fully-booked');
          el.title = 'Все слоты заняты';
        } else {
          el.classList.add('available');
          if (booking.date === dateStr) el.classList.add('selected');
          el.addEventListener('click', () => selectCalDate(dateStr));
        }
      }

      calGrid.appendChild(el);
    }
  }

  function selectCalDate(dateStr) {
    booking.date = dateStr;
    booking.time = null;
    const d = new Date(dateStr + 'T12:00:00');
    const dow = DOW_SHORT[d.getDay()];
    booking.dateLabel = `${dow}, ${d.getDate()} ${MONTH_GEN[d.getMonth() + 1]}`;
    renderCalendar();
    loadTimeSlots(dateStr);
  }

  async function loadTimeSlots(date) {
    timesContainer.innerHTML = '';
    timeSection.style.display = 'block';
    let booked = [];
    try {
      const res = await fetch(`/api/booking/slots?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        booked = data.booked || [];
      }
    } catch {}

    BOOKING_SLOTS.forEach(time => {
      const btn = document.createElement('button');
      btn.className = 'booking__time';
      const [h, m] = time.split(':').map(Number);
      const endMin = h * 60 + m + 30;
      const endTime = `${Math.floor(endMin / 60)}:${String(endMin % 60).padStart(2, '0')}`;
      btn.innerHTML = `${time}<span class="booking__time-range">${time} – ${endTime}</span>`;

      if (booked.includes(time)) {
        btn.classList.add('disabled');
        btn.innerHTML = `${time}<span class="booking__time-range">занято</span>`;
      } else {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.booking__time').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          booking.time = time;
          contactSection.style.display = 'block';
          updateSummary();
        });
      }
      timesContainer.appendChild(btn);
    });
  }

  function updateSummary() {
    const ready = booking.duration && booking.date && booking.time && booking.name && booking.phone;
    if (booking.date && booking.time) {
      contactSection.style.display = 'block';
      summaryCard.style.display = 'block';
      let html = '';
      html += `<div class="booking__summary-row"><span class="booking__summary-icon">📅</span><div class="booking__summary-text"><strong>${booking.dateLabel}</strong><span>${booking.time}`;
      if (booking.duration) {
        const [h, m] = booking.time.split(':').map(Number);
        const endMin = h * 60 + m + booking.duration;
        const endTime = `${Math.floor(endMin / 60)}:${String(endMin % 60).padStart(2, '0')}`;
        html += ` – ${endTime}`;
      }
      html += `</span></div></div>`;
      if (booking.duration) {
        html += `<div class="booking__summary-row"><span class="booking__summary-icon">⏱</span><div class="booking__summary-text"><strong>${booking.duration} минут</strong><span>онлайн-встреча</span></div></div>`;
      }
      if (booking.name) {
        html += `<div class="booking__summary-row"><span class="booking__summary-icon">👤</span><div class="booking__summary-text"><strong>${booking.name}</strong><span>${booking.phone || ''}</span></div></div>`;
      }
      summaryBody.innerHTML = html;
    }
    submitBtn.disabled = !ready;
  }

  async function submitBooking() {
    if (!booking.duration || !booking.date || !booking.time || !booking.name || !booking.phone) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Бронирование...';
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: booking.duration, date: booking.date,
          time: booking.time, name: booking.name, phone: booking.phone
        })
      });
      if (res.ok) {
        alert(`Спасибо, ${booking.name}! Встреча забронирована на ${booking.dateLabel}, ${booking.time}. Мы свяжемся с вами для подтверждения.`);
        booking.duration = null; booking.date = null; booking.time = null;
        booking.name = ''; booking.phone = '';
        document.querySelectorAll('.booking__dur, .booking__time').forEach(b => b.classList.remove('selected'));
        timesContainer.innerHTML = '';
        summaryBody.innerHTML = '';
        bookingNameInput.value = ''; bookingPhoneInput.value = '';
        timeSection.style.display = 'none';
        contactSection.style.display = 'none';
        summaryCard.style.display = 'none';
        renderCalendar();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Ошибка при бронировании. Попробуйте ещё раз.');
      }
    } catch {
      alert('Ошибка сети. Проверьте подключение к интернету.');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Забронировать встречу';
  }

  // Form submission → Telegram bot
  const form = document.getElementById('application-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form__submit');
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    const data = new FormData(form);
    const name = data.get('name');
    const phone = data.get('phone');
    const telegram = data.get('telegram');
    const tariff = data.get('tariff');

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, telegram, tariff })
      });
      if (res.ok) {
        alert(`Спасибо, ${name}! Ваша заявка принята. Мы свяжемся с вами в ближайшее время.`);
        form.reset();
      } else {
        alert('Произошла ошибка при отправке. Попробуйте ещё раз.');
      }
    } catch {
      alert('Ошибка сети. Проверьте подключение к интернету.');
    }

    btn.disabled = false;
    btn.textContent = 'Оставить заявку';
  });

  // ── Scroll progress bar ──
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    const updateProgress = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const ratio = max > 0 ? h.scrollTop / max : 0;
      scrollProgress.style.width = (ratio * 100) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  // ── Cookie consent ──
  const cookieBanner = document.getElementById('cookieBanner');
  if (cookieBanner) {
    let consent = null;
    try { consent = localStorage.getItem('cookie-consent'); } catch {}
    if (!consent) {
      document.body.classList.add('cookie-open');
      setTimeout(() => cookieBanner.classList.add('cookie--visible'), 900);
    }
    const closeCookie = (value) => {
      try { localStorage.setItem('cookie-consent', value); } catch {}
      cookieBanner.classList.remove('cookie--visible');
      document.body.classList.remove('cookie-open');
    };
    const acceptBtn = document.getElementById('cookieAccept');
    const declineBtn = document.getElementById('cookieDecline');
    if (acceptBtn) acceptBtn.addEventListener('click', () => closeCookie('accepted'));
    if (declineBtn) declineBtn.addEventListener('click', () => closeCookie('necessary'));
  }

});
