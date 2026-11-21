/* AccessOTP — functional UI for a static site. No real OTP, banking API or bank data. */
(() => {
  'use strict';
  const config = window.ACCESSOTP_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const menu = $('menu-toggle');
  const nav = $('site-nav');

  if (menu && nav) {
    const closeNav = () => {
      nav.classList.remove('is-open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Open navigation menu');
    };
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
  }

  const teamGrid = $('team-grid');
  const team = Array.isArray(config.team) ? config.team : [];
  if (teamGrid) {
    const members = team.length ? team : [{name:'Team Member 1',role:'Role to be confirmed',linkedin:''}];
    members.forEach((m, i) => {
      const card = document.createElement('article');
      card.className = 'card team-card';
      const avatar = document.createElement('div');
      avatar.className = 'team-avatar';
      avatar.textContent = (m.name || 'T').split(/\s+/).slice(0,2).map((n) => n[0]).join('').toUpperCase();
      const name = document.createElement('h3');
      name.textContent = m.name || `Team Member ${i+1}`;
      const role = document.createElement('p');
      role.className = 'role';
      role.textContent = m.role || 'Role to be confirmed';
      card.append(avatar,name,role);
      const linkedin = String(m.linkedin || '').trim();
      if (/^https:\/\/(?:(?:www|[a-z]{2})\.)?linkedin\.com\/in\//i.test(linkedin)) {
        const link = document.createElement('a');
        link.className = 'team-link'; link.href = linkedin; link.target='_blank'; link.rel='noopener noreferrer';
        link.textContent = 'View LinkedIn profile ↗';
        card.append(link);
      } else {
        const pending = document.createElement('div'); pending.className='pending'; pending.textContent='Profile details pending'; card.append(pending);
      }
      teamGrid.append(card);
    });
  }

  const emailBlock = $('business-email');
  if (emailBlock && typeof config.businessEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.businessEmail)) {
    emailBlock.replaceChildren();
    const link = document.createElement('a'); link.href = 'mailto:' + config.businessEmail; link.textContent = config.businessEmail;
    emailBlock.append(link);
  }

  const socialLinks = $('linkedin-links');
  if (socialLinks) {
    const valid = team.filter((m) => /^https:\/\/(?:(?:www|[a-z]{2})\.)?linkedin\.com\/in\//i.test(String(m.linkedin || '')));
    if (valid.length) {
      socialLinks.replaceChildren();
      valid.forEach((m) => {
        const link = document.createElement('a'); link.href = m.linkedin; link.target='_blank'; link.rel='noopener noreferrer';
        link.textContent = m.name + ' ↗'; socialLinks.append(link);
      });
    }
  }

  const form = $('contact-form');
  if (form) {
    const status = $('form-status');
    const submit = $('contact-submit');
    const endpoint = String(config.formspreeEndpoint || '').trim();
    const validEndpoint = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint);
    if (validEndpoint) status.textContent = 'We will only use your details to respond to this enquiry.';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.className = 'form-status';
      if (!form.reportValidity()) return;
      if (form.elements['_gotcha'] && form.elements['_gotcha'].value) return;
      if (!validEndpoint) {
        status.textContent = 'This form is a preview. Please connect a Formspree endpoint in config.js before accepting messages.';
        status.classList.add('is-error');
        return;
      }
      submit.disabled = true;
      status.textContent = 'Sending your message…';
      try {
        const data = new FormData(form);
        const response = await fetch(endpoint, { method:'POST', body:data, headers:{'Accept':'application/json'} });
        if (!response.ok) throw new Error('Submission failed');
        form.reset();
        status.textContent = 'Thank you. Your message was submitted successfully.';
        status.classList.add('is-success');
      } catch (_) {
        status.textContent = 'Your message could not be sent. Please try again or contact us by email.';
        status.classList.add('is-error');
      } finally { submit.disabled = false; }
    });
  }

  // DemoBank + AccessOTP: all checks and transitions run locally in the browser.
  // These are public, fictional sample values — never accept real bank credentials.
  const start = $('start-demo');
  if (start) {
    const form = $('bank-login-form');
    const username = $('demo-username');
    const password = $('demo-password');
    const error = $('login-error');
    const loginArea = $('login-area');
    const dashboard = $('bank-dashboard');
    const reset = $('reset-demo');
    const bank = $('bank-status');
    const access = $('access-status');
    const detail = $('access-detail');
    const live = $('demo-live-status');
    const items = Array.from(document.querySelectorAll('.timeline-item'));
    let tasks = [];
    let running = false;
    let finished = false;

    function setStage(stage, bankText, accessText, detailText, liveText) {
      bank.textContent = bankText;
      access.textContent = accessText;
      detail.textContent = detailText;
      live.textContent = liveText;
      bank.classList.toggle('is-success', stage === 5);
      items.forEach((item) => {
        const n = Number(item.dataset.stage);
        item.classList.toggle('is-active', n === stage);
        item.classList.toggle('is-done', stage > 0 && n < stage || (stage === 5 && n === 5));
      });
    }
    function clearTasks() { tasks.forEach(clearTimeout); tasks = []; }
    function resetDemo() {
      clearTasks(); running = false; finished = false;
      username.value = ''; password.value = '';
      error.textContent = ''; error.hidden = true;
      username.disabled = false; password.disabled = false;
      start.disabled = false; start.textContent = 'Sign in to DemoBank →';
      loginArea.hidden = false; dashboard.hidden = true;
      setStage(0,
        'Enter the demo username and password to begin.',
        'Waiting for a request',
        'No verification in progress',
        'Step 1: Enter the demo username and password.');
    }
    function beginDemo() {
      if (running || finished) return;
      error.textContent = ''; error.hidden = true;
      // Validates public demo values only; no password is stored, logged, or transmitted.
      if (username.value.trim() !== 'demo' || password.value !== 'Demo@1234') {
        error.textContent = 'Incorrect demo login. Use the sample username and password shown above.';
        error.hidden = false;
        password.value = '';
        password.focus();
        return;
      }
      running = true;
      username.disabled = true; password.disabled = true; start.disabled = true;
      start.textContent = 'Signing in…';
      setStage(2,
        'Sample username and password accepted',
        'Waiting for bank verification request',
        'No OTP request received yet',
        'Step 2: DemoBank checked the fictional credentials locally.');
      tasks.push(setTimeout(() => {
        setStage(3,
          'Password accepted — waiting for AccessOTP',
          'Simulated request received',
          'Fictional bank-approved channel',
          'Step 3: DemoBank simulated sending a request to AccessOTP.');
      }, 1200));
      tasks.push(setTimeout(() => {
        setStage(4,
          'AccessOTP verification in progress',
          'Processing simulated OTP verification',
          'Returning a fictional approval',
          'Step 4: AccessOTP simulated automatic verification; no OTP was generated or entered.');
      }, 2500));
      tasks.push(setTimeout(() => {
        setStage(5,
          'Login successful — demo account opened!',
          'Simulated verification complete',
          'Demo approval delivered to DemoBank',
          'Step 5: Signed in to the fictional bank without manually entering an OTP.');
        loginArea.hidden = true;
        dashboard.hidden = false;
        running = false; finished = true; tasks = [];
      }, 3900));
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      beginDemo();
    });
    reset.addEventListener('click', () => { resetDemo(); username.focus(); });
    resetDemo();
  }
})();
