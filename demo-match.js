/* Browser-only recreation of the flows in the supplied AccessOTP Android Studio source.
   IMPORTANT: all identities, balances and responses are fictional. There is no real OTP,
   Android IPC, encryption, HMAC check, banking backend, or actual device verification here. */
(() => {
  'use strict';
  const bank = document.getElementById('match-bank-view');
  if (!bank) return;
  const $ = (id) => document.getElementById(id);
  const msg = $('match-bank-message');
  const activity = $('match-auth-activity');
  const help = $('match-auth-help');
  const install = $('match-auth-installed');
  const installStatus = $('match-install-status');
  const stepStatus = $('match-step-status');
  const steps = [...document.querySelectorAll('#match-steps [data-stage]')];
  const accounts = new Map([
    ['ahmed', {pin:'1234', balance:125000, history:[]}],
    ['sara',  {pin:null, balance:85000, history:[]}]
  ]);
  let screen='welcome', returnTo='welcome', user='', pin='', privatePin=false;
  let selectedDigit=null, vibration='Count', authVibration='Count', loggedIn=false, showBalance=false;
  let recipient='', pendingMoney=0, pendingType='', timer=null;
  let authenticatorLast='No requests yet';

  // The browser demo mirrors Android's local PIN-attempt UX only. This is not
  // real authentication protection: browser storage is editable and resettable.
  const PIN_LIMIT=5;
  const PIN_LOCKOUT_MS=60_000;
  const attemptFallback=new Map();
  const storageKey=(name)=>`accessotp-demo-pin-attempts:${name}`;
  function readPinAttempts(name) {
    let saved=attemptFallback.get(name);
    try {
      const raw=window.localStorage.getItem(storageKey(name));
      if(raw) saved=JSON.parse(raw);
    } catch(e) { /* Storage may be disabled in private browsing. */ }
    let failures=Number(saved?.failures)||0;
    let until=Number(saved?.until)||0;
    if(!Number.isFinite(until)||!Number.isFinite(failures)||failures<0) {
      failures=0;until=0;
    }
    if(until>0 && until<=Date.now()) {
      clearPinAttempts(name);
      return {failures:0,until:0};
    }
    return {failures,until};
  }
  function savePinAttempts(name, data) {
    attemptFallback.set(name,data);
    try {window.localStorage.setItem(storageKey(name),JSON.stringify(data));}
    catch(e) { /* The session fallback still supports the demo. */ }
  }
  function clearPinAttempts(name) {
    attemptFallback.delete(name);
    try {window.localStorage.removeItem(storageKey(name));}
    catch(e) { /* Ignore blocked storage. */ }
  }
  function isPinLocked(name) {
    return readPinAttempts(name).until>Date.now();
  }
  function showPinLockout(name) {
    if(!isPinLocked(name))return false;
    user=name;pin='';selectedDigit=null;
    setStage('pin','Sign-in temporarily locked after five incorrect PIN attempts (browser simulation).');
    go('locked');
    return true;
  }
  function recordWrongPin(name) {
    const prev=readPinAttempts(name);
    const next=prev.failures+1;
    pin='';selectedDigit=null;
    if(next>=PIN_LIMIT) {
      savePinAttempts(name,{failures:0,until:Date.now()+PIN_LOCKOUT_MS});
      showPinLockout(name);
      return;
    }
    savePinAttempts(name,{failures:next,until:0});
    render();
    message(`Incorrect PIN. ${PIN_LIMIT-next} attempt${PIN_LIMIT-next===1?'':'s'} left.`,true);
  }

  const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const formatMoney = (fils) => `${(fils/1000).toFixed(3)} BHD`;
  const button = (title,action,kind='btn-outline',additional='') => `<button type="button" class="btn ${kind} match-action" data-action="${action}" ${additional}>${title}</button>`;
  const message = (text='',bad=false) => { msg.textContent=text; msg.classList.toggle('is-error',bad); };
  const setStage = (stage,text) => {
    const order=['username','pin','request','proof','success'];
    const i=order.indexOf(stage);
    steps.forEach((e,j)=>{
      e.classList.toggle('is-active',i>=0&&j===i);
      e.classList.toggle('is-done',i>=0&&j<i || (i===4&&j===4));
    });
    stepStatus.textContent=text;
  };
  const updateAuthenticator = () => {
    activity.textContent=authenticatorLast;
    installStatus.textContent=install.checked?'Authenticator available (simulated)':'Authenticator unavailable (simulated)';
    installStatus.classList.toggle('match-issue',!install.checked);
  };
  const go = (next,notice='') => { screen=next;render();message(notice); };
  const cancelTimer = () => { if(timer!==null){clearTimeout(timer);timer=null;} };
  const reset = () => {
    cancelTimer(); user='';pin='';selectedDigit=null;loggedIn=false;showBalance=false;recipient='';pendingMoney=0;pendingType='';
    setStage(null,'Start by selecting Sign in on the bank welcome screen.');
    go('welcome');
  };

  // Optional browser haptic feedback. Android vibration modes are defined in Common.kt.
  function vibrateDigit(d) {
    if (vibration==='Off') return;
    if (typeof navigator.vibrate !== 'function') {
      message('Browser vibration is not available here. The Count/Morse feedback is implemented in the Android app.');return;
    }
    const digit=Number(d);let pattern=[];
    if(vibration==='Morse'){
      const code=['-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'][digit];
      [...code].forEach((sym,i)=> { pattern.push(sym==='.'?75:225); if(i<code.length-1)pattern.push(90); });
    } else {
      const count=digit===0?10:digit;
      for(let i=0;i<count;i++){pattern.push(130);if(i<count-1)pattern.push(i===4?360:150);}
    }
    navigator.vibrate(pattern);
  }
  // Browser haptic preview of the Android bank's new Feel balance action.
  // Pattern timings mirror the Count/Morse scheme in the revised Common.kt.
  function feelBalance(mode) {
    const fils=accounts.get(user)?.balance ?? 0;
    const amount=(fils / 1000).toFixed(3);
    const buzz=[];
    const addPulse=(on, gap)=>{if(buzz.length)buzz.push(gap);buzz.push(on);};
    const morse=['-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'];
    for(let i=0;i<amount.length;i++){
      const ch=amount[i];let gap=i===0?0:650;
      if(i>0 && ch!=='.' && amount[i-1]!=='.'){
        addPulse(65,gap);gap=650; // brief separator tick between digits
      }
      if(ch==='.'){
        addPulse(520,gap); // long pulse for decimal point
      }else if(mode==='Morse'){
        for(const [j,sym] of [...morse[Number(ch)]].entries()){
          addPulse(sym==='.'?75:225,j===0?gap:90);
        }
      }else{
        const count=ch==='0'?10:Number(ch);
        for(let j=0;j<count;j++)addPulse(130,j===0?gap:(j===5?360:150));
      }
    }
    if(typeof navigator.vibrate !== 'function' || navigator.vibrate(buzz)!==true){
      message(`Feel balance: ${mode} haptic preview is unavailable in this browser. The Android app provides the vibration pattern on a supported device.`);
      return;
    }
    message(`Feel balance: ${mode} preview requested. Check the phone's vibration; some browsers do not support haptics.`);
  }
  function panel(title,subtitle,content){return `<div class="match-content"><h2>${title}</h2><p class="match-subtitle">${subtitle}</p>${content}</div>`;}
  function render() {
    let content='';
    if(screen==='welcome'){
      content=panel('AccessOTP','Accessible one-time code verification for the banking demo. The authenticator handles OTP in the background.',
        `<div class="demo-credentials"><strong>Android sample account</strong><span>Username: <code>ahmed</code></span><span>PIN: <code>1234</code></span></div><div class="match-welcome-actions">${button('Sign in','username','btn-primary')}${button('Create account','create')}${button('Vibration','settings')}${button('Help','help')}<a class="btn btn-outline match-action" href="https://accessotp.site/" aria-label="Open the AccessOTP main website">Website</a></div><div class="match-muted">Two separate Android apps, one device. Use fictional credentials only.</div>`);
    } else if(screen==='username'){
      content=panel('Sign in with AccessOTP','Enter your username to continue. The default demo account is ahmed.',
        `<form id="match-username-form" class="match-form"><label for="match-name">Username</label><input type="text" id="match-name" name="username" maxlength="24" value="${esc(user)}" autocapitalize="off" autocomplete="off" spellcheck="false" required><button class="btn btn-primary" type="submit">Continue to PIN</button></form>${button('Back','welcome')}`);
    } else if(screen==='create'){
      content=panel('Create account','Create a temporary browser demo account with a sample PIN (resets on refresh). New accounts start with 0.000 BHD.',
        `<form id="match-create-form" class="match-form"><label for="match-new-name">New demo username</label><input type="text" id="match-new-name" maxlength="24" pattern="[a-z0-9_]{3,24}" autocomplete="off" required placeholder="3–24 letters, digits, underscores"><button class="btn btn-primary" type="submit">Choose PIN</button></form>${button('Back','welcome')}`);
    } else if(screen==='pin'||screen==='create-pin'){
      const create = screen==='create-pin';
      const label = create ? 'Choose PIN' : 'Sign in with AccessOTP';
      const subtitle = create?'Set a four-digit PIN for the temporary demo account.':'Enter your four-digit demo PIN. AccessOTP will verify the OTP automatically afterward.';
      const positions=['Top left','Top center','Top right','Upper left','Upper center','Upper right','Lower left','Lower center','Lower right','Bottom center'];
      const digits=[1,2,3,4,5,6,7,8,9,0];
      if(privatePin && vibration==='Off') {
        content=panel(label,subtitle,`<div class="match-detail" role="alert"><strong>Hidden PIN entry requires vibration.</strong><span>Vibration is Off. Enable Count or Morse to use the hidden PIN keypad.</span></div>${button('Show number keys','toggle-private')}${button('Open vibration settings','settings','btn-primary')}<div class="match-pin-controls">${button('Back',create?'create':'username')}</div>`);
        bank.innerHTML=content;
        return;
      }
      let pad='';digits.slice(0,9).forEach((d,i)=>pad+=`<button type="button" class="match-key" data-digit="${d}" data-position="${positions[i]}" aria-label="${privatePin?positions[i]+' hidden key':String(d)}">${privatePin?'•':d}</button>`);
      const zero=`<button type="button" class="match-key" data-digit="0" data-position="Bottom center" aria-label="${privatePin?'Bottom center hidden key':'0'}">${privatePin?'•':'0'}</button>`;
      const keypad=`<div class="match-keypad">${pad}<button class="match-key match-utility" type="button" data-action="clear">Clear</button>${zero}<button class="match-key match-utility" type="button" data-action="delete">Delete</button></div>`;
      const hiddenNote=privatePin?`<p class="match-hint">Tap a hidden keypad position to select its digit, then press <strong>Enter selected digit</strong>. Android requires a vibration-capable device and Count or Morse. In desktop browsers this keypad is a visual illustration, not usable tactile feedback.</p>`:'';
      content=panel(label,subtitle,`<div class="match-pin-counter" role="status" aria-live="polite">${pin.length} of 4 digits entered</div>${button(privatePin?'Show number keys':'Hide numbers for private entry','toggle-private')}${hiddenNote}${keypad}${privatePin?button('Enter selected digit','enter-selected','btn-outline','id="match-enter-selected"'):''}<div class="match-pin-controls">${button(create?'Create account':'Sign in',create?'finish-create':'submit-pin','btn-primary')}${button('Back',create?'create':'username')}</div>`);
    } else if(screen==='locked'){
      const remaining=Math.max(0,Math.ceil((readPinAttempts(user).until-Date.now())/1000));
      const wait=remaining===1?'1 second':`${remaining} seconds`;
      content=panel('Sign-in temporarily locked',`This account had five incorrect PIN attempts. Try again in ${wait}.`,
        `<div class="match-detail" role="alert"><strong>60-second PIN lockout (simulated)</strong><span>This browser demo remembers the cooldown after a page refresh, but it is not a real security barrier.</span></div>${button('Try again','retry-locked','btn-primary')}${button('Back','locked-back')}`);
    } else if(screen==='settings'){
      content=panel('Vibration settings','Choose how digits feel. In Count mode, zero uses two groups of five pulses.',
        `<div class="match-segment">${['Count','Morse','Off'].map((m)=>`<button type="button" class="match-option ${vibration===m?'selected':''}" data-mode="${m}" aria-pressed="${vibration===m}">${m}${vibration===m?' ✓':''}</button>`).join('')}</div>${vibration!=='Off'?button('Preview digit 0','preview-zero'):''}<p class="match-hint">Private PIN entry requires Count or Morse, not Off, in Android. Website haptics depend on browser and device support.</p>${button('Back','return-settings')}`);
    } else if(screen==='help'){
      content=panel('Sign-in help','Use the default demo username ahmed and PIN 1234. AccessOTP Authenticator must be installed on the same Android device. It verifies the one-time code automatically.',button('Back','welcome'));
    } else if(screen==='verifying'){
      content=panel('Verifying with AccessOTP','The Authenticator is checking the one-time code automatically. No OTP needs to be entered.',`<div class="match-progress"><span class="match-loader" aria-hidden="true"></span><strong id="match-verification-status">Requesting Authenticator public key…</strong></div>`);
    } else if(screen==='error'){
      content=panel('Login unsuccessful','The bank demo could not complete automatic verification.',`${button('Try again','reset','btn-primary')}`);
    } else if(screen==='dashboard'){
      const balance = accounts.get(user)?.balance ?? 0;
      content=panel('AccessOTP','Demo banking · Signed in as '+esc(user),
      `<div class="match-detail"><strong>✓ OTP verified (simulation)</strong></div><div class="match-balance"><small>Available balance</small><strong>${showBalance?formatMoney(balance):'Hidden'}</strong>${button(showBalance?'Hide balance':'Show balance','balance-toggle')}</div><div class="match-actions">${button('Feel balance','feel-balance')}${button('Add money','topup')}${button('Send money','transfer-select','btn-primary')}${button('Transactions','transactions')}${button('Vibration','settings')}${button('Sign out','signout')}</div><p class="match-hint">Feel balance uses Count or Morse patterns. A short tick separates digits and a longer pulse marks the decimal point. On browsers without vibration, this is a visual-only demonstration.</p><p class="match-muted">All balances and transactions are local fictional demo data. Nothing is transferred to a bank.</p>`);
    } else if(screen==='balance-mode'){
      content=panel('Choose balance vibration','Android offers Count or Morse when vibration is set to Off.',
        `${button('Count vibration','feel-count','btn-primary')}${button('Morse vibration','feel-morse')}${button('Back','dashboard')}`);
    } else if(screen==='transactions'){
      const entries=accounts.get(user).history;
      content=panel('Transactions','Most recent first.',`${entries.length?`<ul class="match-transaction-list">${[...entries].reverse().map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<div class="match-detail">No transactions yet.</div>'}${button('Back','dashboard')}`);
    } else if(screen==='topup'){
      content=panel('Add money','Top up your fictional account with demo funds.',moneyForm('topup')+button('Back','dashboard'));
    } else if(screen==='transfer-select'){
      const options=[...accounts.keys()].filter(x=>x!==user);
      content=panel('Choose a recipient','Select a demo account to receive the simulated transfer.',`<div class="match-actions">${options.map(x=>button(esc(x==='sara'?'Sara (demo)':x==='ahmed'?'Ahmed (demo)':x),'recipient-'+x)).join('')}${button('Back','dashboard')}</div>`);
    } else if(screen==='transfer-amount'){
      content=panel('Send money',`Recipient: ${esc(recipient==='sara'?'Sara (demo)':recipient)}`,moneyForm('transfer')+button('Back','transfer-select'));
    } else if(screen==='review'){
      const to = pendingType==='topup'?`Add ${formatMoney(pendingMoney)} to your demo balance?`:`Send ${formatMoney(pendingMoney)} to ${esc(recipient)}?`;
      content=panel(pendingType==='topup'?'Review top-up':'Review transfer',to,button('Confirm','confirm-money','btn-primary')+button('Cancel',pendingType==='topup'?'topup':'transfer-amount'));
    } else if(screen==='signout'){
      content=panel('Sign out?','Would you like to end this demo session?',button('Sign out','confirm-signout','btn-primary')+button('Cancel','dashboard'));
    }
    bank.innerHTML=content;
  }
  function moneyForm(kind){return `<form class="match-form" data-money-form="${kind}"><label for="match-amount">Amount in BHD</label><input type="text" id="match-amount" inputmode="decimal" placeholder="e.g. 12.500" required><button class="btn btn-primary" type="submit">${kind==='topup'?'Review top-up':'Review transfer'}</button></form>`;}
  function authenticate(){
    if(!install.checked){
      authenticatorLast='No requests yet';updateAuthenticator();
      setStage('request','Cannot connect: AccessOTP Authenticator is not installed in this simulation.');
      go('error','Install AccessOTP Authenticator on the same device to continue (simulated failure).');return;
    }
    go('verifying');setStage('request','Bank app begins a protected verification request (visual simulation).');
    const updateText = (s)=>{const el=$('match-verification-status');if(el)el.textContent=s;};
    updateText('Bank requests the Authenticator public key…');
    cancelTimer();timer=setTimeout(()=>{
      if(screen!=='verifying')return;
      updateText('Authenticator processes the protected request…');
      setStage('proof','Authenticator checks the challenge and returns a simulated verification proof.');
      timer=setTimeout(()=>{
        if(screen!=='verifying')return;
        authenticatorLast='Verified (browser simulation)'; updateAuthenticator();
        loggedIn=true;showBalance=false;
        setStage('success','Bank checks the returned proof and opens the demo account.');
        go('dashboard','Automatic verification complete in this browser simulation.');
        timer=null;
      },1250);
    },1050);
  }
  function submitPin(isCreate){
    if(!isCreate && showPinLockout(user))return;
    if(pin.length!==4){message('Enter four digits.');return;}
    if(isCreate){
      const acct=accounts.get(user); acct.pin=pin;pin='';selectedDigit=null;clearPinAttempts(user);go('pin','Browser demo account created. Enter its PIN to sign in.');return;
    }
    if(accounts.get(user)?.pin!==pin){recordWrongPin(user);return;}
    clearPinAttempts(user);pin='';selectedDigit=null;authenticate();
  }
  function parseAmount(str){
    const s=String(str).trim();
    if(!/^(?:\d{1,16}(?:\.\d{0,3})?|\.\d{1,3})$/.test(s))return null;
    const [whole,dec='']=s.split('.');const fils=Number(whole||0)*1000+Number(dec.padEnd(3,'0')||0);
    return Number.isSafeInteger(fils)&&fils>0?fils:null;
  }
  bank.addEventListener('submit',(event)=>{
    event.preventDefault();
    if(event.target.id==='match-username-form'){
      const name=event.target.elements.username.value.trim().toLowerCase();
      if(!accounts.has(name)||!accounts.get(name).pin){message('No demo account has that username.',true);return;}
      user=name;pin='';if(showPinLockout(name))return;setStage('pin','Username accepted in browser simulation. Enter four-digit PIN.');go('pin');
    } else if(event.target.id==='match-create-form'){
      const name=event.target.querySelector('input').value.trim().toLowerCase();
      if(!/^[a-z0-9_]{3,24}$/.test(name)||accounts.has(name)){message('Use a unique 3–24 character username (letters, digits, underscore).',true);return;}
      accounts.set(name,{pin:null,balance:0,history:[]});user=name;pin='';go('create-pin');
    } else if(event.target.dataset.moneyForm){
      const value=parseAmount(event.target.querySelector('input').value);
      const kind=event.target.dataset.moneyForm;
      if(value===null||kind==='transfer'&&value>accounts.get(user).balance){message('Enter a valid positive amount within your available balance, with up to three decimal places.',true);return;}
      if(kind==='topup'&&value>Number.MAX_SAFE_INTEGER-accounts.get(user).balance){message('Amount is too large.',true);return;}
      pendingMoney=value;pendingType=kind;go('review');
    }
  });
  bank.addEventListener('click',(event)=>{
    const key=event.target.closest('[data-digit]');
    if(key && (screen==='pin'||screen==='create-pin')){
      const d=key.dataset.digit;
      vibrateDigit(d);
      if(privatePin){selectedDigit=d;message(`${key.dataset.position} position selected. Press Enter selected digit.`);}
      else if(pin.length<4){pin+=d;render();message('');}
      return;
    }
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(!action)return;
    switch(action){
      case 'username':user='';setStage('username','Enter the username of a fictional demo account.');go('username');break;
      case 'welcome':case 'create':case 'dashboard':case 'transfer-select':case 'topup':case 'transactions':case 'signout':go(action);break;
      case 'settings':returnTo=screen;if(screen==='pin'||screen==='create-pin'){pin='';selectedDigit=null;}go('settings');break;
      case 'return-settings':if(returnTo==='pin'&&showPinLockout(user))break;go(returnTo);break;
      case 'retry-locked':if(!showPinLockout(user)){setStage('pin','PIN lockout ended. Enter your four-digit PIN.');go('pin','You can try signing in again.');}break;
      case 'locked-back':pin='';go('username');break;
      case 'help':go('help');break;
      case 'toggle-private':privatePin=!privatePin;pin='';selectedDigit=null;render();message(privatePin?(vibration==='Off'?'Enable Count or Morse in vibration settings before using hidden PIN.':'Hidden digits enabled. Select a keypad position, then confirm it.'):'Visible number keys enabled.',privatePin&&vibration==='Off');break;
      case 'delete':pin=pin.slice(0,-1);selectedDigit=null;render();break;
      case 'clear':pin='';selectedDigit=null;render();break;
      case 'enter-selected':if(selectedDigit!==null&&pin.length<4){pin+=selectedDigit;selectedDigit=null;render();}else message('Choose a hidden key first.');break;
      case 'submit-pin':submitPin(false);break;
      case 'finish-create':submitPin(true);break;
      case 'preview-zero':vibrateDigit(0);break;
      case 'reset':reset();break;
      case 'balance-toggle':showBalance=!showBalance;render();break;
      case 'feel-balance':if(vibration==='Off'){go('balance-mode');}else{feelBalance(vibration);}break;
      case 'feel-count':case 'feel-morse':{const mode=action==='feel-count'?'Count':'Morse';go('dashboard');feelBalance(mode);break;}
      case 'confirm-money':{
        const account=accounts.get(user);
        if(pendingType==='topup'){
          account.balance+=pendingMoney;account.history.push(`Added ${formatMoney(pendingMoney)}`);
        }else{
          const other=accounts.get(recipient);if(account.balance<pendingMoney){go('dashboard','Not enough demo funds.');return;}
          account.balance-=pendingMoney;other.balance+=pendingMoney;
          account.history.push(`Sent ${formatMoney(pendingMoney)} to ${recipient}`);
          other.history.push(`Received ${formatMoney(pendingMoney)} from ${user}`);
        }
        go('dashboard','Demo transaction completed.');break;
      }
      case 'confirm-signout':reset();break;
      default:if(action.startsWith('recipient-')){recipient=action.slice(10);go('transfer-amount');}
    }
  });
  bank.addEventListener('click',()=>{ // No-op; delegated actions above handle all input.
  });
  document.addEventListener('click',(event)=>{
    const mode=event.target.closest('[data-mode]')?.dataset.mode;
    if(!mode)return;
    vibration=mode;render();vibrateDigit(3);
    message(`${mode} vibration selected. Browser haptics depend on device support.`);
  });
  install.addEventListener('change',()=>{
    updateAuthenticator();
    help.textContent=install.checked?'Companion application available for the next simulated sign-in.':'With the companion app missing, the bank demo must reject automatic authentication.';
  });
  document.querySelectorAll('[data-auth-info]').forEach(button=>button.addEventListener('click',()=>{
    const section=button.dataset.authInfo;
    const descriptions={
      status:'Ready to receive requests from the AccessOTP bank app when the companion app is installed.',
      activity:`Latest activity: ${authenticatorLast}`,
      vibration:`Authenticator vibration options (separate from bank settings): <span class="match-auth-modes">${['Count','Morse','Off'].map(m=>`<button type="button" data-auth-mode="${m}" aria-pressed="${authVibration===m}">${m}${authVibration===m?' ✓':''}</button>`).join('')}</span>`,
      help:'In Android, install both apps on the same device with a matching signing key. Sign in from the bank; OTP is checked automatically. No separate trusted-device enrollment screen exists.'
    };
    if(section==='vibration'){help.innerHTML=descriptions[section];}else{help.textContent=descriptions[section];}
  }));
  help.addEventListener('click',(event)=>{
    const mode=event.target.closest('[data-auth-mode]')?.dataset.authMode;
    if(!mode)return;
    authVibration=mode;
    document.querySelector('[data-auth-info="vibration"]')?.click();
    help.insertAdjacentHTML('beforeend','<small class="match-hint">Authenticator mode saved in this browser demo only.</small>');
  });
  window.addEventListener('pagehide',cancelTimer);
  updateAuthenticator();setStage(null,'Start by selecting Sign in on the bank welcome screen.');render();
})();
