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
      <div class="product-card__img" ${p.id ? `data-ver="${p.id}"` : ''}>
        <img src="${p.imagen}" alt="${p.nombre}" loading="lazy" />
        ${p.etiqueta ? `<span class="product-card__tag">${p.etiqueta}</span>` : ''}
      </div>
      <div class="product-card__body">
        <h3>${p.nombre}</h3>
        <p>${p.descripcion || ''}</p>
        <div class="product-card__foot">
          <span class="price">${formatPrice(p.precio)}</span>
          <div class="btns">
            <button class="btn btn--sm btn--ghost" ${p.id ? `data-ver="${p.id}"` : ''}>Ver más</button>
            <button class="btn btn--sm btn--primary" ${p.id ? `data-add="${p.id}"` : ''}>Agregar</button>
          </div>
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

    productosActuales = productos;
    productsGrid.innerHTML = productos.map(p => cardHTML(p, conReacciones)).join('');
    productsGrid.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--d', `${i * 0.07}s`);
      revealObserver.observe(el);
    });

    if (conReacciones) {
      wireReactions(productsGrid);
      await cargarConteos();
      await cargarMiReaccion();
      // Tiempo real: si otra persona reacciona, los números se actualizan solos
      window.sb.channel('reacciones-web')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reacciones' }, () => cargarConteos())
        .subscribe();
    }
  };

  /* ===================== CARRITO · VENTANA · CHECKOUT ===================== */
  let productosActuales = [];
  const getProd = (id) => productosActuales.find(p => String(p.id) === String(id));
  const wireReactions = (container) => {
    container.querySelectorAll('.reaction').forEach(btn => btn.addEventListener('click', () => onReaccion(btn)));
  };
  const precioLabel = (v) => (v && v > 0) ? '$' + Number(v).toLocaleString('es-CO') : 'A convenir';

  // ----- Notificaciones (toasts) -----
  const toastWrap = document.getElementById('toast-wrap');
  const showToast = (msg) => {
    if (!toastWrap) return;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    toastWrap.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2400);
  };

  // ----- Elementos del carrito / ventana -----
  const overlay = document.getElementById('overlay');
  const cartEl = document.getElementById('cart');
  const cartItemsEl = document.getElementById('cart-items');
  const cartTotalEl = document.getElementById('cart-total');
  const cartBadge = document.getElementById('cart-badge');
  const modal = document.getElementById('product-modal');

  // ----- Estado del carrito (guardado en el navegador) -----
  const loadCart = () => { try { return JSON.parse(localStorage.getItem('eco-cart')) || []; } catch { return []; } };
  const saveCart = () => localStorage.setItem('eco-cart', JSON.stringify(cart));
  let cart = loadCart();
  const cartTotal = () => cart.reduce((s, i) => s + (i.precio || 0) * i.cantidad, 0);
  const cartCount = () => cart.reduce((s, i) => s + i.cantidad, 0);

  const updateBadge = () => {
    if (!cartBadge) return;
    const n = cartCount();
    cartBadge.textContent = n;
    cartBadge.hidden = n === 0;
  };

  const renderCart = () => {
    if (!cartItemsEl) return;
    if (!cart.length) {
      cartItemsEl.innerHTML = '<p class="cart__empty">Tu carrito está vacío.<br>Agrega productos ☕</p>';
    } else {
      cartItemsEl.innerHTML = cart.map(i => `
        <div class="cart-item" data-id="${i.id}">
          <img class="cart-item__img" src="${i.imagen}" alt="${i.nombre}" />
          <div>
            <div class="cart-item__name">${i.nombre}</div>
            <div class="cart-item__price">${precioLabel(i.precio)}</div>
            <div class="cart-item__qty">
              <button data-menos="${i.id}" aria-label="Menos">−</button>
              <span>${i.cantidad}</span>
              <button data-mas="${i.id}" aria-label="Más">+</button>
            </div>
          </div>
          <button class="cart-item__del" data-del="${i.id}" aria-label="Quitar">🗑️</button>
        </div>`).join('');
    }
    const total = cartTotal();
    if (cartTotalEl) cartTotalEl.textContent = total > 0 ? '$' + total.toLocaleString('es-CO') : 'A convenir';
    updateBadge();
  };

  const addToCart = (prod) => {
    if (!prod) return;
    const ex = cart.find(i => i.id === prod.id);
    if (ex) ex.cantidad++;
    else cart.push({ id: prod.id, nombre: prod.nombre, precio: prod.precio || 0, imagen: prod.imagen, cantidad: 1 });
    saveCart(); renderCart(); showToast('Agregado al carrito ✓');
  };
  const changeQty = (id, delta) => {
    const it = cart.find(i => i.id === id); if (!it) return;
    it.cantidad += delta;
    if (it.cantidad <= 0) cart = cart.filter(i => i.id !== id);
    saveCart(); renderCart();
  };
  const removeItem = (id) => { cart = cart.filter(i => i.id !== id); saveCart(); renderCart(); };

  // ----- Abrir / cerrar overlay, carrito y ventana -----
  function cerrarOverlaySiLibre() {
    const abierto = (cartEl && cartEl.classList.contains('open')) || (modal && !modal.hidden);
    if (!abierto && overlay) { overlay.classList.remove('show'); setTimeout(() => { overlay.hidden = true; }, 300); }
  }
  const abrirOverlay = () => { if (!overlay) return; overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add('show')); };
  const openCart = () => { renderCart(); if (cartEl) cartEl.classList.add('open'); abrirOverlay(); };
  const closeCart = () => { if (cartEl) cartEl.classList.remove('open'); cerrarOverlaySiLibre(); };
  const closeModal = () => { if (modal) modal.hidden = true; cerrarOverlaySiLibre(); };

  const openModal = (prod) => {
    if (!prod || !modal) return;
    document.getElementById('m-img').src = prod.imagen;
    document.getElementById('m-img').alt = prod.nombre;
    document.getElementById('m-nombre').textContent = prod.nombre;
    document.getElementById('m-precio').textContent = precioLabel(prod.precio);
    document.getElementById('m-desc').textContent = prod.descripcion || '';
    const tag = document.getElementById('m-tag');
    if (prod.etiqueta) { tag.textContent = prod.etiqueta; tag.hidden = false; } else { tag.hidden = true; }
    // Reacciones dentro de la ventana
    const rc = document.getElementById('m-reactions');
    rc.innerHTML = window.sb ? `
      <div class="reactions" data-product="${prod.id}">
        <button class="reaction" data-tipo="like"><span>👍</span><b class="rc like">0</b></button>
        <button class="reaction" data-tipo="love"><span>❤️</span><b class="rc love">0</b></button>
        <button class="reaction" data-tipo="dislike"><span>👎</span><b class="rc dislike">0</b></button>
      </div>` : '';
    if (window.sb) { wireReactions(rc); cargarConteos(); cargarMiReaccion(); }
    document.getElementById('m-add').onclick = () => { addToCart(prod); closeModal(); };
    modal.hidden = false; abrirOverlay();
  };

  // ----- Conexiones de eventos -----
  if (productsGrid) productsGrid.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const ver = e.target.closest('[data-ver]');
    if (add) { e.preventDefault(); addToCart(getProd(add.dataset.add)); }
    else if (ver) { openModal(getProd(ver.dataset.ver)); }
  });
  if (cartItemsEl) cartItemsEl.addEventListener('click', (e) => {
    const mas = e.target.closest('[data-mas]'), menos = e.target.closest('[data-menos]'), del = e.target.closest('[data-del]');
    if (mas) changeQty(mas.dataset.mas, 1);
    else if (menos) changeQty(menos.dataset.menos, -1);
    else if (del) removeItem(del.dataset.del);
  });
  document.getElementById('cart-btn') && document.getElementById('cart-btn').addEventListener('click', openCart);
  document.getElementById('cart-close') && document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('modal-close') && document.getElementById('modal-close').addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', () => { closeCart(); closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCart(); closeModal(); } });

  // ----- Checkout: guarda el pedido y abre WhatsApp -----
  const checkoutForm = document.getElementById('checkout-form');
  const cartMsg = document.getElementById('cart-msg');
  if (checkoutForm) checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('c-nombre').value.trim();
    const tel = document.getElementById('c-tel').value.trim();
    cartMsg.className = 'cart__msg';
    if (!cart.length) { cartMsg.textContent = 'Tu carrito está vacío.'; cartMsg.classList.add('err'); return; }
    if (nombre.length < 2) { cartMsg.textContent = 'Escribe tu nombre para el pedido.'; cartMsg.classList.add('err'); return; }

    const items = cart.map(i => ({ producto_id: i.id, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad }));
    const total = cartTotal();

    // Guardar el pedido en la base de datos (si Supabase está conectado)
    if (window.sb) {
      try { await window.sb.from('pedidos').insert({ cliente_nombre: nombre, cliente_telefono: tel, items, total }); }
      catch (err) { console.warn('Pedido:', err.message); }
    }

    // Armar el mensaje de WhatsApp
    let texto = `¡Hola ECOCOFFIEPLANET! 🌿 Soy ${nombre} y quiero hacer un pedido:\n\n`;
    cart.forEach(i => { texto += `• ${i.cantidad}x ${i.nombre} (${precioLabel(i.precio)})\n`; });
    texto += `\nTotal: ${total > 0 ? '$' + total.toLocaleString('es-CO') : 'A convenir'}`;
    if (tel) texto += `\nMi WhatsApp: ${tel}`;
    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`, '_blank');

    // Vaciar carrito
    cart = []; saveCart(); renderCart(); checkoutForm.reset();
    cartMsg.textContent = '¡Pedido enviado! Te llevamos a WhatsApp ✓'; cartMsg.classList.add('ok');
    showToast('Pedido realizado 🎉');
    setTimeout(closeCart, 1600);
  });

  updateBadge(); // muestra el contador si ya había productos guardados
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
