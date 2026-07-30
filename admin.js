/* ============================================================
   ECOCOFFIEPLANET · admin.js
   Lógica del panel de administrador:
   - Login con Supabase Auth (solo rol 'admin')
   - Agregar / editar / eliminar productos
   - Subir imágenes a Supabase Storage
   - Ver reacciones (👍 ❤️ 👎) y total, ordenar por reacciones
   La SEGURIDAD real la dan las políticas (RLS) de la base de datos:
   aunque alguien abra esta página, no puede escribir sin ser admin.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);

  // Vistas
  const loginView = $('#login-view');
  const panelView = $('#panel-view');
  // Login
  const loginForm = $('#login-form');
  const loginMsg  = $('#login-msg');
  const logoutBtn = $('#logout-btn');
  const adminEmail = $('#admin-email');
  // Formulario de producto
  const productForm = $('#product-form');
  const formTitle = $('#form-title');
  const formMsg   = $('#form-msg');
  const cancelEditBtn = $('#cancel-edit');
  const saveBtn = $('#save-btn');
  const fNombre = $('#p-nombre'), fPrecio = $('#p-precio'), fDesc = $('#p-desc');
  const fEtiqueta = $('#p-etiqueta'), fImagen = $('#p-imagen'), fFile = $('#p-file');
  // Tabla
  const tableBody = $('#product-table-body');
  const sortSelect = $('#sort-select');

  let productos = [];   // productos con sus conteos
  let editId = null;    // id del producto que se está editando (o null)

  // Si no está configurado Supabase, avisamos y no seguimos
  if (!window.sb) {
    loginMsg.textContent = '⚠️ Falta configurar Supabase en el archivo supabase-config.js';
    loginMsg.className = 'msg err';
    loginForm.querySelector('button').disabled = true;
    return;
  }

  /* -------------------- SESIÓN Y ACCESO -------------------- */
  const esAdmin = async () => {
    const { data, error } = await window.sb.rpc('es_admin');
    return !error && data === true;
  };

  const mostrarLogin = () => { panelView.hidden = true; loginView.hidden = false; };
  const mostrarPanel = (user) => {
    loginView.hidden = true; panelView.hidden = false;
    adminEmail.textContent = user.email;
    cargarProductos();
  };

  const init = async () => {
    const { data: { session } } = await window.sb.auth.getSession();
    if (session && await esAdmin()) mostrarPanel(session.user);
    else mostrarLogin();
  };

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = 'Ingresando…'; loginMsg.className = 'msg';
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) { loginMsg.textContent = 'Escribe correo y contraseña.'; loginMsg.className = 'msg err'; return; }

    const { error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) { loginMsg.textContent = 'Correo o contraseña incorrectos.'; loginMsg.className = 'msg err'; return; }

    // Verificar que sea administrador; si no, cerrar sesión
    if (!(await esAdmin())) {
      await window.sb.auth.signOut();
      loginMsg.textContent = 'Esta cuenta no tiene permisos de administrador.';
      loginMsg.className = 'msg err';
      return;
    }
    const { data: { user } } = await window.sb.auth.getUser();
    loginForm.reset();
    mostrarPanel(user);
  });

  // Cerrar sesión
  logoutBtn.addEventListener('click', async () => {
    await window.sb.auth.signOut();
    mostrarLogin();
  });

  /* -------------------- CARGAR PRODUCTOS + REACCIONES -------------------- */
  const cargarProductos = async () => {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-soft);">Cargando…</td></tr>`;
    const [{ data: prods, error }, { data: counts }] = await Promise.all([
      window.sb.from('productos').select('*'),
      window.sb.rpc('conteo_reacciones'),
    ]);
    if (error) { tableBody.innerHTML = `<tr><td colspan="6" style="color:#d9534f;">Error: ${error.message}</td></tr>`; return; }

    const cmap = {};
    (counts || []).forEach(c => { cmap[c.producto_id] = c; });
    productos = (prods || []).map(p => {
      const c = cmap[p.id] || { likes: 0, loves: 0, dislikes: 0, total: 0 };
      return { ...p, likes: +c.likes || 0, loves: +c.loves || 0, dislikes: +c.dislikes || 0, total: +c.total || 0 };
    });
    renderTabla();
  };

  const formatPrecio = (v) => (!v || v <= 0) ? '$0' : '$' + Number(v).toLocaleString('es-CO');

  const renderTabla = () => {
    // Ordenar según la selección
    const orden = sortSelect.value;
    const lista = [...productos].sort((a, b) =>
      orden === 'reacciones' ? b.total - a.total : new Date(b.creado_en) - new Date(a.creado_en)
    );

    if (!lista.length) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-soft);">No hay productos. Agrega el primero arriba. ☕</td></tr>`;
      return;
    }

    tableBody.innerHTML = lista.map(p => `
      <tr>
        <td><img class="admin-thumb" src="${p.imagen || ''}" alt="${escapeHtml(p.nombre)}" onerror="this.style.visibility='hidden'"/></td>
        <td>
          <b>${escapeHtml(p.nombre)}</b>
          ${p.etiqueta ? `<br><small style="color:var(--accent)">${escapeHtml(p.etiqueta)}</small>` : ''}
        </td>
        <td>${formatPrecio(p.precio)}</td>
        <td>
          <span class="rcount">👍 <b>${p.likes}</b></span>
          <span class="rcount">❤️ <b>${p.loves}</b></span>
          <span class="rcount">👎 <b>${p.dislikes}</b></span>
        </td>
        <td><b>${p.total}</b></td>
        <td>
          <div class="admin-row-actions">
            <button class="btn-icon" data-edit="${p.id}">✏️ Editar</button>
            <button class="btn-icon danger" data-del="${p.id}">🗑️ Borrar</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Conectar botones de cada fila
    tableBody.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => empezarEdicion(b.dataset.edit)));
    tableBody.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => borrarProducto(b.dataset.del)));
  };

  sortSelect.addEventListener('change', renderTabla);

  /* -------------------- GUARDAR (AGREGAR O EDITAR) -------------------- */
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = ''; formMsg.className = 'msg';

    // Validación en el frontend
    const nombre = fNombre.value.trim();
    if (nombre.length < 2) { formMsg.textContent = 'El nombre es obligatorio.'; formMsg.className = 'msg err'; fNombre.focus(); return; }
    const precio = Math.max(0, parseInt(fPrecio.value, 10) || 0);

    saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';

    try {
      // Si el admin subió un archivo, lo mandamos a Storage y usamos su URL
      let imagen = fImagen.value.trim();
      if (fFile.files && fFile.files[0]) {
        const file = fFile.files[0];
        const ext = file.name.split('.').pop();
        const ruta = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
        const { error: upErr } = await window.sb.storage.from('productos').upload(ruta, file, { upsert: false });
        if (upErr) throw new Error('No se pudo subir la imagen: ' + upErr.message);
        imagen = window.sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
      }

      const datos = {
        nombre,
        descripcion: fDesc.value.trim(),
        precio,
        etiqueta: fEtiqueta.value.trim(),
        ...(imagen ? { imagen } : {}),
      };

      let error;
      if (editId) {
        ({ error } = await window.sb.from('productos').update(datos).eq('id', editId));
      } else {
        ({ error } = await window.sb.from('productos').insert(datos));
      }
      if (error) throw new Error(error.message);

      formMsg.textContent = editId ? '✅ Producto actualizado.' : '✅ Producto agregado.';
      formMsg.className = 'msg ok';
      resetForm();
      cargarProductos();
    } catch (err) {
      formMsg.textContent = '⚠️ ' + err.message;
      formMsg.className = 'msg err';
    } finally {
      saveBtn.disabled = false; saveBtn.textContent = 'Guardar producto';
    }
  });

  // Cargar datos de un producto en el formulario para editarlo
  const empezarEdicion = (id) => {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    editId = id;
    fNombre.value = p.nombre || '';
    fPrecio.value = p.precio || 0;
    fDesc.value = p.descripcion || '';
    fEtiqueta.value = p.etiqueta || '';
    fImagen.value = p.imagen || '';
    fFile.value = '';
    formTitle.textContent = 'Editar producto';
    saveBtn.textContent = 'Guardar cambios';
    cancelEditBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  cancelEditBtn.addEventListener('click', resetForm);

  function resetForm() {
    editId = null;
    productForm.reset();
    fPrecio.value = 0;
    formTitle.textContent = 'Agregar producto';
    saveBtn.textContent = 'Guardar producto';
    cancelEditBtn.hidden = true;
  }

  // Eliminar producto (sus reacciones se borran solas por la base de datos)
  const borrarProducto = async (id) => {
    const p = productos.find(x => x.id === id);
    if (!confirm(`¿Eliminar "${p ? p.nombre : 'este producto'}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await window.sb.from('productos').delete().eq('id', id);
    if (error) { alert('No se pudo eliminar: ' + error.message); return; }
    if (editId === id) resetForm();
    cargarProductos();
  };

  // Pequeña ayuda para evitar romper el HTML con caracteres especiales
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  init();
});
