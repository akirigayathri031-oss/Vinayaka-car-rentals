(async function () {
  const st = { placeId: '', days: 1, tripType: 'round', mode: 'driver', start: '' };
  let cfg, places, booked = [], lastQuote = null;
  const DRAFT_KEY = 'vcr_draft';

  try {
    [cfg, places, booked] = await Promise.all([api('/api/config'), api('/api/places'), api('/api/booked').catch(() => [])]);
  } catch (e) {
    const el = $('#load-err'); el.textContent = e.message; el.classList.remove('hidden');
    return;
  }

  /* destination dropdown: Popular first, then each state nearest-first */
  const dest = $('#dest');
  const opt = (p) => `<option value="${esc(p.id)}">${esc(p.name)} – ${p.km} km</option>`;
  const group = (label, list) => `<optgroup label="${esc(label)}">${list.map(opt).join('')}</optgroup>`;
  const byKm = (a, b) => a.km - b.km;
  dest.innerHTML = '<option value="">Select destination…</option>'
    + group('Popular', places.filter((p) => p.popular).sort(byKm))
    + group('Telangana', places.filter((p) => !p.popular && p.state === 'Telangana').sort(byKm))
    + group('Andhra Pradesh', places.filter((p) => !p.popular && p.state === 'Andhra Pradesh').sort(byKm));

  $('#b-pax').max = cfg.maxPassengers;
  $('#days').max = cfg.maxDays;
  const today = new Date();
  $('#start').min = localISO(today);
  const tomorrow = new Date(today.getTime() + 86400000);
  $('#start').value = localISO(tomorrow);
  st.start = $('#start').value;

  const u = Auth.user;
  if (u) { $('#b-name').value = u.name; $('#b-phone').value = u.phone; }

  /* restore a trip the person was planning before logging in */
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
    if (d) {
      Object.assign(st, d.st || {});
      dest.value = st.placeId || '';
      $('#days').value = st.days;
      $('#start').value = st.start || $('#start').value;
      $(`input[name=tripType][value=${st.tripType}]`).checked = true;
      $(`input[name=mode][value=${st.mode}]`).checked = true;
      if (d.form) {
        if (d.form.name && !u) $('#b-name').value = d.form.name;
        if (d.form.phone && !u) $('#b-phone').value = d.form.phone;
        $('#b-pax').value = d.form.pax || 2;
        $('#b-pickup').value = d.form.pickup || 'Jadcherla';
        $('#b-notes').value = d.form.notes || '';
      }
      sessionStorage.removeItem(DRAFT_KEY);
    }
  } catch (_) {}

  const btn = $('#book-btn');
  btn.textContent = Auth.token ? 'Book now' : 'Login to book';

  /* ---------- quote ---------- */
  let seq = 0;
  async function refresh() {
    checkDates();
    if (!st.placeId) { lastQuote = null; $('#timeline').innerHTML = ''; $('#quote-body').innerHTML = '<div class="empty">Choose a destination to see the fare.</div>'; return; }
    const mine = ++seq;
    try {
      const r = await api('/api/quote', { method: 'POST', body: { placeId: st.placeId, days: st.days, tripType: st.tripType, mode: st.mode } });
      if (mine !== seq) return;
      lastQuote = r;
      renderQuote(r);
    } catch (e) {
      if (mine !== seq) return;
      $('#quote-body').innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
    }
  }

  function renderQuote(r) {
    const q = r.quote;
    const facts = [
      `${r.place.km} km one way`,
      st.tripType === 'round' ? `${q.totalKm} km round trip` : 'One-way drop',
      st.mode === 'self' ? `${q.includedKm} km included` : `${q.billableKm} km billed`,
    ].map((f) => `<span class="fact">${esc(f)}</span>`).join('');
    $('#quote-body').innerHTML = `
      <div class="facts">${facts}</div>
      <div><b>Jadcherla → ${esc(r.place.name)}</b><br><span style="color:var(--muted);font-size:14px">${q.days} day${q.days > 1 ? 's' : ''}${st.start ? ' · from ' + esc(fmtDate(st.start)) : ''}</span></div>
      <div class="total"><div><small>Estimated fare</small></div><div class="amt">${inr(q.total)}</div></div>
      <ul class="lines">${q.lines.map((l) => `<li><span>${esc(l.label)}</span><b>${inr(l.amount)}</b></li>`).join('')}
        ${q.deposit ? `<li><span>Refundable deposit at pickup (not part of fare)</span><b>${inr(q.deposit)}</b></li>` : ''}</ul>
      <ul class="notes">${cfg.priceNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>`;
    $('#timeline').innerHTML = r.timeline.map((t) => `
      <button type="button" class="tl ${t.days === st.days ? 'on' : ''}" data-d="${t.days}">
        <span class="d">${t.days} day${t.days > 1 ? 's' : ''}</span><span class="p">${inr(t.total)}</span><span class="k">${t.billableKm} km</span>
      </button>`).join('');
  }

  function checkDates() {
    const note = $('#dates-note');
    if (!st.start) { note.classList.add('hidden'); return; }
    const end = new Date(st.start + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() + st.days - 1);
    const endS = end.toISOString().slice(0, 10);
    const clash = booked.find((b) => st.start <= b.end && endS >= b.start);
    if (clash) {
      note.textContent = `The car is already booked from ${fmtDate(clash.start)} to ${fmtDate(clash.end)}. Please pick other dates or call us.`;
      note.classList.remove('hidden');
    } else note.classList.add('hidden');
  }

  /* ---------- inputs ---------- */
  const setDays = (n) => {
    n = Math.max(1, Math.min(cfg.maxDays, Math.round(Number(n)) || 1));
    st.days = n; $('#days').value = n; refresh();
  };
  dest.onchange = () => { st.placeId = dest.value; refresh(); };
  document.querySelectorAll('input[name=tripType]').forEach((r) => (r.onchange = () => { st.tripType = r.value; refresh(); }));
  document.querySelectorAll('input[name=mode]').forEach((r) => (r.onchange = () => { st.mode = r.value; refresh(); }));
  $('#start').onchange = () => { st.start = $('#start').value; refresh(); };
  $('#dminus').onclick = () => setDays(st.days - 1);
  $('#dplus').onclick = () => setDays(st.days + 1);
  $('#days').onchange = (e) => setDays(e.target.value);
  $('#timeline').onclick = (e) => { const b = e.target.closest('.tl'); if (b) setDays(b.dataset.d); };

  /* ---------- booking ---------- */
  const showMsg = (html, cls = 'err') => { $('#book-msg').innerHTML = html ? `<div class="msg ${cls}">${esc(html)}</div>` : ''; };

  $('#book-form').onsubmit = async (e) => {
    e.preventDefault();
    showMsg('');
    if (!st.placeId) { showMsg('Please choose your destination first.'); dest.focus(); return; }
    if (!st.start) { showMsg('Please choose the pickup date.'); return; }
    const form = { name: $('#b-name').value.trim(), phone: $('#b-phone').value.trim(), pax: $('#b-pax').value, pickup: $('#b-pickup').value.trim(), notes: $('#b-notes').value.trim() };

    if (!Auth.token) {
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ st, form })); } catch (_) {}
      location.href = '/login.html?next=' + encodeURIComponent('/#book');
      return;
    }
    btn.disabled = true; btn.textContent = 'Booking…';
    try {
      const { booking } = await api('/api/bookings', {
        method: 'POST',
        body: { placeId: st.placeId, days: st.days, tripType: st.tripType, mode: st.mode, startDate: st.start, passengers: Number(form.pax), name: form.name, phone: form.phone, pickupPoint: form.pickup, notes: form.notes },
      });
      showConfirm(booking);
    } catch (err) {
      if (err.status === 401) {
        try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ st, form })); } catch (_) {}
        location.href = '/login.html?next=' + encodeURIComponent('/#book');
        return;
      }
      showMsg(err.message);
    } finally {
      btn.disabled = false; btn.textContent = Auth.token ? 'Book now' : 'Login to book';
    }
  };

  function showConfirm(b) {
    const text = `Hello Vinayaka Car Rentals, I booked the Ertiga.\nBooking ID: ${b.id}\nName: ${b.name} (${b.phone})\nTrip: Jadcherla → ${b.placeName} (${b.tripType === 'round' ? 'round trip' : 'one way'}, ${b.mode === 'self' ? 'self drive' : 'with driver'})\nDate: ${fmtDate(b.startDate)} to ${fmtDate(b.endDate)} (${b.days} day${b.days > 1 ? 's' : ''})\nPassengers: ${b.passengers}\nEstimated fare: ${inr(b.fare)}`;
    $('#book-form-wrap').classList.add('hidden');
    const c = $('#confirm'); c.classList.remove('hidden');
    c.innerHTML = `<div class="tick">✓</div>
      <h3 style="margin:0">Booking request received</h3>
      <div class="bid">${esc(b.id)}</div>
      <div style="font-size:14px;color:var(--muted)">Jadcherla → <b style="color:var(--ink)">${esc(b.placeName)}</b><br>${esc(fmtDate(b.startDate))} – ${esc(fmtDate(b.endDate))} · ${b.days} day${b.days > 1 ? 's' : ''}<br>Estimated fare <b style="color:var(--ink)">${inr(b.fare)}</b></div>
      <p style="font-size:14px">Status: <b>Pending</b>. We will confirm on your phone. For a faster reply, send the details on WhatsApp.</p>
      <div class="row">
        <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${esc(cfg.whatsapp)}?text=${encodeURIComponent(text)}">Send on WhatsApp</a>
        <a class="btn btn-line" href="/bookings.html">My bookings</a>
      </div>`;
    c.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  refresh();
  if (location.hash === '#book') setTimeout(() => $('#book').scrollIntoView(), 50);
})();
