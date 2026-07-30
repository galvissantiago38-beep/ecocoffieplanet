/* ============================================================
   ECOCOFFIEPLANET · script.js
   Bloques:
   1.  Aplicar CONFIG (imágenes, productos, galería, precios)
   2.  Loader · año del footer
   3.  Navbar (fondo al scroll) + menú responsive
   4.  Modo oscuro / claro
   5.  Navegación por diapositivas (puntos + flecha + activo)
   6.  Parallax del hero · botón volver arriba
   7.  Reveal (animación al aparecer) + contadores
   8.  Carrusel · Acordeón · Formulario
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* --------------------------------------------------------
     1. APLICAR CONFIG  (todo sale de config.js)
     -------------------------------------------------------- */
  // Da formato al precio: 0 -> texto configurado; otro -> "$24.900"
  const formatPrice = (valor) => {
    if (!valor || valor <= 0) return (CONFIG.textoPrecioCero || '$0');
    return '$' + Number(valor).toLocaleString('es-CO');
  };

  // Imagen de portada (fondo del hero)
  const heroBg = document.getElementById('hero-bg');
  if (heroBg && CONFIG.heroImagen) heroBg.style.backgroundImage = `url('${CONFIG.heroImagen}')`;

  // Imágenes de secciones (elementos con data-img="clave")
  document.querySelectorAll('[data-img]').forEach(img => {
    const clave = img.getAttribute('data-img');
    if (CONFIG.imagenes && CONFIG.imagenes[clave]) img.src = CONFIG.imagenes[clave];
  });

  // Generar tarjetas de PRODUCTOS
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid && Array.isArray(CONFIG.productos)) {
    productsGrid.innerHTML = CONFIG.productos.map(p => `
      <article class="product-card reveal">
        <div class="product-card__img">
          <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" />
          ${p.etiqueta ? `<span class="product-card__tag">${p.etiqueta}</span>` : ''}
        </div>
        <div class="product-card__body">
          <h3>${p.nombre}</h3>
          <p>${p.descripcion}</p>
          <div class="product-card__foot">
            <span class="price">${formatPrice(p.precio)}</span>
            <button class="btn btn--sm btn--primary">Ver más</button>
          </div>
        </div>
      </article>
    `).join('');
  }

  // Generar GALERÍA
  const galleryGrid = document.getElementById('gallery-grid');
  if (galleryGrid && Array.isArray(CONFIG.galeria)) {
    galleryGrid.innerHTML = CONFIG.galeria.map((url, i) => `
      <div class="gallery__item reveal"><img src="${url}" alt="Galería ${i + 1}" loading="lazy" /></div>
    `).join('');
  }

  /* --------------------------------------------------------
     2. LOADER · AÑO
     -------------------------------------------------------- */
  const loader = document.getElementById('loader');
  window.addEventListener('load', () => setTimeout(() => loader.classList.add('hidden'), 500));
  setTimeout(() => loader && loader.classList.add('hidden'), 2500); // respaldo

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --------------------------------------------------------
     3. NAVBAR + MENÚ RESPONSIVE
     -------------------------------------------------------- */
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');

  const onScrollNavbar = () => navbar.classList.toggle('scrolled', window.scrollY > 60);
  onScrollNavbar();

  hamburger.addEventListener('click', () => {
    const open = navMenu.classList.toggle('open');
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  navMenu.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* --------------------------------------------------------
     4. MODO OSCURO / CLARO (recuerda la preferencia)
     -------------------------------------------------------- */
  const themeToggle = document.getElementById('theme-toggle');
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('eco-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) root.setAttribute('data-theme', 'dark');

  themeToggle.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    if (isDark) { root.removeAttribute('data-theme'); localStorage.setItem('eco-theme', 'light'); }
    else { root.setAttribute('data-theme', 'dark'); localStorage.setItem('eco-theme', 'dark'); }
  });

  /* --------------------------------------------------------
     5. NAVEGACIÓN POR DIAPOSITIVAS
     - Crea los puntos laterales (uno por diapositiva)
     - Marca el punto activo según la diapositiva visible
     - Flecha inferior "siguiente" + teclas de flecha
     -------------------------------------------------------- */
  const slides = Array.from(document.querySelectorAll('.deck .slide'));
  const deckNav = document.getElementById('deck-nav');
  const nextBtn = document.getElementById('next-slide');
  let activeIndex = 0;

  // Crear un punto por diapositiva
  slides.forEach((slide, i) => {
    const dot = document.createElement('button');
    dot.className = 'deck-nav__dot';
    dot.setAttribute('data-label', slide.dataset.nav || `Sección ${i + 1}`);
    dot.setAttribute('aria-label', slide.dataset.nav || `Sección ${i + 1}`);
    dot.addEventListener('click', () => slide.scrollIntoView({ behavior: 'smooth' }));
    deckNav.appendChild(dot);
  });
  const dots = Array.from(deckNav.children);

  // Detecta qué diapositiva está visible para marcar el punto activo
  const slideObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeIndex = slides.indexOf(entry.target);
        dots.forEach((d, i) => d.classList.toggle('active', i === activeIndex));
        // Ocultar la flecha "siguiente" en la última diapositiva
        nextBtn.classList.toggle('hidden', activeIndex >= slides.length - 1);
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 }); // se activa cuando la diapositiva cruza el centro
  slides.forEach(s => slideObserver.observe(s));

  // Ir a la siguiente diapositiva
  const goToSlide = (i) => {
    const idx = Math.max(0, Math.min(i, slides.length - 1));
    slides[idx].scrollIntoView({ behavior: 'smooth' });
  };
  nextBtn.addEventListener('click', () => goToSlide(activeIndex + 1));

  // Flechas del teclado (arriba/abajo) para moverse entre diapositivas
  document.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown'].includes(e.key)) { e.preventDefault(); goToSlide(activeIndex + 1); }
    if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); goToSlide(activeIndex - 1); }
  });

  /* --------------------------------------------------------
     6. PARALLAX HERO · VOLVER ARRIBA
     -------------------------------------------------------- */
  const toTop = document.getElementById('to-top');
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  window.addEventListener('scroll', () => {
    onScrollNavbar();
    if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    toTop.classList.toggle('show', window.scrollY > 600);
  }, { passive: true });

  /* --------------------------------------------------------
     7. REVEAL + CONTADORES
     -------------------------------------------------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Aparición escalonada de tarjetas dentro de las grillas
  document.querySelectorAll('.values-grid, .benefits-grid, .products-grid, .steps').forEach(grid => {
    grid.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--d', `${i * 0.07}s`));
  });

  // Contadores animados
  const animateCounter = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = prefix + Math.floor(eased * target).toLocaleString('es-CO') + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { animateCounter(entry.target); counterObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach(c => counterObserver.observe(c));

  /* --------------------------------------------------------
     8. CARRUSEL · ACORDEÓN · FORMULARIO
     -------------------------------------------------------- */
  // --- Carrusel de testimonios ---
  const track = document.getElementById('carousel-track');
  const cSlides = track ? Array.from(track.children) : [];
  const dotsWrap = document.getElementById('carousel-dots');
  let cIndex = 0, autoplayId = null;

  if (cSlides.length) {
    cSlides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); resetAutoplay(); });
      dotsWrap.appendChild(dot);
    });
    const cDots = Array.from(dotsWrap.children);
    const update = () => {
      track.style.transform = `translateX(-${cIndex * 100}%)`;
      cDots.forEach((d, i) => d.classList.toggle('active', i === cIndex));
    };
    function goTo(i) { cIndex = (i + cSlides.length) % cSlides.length; update(); }

    document.getElementById('carousel-next').addEventListener('click', () => { goTo(cIndex + 1); resetAutoplay(); });
    document.getElementById('carousel-prev').addEventListener('click', () => { goTo(cIndex - 1); resetAutoplay(); });

    const startAutoplay = () => { autoplayId = setInterval(() => goTo(cIndex + 1), 5000); };
    function resetAutoplay() { clearInterval(autoplayId); startAutoplay(); }

    const carousel = document.getElementById('carousel');
    carousel.addEventListener('mouseenter', () => clearInterval(autoplayId));
    carousel.addEventListener('mouseleave', startAutoplay);

    update(); startAutoplay();
  }

  // --- Acordeón (FAQ) ---
  const accItems = document.querySelectorAll('.accordion__item');
  accItems.forEach(item => {
    const head = item.querySelector('.accordion__head');
    const panel = item.querySelector('.accordion__panel');
    head.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      accItems.forEach(o => { o.classList.remove('open'); o.querySelector('.accordion__panel').style.maxHeight = null; });
      if (!isOpen) { item.classList.add('open'); panel.style.maxHeight = panel.scrollHeight + 'px'; }
    });
  });

  // --- Formulario de contacto (validación sin backend) ---
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      const check = (field, ok) => { field.classList.toggle('invalid', !ok); if (!ok) valid = false; };
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
      check(form.name, form.name.value.trim().length >= 2);
      check(form.email, emailOk);
      check(form.message, form.message.value.trim().length >= 5);

      if (!valid) { status.textContent = 'Por favor completa todos los campos correctamente.'; status.className = 'form-status err'; return; }
      status.textContent = `¡Gracias, ${form.name.value.trim()}! Recibimos tu mensaje y te responderemos pronto. 🌿`;
      status.className = 'form-status ok';
      form.reset();
    });
    form.querySelectorAll('input, textarea').forEach(f => f.addEventListener('input', () => f.classList.remove('invalid')));
  }

});
