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

  // Observador para animar los elementos al aparecer (se usa también aquí abajo)
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  // ===================== PRODUCTOS + REACCIONES =====================
  const productsGrid = document.getElementById('products-grid');

  // Identificador anónimo del visitante (para "una reacción por persona", sin registro)
  const getClienteId = () => {
    let id = localStorage.getItem('eco-cliente-id');
    if (!id) {
      id = 'c_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.round(Math.random() * 1e9));
      localStorage.setItem('eco-cliente-id', id);
    }
    return id;
  };
  const clienteId = getClienteId();

  // Plantilla de tarjeta. "conReacciones" añade los botones 👍 ❤️ 👎
  const cardHTML = (p, conReacciones) => `
    <article class="product-card reveal" data-product="${p.id || ''}">
      <div class="product-card__img">
        <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" />
        ${p.etiqueta ? `<span class="product-card__tag">${p.etiqueta}</span>` : ''}
      </div>
      <div class="product-card__body">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion || ''}</p>
        <div class="product-card__foot">
          <span class="price">${formatPrice(p.precio)}</span>
          <button class="btn btn--sm btn--primary">Ver más</button>
        </div>
        ${conReacciones ? `
        <div class="reactions" data-product="${p.id}">
          <button class="reaction" data-tipo="like"    aria-label="Me gusta"><span>👍</span><b class="rc like">0</b></button>
          <button class="reaction" data-tipo="love"    aria-label="Me encanta"><span>❤️</span><b class="rc love">0</b></button>
          <button class="reaction" data-tipo="dislike" aria-label="No me gusta"><span>👎</span><b class="rc dislike">0</b></button>
        </div>` : ''}
      </div>
    </article>`;

  // Pinta los números de reacciones en cada tarjeta
  const pintarConteos = (map) => {
    document.querySelectorAll('.reactions').forEach(bar => {
      const c = map[bar.dataset.product] || {};
      bar.querySelector('.rc.like').textContent = c.like || 0;
      bar.querySelector('.rc.love').textContent = c.love || 0;
      bar.querySelector('.rc.dislike').textContent = c.dislike || 0;
    });
  };

  // Trae los conteos desde la base de datos
  const cargarConteos = async () => {
    if (!window.sb) return;
    const { data, error } = await window.sb.rpc('conteo_reacciones');
    if (error) { console.warn('Conteos:', error.message); return; }
    const map = {};
    (data || []).forEach(r => { map[r.producto_id] = { like: r.likes, love: r.loves, dislike: r.dislikes }; });
    pintarConteos(map);
  };

  // Marca cuál reacción eligió este visitante
  const cargarMiReaccion = async () => {
    if (!window.sb) return;
    const { data } = await window.sb.from('reacciones').select('producto_id,tipo').eq('cliente_id', clienteId);
    document.querySelectorAll('.reaction').forEach(b => b.classList.remove('active'));
    (data || []).forEach(r => {
      const btn = document.querySelector(`.reactions[data-product="${r.producto_id}"] .reaction[data-tipo="${r.tipo}"]`);
      if (btn) btn.classList.add('active');
    });
  };

  // Clic en un botón de reacción
  const onReaccion = async (btn) => {
    if (!window.sb) return;
    const bar = btn.closest('.reactions');
    const producto_id = bar.dataset.product;
    const tipo = btn.dataset.tipo;
    const yaActiva = btn.classList.contains('active');

    // animación "pop"
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');

    // respuesta visual inmediata
    bar.querySelectorAll('.reaction').forEach(b => b.classList.remove('active'));
    if (!yaActiva) btn.classList.add('active');

    try {
      if (yaActiva) {
        // clic en la misma reacción → se quita
        await window.sb.from('reacciones').delete().eq('producto_id', producto_id).eq('cliente_id', clienteId);
      } else {
        // nueva reacción o cambio → se guarda/actualiza (upsert por la clave única)
        await window.sb.from('reacciones').upsert(
          { producto_id, cliente_id: clienteId, tipo },
          { onConflict: 'producto_id,cliente_id' }
        );
      }
    } catch (e) { console.warn('Reacción:', e.message); }
    cargarConteos();
  };

  // Dibuja los productos: desde Supabase si está configurado; si no, desde config.js
  const initProductos = async () => {
    if (!productsGrid) return;
    let productos = null;
    if (window.sb) {
      const { data, error } = await window.sb.from('productos').select('*').order('creado_en', { ascending: true });
      if (!error && data && data.length) productos = data;
    }
    const conReacciones = !!productos;             // solo hay reacciones si vienen de la base de datos
    if (!productos) productos = CONFIG.productos;   // respaldo: nada se rompe sin Supabase

    productsGrid.innerHTML = productos.map(p => cardHTML(p, conReacciones)).join('');
    productsGrid.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--d', `${i * 0.07}s`);
      revealObserver.observe(el);
    });

    if (conReacciones) {
      productsGrid.querySelectorAll('.reaction').forEach(btn =>
        btn.addEventListener('click', () => onReaccion(btn)));
      await cargarConteos();
      await cargarMiReaccion();
      // Tiempo real: si otra persona reacciona, los números se actualizan solos
      window.sb.channel('reacciones-web')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reacciones' }, () => cargarConteos())
        .subscribe();
    }
  };
  initProductos();

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
  // (el observador "revealObserver" se definió arriba, en la sección de productos)
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
