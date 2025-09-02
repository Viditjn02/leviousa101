// Hero phrase animation taken from leviousa_clone style: simple type + erase loop
document.addEventListener('DOMContentLoaded', () => {
  const host = document.querySelector('.typed-phrase');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phrases = [
    "Don't let your budget become someone else's sports car.",
    'Make every dollar count with Leviousa.',
    'Streamline your work with 130+ integrations.'
  ];
  if (!host) return;
  if (prefersReduced) { host.textContent = phrases[0]; return; }

  let i = 0, j = 0, typing = true;
  const typeMs = 25, eraseMs = 18, pauseMs = 1100, startDelay = 800;
  function type() {
    if (!typing) return;
    const s = phrases[i];
    if (j < s.length) {
      host.textContent = s.slice(0, j + 1);
      j++; setTimeout(type, typeMs);
    } else {
      setTimeout(() => { typing = false; erase(); }, pauseMs);
    }
  }
  function erase() {
    const s = phrases[i];
    if (j > 0) {
      host.textContent = s.slice(0, j - 1);
      j--; setTimeout(erase, eraseMs);
    } else {
      i = (i + 1) % phrases.length;
      typing = true; setTimeout(type, typeMs);
    }
  }
  setTimeout(type, startDelay);
});

// Mac: menubar time + lock center date/time
(function(){
  const menubarTime = document.getElementById('menubarTime');
  const lockTime = document.getElementById('lockCenterTime');
  const lockDate = document.getElementById('lockCenterDate');
  function pad(n){return String(n).padStart(2,'0');}
  function upd(){
    const d = new Date();
    const hh = d.getHours();
    const mm = d.getMinutes();
    const txt = pad(hh) + ':' + pad(mm);
    if (menubarTime) menubarTime.textContent = txt;
    if (lockTime) lockTime.textContent = txt;
    if (lockDate) lockDate.textContent = new Intl.DateTimeFormat(undefined,{ weekday:'long', month:'long', day:'numeric' }).format(d);
  }
  upd(); setInterval(upd, 15000);
})();

// Mac notifications (toasts) - Updated with modern macOS style and sound
(function(){
  const list = document.getElementById('macToasts');
  if (!list) return;
  
  const notifications = [
    {
      app: 'Leviousa',
      icon: '⚡',
      title: 'Follow-up email sent',
      body: ''
    },
    {
      app: 'Leviousa',
      icon: '📊',
      title: 'Sales report generated',
      body: ''
    },
    {
      app: 'Leviousa',
      icon: '💼',
      title: 'Texted on LinkedIn',
      body: ''
    },
    {
      app: 'Leviousa',
      icon: '💰',
      title: 'Invoice paid',
      body: ''
    },
    {
      app: 'Leviousa',
      icon: '✅',
      title: 'To-do list completed',
      body: ''
    }
  ];
  
  // Audio functionality removed for better user experience
  
  function makeToast(notification) {
    const div = document.createElement('div');
    div.className = 'toast';
    
    div.innerHTML = `
      <div class="toast-header">
        <div class="toast-app-icon">${notification.icon}</div>
        <div class="toast-meta">
          <div class="toast-app-name">${notification.app}</div>
        </div>
      </div>
      <div class="toast-title">${notification.title}</div>
    `;
    
    // All 5 notifications can now fit, so no overflow management needed during the cycle
    
    list.appendChild(div);
    
    requestAnimationFrame(() => {
      div.classList.add('show');
    });
    
    return div;
  }
  
  function loop() {
    let i = 0;
    let isPaused = false;
    let nextTimeout = null;
    
    // Check if Mac screen is visible
    function isMacVisible() {
      const macDemo = document.querySelector('.mac-demo');
      if (!macDemo) return false;
      
      const rect = macDemo.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    }
    
    function next() {
      // Check if Mac screen is visible before proceeding
      if (!isMacVisible()) {
        isPaused = true;
        // Check again after a short delay
        nextTimeout = setTimeout(next, 500);
        return;
      }
      
      if (isPaused) {
        isPaused = false;
        console.log('📱 Notifications resumed - Mac screen visible');
      }
      
      if (i < notifications.length) {
        makeToast(notifications[i++]);
        nextTimeout = setTimeout(next, 2500);
      } else {
        // Clear all notifications after showing the last one
        setTimeout(() => {
          const allToasts = list.querySelectorAll('.toast');
          allToasts.forEach((toast, index) => {
            setTimeout(() => {
              toast.style.animation = 'macSlideOut 0.3s ease forwards';
              setTimeout(() => {
                if (toast.parentNode) {
                  toast.remove();
                }
              }, 300);
            }, index * 100);
          });
          
          // Restart the cycle after all notifications are cleared
          setTimeout(() => {
            i = 0;
            next();
          }, 2000);
        }, 1750);
      }
    }
    
    // Start the notification loop
    nextTimeout = setTimeout(next, 2000);
    
    // Listen for scroll events to pause/resume notifications
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (!isMacVisible() && !isPaused) {
          console.log('⏸️ Notifications paused - Mac screen not visible');
          isPaused = true;
          clearTimeout(nextTimeout);
          // Check periodically if Mac becomes visible again
          const checkVisibility = () => {
            if (isMacVisible()) {
              next();
            } else {
              setTimeout(checkVisibility, 500);
            }
          };
          checkVisibility();
        }
      }, 100);
    });
  }
  
  loop();
})();

// Overlay rotator (answers)
(function(){
  const qEl = document.getElementById('ovQ');
  const aEl = document.getElementById('ovA');
  if(!qEl || !aEl) return;
  const items = [
    { q: 'Find Q2 revenue sheet in Drive', a: 'Found <b>Revenue_Q2.xlsx</b> · last updated 2h ago · <u>Open</u>' },
    { q: 'Summarize latest Slack thread with Acme', a: 'Summary ready with 5 action items · <u>Copy</u>' },
    { q: 'Schedule 30‑min catch‑up with Priya next week', a: 'Tuesday 2:30 PM works for both · <u>Create invite</u>' }
  ];
  let i = 0;
  function tick(){ const {q,a} = items[i]; qEl.textContent = '“' + q + '”'; aEl.innerHTML = a; i = (i + 1) % items.length; }
  tick(); setInterval(tick, 2600);
})();

// Mac: ensure wallpaper + safe dock scaling
(function(){
  function ensureMac(){
    let dock = document.getElementById('macDock');
    if (!dock) return;
    const frame = dock.closest('.macbook') || document.querySelector('.mac-inner') || document.getElementById('macScreen');
    if (frame && frame.style) frame.style.background = 'radial-gradient(140% 120% at 30% 15%, #432626, #0b0b0b 60%)';
    function scale(){
      if (!dock) return;
      const base = dock.closest('.mac-inner') || dock.parentElement;
      const avail = Math.max(480, (base ? base.clientWidth : window.innerWidth) - 120);
      const content = dock.scrollWidth || 1;
      const s = Math.min(1, Math.max(0.62, avail / content));
      dock.style.setProperty('--dock-scale', s.toFixed(3));
    }
    scale(); window.addEventListener('resize', scale);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureMac); else ensureMac();
})();

// Reveal on scroll
(function(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('active'); obs.unobserve(entry.target); } });
  }, { threshold: 0.07 });
  els.forEach(el => io.observe(el));
})();

// Update active nav underline on scroll
(function(){
  const sections = ['top','everything-ai','pricing','faq','help'].map(id=>document.getElementById(id)).filter(Boolean);
  const links = Array.from(document.querySelectorAll('nav a'));
  if (!sections.length || !links.length) return;
  const byId = new Map(links.map(a=>[a.getAttribute('href')?.replace('#',''), a]));
  function setActive(id){
    links.forEach(a=>a.classList.toggle('active', a===byId.get(id)));
  }
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ setActive(e.target.id); }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
  sections.forEach(s=>obs.observe(s));
})();

// Enhanced OS and Architecture-aware download links
(function(){
  const mac = document.getElementById('macLink');
  const win = document.getElementById('winLink'); 
  const dl = document.getElementById('downloadBtn');
  const ua = navigator.userAgent;
  
  // Enhanced Mac detection with Apple Silicon vs Intel
  const isMac = /Mac|iPhone|iPad/.test(ua);
  const isWin = /Windows/.test(ua);
  
  // Detect Apple Silicon vs Intel Mac
  const isAppleSilicon = isMac && (
    /Apple.*Silicon/i.test(ua) || 
    /ARM64/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
  
  // Smart URL selection
  let macUrl;
  if (isMac) {
    // PROFESSIONAL NOTARIZED VERSION - Complete solution
    macUrl = 'https://github.com/Viditjn02/leviousa101/releases/download/1.0.0-FINAL-COMPLETE-1756840180591/Leviousa-v1.01-PROFESSIONAL.dmg';
    console.log('🍎 Mac detected:', isAppleSilicon ? 'Apple Silicon' : 'Intel', '- Using FINAL COMPLETE DMG');
  } else {
    macUrl = '/api/downloads/dmg'; // Default to ARM64 for non-Mac users
  }
  
  const winUrl = '/api/downloads/exe';
  
  if (mac) mac.href = macUrl; 
  if (win) win.href = winUrl;
  if (dl) { 
    dl.href = isMac ? macUrl : (isWin ? winUrl : macUrl);
    const img = dl.querySelector('img'); 
    if (img) img.src = isMac ? 'https://cdn.simpleicons.org/apple/000000' : 'https://cdn.simpleicons.org/windows/000000'; 
    
    // Add download tracking and enhanced UX
    dl.addEventListener('click', function(e) {
      // Add visual feedback
      const originalText = dl.querySelector('span').textContent;
      dl.querySelector('span').textContent = 'Preparing...';
      dl.style.opacity = '0.7';
      
      // Track the download
      if (typeof gtag !== 'undefined') {
        gtag('event', 'download_start', {
          'platform': isMac ? 'mac' : (isWin ? 'windows' : 'unknown'),
          'source': 'landing_page'
        });
      }
      
      // Reset button after a delay
      setTimeout(() => {
        dl.querySelector('span').textContent = originalText;
        dl.style.opacity = '1';
      }, 2000);
    });
  }
})();

// Waitlist + Vendor form (basic)
(function(){
  const f = document.getElementById('wlForm'); const email = document.getElementById('wlEmail'); const msg = document.getElementById('wlMsg');
  if (f) f.addEventListener('submit', (e)=>{ e.preventDefault(); const v = (email?.value||'').trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { email?.classList.add('err'); msg.textContent='Please enter a valid email.'; return; } email?.classList.remove('err'); msg.textContent='Thanks! We\'ll email you when it\'s ready.'; f.reset(); });
  const vendorBtn=document.getElementById('vendorBtn'); const vendorForm=document.getElementById('vendorForm'); const vfMsg=document.getElementById('vfMsg');
  vendorBtn?.addEventListener('click', (e)=>{ e.preventDefault(); vendorForm?.removeAttribute('hidden'); vendorForm?.scrollIntoView({behavior:'smooth'}); });
  vendorForm?.addEventListener('submit', (e)=>{ e.preventDefault(); vfMsg.textContent='Request sent. We\'ll get back within 1 business day.'; });
})();

// Footer year
document.getElementById('y').textContent = new Date().getFullYear();

// Real-time waitlist counter
(function(){
  const countElement = document.getElementById('waitlistCount');
  const ctaElement = document.getElementById('ctaMessage');
  if (!countElement) return;
  
  let currentCount = 101;
  const startTime = Date.now();
  
  // Dynamic CTA messages based on count
  const ctaMessages = [
    { threshold: 0, message: "What are you waiting for? <span class='cta-highlight'>Join now!</span>" },
    { threshold: 150, message: "Don't miss out! <span class='cta-highlight'>Secure your spot!</span>" },
    { threshold: 200, message: "Join the growing community! <span class='cta-highlight'>Get early access!</span>" },
    { threshold: 300, message: "Limited early access! <span class='cta-highlight'>Join before it's too late!</span>" },
    { threshold: 500, message: "🔥 Trending! <span class='cta-highlight'>Be part of the revolution!</span>" }
  ];
  
  function updateCTAMessage(count) {
    if (!ctaElement) return;
    
    // Find the appropriate message based on count
    const message = ctaMessages
      .slice()
      .reverse()
      .find(msg => count >= msg.threshold);
    
    if (message && ctaElement.innerHTML !== message.message) {
      // Animate message change
      ctaElement.style.opacity = '0';
      ctaElement.style.transform = 'translateY(10px)';
      
      setTimeout(() => {
        ctaElement.innerHTML = message.message;
        ctaElement.style.opacity = '1';
        ctaElement.style.transform = 'translateY(0)';
      }, 300);
    }
  }
  
  function updateCounter() {
    // Increase counter based on realistic growth patterns
    const elapsed = Date.now() - startTime;
    const minutes = elapsed / (1000 * 60);
    
    // Simulate realistic signup patterns with some randomness
    const baseGrowth = Math.floor(minutes * 0.3); // ~0.3 signups per minute average
    const randomBoost = Math.random() < 0.1 ? Math.floor(Math.random() * 3) : 0; // Occasional bursts
    
    const newCount = 101 + baseGrowth + randomBoost;
    
    if (newCount > currentCount) {
      // Add updating class for special animation
      countElement.classList.add('updating');
      
      setTimeout(() => {
        currentCount = newCount;
        countElement.textContent = currentCount.toLocaleString();
        
        // Update CTA message based on count
        updateCTAMessage(currentCount);
        
        // Remove updating class after animation
        setTimeout(() => {
          countElement.classList.remove('updating');
        }, 600);
      }, 300);
    }
  }
  
  // Update counter every 15-45 seconds with some randomness
  function scheduleNextUpdate() {
    const delay = 15000 + Math.random() * 30000; // 15-45 seconds
    setTimeout(() => {
      updateCounter();
      scheduleNextUpdate();
    }, delay);
  }
  
  // Initialize CTA message
  updateCTAMessage(currentCount);
  
  // Start the counter updates
  scheduleNextUpdate();
  
  // Also update when someone actually joins the waitlist
  const waitlistForm = document.getElementById('wlForm');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', (e) => {
      // Small delay to simulate processing, then increment
      setTimeout(() => {
        currentCount++;
        
        // Special celebration animation for user's own signup
        countElement.classList.add('updating');
        const badge = countElement.closest('.counter-badge');
        
        // Add extra glow effect
        if (badge) {
          badge.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3), 0 0 30px rgba(144,81,81,0.4)';
          badge.style.transform = 'scale(1.05)';
        }
        
        setTimeout(() => {
          countElement.textContent = currentCount.toLocaleString();
          
          setTimeout(() => {
            countElement.classList.remove('updating');
            if (badge) {
              badge.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
              badge.style.transform = 'scale(1)';
            }
          }, 600);
        }, 300);
      }, 1000);
    });
  }
})();

// Spotlight demo (palette) interactions
(function(){
  const q = document.getElementById('spotQ');
  const rows = document.getElementById('spotRows');
  if(!q||!rows) return;
  const samples = [
    ['Find Q2 revenue sheet in Drive','<b>Found</b> Revenue_Q2.xlsx · last updated 2h ago · <u>Open</u>'],
    ['Summarize latest Slack thread with Acme','<b>Summary ready</b> · 5 action items · <u>Copy</u>'],
    ['Schedule 30‑min catch‑up with Priya next week','Tuesday 2:30 PM works for both · <u>Create invite</u>'],
    ['Create invoice draft for Acme Q3','Draft posted to <b>Sheets</b> · <u>Open</u>']
  ];
  let i=0; q.placeholder = 'Ask across Gmail, Slack, Drive…';
  function rotate(){ const [qq,aa]=samples[i]; rows.innerHTML = '<div class="row">“'+qq+'”</div><div class="row">'+aa+'</div>'; i=(i+1)%samples.length; }
  rotate(); setInterval(rotate,1600);
  q.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); rows.innerHTML = '<div class="row">Searching…</div>'; setTimeout(rotate,600); } });
})();

// ROI calculator
(function(){
  const t=document.getElementById('roiTeam'), r=document.getElementById('roiRate'), m=document.getElementById('roiMins');
  const out=document.getElementById('roiOut'), sub=document.getElementById('roiSub');
  if(!t||!r||!m) return;
  [t,r,m].forEach(el=>el.addEventListener('input',calc));
  function val(x){const v=parseFloat(x.value);return isFinite(v)&&v>0?v:0}
  function calc(){
    const team=val(t), rate=val(r), mins=val(m);
    if(!team||!rate||!mins){ out.textContent='—'; sub.textContent='Enter your team to estimate monthly savings.'; return; }
    const hoursPerWeek = (team * mins) / 60;
    const hoursPerMonth = hoursPerWeek * 4.3; // avg weeks / month
    const savings = hoursPerMonth * rate;
    out.textContent = '$'+Math.round(savings).toLocaleString();
    const pro = 18 * team; // simple reference against Pro
    sub.textContent = `Est. monthly savings vs ~$${pro.toLocaleString()} Pro seats`;
  }
})();

// Minimal self-tests (no DOM changes)
(function(){
  const results = [];
  function ok(name, cond){ results.push([name, !!cond]); }
  ok('macDock exists', !!document.getElementById('macDock'));
  ok('typed-phrase present', !!document.querySelector('.typed-phrase'));
  ok('mac toasts present', !!document.getElementById('macToasts'));
  ok('FaceTime in dock', !!document.querySelector('.dock-item[title="FaceTime"]'));
  ok('Photos in dock', !!document.querySelector('.dock-item[title="Photos"]'));
  ok('voice section exists', !!document.getElementById('voice'));
  if (results.some(r=>!r[1])) console.warn('[Leviousa self-test]', results); else console.log('[Leviousa self-test] all good');
})();

// Live action stream demo
(function(){
  const list = document.getElementById('streamList');
  if(!list) return;
  const events = [
    ['g','Email drafted to Maya with pricing recap','Gmail'],
    ['b','Slack summary posted to #sales-pricing','Slack'],
    ['p','Invite created for Tue 2:30 PM with Priya','Calendar'],
    ['r','Invoice generated for Acme Q3 in Sheets','Sheets'],
    ['g','CRM updated to Negotiation • next step: send quote','HubSpot'],
    ['b','Drive link attached: Revenue_Q2.xlsx','Drive']
  ];
  function paint(){
    list.innerHTML='';
    events.forEach((e,i)=>{
      const li=document.createElement('li');
      li.className='event';
      li.innerHTML = `<i class="dot ${e[0]}"></i><span>${e[1]}</span><span class="when">now</span>`;
      list.appendChild(li);
    });
  }
  paint();
})();

// Logo rotation animation
(function(){
  const logoSlots = document.querySelectorAll('.logo-slot');
  
  logoSlots.forEach((slot, index) => {
    const logos = JSON.parse(slot.dataset.logos);
    let currentIndex = 0;
    
    setInterval(() => {
      const img = slot.querySelector('img');
      slot.classList.add('rotating');
      
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % logos.length;
        const logoUrl = logos[currentIndex];
        const brandName = logoUrl.split('/').pop().split('/')[0];
        
        img.src = logoUrl;
        img.alt = brandName.charAt(0).toUpperCase() + brandName.slice(1);
        
        // Add a slight delay before removing the rotating class for smoother transition
        setTimeout(() => {
          slot.classList.remove('rotating');
        }, 100);
      }, 300);
    }, 3500 + (index * 600)); // Longer intervals with more stagger
  });
})();

// Chat agent functionality
(function(){
  const chatBtn = document.getElementById('chatAgentBtn');
  if (!chatBtn) return;
  
  chatBtn.addEventListener('click', () => {
    // Modern Gen Z style notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(45deg, #ff6b6b, #4e54c8);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 1000;
      font-weight: 600;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = '💬 Chat support coming soon! Stay tuned.';
    
    const style = document.createElement('style');
    style.textContent = '@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }';
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  });
})();

// AI Magic Interactive Effects
(function(){
  const magicText = document.getElementById('magicText');
  if (!magicText) return;
  
  const messages = [
    "Automatically drafting your follow-up email...",
    "Scheduling meeting with 3 participants...",
    "Creating invoice and sending to client...",
    "Updating CRM with deal progress...",
    "Posting summary to team Slack...",
    "Setting reminders for next actions..."
  ];
  
  let currentIndex = 0;
  
  function typeMessage(message, callback) {
    let i = 0;
    magicText.textContent = '';
    
    const typeInterval = setInterval(() => {
      magicText.textContent += message[i];
      i++;
      
      if (i >= message.length) {
        clearInterval(typeInterval);
        setTimeout(callback, 2000);
      }
    }, 50);
  }
  
  function eraseMessage(callback) {
    const currentText = magicText.textContent;
    let i = currentText.length;
    
    const eraseInterval = setInterval(() => {
      magicText.textContent = currentText.substring(0, i);
      i--;
      
      if (i < 0) {
        clearInterval(eraseInterval);
        setTimeout(callback, 500);
      }
    }, 30);
  }
  
  function cycleMessages() {
    typeMessage(messages[currentIndex], () => {
      eraseMessage(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        cycleMessages();
      });
    });
  }
  
  // Start the cycle
  cycleMessages();
  
  // Add hover effects to magic cards
  const magicCards = document.querySelectorAll('.magic-card');
  magicCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const pulse = card.querySelector('.magic-pulse');
      const spark = card.querySelector('.magic-spark');
      const trail = card.querySelector('.magic-trail');
      
      if (pulse) pulse.style.animationDuration = '0.5s';
      if (spark) spark.style.animationDuration = '0.3s';
      if (trail) trail.style.animationDuration = '0.4s';
    });
    
    card.addEventListener('mouseleave', () => {
      const pulse = card.querySelector('.magic-pulse');
      const spark = card.querySelector('.magic-spark');
      const trail = card.querySelector('.magic-trail');
      
      if (pulse) pulse.style.animationDuration = '2s';
      if (spark) spark.style.animationDuration = '1.5s';
      if (trail) trail.style.animationDuration = '1.8s';
    });
  });
})();

// Experience Leviousa - Mouse movement spotlight effect
function initExperienceLeviousa() {
  const cards = document.querySelectorAll('.feature-card');
  
  cards.forEach(card => {
    let spotlight = card.querySelector('.spotlight');
    
    card.addEventListener('mousemove', (e) => {
      if (!spotlight) return;
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      spotlight.style.transform = `translate(${x}px, ${y}px)`;
      spotlight.style.opacity = '0.4';
    });
    
    card.addEventListener('mouseleave', () => {
      if (spotlight) {
        spotlight.style.opacity = '0';
      }
    });
  });
}

// Initialize Experience Leviousa when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initExperienceLeviousa();
  initPricingCards();
  initInvisibleBrowser();
  initMacSplitScreen();
});

// Browser Split Screen Functionality
function initMacSplitScreen() {
  console.log("Initializing Browser Split Screen");
  
  const divider = document.getElementById('browser-split-divider');
  const container = document.getElementById('browser-split-screen');
  const leftHalf = document.getElementById('browser-visible-half');
  const rightHalf = document.getElementById('browser-invisible-half');
  
  if (!divider || !container || !leftHalf || !rightHalf) {
    console.error("Browser Split screen elements not found:", { divider, container, leftHalf, rightHalf });
    return;
  }
  
  console.log("Browser Split screen elements found, setting up events");
  let isDragging = false;
  
  // Draw attention to divider on page load
  setTimeout(() => {
    const handle = document.querySelector('.browser-divider-handle');
    if (handle) {
      handle.style.transform = 'translate(-50%, -50%) scale(1.2)';
      handle.style.boxShadow = '0 0 20px #ff0, 0 0 40px #ff0';
      
      // Add flashing text
      const flashText = document.createElement('div');
      flashText.textContent = 'DRAG';
      flashText.style.position = 'absolute';
      flashText.style.top = '50%';
      flashText.style.left = '50%';
      flashText.style.transform = 'translate(-50%, -50%)';
      flashText.style.background = '#ff0';
      flashText.style.color = '#000';
      flashText.style.padding = '5px 10px';
      flashText.style.borderRadius = '20px';
      flashText.style.fontWeight = 'bold';
      flashText.style.fontSize = '14px';
      flashText.style.zIndex = '9999';
      flashText.style.animation = 'flash 0.5s infinite alternate';
      divider.appendChild(flashText);
      
      // Add style for flash animation
      const style = document.createElement('style');
      style.textContent = '@keyframes flash { from { opacity: 1; } to { opacity: 0.5; } }';
      document.head.appendChild(style);
      
      // Remove after 2 seconds
      setTimeout(() => {
        handle.style.transform = 'translate(-50%, -50%)';
        handle.style.boxShadow = '';
        flashText.remove();
      }, 2000);
    }
  }, 500);
  
  // Mouse events for desktop
  divider.addEventListener('mousedown', (e) => {
    console.log("Divider mousedown");
    isDragging = true;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    divider.classList.add('active-divider');
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const containerRect = container.getBoundingClientRect();
    const leftWidth = e.clientX - containerRect.left;
    
    // Calculate percentage with constraints (20-80%)
    const percentage = Math.min(Math.max(leftWidth / containerRect.width * 100, 20), 80);
    
    // Set the widths
    leftHalf.style.width = `${percentage}%`;
    rightHalf.style.width = `${100 - percentage}%`;
    
    // Update divider position
    divider.style.left = `${percentage}%`;
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      console.log("Divider mouseup");
      isDragging = false;
      document.body.style.cursor = '';
      divider.classList.remove('active-divider');
    }
  });
  
  // Touch events for mobile
  divider.addEventListener('touchstart', (e) => {
    console.log("Divider touchstart");
    isDragging = true;
    e.preventDefault();
    divider.classList.add('active-divider');
  });
  
  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const containerRect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const leftWidth = touch.clientX - containerRect.left;
    
    // Calculate percentage with constraints (20-80%)
    const percentage = Math.min(Math.max(leftWidth / containerRect.width * 100, 20), 80);
    
    // Set the widths
    leftHalf.style.width = `${percentage}%`;
    rightHalf.style.width = `${100 - percentage}%`;
    
    // Update divider position
    divider.style.left = `${percentage}%`;
  });
  
  document.addEventListener('touchend', () => {
    if (isDragging) {
      console.log("Divider touchend");
      isDragging = false;
      divider.classList.remove('active-divider');
    }
  });
  
  // Add CSS for active divider state
  const style = document.createElement('style');
  style.textContent = `
    .active-divider .browser-divider-handle {
      transform: translate(-50%, -50%) scale(1.2) !important;
      box-shadow: 0 0 20px #ff0, 0 0 40px #ff0 !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log("Browser Split screen initialized");
}

// Invisible Browser Demo Interactions
function initInvisibleBrowser() {
  // Initialize tab switching only
  
  // Browser frame interaction (without overlay)
  const browserFrame = document.querySelector('.browser-frame');
  if (browserFrame) {
    browserFrame.addEventListener('mouseenter', () => {
      // No overlay interaction needed
    });
    
    browserFrame.addEventListener('mouseleave', () => {
      // No overlay interaction needed
    });
  }
  
  // Tab switching functionality
  initTabSwitching();
}

// Tab Switching System
function initTabSwitching() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.webpage-content');
  const urlDisplay = document.getElementById('currentUrl');
  
  const urls = {
    'chatgpt': 'chat.openai.com',
    'perplexity': 'perplexity.ai',
    'youtube': 'youtube.com'
  };
  
  let currentTabIndex = 0;
  const tabOrder = ['chatgpt', 'perplexity', 'youtube'];
  
  function switchToTab(tabName) {
    // Update tabs with a slight delay for visual effect
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Fade out all content first
    contents.forEach(content => {
      if (content.classList.contains('active') && content.dataset.content !== tabName) {
        content.style.opacity = '0';
      }
    });
    
    // After a short delay, update the active state and fade in the new content
    setTimeout(() => {
      contents.forEach(content => {
        const isActive = content.dataset.content === tabName;
        content.classList.toggle('active', isActive);
        if (isActive) {
          content.style.opacity = '1';
        }
      });
    }, 150);
    
    // Update URL
    if (urlDisplay) {
      urlDisplay.textContent = urls[tabName];
    }
  }
  
  // Auto-cycle through tabs
  function cycleTabs() {
    const tabName = tabOrder[currentTabIndex];
    switchToTab(tabName);
    currentTabIndex = (currentTabIndex + 1) % tabOrder.length;
  }
  
  // Start with ChatGPT
  switchToTab('chatgpt');
  
  // Auto-cycle every 4 seconds with fade transition
  setInterval(cycleTabs, 4000);
  
  // Manual tab clicking
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;
      switchToTab(tabName);
      // Update current index to sync with auto-cycle
      currentTabIndex = tabOrder.indexOf(tabName);
    });
  });
}

// Enhanced pricing card interactions with modern animations
function initPricingCards() {
  const priceCards = document.querySelectorAll('.price-card');
  const pricingHint = document.querySelector('.pricing-hint');
  let hintShown = false;
  
  priceCards.forEach(card => {
    const mouseGlow = card.querySelector('.mouse-glow');
    
    card.addEventListener('mouseenter', () => {
      // Hide hint after first hover
      if (pricingHint && !hintShown) {
        pricingHint.style.opacity = '0.3';
        hintShown = true;
      }
    });
    
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Update CSS custom properties for mouse tracking
      card.style.setProperty('--mouse-x', `${x}%`);
      card.style.setProperty('--mouse-y', `${y}%`);
      
      // Update mouse glow element if it exists
      if (mouseGlow) {
        mouseGlow.style.setProperty('--mouse-x', `${x}%`);
        mouseGlow.style.setProperty('--mouse-y', `${y}%`);
      }
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--mouse-x', '50%');
      card.style.setProperty('--mouse-y', '50%');
      
      if (mouseGlow) {
        mouseGlow.style.setProperty('--mouse-x', '50%');
        mouseGlow.style.setProperty('--mouse-y', '50%');
      }
    });
    
    // Add subtle entrance animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'cardEntrance 0.6s ease-out forwards';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    observer.observe(card);
  });
  
  // Show hint with emphasis when pricing section comes into view
  const pricingSection = document.getElementById('pricing');
  if (pricingSection && pricingHint) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hintShown) {
          // Add extra emphasis animation when section first appears
          setTimeout(() => {
            pricingHint.style.animation = 'pulseHint 2s ease-in-out infinite, bounceIn 0.8s ease-out';
          }, 500);
        }
      });
    }, { threshold: 0.3 });
    
    sectionObserver.observe(pricingSection);
  }
}

// Assignment Demo Typing Animation
function initAssignmentTyping() {
  const typedElement = document.getElementById('typed-answer');
  const cursor = document.querySelector('.typing-cursor');
  
  if (!typedElement) return;
  
  const fullText = typedElement.textContent;
  typedElement.textContent = ''; // Clear the content initially
  
  let charIndex = 0;
  const typingSpeed = 30; // Milliseconds per character
  const pauseAfterParagraph = 800; // Pause after each paragraph
  const pauseAfterCompletion = 3000; // Pause before restarting
  const fadeOutDuration = 1000; // Time to fade out text
  
  function typeCharacter() {
    if (charIndex < fullText.length) {
      const char = fullText[charIndex];
      typedElement.textContent += char;
      
      // Show cursor while typing
      if (cursor) {
        cursor.style.display = 'inline-block';
      }
      
      charIndex++;
      
      // Pause longer after periods and double newlines (paragraphs)
      let nextDelay = typingSpeed;
      if (char === '.' && fullText[charIndex] === '\n' && fullText[charIndex + 1] === '\n') {
        nextDelay = pauseAfterParagraph;
      } else if (char === '.' || char === ',' || char === ';') {
        nextDelay = typingSpeed * 3;
      }
      
      setTimeout(typeCharacter, nextDelay);
    } else {
      // When typing is complete, pause then fade out and restart
      setTimeout(() => {
        // Fade out the text
        typedElement.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
        typedElement.style.opacity = '0';
        
        // Hide cursor during fade
        if (cursor) {
          cursor.style.display = 'none';
        }
        
        // After fade out, reset and start again
        setTimeout(() => {
          typedElement.textContent = '';
          typedElement.style.opacity = '1';
          charIndex = 0;
          typeCharacter();
        }, fadeOutDuration);
      }, pauseAfterCompletion);
    }
  }
  
  // Start typing after a delay (when overlay animation starts)
  setTimeout(() => {
    typeCharacter();
  }, 2500); // Start after overlay appears and progress bar starts
}

// Initialize assignment typing when page loads
document.addEventListener('DOMContentLoaded', () => {
  initAssignmentTyping();
});

