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
    const trustButton = $('trust-device-btn');
    const trustBadge = $('device-trust-badge');
    const trustDescription = $('device-trust-description');
    const accessTrust = $('access-device-pill');
    let trustedDevice = false; // Demo UI state only, not an actual device security check.
    let tasks = [];
    let running = false;
    let finished = false;

    function setStage(stage, bankText, accessText, detailText, liveText) {
      bank.textContent = bankText;
      access.textContent = accessText;
      detail.textContent = detailText;
      live.textContent = liveText;
      bank.classList.toggle('is-success', stage === 6);
      items.forEach((item) => {
        const n = Number(item.dataset.stage);
        item.classList.toggle('is-active', n === stage);
        item.classList.toggle('is-done', stage > 0 && n < stage || (stage === 6 && n === 5));
      });
    }
    function clearTasks() { tasks.forEach(clearTimeout); tasks = []; }
    function renderDeviceTrust() {
      if (!trustButton || !trustBadge || !trustDescription || !accessTrust) return;
      trustBadge.textContent = trustedDevice ? 'Trusted · demo' : 'Not trusted';
      trustBadge.classList.toggle('is-trusted', trustedDevice);
      trustDescription.textContent = trustedDevice
        ? 'DemoBank recognizes this fictional device. Automatic OTP verification can proceed after sign-in.'
        : 'This fictional device is not registered with DemoBank yet.';
      accessTrust.textContent = trustedDevice
        ? '✓ Trusted device registered (simulation)'
        : '◯ Device not registered (demo)';
      accessTrust.classList.toggle('is-trusted', trustedDevice);
      trustButton.textContent = trustedDevice
        ? 'Remove demo device trust'
        : 'Simulate device registration';
      trustButton.disabled = running || finished;
    }
    if (trustButton) {
      trustButton.addEventListener('click', () => {
        if (running || finished) return;
        trustedDevice = !trustedDevice;
        error.hidden = true;
        error.textContent = '';
        renderDeviceTrust();
      });
    }
    function resetDemo() {
      clearTasks(); running = false; finished = false;
      username.value = ''; password.value = '';
      error.textContent = ''; error.hidden = true;
      username.disabled = false; password.disabled = false;
      start.disabled = false; start.textContent = 'Sign in to DemoBank →';
      loginArea.hidden = false; dashboard.hidden = true;
      renderDeviceTrust(); // Demo trust persists until explicitly removed, like device enrollment.
      setStage(0,
        'Enter the demo username and password to begin.',
        'Waiting for a request',
        'No verification in progress',
        'Step 1: Use the sample credentials and simulate trusted-device registration.');
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
      // Only a UI simulation: a real bank must validate and bind the trusted device.
      if (!trustedDevice) {
        error.textContent = 'Device not trusted. Select “Simulate device registration” before signing in. No OTP request was made.';
        error.hidden = false;
        if (trustButton) trustButton.focus();
        return;
      }
      running = true;
      renderDeviceTrust();
      username.disabled = true; password.disabled = true; start.disabled = true;
      start.textContent = 'Signing in…';
      setStage(2,
        'Sample username and password accepted',
        'Waiting for bank verification request',
        'No OTP request received yet',
        'Step 2: DemoBank checked the fictional credentials locally.');
      tasks.push(setTimeout(() => {
        setStage(3,
          'Trusted demo device confirmed',
          'Demo device recognized',
          'Pre-registered device simulated',
          'Step 3: This demo device is marked trusted. No real device verification took place.');
      }, 850));
      tasks.push(setTimeout(() => {
        setStage(4,
          'Password and demo device accepted — contacting AccessOTP',
          'Simulated verification request received',
          'Fictional bank-approved channel',
          'Step 4: DemoBank simulated an authorized request to AccessOTP.');
      }, 1750));
      tasks.push(setTimeout(() => {
        setStage(5,
          'AccessOTP verification in progress',
          'Processing simulated automatic verification',
          'Returning fictional approval',
          'Step 5: AccessOTP simulated OTP verification without generating or entering a code.');
      }, 2950));
      tasks.push(setTimeout(() => {
        setStage(6,
          'Login successful — demo account opened!',
          'Simulated verification complete',
          'Demo approval delivered to DemoBank',
          'Step 6: Signed in to the fictional bank after demo device and OTP checks.');
        loginArea.hidden = true;
        dashboard.hidden = false;
        running = false; finished = true; tasks = [];
        renderDeviceTrust();
      }, 4350));
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
