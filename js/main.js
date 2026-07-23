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

  // Carousel
  const carousel = document.querySelector('.transformation__carousel');
  const cards = carousel.querySelectorAll('.transform-card');
  const prevBtn = document.querySelector('.carousel-btn--prev');
  const nextBtn = document.querySelector('.carousel-btn--next');
  const dotsContainer = document.querySelector('.carousel-dots');

  let visibleCount = window.innerWidth > 768 ? 2 : 1;
  let totalPages = Math.ceil(cards.length / visibleCount);
  let currentPage = 0;

  function buildDots() {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goTo(page) {
    currentPage = Math.max(0, Math.min(page, totalPages - 1));
    const card = cards[currentPage * visibleCount];
    if (card) {
      carousel.scrollTo({ left: card.offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
    }
    dotsContainer.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === currentPage);
    });
  }

  prevBtn.addEventListener('click', () => goTo(currentPage - 1));
  nextBtn.addEventListener('click', () => goTo(currentPage + 1));

  window.addEventListener('resize', () => {
    const newCount = window.innerWidth > 768 ? 2 : 1;
    if (newCount !== visibleCount) {
      visibleCount = newCount;
      totalPages = Math.ceil(cards.length / visibleCount);
      currentPage = 0;
      buildDots();
    }
  });

  buildDots();

  // Scroll animations
  const fadeElements = document.querySelectorAll(
    '.pain-card, .program-block, .for-whom__card, .pricing-card, .faq__item, .transform-card, .system__highlight, .problem__quote, .knowledge__highlight'
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

  // Form submission
  const form = document.getElementById('application-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name');
    alert(`Спасибо, ${name}! Ваша заявка принята. Мы свяжемся с вами в ближайшее время.`);
    form.reset();
  });

});
