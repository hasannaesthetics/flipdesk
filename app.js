/* ═══════════════════════════════════════════════════════
   FLIPDESK — app.js
   All data stored in localStorage, zero dependencies.
════════════════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════════════
// FIREBASE CLOUD & AUTH LAYER
// ══════════════════════════════════════════════════════
const CloudSync = {
  currentUser: null,
  unsubscribeDoc: null,

  init() {
    if (!window.fbAuth) {
      window.addEventListener('firebase-ready', () => this.init());
      return;
    }

    // Firebase Auth persists login state automatically
    window.fbOnAuthStateChanged(window.fbAuth, (user) => {
      this.currentUser = user;
      this.updateUI(user);

      const authScreen = document.getElementById('authScreen');
      if (user) {
        if (authScreen) authScreen.style.display = 'none';
        this.listenToCloud(user.uid);
      } else {
        if (authScreen) authScreen.style.display = 'flex';
        if (this.unsubscribeDoc) this.unsubscribeDoc();
        renderAll();
      }
    });

    const handleGoogleLogin = () => {
      if (!window.fbAuth) {
        alert("Firebase is still initializing... please try again in 2 seconds.");
        return;
      }
      window.fbSignInWithPopup(window.fbAuth, window.fbGoogleProvider).catch((err) => {
        const errorMsg = document.getElementById('authErrorMsg');
        if (errorMsg) {
          errorMsg.innerText = "Google Login Error: " + err.message;
          errorMsg.style.display = 'block';
        }
      });
    };

    const overlayBtn = document.getElementById('googleSignInOverlayBtn');
    if (overlayBtn) overlayBtn.onclick = handleGoogleLogin;

    // Email / Password handlers
    const emailSignInBtn = document.getElementById('emailSignInBtn');
    const emailSignUpBtn = document.getElementById('emailSignUpBtn');
    const authEmailInput = document.getElementById('authEmail');
    const authPasswordInput = document.getElementById('authPassword');
    const authErrorMsg = document.getElementById('authErrorMsg');

    if (emailSignInBtn) {
      emailSignInBtn.onclick = () => {
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value.trim();
        if (!email || !password) {
          if (authErrorMsg) {
            authErrorMsg.innerText = "Please enter email and password.";
            authErrorMsg.style.display = 'block';
          }
          return;
        }
        window.fbSignInWithEmailAndPassword(window.fbAuth, email, password)
          .catch((err) => {
            if (authErrorMsg) {
              authErrorMsg.innerText = "Sign In Failed: " + err.message;
              authErrorMsg.style.display = 'block';
            }
          });
      };
    }

    if (emailSignUpBtn) {
      emailSignUpBtn.onclick = () => {
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value.trim();
        if (!email || !password || password.length < 6) {
          if (authErrorMsg) {
            authErrorMsg.innerText = "Email & Password (min 6 chars) required.";
            authErrorMsg.style.display = 'block';
          }
          return;
        }
        window.fbCreateUserWithEmailAndPassword(window.fbAuth, email, password)
          .catch((err) => {
            if (authErrorMsg) {
              authErrorMsg.innerText = "Registration Failed: " + err.message;
              authErrorMsg.style.display = 'block';
            }
          });
      };
    }

    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
      forgotPasswordBtn.onclick = () => {
        const email = authEmailInput.value.trim();
        if (!email) {
          if (authErrorMsg) {
            authErrorMsg.innerText = "Please type your email address first above.";
            authErrorMsg.style.display = 'block';
            authErrorMsg.style.color = 'var(--warn)';
          }
          authEmailInput.focus();
          return;
        }
        window.fbSendPasswordResetEmail(window.fbAuth, email)
          .then(() => {
            if (authErrorMsg) {
              authErrorMsg.innerText = "Password reset link sent to your email!";
              authErrorMsg.style.display = 'block';
              authErrorMsg.style.color = 'var(--accent)';
            }
          })
          .catch((err) => {
            if (authErrorMsg) {
              authErrorMsg.innerText = "Reset Failed: " + err.message;
              authErrorMsg.style.display = 'block';
              authErrorMsg.style.color = 'var(--danger)';
            }
          });
      };
    }

    const authBtn = document.getElementById('authBtn');
    if (authBtn) {
      authBtn.onclick = () => {
        if (this.currentUser) {
          if (confirm("Sign out of your FlipDesk account?")) {
            window.fbSignOut(window.fbAuth);
          }
        } else {
          const authScreen = document.getElementById('authScreen');
          if (authScreen) authScreen.style.display = 'flex';
        }
      };
    }

    // Settings tab listeners
    const settingsSignOutBtn = document.getElementById('settingsSignOutBtn');
    if (settingsSignOutBtn) {
      settingsSignOutBtn.onclick = () => {
        if (confirm("Sign out of your FlipDesk account?")) {
          window.fbSignOut(window.fbAuth);
        }
      };
    }

    const settingsChangePasswordBtn = document.getElementById('settingsChangePasswordBtn');
    const settingsNewPasswordInput = document.getElementById('settingsNewPassword');
    const settingsConfirmPasswordInput = document.getElementById('settingsConfirmPassword');
    const settingsMsg = document.getElementById('settingsMsg');

    if (settingsChangePasswordBtn) {
      settingsChangePasswordBtn.onclick = () => {
        if (!this.currentUser) {
          alert("You must be logged in to update password.");
          return;
        }
        const newPass = settingsNewPasswordInput.value.trim();
        const confirmPass = settingsConfirmPasswordInput ? settingsConfirmPasswordInput.value.trim() : newPass;

        if (newPass.length < 6) {
          if (settingsMsg) {
            settingsMsg.innerText = "Password must be at least 6 characters.";
            settingsMsg.style.display = 'block';
            settingsMsg.style.color = 'var(--danger)';
          }
          return;
        }

        if (newPass !== confirmPass) {
          if (settingsMsg) {
            settingsMsg.innerText = "Passwords do not match! Please re-enter.";
            settingsMsg.style.display = 'block';
            settingsMsg.style.color = 'var(--danger)';
          }
          if (settingsConfirmPasswordInput) settingsConfirmPasswordInput.focus();
          return;
        }

        const doUpdate = () => {
          window.fbUpdatePassword(this.currentUser, newPass)
            .then(() => {
              alert("✅ Password changed successfully!");
              if (settingsMsg) {
                settingsMsg.innerText = "Password changed successfully!";
                settingsMsg.style.display = 'block';
                settingsMsg.style.color = 'var(--accent)';
              }
              settingsNewPasswordInput.value = '';
              if (settingsConfirmPasswordInput) settingsConfirmPasswordInput.value = '';
            })
            .catch((err) => {
              if (err.code === 'auth/requires-recent-login') {
                if (confirm("For security, Google requires you to re-authenticate before creating/changing a password. Sign in to Google now?")) {
                  window.fbSignInWithPopup(window.fbAuth, window.fbGoogleProvider)
                    .then(() => {
                      doUpdate(); // Retry after fresh login
                    })
                    .catch((reErr) => {
                      if (settingsMsg) {
                        settingsMsg.innerText = "Re-authentication failed: " + reErr.message;
                        settingsMsg.style.display = 'block';
                        settingsMsg.style.color = 'var(--danger)';
                      }
                    });
                }
              } else {
                if (settingsMsg) {
                  settingsMsg.innerText = "Update Failed: " + err.message;
                  settingsMsg.style.display = 'block';
                  settingsMsg.style.color = 'var(--danger)';
                }
              }
            });
        };

        doUpdate();
      };
    }

    const settingsSendResetEmailBtn = document.getElementById('settingsSendResetEmailBtn');
    if (settingsSendResetEmailBtn) {
      settingsSendResetEmailBtn.onclick = () => {
        if (!this.currentUser || !this.currentUser.email) {
          alert("No email associated with this account.");
          return;
        }
        window.fbSendPasswordResetEmail(window.fbAuth, this.currentUser.email)
          .then(() => {
            alert(`Password reset link sent to ${this.currentUser.email}`);
            if (settingsMsg) {
              settingsMsg.innerText = `Password reset link sent to ${this.currentUser.email}!`;
              settingsMsg.style.display = 'block';
              settingsMsg.style.color = 'var(--accent)';
            }
          })
          .catch((err) => {
            if (settingsMsg) {
              settingsMsg.innerText = "Reset Failed: " + err.message;
              settingsMsg.style.display = 'block';
              settingsMsg.style.color = 'var(--danger)';
            }
          });
      };
    }
  },

  updateUI(user) {
    const statusText = document.getElementById('userAuthStatus');
    const authBtn = document.getElementById('authBtn');
    const settingsEmail = document.getElementById('settingsAccountEmail');
    const settingsStatus = document.getElementById('settingsSyncStatus');
    const settingsSecurityTitle = document.getElementById('settingsSecurityTitle');
    const settingsSecurityDesc = document.getElementById('settingsSecurityDesc');
    const labelNewPassword = document.getElementById('labelNewPassword');
    const groupConfirmPassword = document.getElementById('groupConfirmPassword');
    const groupResetEmailLink = document.getElementById('groupResetEmailLink');
    const btnChangePassword = document.getElementById('settingsChangePasswordBtn');

    if (settingsEmail) settingsEmail.value = user ? (user.email || user.displayName || 'Signed In') : 'Not signed in';
    if (settingsStatus) settingsStatus.value = user ? 'Online & Synced (Google Cloud)' : 'Offline / Signed Out';

    const isGoogleUser = user && user.providerData && user.providerData.some(p => p.providerId === 'google.com');

    if (isGoogleUser) {
      if (settingsSecurityTitle) settingsSecurityTitle.innerText = 'Security & Authentication';
      if (settingsSecurityDesc) settingsSecurityDesc.innerText = 'You are signed in via Google Authentication. Password creation is managed directly by Google.';
      if (labelNewPassword) labelNewPassword.innerText = 'Create FlipDesk Password (Optional)';
      if (groupConfirmPassword) groupConfirmPassword.style.display = 'block';
      if (btnChangePassword) btnChangePassword.innerText = 'Create / Update Password';
      if (groupResetEmailLink) groupResetEmailLink.style.display = 'none';
    } else {
      if (settingsSecurityTitle) settingsSecurityTitle.innerText = 'Security & Password';
      if (settingsSecurityDesc) settingsSecurityDesc.innerText = 'Change your account password or trigger a password reset email.';
      if (labelNewPassword) labelNewPassword.innerText = 'New Password';
      if (groupConfirmPassword) groupConfirmPassword.style.display = 'block';
      if (btnChangePassword) btnChangePassword.innerText = 'Update Password';
      if (groupResetEmailLink) groupResetEmailLink.style.display = 'block';
    }

    const mobileAuthBtn = document.getElementById('mobileAuthBtn');

    if (user) {
      statusText.innerText = `Synced: ${user.displayName || user.email.split('@')[0]}`;
      statusText.style.color = 'var(--accent)';
      authBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      `;
      if (mobileAuthBtn) {
        mobileAuthBtn.innerHTML = `🟢 ${user.displayName ? user.displayName.split(' ')[0] : 'Synced'}`;
        mobileAuthBtn.style.color = 'var(--accent)';
        mobileAuthBtn.style.borderColor = 'var(--accent)';
        mobileAuthBtn.onclick = () => {
          document.getElementById('nav-settings').click();
        };
      }
    } else {
      statusText.innerText = 'Cloud Sync: Logged Out';
      statusText.style.color = 'var(--text-2)';
      authBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Sign In with Google
      `;
      if (mobileAuthBtn) {
        mobileAuthBtn.innerHTML = `🔑 Sign In`;
        mobileAuthBtn.style.color = 'var(--text-1)';
        mobileAuthBtn.style.borderColor = 'var(--accent)';
        mobileAuthBtn.onclick = () => {
          document.getElementById('authScreen').classList.add('open');
        };
      }
    }
  },

  listenToCloud(uid) {
    if (!window.fbDb) return;
    const docRef = window.fbDoc(window.fbDb, "users", uid);
    
    this.unsubscribeDoc = window.fbOnSnapshot(docRef, (docSnap) => {
      // Ignore local optimistic echo snapshots so local state isn't overwritten mid-edit
      if (docSnap.metadata && docSnap.metadata.hasPendingWrites) return;

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Merge cloud data into local storage safely without triggering redundant cloud saves
        if (data.deals && Array.isArray(data.deals)) DB.save(DB.KEY_DEALS, data.deals, false);
        if (data.leads && Array.isArray(data.leads)) DB.save(DB.KEY_LEADS, data.leads, false);
        if (data.ads && Array.isArray(data.ads)) {
          // Heal any legacy ad entries missing an id — assign locally only, no cloud write
          const healedAds = data.ads.map((a, i) => {
            if (a && !a.id) return { ...a, id: 'ad_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2, 6) };
            return a;
          });
          DB.save(DB.KEY_ADS, healedAds, false);
        }
        if (data.prices && Array.isArray(data.prices)) DB.save(DB.KEY_PRICES, data.prices, false);
        if (data.capital && Array.isArray(data.capital)) DB.save(DB.KEY_CAPITAL, data.capital, false);
        if (data.expenses && Array.isArray(data.expenses)) DB.save(DB.KEY_EXPENSES, data.expenses, false);
        if (data.customCats && Array.isArray(data.customCats)) DB.save(DB.KEY_CUSTOM_CATS, data.customCats, false);
        if (data.customPlats && Array.isArray(data.customPlats)) DB.save(DB.KEY_CUSTOM_PLATS, data.customPlats, false);
        renderAll();
      } else {
        // Doc doesn't exist yet, initialize cloud doc with current local data
        this.saveAllToCloud();
      }
    });
  },

  async saveAllToCloud() {
    if (!this.currentUser || !window.fbDb) return;
    const docRef = window.fbDoc(window.fbDb, "users", this.currentUser.uid);
    const fullData = {
      deals: DB.deals,
      leads: DB.leads,
      ads: DB.ads,
      prices: DB.prices,
      capital: DB.capital,
      expenses: DB.expenses,
      customCats: DB.customCats,
      customPlats: DB.customPlats,
      updatedAt: new Date().toISOString()
    };
    try {
      await window.fbSetDoc(docRef, fullData, { merge: true });
    } catch (e) {
      console.error("Cloud Save Error:", e);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => CloudSync.init());

// ══════════════════════════════════════════════════════
// DATA LAYER
// ══════════════════════════════════════════════════════

const DB = {
  KEY_DEALS: 'fd_deals',
  KEY_LEADS: 'fd_leads',
  KEY_ADS:   'fd_ads',
  KEY_PRICES: 'fd_prices',
  KEY_CAPITAL: 'fd_capital',
  KEY_EXPENSES: 'fd_expenses',
  KEY_CUSTOM_CATS: 'fd_custom_cats',
  KEY_CUSTOM_PLATS: 'fd_custom_plats',

  load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  save(key, data, triggerCloud = true) {
    localStorage.setItem(key, JSON.stringify(data));
    if (triggerCloud && CloudSync.currentUser) {
      CloudSync.saveAllToCloud();
    }
  },

  get deals() { return this.load(this.KEY_DEALS); },
  get leads() { return this.load(this.KEY_LEADS); },
  get ads()   { return this.load(this.KEY_ADS); },
  get prices() { return this.load(this.KEY_PRICES); },
  get capital() { return this.load(this.KEY_CAPITAL); },
  get expenses() { return this.load(this.KEY_EXPENSES); },
  get customCats() { return this.load(this.KEY_CUSTOM_CATS); },
  get customPlats() { return this.load(this.KEY_CUSTOM_PLATS); },

  saveDeals(d) { this.save(this.KEY_DEALS, d); },
  saveLeads(d) { this.save(this.KEY_LEADS, d); },
  saveAds(d)   { this.save(this.KEY_ADS, d); },
  savePrices(d) { this.save(this.KEY_PRICES, d); },
  saveCapital(d) { this.save(this.KEY_CAPITAL, d); },
  saveExpenses(d) { this.save(this.KEY_EXPENSES, d); },
  saveCustomCats(d) { this.save(this.KEY_CUSTOM_CATS, d); },
  saveCustomPlats(d) { this.save(this.KEY_CUSTOM_PLATS, d); },
};

// ══════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : n > 0 ? '+' : '';
  return sign + 'S$' + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtPlain(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + 'S$' + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
}

function monthKey(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 7); // YYYY-MM
}

function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${y}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthKey() {
  return todayISO().slice(0, 7);
}

function lastMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

function currentYear() {
  return todayISO().slice(0, 4);
}

function profitClass(n) {
  if (n > 0) return 'profit-pos';
  if (n < 0) return 'profit-neg';
  return 'profit-zero';
}

function getCategoryPill(cat) {
  if (!cat) return `<span class="pill pill-other">—</span>`;
  const c = cat.toLowerCase();
  if (c.includes('ps5'))     return `<span class="pill pill-ps5">PS5</span>`;
  if (c.includes('ps4'))     return `<span class="pill pill-ps4">PS4</span>`;
  if (c.includes('switch'))  return `<span class="pill pill-switch">Switch</span>`;
  if (c.includes('iphone'))  return `<span class="pill pill-iphone">iPhone</span>`;
  if (c.includes('ipad'))    return `<span class="pill pill-ipad">iPad</span>`;
  if (c.includes('mac') || c.includes('imac')) return `<span class="pill pill-mac">Mac</span>`;
  if (c.includes('thinkpad') || c.includes('laptop') || c.includes('dell') || c.includes('asus') || c.includes('hp') || c.includes('surface')) return `<span class="pill pill-laptop">Laptop</span>`;
  return `<span class="pill pill-other">${escHtml(cat)}</span>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

// ══════════════════════════════════════════════════════
// TAB NAVIGATION
// ══════════════════════════════════════════════════════
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const mobileTabs = document.querySelectorAll('.mobile-tab');
  const drawerNavItems = document.querySelectorAll('.drawer-nav-item');
  const sections = document.querySelectorAll('.tab-section');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const closeMobileDrawer = document.getElementById('closeMobileDrawer');

  function switchTab(tab) {
    navItems.forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
    mobileTabs.forEach(n => {
      const isActive = n.dataset.tab === tab;
      n.classList.toggle('active', isActive);
      if (isActive) {
        n.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
    drawerNavItems.forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
    sections.forEach(s => s.classList.toggle('active', s.id === `tab-${tab}`));
    
    if (mobileDrawer && mobileDrawer.classList.contains('open')) {
      mobileDrawer.classList.remove('open');
    }

    if (tab === 'dashboard') renderDashboard();
    if (tab === 'deals') renderDeals();
    if (tab === 'inventory') renderInventory();
    if (tab === 'summary') renderSummary();
    if (tab === 'ads') renderAds();
    if (tab === 'prices') renderPrices();
    if (tab === 'capital') renderCapital();
    if (tab === 'expenses') renderExpenses();
  }

  navItems.forEach(n => n.addEventListener('click', () => switchTab(n.dataset.tab)));
  mobileTabs.forEach(n => n.addEventListener('click', () => switchTab(n.dataset.tab)));
  drawerNavItems.forEach(n => n.addEventListener('click', () => switchTab(n.dataset.tab)));

  if (mobileMenuToggle && mobileDrawer) {
    mobileMenuToggle.addEventListener('click', () => mobileDrawer.classList.add('open'));
  }
  if (closeMobileDrawer && mobileDrawer) {
    closeMobileDrawer.addEventListener('click', () => mobileDrawer.classList.remove('open'));
  }
  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', e => {
      if (e.target === e.currentTarget) mobileDrawer.classList.remove('open');
    });
  }
}

function renderAll() {
  renderDashboard();
  renderDeals();
  renderInventory();
  renderLeads();
  renderAds();
  renderPrices();
  renderCapital();
  renderExpenses();
}

// ══════════════════════════════════════════════════════
// DEALS
// ══════════════════════════════════════════════════════
let dealDeleteId = null;

function renderDeals() {
  const deals = DB.deals;
  const search = document.getElementById('dealSearch').value.toLowerCase();
  const cat    = document.getElementById('dealCatFilter').value;
  const month  = document.getElementById('dealMonthFilter').value;

  // Populate month filter
  populateMonthFilter('dealMonthFilter', deals.map(d => d.date));

  const filtered = deals.filter(d => {
    const matchSearch = !search || d.device.toLowerCase().includes(search) || (d.notes || '').toLowerCase().includes(search);
    const matchCat = !cat || (d.category || '').toLowerCase().includes(cat.toLowerCase());
    const matchMonth = !month || monthKey(d.date) === month;
    return matchSearch && matchCat && matchMonth;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Stats (always on full dataset, not filtered)
  updateDealStats(deals);

  const body = document.getElementById('dealsBody');
  const empty = document.getElementById('dealsEmpty');

  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = filtered.map(d => {
    const profit = (d.sold !== '' && d.sold !== null && d.bought !== '' && d.bought !== null)
      ? (parseFloat(d.sold) - parseFloat(d.bought)) : null;
    const margin = profit !== null && parseFloat(d.bought) > 0
      ? ((profit / parseFloat(d.bought)) * 100).toFixed(1) + '%' : '—';
    const profitStr = profit !== null ? fmt(profit) : '—';
    const pc = profit !== null ? profitClass(profit) : 'profit-zero';
    return `<tr>
      <td style="color:var(--text-2);font-size:12px;">${fmtDate(d.date)}</td>
      <td style="color:var(--text-2);font-size:12px;">${d.soldDate ? fmtDate(d.soldDate) : '<span style="color:var(--text-3)">—</span>'}</td>
      <td>
        ${getCategoryPill(d.category)}
        <span style="margin-left:8px;font-size:13px;">${escHtml(d.device)}</span>
        ${d.condition ? `<span style="font-size:11px;color:var(--text-3);margin-left:6px;">${escHtml(d.condition)}</span>` : ''}
      </td>
      <td class="mono" style="color:var(--text-2);">${d.bought !== '' ? 'S$'+parseFloat(d.bought).toFixed(2) : '—'}</td>
      <td class="mono" style="color:var(--text);">${d.sold !== '' && d.sold !== null ? 'S$'+parseFloat(d.sold).toFixed(2) : '<span style="color:var(--text-3)">Unsold</span>'}</td>
      <td class="${pc}">${profitStr}</td>
      <td style="color:var(--text-2);">${margin}</td>
      <td style="color:var(--text-2);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escHtml(d.notes) || '—'}</td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" onclick="editDeal('${d.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="confirmDeleteDeal('${d.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function updateDealStats(deals) {
  const completed = deals.filter(d => d.sold !== '' && d.sold !== null && d.bought !== '' && d.bought !== null);
  const profits = completed.map(d => parseFloat(d.sold) - parseFloat(d.bought));
  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const avgMargin = completed.length > 0
    ? (completed.reduce((a, d) => {
        const b = parseFloat(d.bought);
        return a + (b > 0 ? ((parseFloat(d.sold) - b) / b * 100) : 0);
      }, 0) / completed.length).toFixed(1) + '%'
    : '—';
  const bestFlip = profits.length > 0 ? Math.max(...profits) : null;

  const tp = document.getElementById('statTotalProfit');
  tp.textContent = fmtPlain(totalProfit);
  tp.className = 'stat-value ' + (totalProfit >= 0 ? 'accent' : 'danger');

  document.getElementById('statDealsCount').textContent = completed.length;
  document.getElementById('statAvgMargin').textContent = avgMargin;
}

// ══════════════════════════════════════════════════════
// INVENTORY
// ══════════════════════════════════════════════════════
function renderInventory() {
  const allDeals = DB.deals;
  const unsoldDeals = allDeals.filter(d => d.sold === '' || d.sold === null).sort((a, b) => b.date.localeCompare(a.date));

  const totalCapital = unsoldDeals.reduce((sum, d) => sum + (parseFloat(d.bought) || 0), 0);
  document.getElementById('invTotalCapital').textContent = fmtPlain(totalCapital);
  document.getElementById('invItemsCount').textContent = unsoldDeals.length;

  // Est value calculation based on Price List matching or +25% default margin
  const estValue = unsoldDeals.reduce((sum, d) => {
    const cost = parseFloat(d.bought) || 0;
    const matchPrice = DB.prices.find(p => p.device.toLowerCase() === d.device.toLowerCase());
    return sum + (matchPrice ? parseFloat(matchPrice.sell) : cost * 1.25);
  }, 0);
  document.getElementById('invEstValue').textContent = fmtPlain(estValue);

  const body = document.getElementById('inventoryBody');
  const empty = document.getElementById('inventoryEmpty');

  if (unsoldDeals.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  const today = new Date();
  body.innerHTML = unsoldDeals.map(d => {
    const boughtDate = new Date(d.date);
    const diffTime = Math.abs(today - boughtDate);
    const daysInStock = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return `<tr>
      <td style="color:var(--text-2);font-size:12px;">${fmtDate(d.date)}</td>
      <td style="color:var(--text-2);font-size:12px;">
        <span class="status-badge" style="background:${daysInStock > 14 ? 'var(--danger-bg)' : 'var(--accent-glow)'}; color:${daysInStock > 14 ? 'var(--danger)' : 'var(--accent)'}">
          ${daysInStock} ${daysInStock === 1 ? 'day' : 'days'}
        </span>
      </td>
      <td>
        ${getCategoryPill(d.category)}
        <span style="margin-left:8px;font-size:13px;font-weight:500;">${escHtml(d.device)}</span>
      </td>
      <td class="mono" style="color:var(--text);font-weight:600;">${d.bought !== '' ? 'S$'+parseFloat(d.bought).toFixed(2) : '—'}</td>
      <td style="color:var(--text-2);font-size:12px;">${escHtml(d.condition) || '—'}</td>
      <td style="color:var(--text-2);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escHtml(d.notes) || '—'}</td>
      <td>
        <button class="btn-ghost-sm" onclick="editDeal('${d.id}')" style="border:1px solid var(--accent); color:var(--accent);">
          Mark Sold / Edit
        </button>
      </td>
    </tr>`;
  }).join('');
}

function populateMonthFilter(selectId, dates) {
  const sel = document.getElementById(selectId);
  const current = sel.value;
  const months = [...new Set(dates.map(d => monthKey(d)).filter(Boolean))].sort().reverse();
  const firstOpt = sel.querySelector('option[value=""]');
  sel.innerHTML = '';
  sel.appendChild(firstOpt || (() => { const o = document.createElement('option'); o.value=''; o.textContent='All Time'; return o; })());
  months.forEach(m => {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = monthLabel(m);
    sel.appendChild(o);
  });
  if (months.includes(current)) sel.value = current;
}

function populateCustomOptions() {
  const catSelect = document.getElementById('dealCategory');
  const platSelect = document.getElementById('dealPlatform');
  const filterCatSelect = document.getElementById('filterCategory');

  // Inject custom categories into Deal Modal
  if (catSelect) {
    let customOptGroup = catSelect.querySelector('optgroup[label="Custom Categories"]');
    if (!customOptGroup) {
      customOptGroup = document.createElement('optgroup');
      customOptGroup.label = "Custom Categories";
      catSelect.appendChild(customOptGroup);
    }
    customOptGroup.innerHTML = '';
    DB.customCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      customOptGroup.appendChild(opt);
    });
  }

  // Inject custom categories into Filter dropdown on Deals page
  if (filterCatSelect) {
    let customFilterGroup = filterCatSelect.querySelector('optgroup[label="Custom Categories"]');
    if (!customFilterGroup) {
      customFilterGroup = document.createElement('optgroup');
      customFilterGroup.label = "Custom Categories";
      filterCatSelect.appendChild(customFilterGroup);
    }
    customFilterGroup.innerHTML = '';
    DB.customCats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      customFilterGroup.appendChild(opt);
    });
  }

  // Inject custom platforms into Deal Modal
  if (platSelect) {
    let customPlatGroup = platSelect.querySelector('optgroup[label="Custom Platforms"]');
    if (!customPlatGroup) {
      customPlatGroup = document.createElement('optgroup');
      customPlatGroup.label = "Custom Platforms";
      platSelect.appendChild(customPlatGroup);
    }
    customPlatGroup.innerHTML = '';
    DB.customPlats.forEach(plat => {
      const opt = document.createElement('option');
      opt.value = plat;
      opt.textContent = plat;
      customPlatGroup.appendChild(opt);
    });
  }
}

// Deal modal
function openDealModal(deal = null) {
  populateCustomOptions();
  const modal = document.getElementById('dealModal');
  document.getElementById('dealModalTitle').textContent = deal ? 'Edit Deal' : 'Add Deal';
  document.getElementById('dealId').value = deal ? deal.id : '';
  document.getElementById('dealDate').value = deal ? deal.date : todayISO();
  document.getElementById('dealSoldDate').value = deal ? (deal.soldDate || '') : '';
  document.getElementById('dealCategory').value = deal ? deal.category : '';
  document.getElementById('dealDevice').value = deal ? deal.device : '';
  document.getElementById('dealBought').value = deal ? deal.bought : '';
  document.getElementById('dealSold').value = deal ? (deal.sold ?? '') : '';
  document.getElementById('dealCondition').value = deal ? (deal.condition || '') : '';
  document.getElementById('dealPlatform').value = deal ? (deal.platform || '') : '';
  document.getElementById('dealNotes').value = deal ? (deal.notes || '') : '';
  updateProfitPreview();
  modal.classList.add('open');
}

function closeDealModal() {
  document.getElementById('dealModal').classList.remove('open');
}

// Custom Option Modal Handlers
function openCustomOptionModal() {
  document.getElementById('customOptionForm').reset();
  document.getElementById('customOptionModal').classList.add('open');
}

function closeCustomOptionModal() {
  document.getElementById('customOptionModal').classList.remove('open');
}

function editDeal(id) {
  const deal = DB.deals.find(d => d.id === id);
  if (deal) openDealModal(deal);
}

function confirmDeleteDeal(id) {
  dealDeleteId = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = () => {
    const deals = DB.deals.filter(d => d.id !== id);
    DB.saveDeals(deals);
    document.getElementById('deleteModal').classList.remove('open');
    dealDeleteId = null;
    renderDeals();
    renderSummary();
    showToast('Deal deleted', '');
  };
}

function updateProfitPreview() {
  const bought = parseFloat(document.getElementById('dealBought').value);
  const sold   = parseFloat(document.getElementById('dealSold').value);
  const preview = document.getElementById('dealProfitPreview');
  if (!isNaN(bought) && !isNaN(sold)) {
    const profit = sold - bought;
    const margin = bought > 0 ? ((profit / bought) * 100).toFixed(1) + '%' : '—';
    document.getElementById('previewProfit').textContent = fmt(profit);
    document.getElementById('previewMargin').textContent = margin;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

// ══════════════════════════════════════════════════════
// LEADS
// ══════════════════════════════════════════════════════
function renderLeads() {
  const leads = DB.leads;

  const statuses = ['new', 'hot', 'negotiating', 'won', 'lost'];
  statuses.forEach(s => {
    const col = document.getElementById(`kCards-${s}`);
    const cnt = document.getElementById(`kCount-${s}`);
    const statusLeads = leads.filter(l => l.status === s).reverse();
    cnt.textContent = statusLeads.length;
    col.innerHTML = statusLeads.map(l => `
      <div class="lead-card ${l.status}" onclick="editLead('${l.id}')">
        <div class="lead-card-name">${escHtml(l.name)}</div>
        <div class="lead-card-device">${escHtml(l.device)}</div>
        ${l.price ? `<div class="lead-card-price">S$${parseFloat(l.price).toFixed(2)}</div>` : ''}
        <div class="lead-card-meta">
          <span>${escHtml(l.type || '')}</span>
          ${l.source ? `<span>· ${escHtml(l.source)}</span>` : ''}
          <button style="margin-left:auto;background:transparent;border:none;color:var(--text-3);cursor:pointer;font-size:10px;padding:0;" onclick="event.stopPropagation();confirmDeleteLead('${l.id}')">✕</button>
        </div>
      </div>
    `).join('') || '<div style="color:var(--text-3);font-size:11px;padding:8px 4px;">Empty</div>';
  });

  // Lead stats
  document.getElementById('statOpenLeads').textContent = leads.filter(l => !['won','lost'].includes(l.status)).length;
  document.getElementById('statHotLeads').textContent = leads.filter(l => l.status === 'hot').length;
  document.getElementById('statClosedWon').textContent = leads.filter(l => l.status === 'won').length;
  document.getElementById('statClosedLost').textContent = leads.filter(l => l.status === 'lost').length;
}

function openLeadModal(lead = null) {
  document.getElementById('leadModalTitle').textContent = lead ? 'Edit Lead' : 'Add Lead';
  document.getElementById('leadId').value = lead ? lead.id : '';
  document.getElementById('leadName').value = lead ? lead.name : '';
  document.getElementById('leadType').value = lead ? (lead.type || 'Buyer') : 'Buyer';
  document.getElementById('leadDevice').value = lead ? lead.device : '';
  document.getElementById('leadPrice').value = lead ? (lead.price || '') : '';
  document.getElementById('leadTarget').value = lead ? (lead.target || '') : '';
  document.getElementById('leadSource').value = lead ? (lead.source || '') : '';
  document.getElementById('leadStatus').value = lead ? (lead.status || 'new') : 'new';
  document.getElementById('leadNotes').value = lead ? (lead.notes || '') : '';
  document.getElementById('leadModal').classList.add('open');
}

function closeLeadModal() {
  document.getElementById('leadModal').classList.remove('open');
}

function editLead(id) {
  const lead = DB.leads.find(l => l.id === id);
  if (lead) openLeadModal(lead);
}

function confirmDeleteLead(id) {
  const leads = DB.leads.filter(l => l.id !== id);
  DB.saveLeads(leads);
  renderLeads();
  showToast('Lead removed');
}

// ══════════════════════════════════════════════════════
// ADS
// ══════════════════════════════════════════════════════
function renderAds() {
  const ads = DB.ads;

  const search   = document.getElementById('adSearch').value.toLowerCase();
  const platform = document.getElementById('adPlatformFilter').value;
  const month    = document.getElementById('adMonthFilter').value;

  populateMonthFilter('adMonthFilter', ads.map(a => a.date));

  const filtered = ads.filter(a => {
    if (!a) return false;
    const matchSearch = !search || (a.campaign || '').toLowerCase().includes(search) || (a.notes || '').toLowerCase().includes(search);
    const matchPlat = !platform || (a.platform || '') === platform;
    const matchMonth = !month || !a.date || monthKey(a.date) === month;
    return matchSearch && matchPlat && matchMonth;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Global ad stats (full dataset)
  const totalSpend = ads.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const thisMonth  = ads.filter(a => a && a.date && monthKey(a.date) === currentMonthKey()).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const metaSpend  = ads.filter(a => a && a.platform === 'Meta').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
  const carSpend   = ads.filter(a => a && a.platform === 'Carousell').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

  document.getElementById('statTotalAdSpend').textContent = fmtPlain(totalSpend);
  document.getElementById('statAdThisMonth').textContent  = fmtPlain(thisMonth);
  document.getElementById('statMetaSpend').textContent    = fmtPlain(metaSpend);
  document.getElementById('statCarousellSpend').textContent = fmtPlain(carSpend);

  // Platform breakdown bars
  renderPlatformBars(ads, totalSpend);

  // Table
  const body  = document.getElementById('adsBody');
  const empty = document.getElementById('adsEmpty');

  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = filtered.map((a, idx) => {
    const platColor = a.platform === 'Meta' ? '#e05ade' : a.platform === 'Carousell' ? 'var(--warn)' : 'var(--text-2)';
    const amountNum = parseFloat(a.amount);
    const amountStr = !isNaN(amountNum) ? 'S$' + amountNum.toFixed(2) : '—';
    const safeId = a.id || (`ad_idx_${idx}`);
    return `<tr>
      <td style="color:var(--text-2);font-size:12px;">${a.date ? fmtDate(a.date) : '—'}</td>
      <td><span style="color:${platColor};font-weight:600;font-size:12px;">${escHtml(a.platform || 'Other')}</span></td>
      <td>${escHtml(a.campaign || 'Ad Campaign')}</td>
      <td class="mono" style="color:var(--danger);">${amountStr}</td>
      <td style="color:var(--text-2);">${a.leadsGen || '—'}</td>
      <td style="color:var(--text-2);">${escHtml(a.dealsLinked || '') || '—'}</td>
      <td style="color:var(--text-2);font-size:12px;max-width:160px;overflow:hidden;text-overflow:ellipsis;">${escHtml(a.notes || '') || '—'}</td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" onclick="editAd('${safeId}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="confirmDeleteAd('${safeId}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderPlatformBars(ads, total) {
  const container = document.getElementById('platformBars');
  if (total === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:12px;">No ad spend recorded yet.</p>';
    return;
  }
  const platforms = ['Meta', 'Carousell', 'Other'];
  const colors    = { Meta: '#e05ade', Carousell: 'var(--warn)', Other: 'var(--text-2)' };
  container.innerHTML = platforms.map(p => {
    const spend = ads.filter(a => a && a.platform === p).reduce((s, a) => s + parseFloat(a.amount || 0), 0);
    if (spend === 0) return '';
    const pct = ((spend / total) * 100).toFixed(1);
    return `<div class="platform-bar-row">
      <span class="platform-bar-label" style="color:${colors[p]}">${p}</span>
      <div class="platform-bar-track">
        <div class="platform-bar-fill" style="width:${pct}%;background:${colors[p]}"></div>
      </div>
      <span class="platform-bar-amount">S$${spend.toFixed(2)}</span>
    </div>`;
  }).join('');
}

function openAdModal(ad = null) {
  document.getElementById('adModalTitle').textContent = ad ? 'Edit Ad Spend' : 'Log Ad Spend';
  document.getElementById('adId').value = ad ? (ad.id || '') : '';
  document.getElementById('adDate').value = ad ? (ad.date || todayISO()) : todayISO();
  document.getElementById('adPlatform').value = ad ? (ad.platform || '') : '';
  document.getElementById('adCampaign').value = ad ? (ad.campaign || '') : '';
  document.getElementById('adAmount').value = ad ? (ad.amount || '') : '';
  document.getElementById('adLeads').value = ad ? (ad.leadsGen || '') : '';
  document.getElementById('adDealsLinked').value = ad ? (ad.dealsLinked || '') : '';
  document.getElementById('adNotes').value = ad ? (ad.notes || '') : '';
  document.getElementById('adModal').classList.add('open');
}

function closeAdModal() {
  document.getElementById('adModal').classList.remove('open');
}

function editAd(id) {
  let ad = DB.ads.find(a => a.id === id);
  if (!ad) {
    // Fallback search by campaign/date if matching legacy item
    ad = DB.ads.find(a => (a.id || '') === id);
  }
  if (ad) {
    openAdModal(ad);
  } else {
    // If opening new or unmatched
    openAdModal(null);
  }
}

// Expose ad functions globally so inline onclick attributes always work
window.editAd = editAd;
window.confirmDeleteAd = confirmDeleteAd;
window.openAdModal = openAdModal;
window.closeAdModal = closeAdModal;

function confirmDeleteAd(id) {
  dealDeleteId = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = () => {
    const ads = DB.ads.filter(a => a.id !== id);
    DB.saveAds(ads);
    document.getElementById('deleteModal').classList.remove('open');
    renderAds();
    renderDashboard();
    renderSummary();
    showToast('Ad spend deleted');
  };
}

// ══════════════════════════════════════════════════════
// PRICES
// ══════════════════════════════════════════════════════
function renderPrices() {
  const prices = DB.prices;
  const search = document.getElementById('priceSearch').value.toLowerCase();
  const cat    = document.getElementById('priceCatFilter').value;

  const filtered = prices.filter(p => {
    const matchSearch = !search || p.device.toLowerCase().includes(search) || (p.notes || '').toLowerCase().includes(search);
    const matchCat = !cat || (p.category || '').toLowerCase().includes(cat.toLowerCase());
    return matchSearch && matchCat;
  }).sort((a, b) => a.category.localeCompare(b.category) || a.device.localeCompare(b.device));

  const body  = document.getElementById('pricesBody');
  const empty = document.getElementById('pricesEmpty');

  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  body.innerHTML = filtered.map(p => {
    const marginS = parseFloat(p.sell) - parseFloat(p.buy);
    const marginPct = parseFloat(p.buy) > 0 ? ((marginS / parseFloat(p.buy)) * 100).toFixed(1) + '%' : '—';
    const pc = profitClass(marginS);
    
    return `<tr>
      <td>${getCategoryPill(p.category)}</td>
      <td style="font-weight:500;">${escHtml(p.device)}</td>
      <td class="mono" style="color:var(--text);font-weight:600;">S$${parseFloat(p.buy).toFixed(2)}</td>
      <td class="mono" style="color:var(--text-2);">S$${parseFloat(p.sell).toFixed(2)}</td>
      <td>
        <span class="${pc}">${fmtPlain(marginS)}</span>
        <span style="color:var(--text-3);font-size:12px;margin-left:6px;">(${marginPct})</span>
      </td>
      <td style="color:var(--text-2);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${escHtml(p.notes) || '—'}</td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" onclick="editPrice('${p.id}')" title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="confirmDeletePrice('${p.id}')" title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function updatePricePreview() {
  const buy = parseFloat(document.getElementById('priceBuy').value);
  const sell = parseFloat(document.getElementById('priceSell').value);
  const preview = document.getElementById('priceProfitPreview');
  if (!isNaN(buy) && !isNaN(sell)) {
    const profit = sell - buy;
    const margin = buy > 0 ? ((profit / buy) * 100).toFixed(1) + '%' : '—';
    document.getElementById('pricePreviewProfit').textContent = fmt(profit);
    document.getElementById('pricePreviewProfit').className = profitClass(profit);
    document.getElementById('pricePreviewMargin').textContent = margin;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function openPriceModal(price = null) {
  document.getElementById('priceModalTitle').textContent = price ? 'Edit Price' : 'Add to Price List';
  document.getElementById('priceId').value = price ? price.id : '';
  document.getElementById('priceCategory').value = price ? (price.category || '') : '';
  document.getElementById('priceDevice').value = price ? (price.device || '') : '';
  document.getElementById('priceBuy').value = price ? (price.buy || '') : '';
  document.getElementById('priceSell').value = price ? (price.sell || '') : '';
  document.getElementById('priceNotes').value = price ? (price.notes || '') : '';
  updatePricePreview();
  document.getElementById('priceModal').classList.add('open');
}

function closePriceModal() {
  document.getElementById('priceModal').classList.remove('open');
}

function editPrice(id) {
  const price = DB.prices.find(p => p.id === id);
  if (price) openPriceModal(price);
}

function confirmDeletePrice(id) {
  dealDeleteId = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = () => {
    const prices = DB.prices.filter(p => p.id !== id);
    DB.savePrices(prices);
    document.getElementById('deleteModal').classList.remove('open');
    renderPrices();
    showToast('Price deleted');
  };
}

// ══════════════════════════════════════════════════════
// CAPITAL
// ══════════════════════════════════════════════════════
function getCapitalData() {
  const tx = DB.capital;
  const deals = DB.deals;
  const ads = DB.ads;

  let deposits = 0;
  let withdrawals = 0;
  
  tx.forEach(t => {
    if (t.type === 'deposit') deposits += parseFloat(t.amount || 0);
    if (t.type === 'withdraw') withdrawals += parseFloat(t.amount || 0);
  });

  const dealsBought = deals.filter(d => d.bought !== '' && d.bought !== null).reduce((s, d) => s + parseFloat(d.bought), 0);
  const dealsSold = deals.filter(d => d.sold !== '' && d.sold !== null).reduce((s, d) => s + parseFloat(d.sold), 0);
  const totalAdSpend = ads.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const totalExpenses = DB.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const currentCash = deposits - withdrawals - dealsBought + dealsSold - totalAdSpend - totalExpenses;

  // Build a unified ledger
  const ledger = [];
  tx.forEach(t => {
    ledger.push({
      id: t.id,
      date: t.date,
      type: t.type === 'deposit' ? 'Deposit' : 'Withdrawal',
      desc: t.notes || (t.type === 'deposit' ? 'Capital Injection' : 'Paid Myself'),
      amount: t.type === 'deposit' ? parseFloat(t.amount) : -parseFloat(t.amount),
      isTx: true
    });
  });

  deals.filter(d => d.bought !== '' && d.bought !== null).forEach(d => {
    ledger.push({
      id: d.id + '_buy',
      date: d.date,
      type: 'Deal Bought',
      desc: d.device,
      amount: -parseFloat(d.bought),
      isTx: false
    });
    if (d.sold !== '' && d.sold !== null) {
      ledger.push({
        id: d.id + '_sell',
        date: d.soldDate || d.date,
        type: 'Deal Sold',
        desc: d.device,
        amount: parseFloat(d.sold),
        isTx: false
      });
    }
  });

  ads.forEach(a => {
    ledger.push({
      id: a.id,
      date: a.date,
      type: 'Ad Spend',
      desc: a.platform + ' - ' + a.campaign,
      amount: -parseFloat(a.amount),
      isTx: false
    });
  });

  DB.expenses.forEach(e => {
    ledger.push({
      id: e.id,
      date: e.date,
      type: 'Expense',
      desc: e.category + (e.notes ? ' - ' + e.notes : ''),
      amount: -parseFloat(e.amount),
      isTx: false
    });
  });

  // Sort by date oldest to newest to calculate running balance
  ledger.sort((a, b) => {
    const dCmp = a.date.localeCompare(b.date);
    if (dCmp !== 0) return dCmp;
    return (a.id || '').localeCompare(b.id || '');
  });

  let balance = 0;
  ledger.forEach(item => {
    balance += item.amount;
    item.balance = balance;
  });

  // Reverse for display (newest first)
  ledger.reverse();

  return { currentCash, ledger };
}

function renderCapital() {
  const { currentCash, ledger } = getCapitalData();

  const kpi = document.getElementById('kpiCurrentCash');
  kpi.textContent = fmtPlain(currentCash);
  kpi.style.color = currentCash >= 0 ? 'var(--accent)' : 'var(--danger)';

  const body = document.getElementById('capitalBody');
  const empty = document.getElementById('capitalEmpty');

  if (ledger.length === 0) {
    body.innerHTML = '';
    empty.style.display = 'flex';
    document.getElementById('capitalTable').style.display = 'none';
    return;
  }
  
  empty.style.display = 'none';
  document.getElementById('capitalTable').style.display = 'table';

  body.innerHTML = ledger.map(item => {
    const amtColor = item.amount >= 0 ? 'var(--accent)' : 'var(--danger)';
    const amtPrefix = item.amount > 0 ? '+' : '';
    
    let actions = '';
    if (item.isTx) {
      actions = `
        <button class="btn-icon danger" onclick="confirmDeleteCapital('${item.id}')" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>`;
    }

    return `<tr>
      <td style="color:var(--text-2);font-size:12px;">${fmtDate(item.date)}</td>
      <td style="font-weight:600;font-size:13px;">${item.type}</td>
      <td>${escHtml(item.desc)}</td>
      <td class="mono" style="color:${amtColor};font-weight:600;">${amtPrefix}S$${Math.abs(item.amount).toFixed(2)}</td>
      <td class="mono">S$${item.balance.toFixed(2)}</td>
      <td><div class="row-actions">${actions}</div></td>
    </tr>`;
  }).join('');
}

function openCapitalModal(type) {
  document.getElementById('capitalModalTitle').textContent = type === 'deposit' ? 'Inject Capital' : 'Pay Myself (Withdraw)';
  document.getElementById('capitalId').value = '';
  document.getElementById('capitalType').value = type;
  document.getElementById('capitalDate').value = todayISO();
  document.getElementById('capitalAmount').value = '';
  document.getElementById('capitalNotes').value = '';
  document.getElementById('capitalModal').classList.add('open');
}

function closeCapitalModal() {
  document.getElementById('capitalModal').classList.remove('open');
}

function confirmDeleteCapital(id) {
  dealDeleteId = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = () => {
    const tx = DB.capital.filter(t => t.id !== id);
    DB.saveCapital(tx);
    document.getElementById('deleteModal').classList.remove('open');
    renderCapital();
    showToast('Transaction deleted');
  };
}

// ══════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════
function editTargetProfit() {
  const current = localStorage.getItem('flipTargetProfit') || '2000';
  document.getElementById('targetInput').value = current;
  document.getElementById('targetModal').classList.add('open');
}

function renderDashboard() {
  const deals = DB.deals;
  const capitalData = getCapitalData();
  
  const dealsDone = deals.filter(d => d.sold !== '' && d.sold !== null).length;
  const dealsUnsold = deals.filter(d => d.sold === '' || d.sold === null).length;
  
  const grossProfit = deals.filter(d => d.sold !== '' && d.sold !== null).reduce((sum, d) => sum + (parseFloat(d.sold) - parseFloat(d.bought)), 0);
  const totalAds = DB.ads.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
  const totalExp = DB.expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const netProfit = grossProfit - totalAds - totalExp;
  
  document.getElementById('dashCapital').textContent = fmtPlain(capitalData.currentCash);
  document.getElementById('dashDealsDone').textContent = dealsDone;
  document.getElementById('dashDealsUnsold').textContent = dealsUnsold;
  
  const npEl = document.getElementById('dashNetProfit');
  npEl.textContent = fmtPlain(netProfit);
  if (netProfit > 0) {
    npEl.parentElement.classList.remove('danger-card');
    npEl.parentElement.classList.add('success-card');
  } else {
    npEl.parentElement.classList.remove('success-card');
  }

  // Monthly Target Calculation
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  
  const thisMonthDealsProfit = deals
    .filter(d => d.sold !== '' && d.sold !== null && (d.soldDate || d.date).startsWith(currentMonth))
    .reduce((sum, d) => sum + (parseFloat(d.sold) - parseFloat(d.bought)), 0);
    
  const thisMonthAds = DB.ads
    .filter(a => a.date.startsWith(currentMonth))
    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
    
  const thisMonthExpenses = DB.expenses
    .filter(e => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
  const thisMonthNet = thisMonthDealsProfit - thisMonthAds - thisMonthExpenses;
  
  const target = parseFloat(localStorage.getItem('flipTargetProfit') || '2000');
  
  const progressText = document.getElementById('dashTargetProgress');
  const percentText = document.getElementById('dashTargetPercent');
  const progressBar = document.getElementById('dashTargetBar');
  
  if (progressText && progressBar) {
    progressText.textContent = `${fmtPlain(thisMonthNet)} / ${fmtPlain(target)}`;
    let percent = Math.round((thisMonthNet / target) * 100);
    if (percent < 0) percent = 0;
    
    percentText.textContent = percent + '%';
    progressBar.style.width = Math.min(percent, 100) + '%';
    
    if (percent >= 100) {
      progressBar.style.background = 'var(--success)';
      percentText.style.color = 'var(--success)';
    } else {
      progressBar.style.background = 'var(--accent)';
      percentText.style.color = 'var(--accent)';
    }
  }
}

// ══════════════════════════════════════════════════════
// EXPENSES
// ══════════════════════════════════════════════════════
function renderExpenses() {
  const expenses = DB.expenses;
  expenses.sort((a, b) => b.date.localeCompare(a.date));
  
  const tbody = document.getElementById('expensesBody');
  const empty = document.getElementById('expensesEmpty');
  const table = document.getElementById('expensesTable');
  
  if (!expenses.length) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    table.style.display = 'none';
    document.getElementById('statTotalExpenses').textContent = 'S$0.00';
    document.getElementById('statExpenseThisMonth').textContent = 'S$0.00';
    return;
  }
  
  empty.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = '';
  
  let total = 0;
  let thisMonth = 0;
  const currMonth = new Date().toISOString().slice(0, 7);
  
  expenses.forEach(e => {
    const amt = parseFloat(e.amount);
    total += amt;
    if (e.date.startsWith(currMonth)) thisMonth += amt;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fmtDate(e.date)}</td>
      <td><span class="badge ${e.category && e.category.includes('Software') ? 'accent' : 'warning'}">${e.category}</span></td>
      <td>${e.notes || '—'}</td>
      <td class="danger mono">-S$${amt.toFixed(2)}</td>
      <td style="text-align:right;">
        <button class="btn-ghost-sm" onclick="editExpense('${e.id}')">Edit</button>
        <button class="btn-ghost-sm danger" onclick="confirmDeleteExpense('${e.id}')">Del</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById('statTotalExpenses').textContent = fmtPlain(total);
  document.getElementById('statExpenseThisMonth').textContent = fmtPlain(thisMonth);
}

function openExpenseModal(id = null) {
  const form = document.getElementById('expenseForm');
  form.reset();
  if (id) {
    const ex = DB.expenses.find(e => e.id === id);
    if (ex) {
      document.getElementById('expenseId').value = ex.id;
      document.getElementById('expenseDate').value = ex.date;
      document.getElementById('expenseAmount').value = ex.amount;
      document.getElementById('expenseCategory').value = ex.category;
      document.getElementById('expenseNotes').value = ex.notes;
      document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    }
  } else {
    document.getElementById('expenseId').value = '';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('expenseModalTitle').textContent = 'Log Expense';
  }
  document.getElementById('expenseModal').classList.add('open');
}

function closeExpenseModal() {
  document.getElementById('expenseModal').classList.remove('open');
}

function editExpense(id) {
  openExpenseModal(id);
}

function confirmDeleteExpense(id) {
  dealDeleteId = id;
  document.getElementById('deleteModal').classList.add('open');
  document.getElementById('confirmDeleteBtn').onclick = () => {
    const ex = DB.expenses.filter(e => e.id !== id);
    DB.saveExpenses(ex);
    document.getElementById('deleteModal').classList.remove('open');
    renderExpenses();
    renderDashboard();
    renderCapital();
    showToast('Expense deleted');
  };
}

// ══════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════
function renderSummary() {
  const period = document.getElementById('summaryPeriod').value;
  const allDeals = DB.deals;
  const allAds   = DB.ads;

  function inPeriod(dateStr) {
    if (period === 'all') return true;
    if (period === 'this_month')  return monthKey(dateStr) === currentMonthKey();
    if (period === 'last_month')  return monthKey(dateStr) === lastMonthKey();
    if (period === 'this_year')   return dateStr && dateStr.startsWith(currentYear());
    return true;
  }

  const deals = allDeals.filter(d => inPeriod(d.date));
  const ads   = allAds.filter(a => inPeriod(a.date));
  const expenses = DB.expenses.filter(e => inPeriod(e.date));

  // Gross profit
  const completedDeals = deals.filter(d => d.sold !== '' && d.sold !== null && d.bought !== '' && d.bought !== null);
  const grossProfit = completedDeals.reduce((s, d) => s + (parseFloat(d.sold) - parseFloat(d.bought)), 0);
  const adSpend = ads.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
  const totalExp = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const netProfit = grossProfit - adSpend - totalExp;
  const totalRevenue = completedDeals.reduce((s, d) => s + parseFloat(d.sold), 0);
  const roas = adSpend > 0 ? (totalRevenue / adSpend).toFixed(2) + 'x' : '—';

  document.getElementById('kpiGrossProfit').textContent = fmtPlain(grossProfit);
  document.getElementById('kpiAdSpend').textContent     = fmtPlain(adSpend);
  document.getElementById('kpiROAS').textContent        = roas;

  const kpiNet = document.getElementById('kpiNetProfit');
  kpiNet.textContent = fmtPlain(netProfit);
  kpiNet.style.color = netProfit >= 0 ? 'var(--accent)' : 'var(--danger)';

  // Monthly breakdown
  const monthMap = {};
  completedDeals.forEach(d => {
    const mk = monthKey(d.date);
    if (!monthMap[mk]) monthMap[mk] = { deals:0, revenue:0, cost:0, profit:0, adSpend:0 };
    monthMap[mk].deals++;
    monthMap[mk].revenue += parseFloat(d.sold);
    monthMap[mk].cost    += parseFloat(d.bought);
    monthMap[mk].profit  += parseFloat(d.sold) - parseFloat(d.bought);
  });
  ads.forEach(a => {
    const mk = monthKey(a.date);
    if (!monthMap[mk]) monthMap[mk] = { deals:0, revenue:0, cost:0, profit:0, adSpend:0, expSpend:0 };
    monthMap[mk].adSpend += parseFloat(a.amount || 0);
  });
  expenses.forEach(e => {
    const mk = monthKey(e.date);
    if (!monthMap[mk]) monthMap[mk] = { deals:0, revenue:0, cost:0, profit:0, adSpend:0, expSpend:0 };
    if (monthMap[mk].expSpend === undefined) monthMap[mk].expSpend = 0;
    monthMap[mk].expSpend += parseFloat(e.amount || 0);
  });

  const months = Object.keys(monthMap).sort();

  // Summary table
  const summaryBody = document.getElementById('summaryBody');
  if (months.length === 0) {
    summaryBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-3);padding:30px;">No data for this period.</td></tr>`;
  } else {
    summaryBody.innerHTML = months.reverse().map(mk => {
      const m = monthMap[mk];
      const net = m.profit - (m.adSpend || 0) - (m.expSpend || 0);
      const marginPct = m.cost > 0 ? ((m.profit / m.cost) * 100).toFixed(1) + '%' : '—';
      return `<tr>
        <td style="font-weight:600;">${monthLabel(mk)}</td>
        <td style="color:var(--text-2);">${m.deals}</td>
        <td class="mono">S$${m.revenue.toFixed(2)}</td>
        <td class="mono" style="color:var(--text-2);">S$${m.cost.toFixed(2)}</td>
        <td class="${profitClass(m.profit)}">${fmt(m.profit)}</td>
        <td class="mono" style="color:var(--danger);">${(m.adSpend || 0) > 0 ? 'S$'+(m.adSpend||0).toFixed(2) : '—'}</td>
        <td class="mono" style="color:var(--danger);">${(m.expSpend || 0) > 0 ? 'S$'+(m.expSpend||0).toFixed(2) : '—'}</td>
        <td class="${profitClass(net)}">${fmt(net)}</td>
        <td style="color:var(--text-2);">${marginPct}</td>
      </tr>`;
    }).join('');
  }

  // Chart
  renderMonthlyChart(monthMap, months.reverse());

  // Top devices
  const deviceMap = {};
  completedDeals.forEach(d => {
    const key = d.category || d.device.split(' ').slice(0,2).join(' ');
    if (!deviceMap[key]) deviceMap[key] = { profit: 0, count: 0 };
    deviceMap[key].profit += parseFloat(d.sold) - parseFloat(d.bought);
    deviceMap[key].count++;
  });
  const topDevices = Object.entries(deviceMap)
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 8);
  
  const topList = document.getElementById('topDevicesList');
  if (topDevices.length === 0) {
    topList.innerHTML = '<p style="color:var(--text-3);font-size:12px;padding:12px 0;">No completed deals yet.</p>';
  } else {
    topList.innerHTML = topDevices.map(([name, data], i) => `
      <div class="top-device-row">
        <span class="top-device-rank">#${i+1}</span>
        <span class="top-device-name">${escHtml(name)}</span>
        <span class="top-device-count">${data.count} deal${data.count !== 1 ? 's' : ''}</span>
        <span class="top-device-profit">${fmt(data.profit)}</span>
      </div>
    `).join('');
  }
}

function renderMonthlyChart(monthMap, months) {
  const container = document.getElementById('monthlyChart');
  if (months.length === 0) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:12px;margin:auto;">No data yet.</p>';
    return;
  }

  const maxProfit   = Math.max(...months.map(m => Math.abs(monthMap[m].profit || 0)), 1);
  const maxAdSpend  = Math.max(...months.map(m => monthMap[m].adSpend || 0), 1);
  const maxVal = Math.max(maxProfit, maxAdSpend, 1);

  container.innerHTML = months.map(mk => {
    const m = monthMap[mk];
    const profitH  = Math.max(4, Math.round((Math.abs(m.profit || 0) / maxVal) * 120));
    const adH      = Math.max(0, Math.round(((m.adSpend || 0) / maxVal) * 120));
    const profitColor = (m.profit || 0) >= 0 ? 'var(--accent)' : 'var(--danger)';
    const label = monthLabel(mk).split(' ')[0]; // Just month name
    return `<div class="chart-month-group">
      <div class="chart-bars">
        <div class="chart-bar bar-profit" style="height:${profitH}px;background:${profitColor};" data-tip="${monthLabel(mk)} Profit: ${fmt(m.profit||0)}"></div>
        ${adH > 0 ? `<div class="chart-bar bar-adspend" style="height:${adH}px;" data-tip="${monthLabel(mk)} Ad Spend: S$${(m.adSpend||0).toFixed(2)}"></div>` : ''}
      </div>
      <span class="chart-label">${label}</span>
    </div>`;
  }).join('');

  // Legend
  container.insertAdjacentHTML('afterend', `
    <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:var(--text-2);">
      <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--accent);display:inline-block;"></span>Profit</span>
      <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:var(--danger);display:inline-block;"></span>Ad Spend</span>
    </div>
  `);
}

// ══════════════════════════════════════════════════════
// IMPORT / EXPORT
// ══════════════════════════════════════════════════════
function exportData() {
  const data = {
    version: 1,
    exported: new Date().toISOString(),
    deals: DB.deals,
    leads: DB.leads,
    ads:   DB.ads,
    prices: DB.prices,
    capital: DB.capital,
    expenses: DB.expenses,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flipdesk-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported ✓', 'accent');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.deals) DB.saveDeals(data.deals);
      if (data.leads) DB.saveLeads(data.leads);
      if (data.ads)   DB.saveAds(data.ads);
      if (data.prices) DB.savePrices(data.prices);
      if (data.capital) DB.saveCapital(data.capital);
      if (data.expenses) DB.saveExpenses(data.expenses);
      renderDashboard();
      renderDeals();
      renderLeads();
      renderAds();
      renderPrices();
      renderCapital();
      renderExpenses();
      showToast('Data imported ✓', 'accent');
    } catch {
      showToast('Invalid file — import failed');
    }
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════════════════
// EVENT WIRING
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  // Target Modal triggers
  const targetModal = document.getElementById('targetModal');
  document.getElementById('closeTargetModal').addEventListener('click', () => targetModal.classList.remove('open'));
  document.getElementById('cancelTargetModal').addEventListener('click', () => targetModal.classList.remove('open'));
  targetModal.addEventListener('click', e => { if (e.target === e.currentTarget) targetModal.classList.remove('open'); });
  document.getElementById('targetForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('targetInput').value;
    if (val && !isNaN(val) && val > 0) {
      localStorage.setItem('flipTargetProfit', val);
      targetModal.classList.remove('open');
      renderDashboard();
      showToast('Target updated', 'accent');
    }
  });

  // window.openAdModal already set at module scope above

  // Deal modal triggers
  document.getElementById('openDealModal').addEventListener('click', () => openDealModal());
  document.getElementById('closeDealModal').addEventListener('click', closeDealModal);
  document.getElementById('cancelDealModal').addEventListener('click', closeDealModal);
  document.getElementById('dealModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeDealModal(); });

  // Custom Option modal triggers
  const openCustomOptionBtn = document.getElementById('openCustomOptionModal');
  if (openCustomOptionBtn) openCustomOptionBtn.addEventListener('click', openCustomOptionModal);
  document.getElementById('closeCustomOptionModal').addEventListener('click', closeCustomOptionModal);
  document.getElementById('cancelCustomOptionModal').addEventListener('click', closeCustomOptionModal);
  document.getElementById('customOptionModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCustomOptionModal(); });

  document.getElementById('customOptionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('customOptionType').value;
    const value = document.getElementById('customOptionValue').value.trim();
    if (!value) return;

    if (type === 'category') {
      const cats = DB.customCats;
      if (!cats.includes(value)) {
        cats.push(value);
        DB.saveCustomCats(cats);
      }
    } else if (type === 'platform') {
      const plats = DB.customPlats;
      if (!plats.includes(value)) {
        plats.push(value);
        DB.saveCustomPlats(plats);
      }
    }

    populateCustomOptions();
    closeCustomOptionModal();
    showToast(`Added custom ${type}: "${value}" ✓`, 'accent');
  });

  // Deal live profit preview
  document.getElementById('dealBought').addEventListener('input', updateProfitPreview);
  document.getElementById('dealSold').addEventListener('input', updateProfitPreview);

  // Deal form submit
  document.getElementById('dealForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('dealId').value;
    const deals = DB.deals;
    const oldDeal = id ? deals.find(d => d.id === id) : null;
    const soldVal = document.getElementById('dealSold').value || null;
    const inputSoldDate = document.getElementById('dealSoldDate').value;
    
    let soldDate = null;
    if (inputSoldDate) {
      soldDate = inputSoldDate;
    } else if (soldVal) {
      if (oldDeal && oldDeal.soldDate) soldDate = oldDeal.soldDate;
      else soldDate = todayISO();
    }

    const deal = {
      id:        id || uid(),
      date:      document.getElementById('dealDate').value,
      category:  document.getElementById('dealCategory').value,
      device:    document.getElementById('dealDevice').value.trim(),
      bought:    document.getElementById('dealBought').value,
      sold:      soldVal,
      soldDate:  soldDate,
      condition: document.getElementById('dealCondition').value,
      platform:  document.getElementById('dealPlatform').value,
      notes:     document.getElementById('dealNotes').value.trim(),
    };
    
    if (id) {
      const idx = deals.findIndex(d => d.id === id);
      if (idx !== -1) deals[idx] = deal;
    } else {
      deals.push(deal);
    }
    DB.saveDeals(deals);
    closeDealModal();
    renderDeals();
    renderInventory();
    renderDashboard();
    showToast(id ? 'Deal updated ✓' : 'Deal saved ✓', 'accent');
  });

  // Deal filters
  document.getElementById('dealSearch').addEventListener('input', renderDeals);
  document.getElementById('dealCatFilter').addEventListener('change', renderDeals);
  document.getElementById('dealMonthFilter').addEventListener('change', renderDeals);

  // Lead modal triggers
  document.getElementById('openLeadModal').addEventListener('click', () => openLeadModal());
  document.getElementById('closeLeadModal').addEventListener('click', closeLeadModal);
  document.getElementById('cancelLeadModal').addEventListener('click', closeLeadModal);
  document.getElementById('leadModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeLeadModal(); });

  // Lead form submit
  document.getElementById('leadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('leadId').value;
    const lead = {
      id:     id || uid(),
      name:   document.getElementById('leadName').value.trim(),
      type:   document.getElementById('leadType').value,
      device: document.getElementById('leadDevice').value.trim(),
      price:  document.getElementById('leadPrice').value || null,
      target: document.getElementById('leadTarget').value || null,
      source: document.getElementById('leadSource').value,
      status: document.getElementById('leadStatus').value,
      notes:  document.getElementById('leadNotes').value.trim(),
    };
    const leads = DB.leads;
    if (id) {
      const idx = leads.findIndex(l => l.id === id);
      if (idx !== -1) leads[idx] = lead;
    } else {
      leads.push(lead);
    }
    DB.saveLeads(leads);
    closeLeadModal();
    renderLeads();
    showToast(id ? 'Lead updated ✓' : 'Lead added ✓', 'accent');
  });

  // Ad modal triggers
  const openAdBtn = document.getElementById('openAdModalBtn');
  if (openAdBtn) openAdBtn.addEventListener('click', () => openAdModal());
  document.getElementById('closeAdModal').addEventListener('click', closeAdModal);
  document.getElementById('cancelAdModal').addEventListener('click', closeAdModal);
  document.getElementById('adModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeAdModal(); });

  // Ad form submit
  document.getElementById('adForm').addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById('adId').value;
      const dateVal = document.getElementById('adDate').value || todayISO();
      const platVal = document.getElementById('adPlatform').value || 'Other';
      const campVal = document.getElementById('adCampaign').value.trim();
      const amtVal  = document.getElementById('adAmount').value;

      if (!amtVal || isNaN(parseFloat(amtVal))) {
        alert("Please enter a valid amount spent.");
        return;
      }

      const ad = {
        id:          id || uid(),
        date:        dateVal,
        platform:    platVal,
        campaign:    campVal,
        amount:      amtVal,
        leadsGen:    document.getElementById('adLeads').value || null,
        dealsLinked: document.getElementById('adDealsLinked').value.trim() || null,
        notes:       document.getElementById('adNotes').value.trim(),
      };

      const ads = DB.ads || [];
      if (id) {
        const idx = ads.findIndex(a => a.id === id);
        if (idx !== -1) ads[idx] = ad;
        else ads.push(ad);
      } else {
        ads.push(ad);
      }
      DB.saveAds(ads);
      closeAdModal();
      renderAds();
      renderDashboard();
      renderSummary();
      showToast(id ? 'Ad spend updated ✓' : 'Ad spend logged ✓', 'accent');
    } catch (err) {
      console.error("Save Ad Spend Error:", err);
      alert("Could not save ad spend: " + err.message);
    }
  });

  // Ad filters
  document.getElementById('adSearch').addEventListener('input', renderAds);
  document.getElementById('adPlatformFilter').addEventListener('change', renderAds);
  document.getElementById('adMonthFilter').addEventListener('change', renderAds);

  // Price modal triggers
  document.getElementById('openPriceModal').addEventListener('click', () => openPriceModal());
  document.getElementById('closePriceModal').addEventListener('click', closePriceModal);
  document.getElementById('cancelPriceModal').addEventListener('click', closePriceModal);
  document.getElementById('priceModal').addEventListener('click', e => { if (e.target === e.currentTarget) closePriceModal(); });

  // Price live profit preview
  document.getElementById('priceBuy').addEventListener('input', updatePricePreview);
  document.getElementById('priceSell').addEventListener('input', updatePricePreview);

  // Price form submit
  document.getElementById('priceForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('priceId').value;
    const price = {
      id:       id || uid(),
      category: document.getElementById('priceCategory').value,
      device:   document.getElementById('priceDevice').value.trim(),
      buy:      document.getElementById('priceBuy').value,
      sell:     document.getElementById('priceSell').value,
      notes:    document.getElementById('priceNotes').value.trim(),
    };
    const prices = DB.prices;
    if (id) {
      const idx = prices.findIndex(p => p.id === id);
      if (idx !== -1) prices[idx] = price;
    } else {
      prices.push(price);
    }
    DB.savePrices(prices);
    closePriceModal();
    renderPrices();
    showToast(id ? 'Price updated ✓' : 'Price added ✓', 'accent');
  });

  // Price filters
  document.getElementById('priceSearch').addEventListener('input', renderPrices);
  document.getElementById('priceCatFilter').addEventListener('change', renderPrices);

  // Capital Modal
  document.getElementById('openDepositModal').addEventListener('click', () => openCapitalModal('deposit'));
  document.getElementById('openWithdrawModal').addEventListener('click', () => openCapitalModal('withdraw'));
  document.getElementById('closeCapitalModal').addEventListener('click', closeCapitalModal);
  document.getElementById('cancelCapitalModal').addEventListener('click', closeCapitalModal);
  document.getElementById('capitalModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCapitalModal(); });

  document.getElementById('capitalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const tx = {
      id: uid(),
      type: document.getElementById('capitalType').value,
      date: document.getElementById('capitalDate').value,
      amount: document.getElementById('capitalAmount').value,
      notes: document.getElementById('capitalNotes').value.trim()
    };
    const capitalData = DB.capital;
    capitalData.push(tx);
    DB.saveCapital(capitalData);
    closeCapitalModal();
    renderCapital();
    renderDashboard();
    showToast('Transaction saved');
  });

  // Expense Listeners
  document.getElementById('openExpenseModal').addEventListener('click', () => openExpenseModal());
  document.getElementById('cancelExpenseModal').addEventListener('click', closeExpenseModal);
  document.getElementById('expenseModal').addEventListener('click', e => { if (e.target === e.currentTarget) closeExpenseModal(); });

  document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('expenseId').value;
    const ex = {
      id: id || uid(),
      date: document.getElementById('expenseDate').value,
      amount: document.getElementById('expenseAmount').value,
      category: document.getElementById('expenseCategory').value,
      notes: document.getElementById('expenseNotes').value.trim()
    };
    const expenses = DB.expenses;
    if (id) {
      const idx = expenses.findIndex(x => x.id === id);
      if (idx > -1) expenses[idx] = ex;
    } else {
      expenses.push(ex);
    }
    DB.saveExpenses(expenses);
    closeExpenseModal();
    renderExpenses();
    renderDashboard();
    renderCapital();
    showToast(id ? 'Expense updated' : 'Expense added');
  });

  // Delete modal
  document.getElementById('closeDeleteModal').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('open'));
  document.getElementById('cancelDeleteModal').addEventListener('click', () => document.getElementById('deleteModal').classList.remove('open'));
  document.getElementById('deleteModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('deleteModal').classList.remove('open');
  });

  // Summary period
  document.getElementById('summaryPeriod').addEventListener('change', renderSummary);

function openTermsModal() {
  const modal = document.getElementById('termsModal');
  if (modal) modal.classList.add('open');
}

function closeTermsModal() {
  const modal = document.getElementById('termsModal');
  if (modal) modal.classList.remove('open');
}

window.openTermsModal = openTermsModal;
window.closeTermsModal = closeTermsModal;

function submitFeedback() {
  const type = document.getElementById('feedbackType').value;
  const msg  = document.getElementById('feedbackMessage').value.trim();

  if (!msg) {
    alert("Please enter a short message for your bug report or feedback.");
    return;
  }

  const subject = encodeURIComponent(`FlipDesk ${type} from ${CloudSync.currentUser ? CloudSync.currentUser.email : 'User'}`);
  const body    = encodeURIComponent(`Feedback Type: ${type}\nUser Email: ${CloudSync.currentUser ? CloudSync.currentUser.email : 'Anonymous'}\n\nMessage:\n${msg}`);

  window.location.href = `mailto:muhdxhasan@gmail.com?subject=${subject}&body=${body}`;
  showToast('Opening mail app to submit feedback ✓', 'accent');
  document.getElementById('feedbackMessage').value = '';
}

window.submitFeedback = submitFeedback;

// Terms Modal triggers
document.addEventListener('DOMContentLoaded', () => {
  const termsModal = document.getElementById('termsModal');
  const openTermsBtn = document.getElementById('openTermsBtn');
  const closeTermsModalBtn = document.getElementById('closeTermsModal');
  const acceptTermsBtn = document.getElementById('acceptTermsBtn');

  if (openTermsBtn) openTermsBtn.onclick = openTermsModal;
  if (closeTermsModalBtn) closeTermsModalBtn.onclick = closeTermsModal;
  if (acceptTermsBtn) acceptTermsBtn.onclick = closeTermsModal;
  if (termsModal) {
    termsModal.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeTermsModal();
    });
  }
});

  // Export / Import
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importFile').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  // Initial renders
  renderDashboard();
  renderDeals();
  renderLeads();
  renderAds();
  renderPrices();
  renderCapital();
  renderExpenses();
});
