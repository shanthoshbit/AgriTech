/* ═══════════════════════════════════════════════════════════
   AgriTech App.js — Modular SPA Controller v2.0
   Architecture:
     - FirebaseModule  : auth + realtime DB
     - RouterModule    : hash-based SPA navigation
     - RelayModule     : motor/valve/light control
     - TimerModule     : motor countdown timer
     - UIModule        : toasts, status badges, greeting
═══════════════════════════════════════════════════════════ */

// ╔═══════════════════════════════════════════════════════════╗
// ║  FIREBASE CONFIGURATION                                   ║
// ╚═══════════════════════════════════════════════════════════╝
const firebaseConfig = {
  apiKey: "AIzaSyDviS9iLHKvh7hd5FNIlfucIZP7lAsYyhA",
  authDomain: "jst-control.firebaseapp.com",
  databaseURL: "https://jst-control-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jst-control",
  storageBucket: "jst-control.appspot.com",
  messagingSenderId: "YOUR_MSG_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ╔═══════════════════════════════════════════════════════════╗
// ║  APP STATE                                                ║
// ╚═══════════════════════════════════════════════════════════╝
const AppState = {
  currentPage: "dashboard",
  isESPOnline: false,
  relays: {
    motor: false,
    light: false,
    valve1: false,
    valve2: false
  },
  timer: {
    running: false,
    endTime: null,
    intervalId: null
  },
  user: null
};

// ╔═══════════════════════════════════════════════════════════╗
// ║  ROUTER MODULE — hash-based SPA navigation                ║
// ╚═══════════════════════════════════════════════════════════╝
const Pages = ["dashboard", "water", "market", "advisory", "profile"];

function navigateTo(page) {
  if (!Pages.includes(page)) page = "dashboard";
  AppState.currentPage = page;

  // Update pages
  Pages.forEach(p => {
    const el = document.getElementById(`page-${p}`);
    if (el) el.classList.toggle("active", p === page);
  });

  // Update nav items
  Pages.forEach(p => {
    const btn = document.getElementById(`nav-${p}`);
    if (btn) btn.classList.toggle("active", p === page);
  });

  // Update URL hash
  window.location.hash = page;

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Handle browser back/forward
window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace("#", "");
  if (Pages.includes(hash)) navigateTo(hash);
});

// ╔═══════════════════════════════════════════════════════════╗
// ║  UI MODULE                                                ║
// ╚═══════════════════════════════════════════════════════════╝

// ── Toast Notification ─────────────────────────────────────
let toastTimeout = null;
function showToast(message, duration = 2800) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), duration);
}

// ── Dynamic Greeting ───────────────────────────────────────
function setGreeting() {
  const hour = new Date().getHours();
  let msg = "Good Morning 🌅";
  if (hour >= 12 && hour < 17) msg = "Good Afternoon ☀️";
  else if (hour >= 17 && hour < 20) msg = "Good Evening 🌇";
  else if (hour >= 20) msg = "Good Night 🌙";
  const el = document.getElementById("dashGreeting");
  if (el) el.textContent = msg;
}

// ── Update Status Badge (small chip on dashboard) ──────────
function updateDashChip(id, valEl, isOn) {
  const el = document.getElementById(id);
  const valSpan = document.getElementById(valEl);
  if (valSpan) valSpan.textContent = isOn ? "ON" : "OFF";
  if (el) el.classList.toggle("on", isOn);
}

// ── Update Status Row (Water page status panel) ────────────
function setStatusVal(id, isOn, overrideText) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = overrideText || (isOn ? "ON" : "OFF");
  el.className = "status-row-val" + (isOn ? " green" : "");
}

// ── Update Control Card Highlight ──────────────────────────
function setCardHighlight(cardId, isOn) {
  const el = document.getElementById(cardId);
  if (el) el.classList.toggle("on", isOn);
}

// ── Update Power Badge ─────────────────────────────────────
function setPowerBadge(id, isOn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = isOn ? "ON" : "OFF";
  el.classList.toggle("on", isOn);
}

// ── Update Status Badge (ctrl-status-badge) ────────────────
function setCtrlBadge(id, isOn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = isOn ? "ON" : "OFF";
  el.classList.toggle("on", isOn);
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  ESP CONNECTIVITY MODULE                                  ║
// ╚═══════════════════════════════════════════════════════════╝
function monitorESPStatus() {
  const espRef = database.ref("/test/esp_status");
  const badge = document.getElementById("espBadge");
  const dot = document.getElementById("espDot");
  const label = document.getElementById("espLabel");
  const waterDot = document.getElementById("waterStatusDot");
  const waterLabel = document.getElementById("waterStatusLabel");
  const offlineBar = document.getElementById("offlineAlert");
  const espStatVal = document.getElementById("espStatusVal");

  function setOnline(online) {
    AppState.isESPOnline = online;
    const statusText = online ? "ESP32 Online" : "ESP32 Offline";

    // Header badge
    if (dot) { dot.className = "esp-dot " + (online ? "online" : "offline"); }
    if (label) { label.textContent = online ? "Device Online" : "Device Offline"; }

    // Water page status bar
    if (waterDot) waterDot.className = "device-status-dot " + (online ? "online" : "offline");
    if (waterLabel) waterLabel.textContent = online ? "✅ ESP32 Device Connected" : "❌ ESP32 Device Offline";

    // Offline banner
    if (offlineBar) offlineBar.classList.toggle("hidden", online);

    // Status panel row
    if (espStatVal) {
      espStatVal.textContent = online ? "Online ✅" : "Offline ❌";
      espStatVal.className = "status-row-val " + (online ? "green" : "");
    }
  }

  espRef.on("value", snapshot => {
    setOnline(snapshot.val() === true);
  });

  // Fallback offline detection
  setInterval(() => {
    espRef.get().then(snapshot => {
      if (snapshot && snapshot._dataTimestamp) {
        const age = Date.now() - snapshot._dataTimestamp;
        if (age > 25000) setOnline(false);
      }
    }).catch(() => setOnline(false));
  }, 12000);
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  RELAY CONTROL MODULE                                     ║
// ╚═══════════════════════════════════════════════════════════╝
function setupRelays() {
  const relayConfig = [
    {
      dbPath: "/test/light",      // Motor
      switchId: "relay1Switch",
      stateKey: "motor",
      onChange: (isOn) => {
        setPowerBadge("status1", isOn);
        setStatusVal("motorStatusVal", isOn);
        updateDashChip("motorStatusChip", "dashMotorStatus", isOn);
        setCardHighlight("motorCard", isOn);
        if (!isOn) stopTimer();        // cancel timer when motor turned off manually
      }
    },
    {
      dbPath: "/test/light2",     // Field Light
      switchId: "relay2Switch",
      stateKey: "light",
      onChange: (isOn) => {
        setCtrlBadge("status2", isOn);
        setStatusVal("lightStatusVal", isOn);
        updateDashChip("lightStatusChip", "dashLightStatus", isOn);
        setCardHighlight("lightCard", isOn);
      }
    },
    {
      dbPath: "/test/light3",     // Valve 1
      switchId: "relay3Switch",
      stateKey: "valve1",
      onChange: (isOn) => {
        setCtrlBadge("status3", isOn);
        setStatusVal("valve1StatusVal", isOn);
        updateDashChip("valve1StatusChip", "dashValve1Status", isOn);
        setCardHighlight("valve1Card", isOn);
      }
    },
    {
      dbPath: "/test/light4",     // Valve 2
      switchId: "relay4Switch",
      stateKey: "valve2",
      onChange: (isOn) => {
        setCtrlBadge("status4", isOn);
        setStatusVal("valve2StatusVal", isOn);
        updateDashChip("valve2StatusChip", "dashValve2Status", isOn);
        setCardHighlight("valve2Card", isOn);
      }
    }
  ];

  relayConfig.forEach(cfg => {
    const ref = database.ref(cfg.dbPath);
    const sw = document.getElementById(cfg.switchId);

    // Listen for realtime DB changes
    ref.on("value", snapshot => {
      const val = snapshot.val() === true;
      AppState.relays[cfg.stateKey] = val;
      if (sw) sw.checked = val;
      cfg.onChange(val);
    });

    // User toggled the switch
    if (sw) {
      sw.addEventListener("change", () => {
        ref.set(sw.checked);
        const deviceName = cfg.switchId === "relay1Switch" ? "Motor Pump"
          : cfg.switchId === "relay2Switch" ? "Field Light"
            : cfg.switchId === "relay3Switch" ? "Valve 1"
              : "Valve 2";
        showToast(`${deviceName} turned ${sw.checked ? "ON ✅" : "OFF ⛔"}`);
      });
    }
  });
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  TIMER MODULE                                             ║
// ╚═══════════════════════════════════════════════════════════╝
const motorTimerRef = database.ref("/test/motor_timer");

function monitorTimer() {
  motorTimerRef.on("value", snapshot => {
    const data = snapshot.val();

    // Clear any existing local interval
    if (AppState.timer.intervalId) {
      clearInterval(AppState.timer.intervalId);
      AppState.timer.intervalId = null;
    }

    if (data && data.running && data.endTime) {
      AppState.timer.running = true;
      AppState.timer.endTime = data.endTime;

      AppState.timer.intervalId = setInterval(() => {
        const timeLeft = data.endTime - Date.now();

        if (timeLeft <= 0) {
          clearInterval(AppState.timer.intervalId);
          AppState.timer.running = false;
          updateTimerUI("Timer: OFF");
          // Turn motor off in DB
          database.ref("/test/light").set(false);
          motorTimerRef.set({ running: false });
          showToast("⏱ Motor timer finished. Motor turned OFF.");
        } else {
          const h = Math.floor(timeLeft / 3600000);
          const m = Math.floor((timeLeft % 3600000) / 60000);
          const s = Math.floor((timeLeft % 60000) / 1000);
          const display = h > 0
            ? `Timer: ${h}h ${m}m ${s}s`
            : `Timer: ${m}m ${s}s`;
          updateTimerUI(display);
        }
      }, 1000);

    } else {
      AppState.timer.running = false;
      updateTimerUI("Timer: --");
    }
  });
}

function updateTimerUI(text) {
  const chip = document.getElementById("timerStatus");
  const panel = document.getElementById("timerStatusVal");
  if (chip) chip.textContent = `⏱ ${text.replace("Timer: ", "")}`;
  if (panel) {
    panel.textContent = text;
    panel.className = "status-row-val " + (text.includes("--") || text.includes("OFF") ? "" : "cyan");
  }
}

// ── Open Timer Modal ───────────────────────────────────────
function openTimerModal() {
  document.getElementById("timerModal").classList.remove("hidden");
}

// ── Close Timer Modal ──────────────────────────────────────
function closeTimerModal() {
  document.getElementById("timerModal").classList.add("hidden");
}

// ── Set Timer Duration ─────────────────────────────────────
function setTimer(minutes) {
  const endTime = Date.now() + minutes * 60 * 1000;

  // Turn motor ON first
  database.ref("/test/light").set(true);

  // Save timer to Firebase
  motorTimerRef.set({
    running: true,
    startTime: Date.now(),
    endTime: endTime,
    durationMinutes: minutes
  });

  closeTimerModal();
  showToast(`⏱ Motor timer set for ${minutes} minute${minutes !== 1 ? 's' : ''}`);
}

// ── Set Custom Timer ───────────────────────────────────────
function setCustomTimer() {
  const val = parseInt(document.getElementById("customMinutes").value, 10);
  if (!val || val < 1 || val > 600) {
    showToast("⚠️ Please enter a valid duration (1–600 minutes)");
    return;
  }
  setTimer(val);
}

// ── Stop Timer ─────────────────────────────────────────────
function stopTimer() {
  if (AppState.timer.intervalId) clearInterval(AppState.timer.intervalId);
  motorTimerRef.set({ running: false });
  updateTimerUI("Timer: OFF");
  closeTimerModal();
  showToast("⛔ Motor timer cancelled");
}

// ╔═══════════════════════════════════════════════════════════╗
// ║  AUTH MODULE                                              ║
// ╚═══════════════════════════════════════════════════════════╝
function login() {
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value;
  const statusEl = document.getElementById("loginStatus");
  const btn = document.getElementById("loginBtn");

  if (!email || !password) {
    if (statusEl) statusEl.textContent = "⚠️ Please enter email and password";
    return;
  }

  // Loading state
  if (btn) { btn.querySelector(".btn-text").textContent = "Signing in…"; btn.disabled = true; }
  if (statusEl) statusEl.textContent = "";

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      if (statusEl) statusEl.textContent = "";
    })
    .catch(err => {
      const msgs = {
        "auth/user-not-found": "❌ No account found with this email",
        "auth/wrong-password": "❌ Incorrect password",
        "auth/invalid-email": "❌ Invalid email address",
        "auth/too-many-requests": "⚠️ Too many attempts. Try again later"
      };
      if (statusEl) statusEl.textContent = msgs[err.code] || `❌ ${err.message}`;
    })
    .finally(() => {
      if (btn) { btn.querySelector(".btn-text").textContent = "Sign In to Farm"; btn.disabled = false; }
    });
}

function logout() {
  auth.signOut().then(() => showToast("👋 Logged out successfully"));
}

// ── Auth State Observer ────────────────────────────────────
auth.onAuthStateChanged(user => {
  const loginSection = document.getElementById("loginSection");
  const appShell = document.getElementById("appShell");
  const profileEmail = document.getElementById("profileEmail");

  if (user) {
    AppState.user = user;
    if (loginSection) loginSection.classList.add("hidden");
    if (appShell) appShell.classList.remove("hidden");
    if (profileEmail) profileEmail.textContent = user.email;

    // Navigate to dashboard (or hash page)
    const hash = window.location.hash.replace("#", "");
    navigateTo(Pages.includes(hash) ? hash : "dashboard");

    // Start all listeners
    monitorESPStatus();
    setupRelays();
    monitorTimer();
    setGreeting();
    resetInactivityTimer();

  } else {
    AppState.user = null;
    if (loginSection) loginSection.classList.remove("hidden");
    if (appShell) appShell.classList.add("hidden");
  }
});

// ╔═══════════════════════════════════════════════════════════╗
// ║  INACTIVITY AUTO-LOGOUT (5 min)                          ║
// ╚═══════════════════════════════════════════════════════════╝
const INACTIVITY_MS = 5 * 60 * 1000;
let inactivityTimer = null;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    auth.signOut().then(() => {
      showToast("🔒 Logged out due to inactivity");
      setTimeout(() => location.reload(), 1500);
    });
  }, INACTIVITY_MS);
}

["mousemove", "keydown", "touchstart", "click"].forEach(evt => {
  window.addEventListener(evt, resetInactivityTimer, { passive: true });
});

// ╔═══════════════════════════════════════════════════════════╗
// ║  SPLASH SCREEN                                           ║
// ╚═══════════════════════════════════════════════════════════╝
window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add("fade-out");
    setTimeout(() => {
      splash.style.display = "none";
    }, 650);
  }, 2400);
});

// ╔═══════════════════════════════════════════════════════════╗
// ║  KEYBOARD ACCESSIBILITY                                  ║
// ╚═══════════════════════════════════════════════════════════╝
document.addEventListener("keydown", e => {
  // Close modal on Escape
  if (e.key === "Escape") closeTimerModal();
});

// Allow Enter/Space on module cards
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("module-card")) {
    e.preventDefault();
    e.target.click();
  }
});

// ══════════════════════════════════════════════════════════
// MODULE CARD CLICK — navigate to water if active module
// ══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  const waterCard = document.getElementById("moduleWater");
  if (waterCard) {
    waterCard.addEventListener("click", () => navigateTo("water"));
  }

  // Locked module cards — show coming soon toast on click
  const lockedIds = ["moduleHarvest", "moduleSell", "moduleSeeds", "moduleFertilizer", "moduleAdvisory", "moduleMachinery", "moduleService"];
  const phaseMap = {
    moduleHarvest: "Phase 2",
    moduleSell: "Phase 2",
    moduleSeeds: "Phase 2",
    moduleFertilizer: "Phase 2",
    moduleAdvisory: "Phase 3",
    moduleMachinery: "Phase 4",
    moduleService: "Phase 4"
  };
  lockedIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        showToast(`🔜 Coming in ${phaseMap[id] || 'a future update'} — Stay tuned!`);
      });
    }
  });
});