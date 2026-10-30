// Is file ko apni website me <script src="rating-popup.js"></script> se add karo
(function () {
  // Test mode: URL me ?ratingtest=1 lagao (e.g. mysite.com/?ratingtest=1)
  // to 5 second + purane flags reset ho jayenge, aur console me logs dikhenge
  const TEST = new URLSearchParams(location.search).has('ratingtest');
  if (TEST) { localStorage.removeItem('ratingDone'); sessionStorage.removeItem('visitStart'); }
  const log = (...a) => TEST && console.log('[rating]', ...a);
  const MIN_TIME_MS = TEST ? 5 * 1000 : 5 * 60 * 1000; // 5 minute
  const API = '/api/rating';

  // Multi-page site ke liye start time sessionStorage me
  if (!sessionStorage.getItem('visitStart')) sessionStorage.setItem('visitStart', Date.now());
  const visitStart = Number(sessionStorage.getItem('visitStart'));

  // Agar user logged in hai to email yahan set karo (warna popup email maangega)
  const knownEmail = window.currentUserEmail || localStorage.getItem('userEmail') || null;

  let shown = false;
  let alreadyRated = !!localStorage.getItem('ratingDone');

  async function checkStatus() {
    if (!knownEmail || alreadyRated) return;
    try {
      const r = await fetch(`${API}/status?email=${encodeURIComponent(knownEmail)}`);
      const d = await r.json();
      if (d.rated) { alreadyRated = true; localStorage.setItem('ratingDone', '1'); }
    } catch (e) {}
  }
  checkStatus();

  function tryShow() {
    const spent = Math.round((Date.now() - visitStart) / 1000);
    log('exit detected | shown:', shown, '| alreadyRated:', alreadyRated, '| seconds on site:', spent);
    if (shown || alreadyRated) return;
    if (Date.now() - visitStart < MIN_TIME_MS) return;
    shown = true;
    showPopup();
  }

  // Desktop exit-intent: mouse browser ke upar se bahar jaye
  document.documentElement.addEventListener('mouseleave', (e) => {
    if (e.clientY <= 10) tryShow();
  });

  // Mobile fallback: 5 min ke baad user jab back/tab switch kare
  // (page hidden hone par popup nahi dikh sakta, isliye wapas aane par dikhate hain)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - visitStart >= MIN_TIME_MS) tryShow();
  });

  function showPopup() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif';
    wrap.innerHTML = `
      <div style="background:#fff;color:#222;padding:24px;border-radius:12px;width:min(92vw,360px);text-align:center">
        <h3 style="margin:0 0 8px">Aapko hamari website kaisi lagi?</h3>
        <div id="stars" style="font-size:36px;cursor:pointer;color:#ccc">★★★★★</div>
        ${knownEmail ? '' : '<input id="rEmail" type="email" placeholder="Aapka email" style="width:100%;margin-top:12px;padding:8px;box-sizing:border-box">'}
        <textarea id="rComment" placeholder="Feedback (optional)" style="width:100%;margin-top:8px;padding:8px;box-sizing:border-box"></textarea>
        <p id="rMsg" style="color:#c00;min-height:18px;margin:6px 0"></p>
        <button id="rSubmit" style="padding:10px 20px;background:#f5a623;border:0;border-radius:6px;cursor:pointer">Submit</button>
        <button id="rClose" style="padding:10px 14px;background:none;border:0;cursor:pointer">Baad me</button>
      </div>`;
    document.body.appendChild(wrap);

    let rating = 0;
    const starsEl = wrap.querySelector('#stars');
    const paint = (n) => {
      starsEl.innerHTML = [1,2,3,4,5].map(i =>
        `<span data-v="${i}" style="color:${i <= n ? '#f5a623' : '#ccc'}">★</span>`).join('');
    };
    paint(0);
    starsEl.addEventListener('click', (e) => {
      if (e.target.dataset.v) { rating = +e.target.dataset.v; paint(rating); }
    });

    wrap.querySelector('#rClose').onclick = () => wrap.remove();

    wrap.querySelector('#rSubmit').onclick = async () => {
      const msg = wrap.querySelector('#rMsg');
      const email = knownEmail || wrap.querySelector('#rEmail').value.trim();
      if (!rating) return (msg.textContent = 'please select star');
      if (!/^\S+@\S+\.\S+$/.test(email)) return (msg.textContent = 'please fill correct email');
      try {
        const r = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, rating, comment: wrap.querySelector('#rComment').value })
        });
        if (r.status === 409) msg.textContent = 'A rating has already been submitted with this email.';
        else if (r.ok) { wrap.querySelector('div').innerHTML = '<h3>Thank you! 🙏</h3>'; setTimeout(() => wrap.remove(), 1500); }
        else msg.textContent = 'Something mistake, please try again';
        if (r.ok || r.status === 409) localStorage.setItem('ratingDone', '1');
      } catch (e) { msg.textContent = 'Network error'; }
    };
  }
})();