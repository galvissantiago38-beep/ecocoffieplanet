/* ============================================================
   ECOCOFFIEPLANET · admin.js
   Panel de administrador. El login se hace con una conexión
   DIRECTA al servidor de autenticación (evita un bloqueo
   conocido de la librería en algunos navegadores).
   Luego, todas las operaciones (crear/editar/borrar/subir)
   usan un cliente con el token del admin, y la SEGURIDAD real
   la dan las políticas (RLS) de la base de datos.
   ============================================================ */

const __startAdmin = () => {
  const $ = (s) => document.querySelector(s);

  const SB_URL = window.SUPABASE_URL;
  const SB_KEY = window.SUPABASE_ANON_KEY;

  // Vistas y elementos
  const loginView = $('#login-view');
  const panelView = $('#panel-view');
  const loginForm = $('#login-form');
  const loginMsg  = $('#login-msg');
  const logoutBtn = $('#logout-btn');
  const adminEmail = $('#admin-email');
  const productForm = $('#product-form');
  const formTitle = $('#form-title');
  const formMsg   = $('#form-msg');
  const cancelEditBtn = $('#cancel-edit');
  const saveBtn = $('#save-btn');
  const fNombre = $('#p-nombre'), fPrecio = $('#p-precio'), fDesc = $('#p-desc');
  const fEtiqueta = $('#p-etiqueta'), fImagen = $('#p-imagen'), fFile = $('#p-file');
  const tableBody = $('#product-table-body');
  const sortSelect = $('#sort-select');

  let sbAdmin = null;   // cliente con el token del administrador
  let productos = [];
  let editId = null;

  // Muestra en pantalla cualquier error inesperado (para no quedar "en blanco")
  const showFatal = (m) => { loginMsg.textContent = '⚠️ ' + m; loginMsg.className = 'msg err'; };
  window.addEventListener('error', (e) => showFatal(e.message || 'Error de carga'));
  window.addEventListener('unhandledrejection', (e) => showFatal((e.reason && e.reason.message) || 'Error de conexión'));

  // Aviso si faltara la configuración (sin bloquear el botón)
  if (!SB_URL || SB_URL.includes('TU-PROYECTO')) {
    showFatal('Falta configurar Supabase en supabase-config.js');
  }

  /* -------------------- AUTENTICACIÓN (conexión directa) -------------------- */
  const guardarTokens = (j) => {
    localStorage.setItem('eco-admin-token', j.access_token);
    if (j.refresh_token) localStorage.setItem('eco-admin-refresh', j.refresh_token);
  };
  const limpiarTokens = () => {
    localStorage.removeItem('eco-admin-token');
    localStorage.removeItem('eco-admin-refresh');
    localStorage.removeItem('eco-admin-email');
  };

  // Crea un cliente que envía el token del admin en cada petición.
  // Usa la opción "accessToken" (modo recomendado): evita el bloqueo interno
  // de la librería y garantiza que el token viaje en todas las peticiones.
  const clienteConToken = (token) => {
    if (!window.supabase) throw new Error('No cargó la librería de Supabase (revisa tu internet o desactiva el bloqueador de anuncios).');
    return window.supabase.createClient(SB_URL, SB_KEY, { accessToken: async () => token });
  };

  // Login directo contra el servidor de autenticación (con tiempo límite)
  const iniciarSesion = async (email, password) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(SB_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST', signal: ctrl.signal,
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (r.status !== 200) throw new Error('Correo o contraseña incorrectos.');
      return j;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('El servidor tardó demasiado. Revisa tu internet e intenta de nuevo.');
      throw e;
    } finally { clearTimeout(t); }
  };

  // Renueva el token si se venció (para no tener que re-loguear tan seguido)
  const renovarToken = async () => {
    const rt = localStorage.getItem('eco-admin-refresh');
    if (!rt) return null;
    try {
      const r = await fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (r.status !== 200) return null;
      const j = await r.json(); guardarTokens(j); return j.access_token;
    } catch { return null; }
  };

  const esAdmin = async (cli) => {
    const { data, error } = await cli.rpc('es_admin');
    return !error && data === true;
  };

  const mostrarLogin = () => { panelView.hidden = true; loginView.hidden = false; };
  const mostrarPanel = () => {
    loginView.hidden = true; panelView.hidden = false;
    adminEmail.textContent = localStorage.getItem('eco-admin-email') || '';
    cargarProductos();
  };

  // Al abrir la página: si hay token válido, entra directo
  const init = async () => {
    let token = localStorage.getItem('eco-admin-token');
    if (token) {
      sbAdmin = clienteConToken(token);
      if (await esAdmin(sbAdmin)) return mostrarPanel();
      // token vencido → intentar renovar
      token = await renovarToken();
      if (token) { sbAdmin = clienteConToken(token); if (await esAdmin(sbAdmin)) return mostrarPanel(); }
      limpiarTokens();
    }
    mostrarLogin();
  };

  // Enviar formulario de login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMsg.textContent = 'Ingresando…'; loginMsg.className = 'msg';
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    if (!email || !password) { loginMsg.textContent = 'Escribe correo y contraseña.'; loginMsg.className = 'msg err'; return; }

    try {
      const sesion = await iniciarSesion(email, password);
      const cli = clienteConToken(sesion.access_token);
      if (!(await esAdmin(cli))) { loginMsg.textContent = 'Esta cuenta no tiene permisos de administrador.'; loginMsg.className = 'msg err'; return; }
      guardarTokens(sesion);
      localStorage.setItem('eco-admin-email', email);
      sbAdmin = cli;
      loginForm.reset();
      loginMsg.textContent = '';
      mostrarPanel();
    } catch (err) {
      loginMsg.textContent = err.message;
      loginMsg.className = 'msg err';
    }
  });

  logoutBtn.addEventListener('click', () => { limpiarTokens(); sbAdmin = null; mostrarLogin(); });

  /* -------------------- PRODUCTOS + REACCIONES -------------------- */
  const cargarProductos = async () => {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-soft);">Cargando…</td></tr>`;
    const [{ data: prods, error }, { data: counts }] = await Promise.all([
      sbAdmin.from('productos').select('*'),
      sbAdmin.rpc('conteo_reacciones'),
    ]);
    if (error) { tableBody.innerHTML = `<tr><td colspan="6" style="color:#d9534f;">Error: ${error.message}</td></tr>`; return; }
    const cmap = {}; (counts || []).forEach(c => { cmap[c.producto_id] = c; });
    productos = (prods || []).map(p => {
      const c = cmap[p.id] || { likes: 0, loves: 0, dislikes: 0, total: 0 };
      return { ...p, likes: +c.likes || 0, loves: +c.loves || 0, dislikes: +c.dislikes || 0, total: +c.total || 0 };
    });
    renderTabla();
  };

  const formatPrecio = (v) => (!v || v <= 0) ? '$0' : '$' + Number(v).toLocaleString('es-CO');

  const renderTabla = () => {
    const orden = sortSelect.value;
    const lista = [...productos].sort((a, b) =>
      orden === 'reacciones' ? b.total - a.total : new Date(b.creado_en) - new Date(a.creado_en));

    if (!lista.length) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-soft);">No hay productos. Agrega el primero arriba. ☕</td></tr>`;
      return;
    }
    tableBody.innerHTML = lista.map(p => `
      <tr>
        <td><img class="admin-thumb" src="${p.imagen || ''}" alt="" onerror="this.style.visibility='hidden'"/></td>
        <td><b>${escapeHtml(p.nombre)}</b>${p.etiqueta ? `<br><small style="color:var(--accent)">${escapeHtml(p.etiqueta)}</small>` : ''}</td>
        <td>${formatPrecio(p.precio)}</td>
        <td>
          <span class="rcount">👍 <b>${p.likes}</b></span>
          <span class="rcount">❤️ <b>${p.loves}</b></span>
          <span class="rcount">👎 <b>${p.dislikes}</b></span>
        </td>
        <td><b>${p.total}</b></td>
        <td><div class="admin-row-actions">
          <button class="btn-icon" data-edit="${p.id}">✏️ Editar</button>
          <button class="btn-icon danger" data-del="${p.id}">🗑️ Borrar</button>
        </div></td>
      </tr>`).join('');

    tableBody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => empezarEdicion(b.dataset.edit)));
    tableBody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => borrarProducto(b.dataset.del)));
  };
  sortSelect.addEventListener('change', renderTabla);

  /* -------------------- GUARDAR (AGREGAR / EDITAR) -------------------- */
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = ''; formMsg.className = 'msg';
    const nombre = fNombre.value.trim();
    if (nombre.length < 2) { formMsg.textContent = 'El nombre es obligatorio.'; formMsg.className = 'msg err'; fNombre.focus(); return; }
    const precio = Math.max(0, parseInt(fPrecio.value, 10) || 0);
    saveBtn.disabled = true; saveBtn.textContent = 'Guardando…';

    try {
      let imagen = fImagen.value.trim();
      if (fFile.files && fFile.files[0]) {
        const file = fFile.files[0];
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const ruta = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
        const { error: upErr } = await sbAdmin.storage.from('productos').upload(ruta, file, { upsert: false });
        if (upErr) throw new Error('No se pudo subir la imagen: ' + upErr.message);
        imagen = sbAdmin.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
      }
      const datos = { nombre, descripcion: fDesc.value.trim(), precio, etiqueta: fEtiqueta.value.trim(), ...(imagen ? { imagen } : {}) };

      let error;
      if (editId) ({ error } = await sbAdmin.from('productos').update(datos).eq('id', editId));
      else ({ error } = await sbAdmin.from('productos').insert(datos));
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

  const empezarEdicion = (id) => {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    editId = id;
    fNombre.value = p.nombre || ''; fPrecio.value = p.precio || 0; fDesc.value = p.descripcion || '';
    fEtiqueta.value = p.etiqueta || ''; fImagen.value = p.imagen || ''; fFile.value = '';
    formTitle.textContent = 'Editar producto';
    saveBtn.textContent = 'Guardar cambios';
    cancelEditBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  cancelEditBtn.addEventListener('click', resetForm);

  function resetForm() {
    editId = null; productForm.reset(); fPrecio.value = 0;
    formTitle.textContent = 'Agregar producto';
    saveBtn.textContent = 'Guardar producto';
    cancelEditBtn.hidden = true;
  }

  const borrarProducto = async (id) => {
    const p = productos.find(x => x.id === id);
    if (!confirm(`¿Eliminar "${p ? p.nombre : 'este producto'}"? No se puede deshacer.`)) return;
    const { error } = await sbAdmin.from('productos').delete().eq('id', id);
    if (error) { alert('No se pudo eliminar: ' + error.message); return; }
    if (editId === id) resetForm();
    cargarProductos();
  };

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  init();
};

// Ejecuta el panel aunque la página ya haya terminado de cargar
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __startAdmin);
else __startAdmin();
