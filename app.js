'use strict';
(() => {
  /* CONFIG */
  const SB_URL = 'https://piuztzpjgwouaplbxbqc.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdXp0enBqZ3dvdWFwbGJ4YnFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODY1ODAsImV4cCI6MjA5MzU2MjU4MH0.3QVRdgikykyrql8nv0yx7ZdrskmZWdVi6XRWQJDgstk'; // anon/public key (única credencial del frontend)
  const WA = '573132211683';
  const PAGE = 6;
  const COLS = 'id,nombre,tipo,gestion,zona,precio,habitaciones,banos,area,parqueaderos,estrato,descripcion,asesor,created_at,imagen,imagenes';
  const ARR = [[1e6, '$1 millón'], [1.5e6, '$1,5 millones'], [2e6, '$2 millones'], [3e6, '$3 millones'], [5e6, '$5 millones'], [1e7, '$10 millones']];
  const PRICES = {
    Arriendo: ARR, Amoblado: ARR,
    Venta: [[2e8, '$200 millones'], [3e8, '$300 millones'], [4e8, '$400 millones'], [6e8, '$600 millones'], [8e8, '$800 millones'], [1.2e9, '$1.200 millones']]
  };

  /* UTILITIES */
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nrm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : ''; } catch { return ''; } };
  const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  const price = (p) => {
    const n = Number(p.precio);
    return n > 0 ? '$' + n.toLocaleString('es-CO') + (p.gestion === 'Venta' ? '' : '/mes') : 'Consultar precio';
  };

  /* STATE */
  let all = [], gestion = 'Arriendo', shown = PAGE, opener = null;

  /* DATA */
  function prep(p) {
    let a = p.imagenes;
    if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = []; } }
    const imgs = (Array.isArray(a) ? a : []).map(safeUrl).filter(Boolean);
    return {
      id: String(p.id), nombre: String(p.nombre || 'Propiedad'), tipo: p.tipo || '', gestion: p.gestion || '',
      zona: String(p.zona || ''), precio: p.precio, hab: +p.habitaciones || 0, ban: +p.banos || 0,
      area: +p.area || 0, park: +p.parqueaderos || 0, estrato: +p.estrato || 0,
      desc: String(p.descripcion || ''), asesor: String(p.asesor || ''), created: p.created_at || '',
      imgs, cover: safeUrl(p.imagen) || imgs[0] || ''
    };
  }

  function setState(kind, msg, retry) {
    const el = $('props-state');
    el.hidden = !kind;
    el.className = 'state-msg' + (kind ? ' state-' + kind : '');
    el.textContent = msg || '';
    if (retry) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'view-more-btn'; b.textContent = 'Reintentar';
      b.addEventListener('click', load);
      el.append(' ', b);
    }
  }

  async function load() {
    setState('loading', 'Buscando propiedades…');
    try {
      if (!window.supabase) throw new Error('sdk');
      const sb = window.supabase.createClient(SB_URL, SB_KEY);
      const req = sb.from('propiedades')
        .select(COLS)
        .eq('estado', 'Disponible')
        .order('created_at', { ascending: false })
        .limit(200);
      const { data, error } = await Promise.race([req, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 12000))]);
      if (error) throw error;
      all = (data || []).filter((p) => p && p.id).map(prep);
      $('zonas').innerHTML = [...new Set(all.map((p) => p.zona).filter(Boolean))].sort()
        .map((z) => `<option value="${esc(z)}"></option>`).join('');
      render();
    } catch (e) {
      console.error('Supabase error:', e);
      $('props-grid').innerHTML = ''; $('props-count').textContent = ''; $('load-more').hidden = true;
      setState('error', 'No fue posible cargar las propiedades. Intente nuevamente. [' + (e && (e.code || e.message) || 'error') + ']', true);
    }
  }

  /* FILTERS */
  function filtered() {
    const tipo = $('s-tipo').value, z = nrm($('s-zona').value), max = +$('s-precio').value || Infinity;
    const hab = +$('s-hab').value || 0, ban = +$('s-ban').value || 0, ord = $('s-order').value;
    const r = all.filter((p) => p.gestion === gestion && (!tipo || p.tipo === tipo) && (!z || nrm(p.zona).includes(z)) &&
      (max === Infinity || (+p.precio > 0 && +p.precio <= max)) && p.hab >= hab && p.ban >= ban);
    if (ord === 'price-asc') r.sort((a, b) => (+a.precio || 0) - (+b.precio || 0));
    if (ord === 'price-desc') r.sort((a, b) => (+b.precio || 0) - (+a.precio || 0));
    if (ord === 'recent') r.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
    return r;
  }

  /* RENDER */
  function card(p) {
    const d = [p.hab ? `${p.hab} hab.` : '', p.ban ? `${p.ban} baños` : '', p.area ? `${p.area} m²` : '', p.park ? `${p.park} parq.` : '']
      .filter(Boolean).map((t) => `<div class="prop-detail">${esc(t)}</div>`).join('');
    return `<article class="prop-card">
      <div class="prop-img">${p.cover
        ? `<img src="${esc(p.cover)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async" width="600" height="400">`
        : '<div class="prop-noimg">Foto no disponible</div>'}
        <span class="prop-badge ${p.gestion === 'Venta' ? 'badge-venta' : 'badge-arriendo'}">${esc(p.gestion)}</span></div>
      <div class="prop-body">
        <div class="prop-price">${esc(price(p))}${p.estrato ? `<span>Estrato ${p.estrato}</span>` : ''}</div>
        <h3 class="prop-name"><button type="button" class="prop-link" data-id="${esc(p.id)}">${esc(p.nombre)}</button></h3>
        ${p.zona ? `<div class="prop-loc">${esc(p.zona)}</div>` : ''}
        <div class="prop-details">${d}</div>
      </div></article>`;
  }

  function render() {
    const list = filtered(), n = list.length;
    $('props-grid').innerHTML = list.slice(0, shown).map(card).join('');
    $('props-count').textContent = `${n} propiedad${n !== 1 ? 'es' : ''} encontrada${n !== 1 ? 's' : ''}`;
    $('load-more').hidden = n <= shown;
    setState(n ? '' : 'empty', n ? '' : 'No encontramos propiedades con esos filtros.');
  }

  /* MODAL */
  function openModal(id) {
    const p = all.find((x) => x.id === id);
    if (!p) return;
    const g = p.imgs.length ? p.imgs : (p.cover ? [p.cover] : []);
    const feat = [['Habitaciones', p.hab], ['Baños', p.ban], ['Área', p.area && p.area + ' m²'], ['Parqueaderos', p.park], ['Asesor', p.asesor]]
      .filter((f) => f[1]).map((f) => `<div class="modal-feature"><div class="modal-feature-label">${f[0]}</div><div class="modal-feature-value">${esc(f[1])}</div></div>`).join('');
    const msg = `Hola, estoy interesado en la propiedad "${p.nombre}"${p.zona ? ` ubicada en ${p.zona}` : ''}. Quisiera recibir más información.`;
    $('m-body').innerHTML = `
      <div class="modal-gallery">
        <div class="gallery-main">${p.cover ? `<img id="m-main" src="${esc(p.cover)}" alt="${esc(p.nombre)}" decoding="async">` : '<div class="prop-noimg">Foto no disponible</div>'}</div>
        ${g.length > 1 ? `<div class="gallery-thumbs">${g.map((u, i) => `<button type="button" class="thumb${u === p.cover ? ' active-thumb' : ''}" data-src="${esc(u)}" aria-label="Ver foto ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
      </div>
      <div class="modal-topbar"><span class="prop-badge ${p.gestion === 'Venta' ? 'badge-venta' : 'badge-arriendo'} badge-modal">${esc(p.gestion)}</span>
        <div class="modal-location">${esc(p.zona)}</div></div>
      <h2 class="modal-title" id="m-title">${esc(p.nombre)}</h2>
      <div class="modal-price">${esc(price(p))}</div>
      <div class="modal-layout">
        <div class="modal-main">${p.desc ? `<p class="modal-description">${esc(p.desc)}</p>` : ''}</div>
        <div class="modal-sidebar"><div class="modal-features">${feat}</div>
          <a class="modal-whatsapp" href="${esc(wa(msg))}" target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a></div>
      </div>`;
    opener = document.activeElement;
    $('prop-dialog').showModal();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const d = $('prop-dialog');
    if (d.open) d.close();
  }

  /* CONTACT */
  function submitContact(e) {
    e.preventDefault();
    const nombre = $('c-nombre').value.trim(), tel = $('c-tel').value.trim(), email = $('c-email').value.trim();
    const st = $('contact-status');
    st.className = 'form-status';
    if (nombre.length < 2) { st.textContent = 'Escriba su nombre.'; st.classList.add('is-error'); $('c-nombre').focus(); return; }
    if (!/^[+\d\s()-]{7,20}$/.test(tel)) { st.textContent = 'Escriba un teléfono válido.'; st.classList.add('is-error'); $('c-tel').focus(); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = 'Revise el correo electrónico.'; st.classList.add('is-error'); $('c-email').focus(); return; }
    const url = wa(`Hola, soy ${nombre}.\nTeléfono: ${tel}\nEmail: ${email || 'No suministrado'}\nInterés: ${$('c-interes').value}\nMensaje: ${$('c-msg').value.trim() || 'Sin mensaje adicional.'}`);
    const w = window.open(url, '_blank', 'noopener');
    st.textContent = 'Su solicitud está lista para continuar por WhatsApp. ';
    st.classList.add('is-ok');
    if (!w) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Abrir WhatsApp'; st.append(a); }
    e.target.reset();
  }

  /* MENU */
  function menu(open) {
    const m = $('mobile-menu');
    m.classList.toggle('open', open);
    m.inert = !open;
    $('menu-btn').setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    (open ? $('menu-close') : $('menu-btn')).focus();
  }

  /* INIT */
  function setTab(g) {
    gestion = g; shown = PAGE;
    document.querySelectorAll('.search-tab').forEach((b) => {
      const on = b.dataset.g === g; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
    });
    $('s-precio').innerHTML = '<option value="">Cualquier precio</option>' + PRICES[g].map(([v, l]) => `<option value="${v}">Hasta ${l}</option>`).join('');
    render();
  }

  document.querySelectorAll('.search-tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.g)));
  $('search-form').addEventListener('submit', (e) => { e.preventDefault(); shown = PAGE; render(); $('propiedades').scrollIntoView(); });
  $('more-btn').addEventListener('click', () => {
    const open = $('more-filters').classList.toggle('open');
    $('more-btn').setAttribute('aria-expanded', String(open));
  });
  $('load-more').addEventListener('click', () => { shown += PAGE; render(); });
  $('props-grid').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) openModal(b.dataset.id); });
  $('m-body').addEventListener('click', (e) => {
    const t = e.target.closest('.thumb');
    if (!t) return;
    const main = $('m-main'); if (main) main.src = t.dataset.src;
    document.querySelectorAll('.thumb').forEach((x) => x.classList.toggle('active-thumb', x === t));
  });
  const dlg = $('prop-dialog');
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) closeModal(); });
  dlg.addEventListener('close', () => { document.body.style.overflow = ''; if (opener && opener.focus) opener.focus(); });
  $('contact-form').addEventListener('submit', submitContact);
  $('menu-btn').addEventListener('click', () => menu(true));
  $('menu-close').addEventListener('click', () => menu(false));
  $('mobile-menu').addEventListener('click', (e) => { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('mobile-menu').classList.contains('open')) menu(false); });
  window.addEventListener('scroll', () => document.querySelector('header > nav').classList.toggle('scrolled', window.scrollY > 40), { passive: true });

  setTab('Arriendo');
  load();
})();
