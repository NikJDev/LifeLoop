"use strict";

const SUPABASE_URL = "https://udxzapnzxuzscoqphvew.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bZvODTbF4-RyrJBjh5zqAA_1GwvRqyp";

const appState = {
  client: null,
  configured: false,
  currentUser: null,
  profile: null,
  authMode: "login",
  onboardingIndex: 0,
  selectedAnswer: null,
  userSetup: createDefaultSetup(),
  dashboardData: {
    caffeineLogs: [],
    sweetDrinksLogs: [],
    fitnessLogs: [],
    habitLogs: [],
    notes: [],
    reminders: [],
    wellnessLogs: [],
    streakDates: []
  },
  charts: {},
  realtimeChannel: null,
  dashboardReloadTimer: null,
  reminderTimers: [],
  selectedDate: getLocalDateString(),
  loading: false
};

const onboardingSteps = [
  {
    key: "caffeineTracker",
    question: "Koffein-Tracker aktivieren?",
    hint: "Bei Ja setzen wir dein Tageslimit auf 400 mg.",
    yes() {
      appState.userSetup.caffeineTracker = true;
      appState.userSetup.caffeineLimit = 400;
    },
    no() {
      appState.userSetup.caffeineTracker = false;
    }
  },
  {
    key: "fitnessTracker",
    question: "Fitness-Tracking aktivieren?",
    hint: "Logge Workouts und hake sie ab.",
    yes() {
      appState.userSetup.fitnessTracker = true;
    },
    no() {
      appState.userSetup.fitnessTracker = false;
    }
  },
  {
    key: "sweetDrinksTracker",
    question: "Süßgetränke / Softdrinks tracken?",
    hint: "Zum Beispiel Cola, Fanta oder Energy Sugar.",
    yes() {
      appState.userSetup.sweetDrinksTracker = true;
    },
    no() {
      appState.userSetup.sweetDrinksTracker = false;
    }
  },
  {
    key: "habitsTracker",
    question: "Eigene Gewohnheiten hinzufügen?",
    hint: "Füge mehrere Habits hinzu und entferne sie bei Bedarf.",
    yes() {
      appState.userSetup.habitsTracker = true;
    },
    no() {
      appState.userSetup.habitsTracker = false;
      appState.userSetup.customHabits = [];
    },
    habits: true
  },
  {
    key: "waterTracker",
    question: "Wasser-Tracking aktivieren?",
    hint: "Schnell in ml loggen und dein Tagesziel im Blick behalten.",
    yes() {
      appState.userSetup.waterTracker = true;
    },
    no() {
      appState.userSetup.waterTracker = false;
    }
  },
  {
    key: "sleepTracker",
    question: "Schlaf kurz tracken?",
    hint: "Ein simples Feld fuer Stunden reicht, ohne es kompliziert zu machen.",
    yes() {
      appState.userSetup.sleepTracker = true;
    },
    no() {
      appState.userSetup.sleepTracker = false;
    }
  },
  {
    key: "moodTracker",
    question: "Mood-Check-ins aktivieren?",
    hint: "Gut fuer Muster: Energie, Stimmung, Stress und Routinen.",
    yes() {
      appState.userSetup.moodTracker = true;
    },
    no() {
      appState.userSetup.moodTracker = false;
    }
  },
  {
    key: "notesTracker",
    question: "Notizen / Journal aktivieren?",
    hint: "Kurze Tagesnotizen, Gedanken, Symptome oder Fortschritt speichern.",
    yes() {
      appState.userSetup.notesTracker = true;
    },
    no() {
      appState.userSetup.notesTracker = false;
    }
  },
  {
    key: "remindersTracker",
    question: "Erinnerungen aktivieren?",
    hint: "Praktisch fuer Alltag, Trinken, Training, Termine oder kurze Routinen.",
    yes() {
      appState.userSetup.remindersTracker = true;
    },
    no() {
      appState.userSetup.remindersTracker = false;
    }
  },
  {
    key: "final",
    question: "Setup abgeschlossen",
    hint: "Dein Dashboard wird jetzt aus deinen Antworten gebaut.",
    final: true
  }
];

const els = {};

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  cacheElements();
  bindEvents();
  initSupabase();
  setTodayLabel();
  registerServiceWorker();
  setupSystemThemeListener();
  showScreen("start");

  if (!appState.configured) {
    showToast("Supabase ist noch nicht konfiguriert. Trage URL und Anon Key in script.js ein.", "error");
    return;
  }

  checkSession();
}

function cacheElements() {
  els.startScreen = document.getElementById("start-screen");
  els.authScreen = document.getElementById("auth-screen");
  els.onboardingScreen = document.getElementById("onboarding-screen");
  els.dashboardScreen = document.getElementById("dashboard-screen");
  els.startButton = document.getElementById("start-button");
  els.authBackButton = document.getElementById("auth-back-button");
  els.authForm = document.getElementById("auth-form");
  els.authTitle = document.getElementById("auth-title");
  els.authSubtitle = document.getElementById("auth-subtitle");
  els.authName = document.getElementById("auth-name");
  els.authEmail = document.getElementById("auth-email");
  els.authPassword = document.getElementById("auth-password");
  els.authPasswordConfirm = document.getElementById("auth-password-confirm");
  els.nameField = document.getElementById("name-field");
  els.confirmField = document.getElementById("confirm-field");
  els.authMessage = document.getElementById("auth-message");
  els.authSubmitButton = document.getElementById("auth-submit-button");
  els.authModeButton = document.getElementById("auth-mode-button");
  els.togglePasswordButton = document.getElementById("toggle-password-button");
  els.onboardingProgress = document.getElementById("onboarding-progress");
  els.onboardingCard = document.getElementById("onboarding-card");
  els.dashboardTitle = document.getElementById("dashboard-title");
  els.todayLabel = document.getElementById("today-label");
  els.dashboardGrid = document.getElementById("dashboard-grid");
  els.dashboardMessage = document.getElementById("dashboard-message");
  els.reloadDashboardButton = document.getElementById("reload-dashboard-button");
  els.openSettingsButton = document.getElementById("open-settings-button");
  els.settingsOverlay = document.getElementById("settings-overlay");
  els.closeSettingsButton = document.getElementById("close-settings-button");
  els.settingsContent = document.getElementById("settings-content");
  els.toastArea = document.getElementById("toast-area");
}

function bindEvents() {
  els.startButton.addEventListener("click", () => showScreen("auth"));
  els.authBackButton.addEventListener("click", () => showScreen("start"));
  els.authModeButton.addEventListener("click", toggleAuthMode);
  els.togglePasswordButton.addEventListener("click", togglePasswordVisibility);
  els.authForm.addEventListener("submit", handleAuthSubmit);
  els.reloadDashboardButton.addEventListener("click", loadDashboard);
  els.openSettingsButton.addEventListener("click", () => openOverlay("settings"));
  els.closeSettingsButton.addEventListener("click", () => closeOverlay("settings"));
  els.settingsOverlay.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-settings]")) closeOverlay("settings");
  });
}

function initSupabase() {
  appState.configured = hasValidSupabaseConfig();

  if (appState.configured) {
    try {
    appState.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
      appState.client = null;
      appState.configured = false;
      showToast(`Supabase konnte nicht initialisiert werden: ${readableError(error)}`, "error");
    }
  }
}

function hasValidSupabaseConfig() {
  if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (SUPABASE_URL.includes("YOUR_") || SUPABASE_ANON_KEY.includes("YOUR_")) return false;

  try {
    const parsedUrl = new URL(SUPABASE_URL);
    return parsedUrl.protocol === "https:" && parsedUrl.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function ensureSupabaseClient() {
  if (appState.client) return true;
  appState.configured = false;
  const message = "Supabase ist nicht korrekt verbunden. Prüfe SUPABASE_URL und SUPABASE_ANON_KEY in script.js.";
  setAuthError(message);
  showToast(message, "error");
  return false;
}

async function checkSession() {
  if (!ensureSupabaseClient()) return;
  try {
    const { data, error } = await appState.client.auth.getSession();
    if (error) throw error;
    const user = data.session?.user || null;
    appState.currentUser = user;

    if (!user) {
      showScreen("start");
      return;
    }

    await routeAfterAuth();
  } catch (error) {
    showToast(readableError(error), "error");
    showScreen("start");
  }
}

async function routeAfterAuth() {
  await loadProfile();
  if (!appState.profile || !appState.profile.onboarding_completed) {
    appState.onboardingIndex = 0;
    appState.userSetup = createDefaultSetup();
    showScreen("onboarding");
    renderOnboardingStep();
    return;
  }
  setupRealtimeSubscription();
  await loadDashboard();
}

function showScreen(screenName) {
  const map = {
    start: els.startScreen,
    auth: els.authScreen,
    onboarding: els.onboardingScreen,
    dashboard: els.dashboardScreen
  };

  Object.values(map).forEach((screen) => screen.classList.remove("active"));
  map[screenName]?.classList.add("active");
  if (screenName !== "dashboard") closeOverlay("settings");
}

function openOverlay(name) {
  if (name !== "settings") return;
  renderSettings();
  els.settingsOverlay.classList.remove("hidden");
  els.settingsOverlay.setAttribute("aria-hidden", "false");
}

function closeOverlay(name) {
  if (name !== "settings") return;
  els.settingsOverlay.classList.add("hidden");
  els.settingsOverlay.setAttribute("aria-hidden", "true");
}

function toggleAuthMode() {
  appState.authMode = appState.authMode === "login" ? "register" : "login";
  const isRegister = appState.authMode === "register";
  els.authTitle.textContent = isRegister ? "Registrieren" : "Einloggen";
  els.authSubtitle.textContent = isRegister ? "Erstelle dein Konto und starte dein Setup." : "Melde dich an und öffne deinen LifeLoop.";
  els.authSubmitButton.textContent = isRegister ? "Konto erstellen" : "Einloggen";
  els.authModeButton.textContent = isRegister ? "Schon ein Konto? Einloggen" : "Noch kein Konto? Registrieren";
  els.nameField.classList.toggle("hidden", !isRegister);
  els.confirmField.classList.toggle("hidden", !isRegister);
  els.authMessage.textContent = "";
  els.authPassword.autocomplete = isRegister ? "new-password" : "current-password";
}

function togglePasswordVisibility() {
  const nextType = els.authPassword.type === "password" ? "text" : "password";
  els.authPassword.type = nextType;
  els.authPasswordConfirm.type = nextType;
  els.togglePasswordButton.setAttribute("aria-label", nextType === "password" ? "Passwort anzeigen" : "Passwort verstecken");
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (!appState.configured) {
    setAuthError("Supabase ist noch nicht konfiguriert. Trage URL und Anon Key in script.js ein.");
    return;
  }
  if (!ensureSupabaseClient()) return;

  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  const name = els.authName.value.trim();
  const passwordConfirm = els.authPasswordConfirm.value;

  if (!email || !password) {
    setAuthError("Bitte E-Mail und Passwort eingeben.");
    return;
  }

  if (appState.authMode === "register") {
    if (!name) {
      setAuthError("Bitte gib deinen Namen ein.");
      return;
    }
    if (password !== passwordConfirm) {
      setAuthError("Die Passwörter stimmen nicht überein.");
      return;
    }
  }

  setLoading(els.authSubmitButton, true, appState.authMode === "register" ? "Erstelle Konto..." : "Logge ein...");
  setAuthError("");

  try {
    if (appState.authMode === "register") {
      const { data, error } = await appState.client.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
      appState.currentUser = data.user;
      if (!data.session) {
        showToast("Registrierung erfolgreich. Prüfe ggf. deine E-Mails und logge dich danach ein.");
        toggleAuthMode();
        return;
      }
      await saveProfile({ name, onboarding_completed: false });
    } else {
      const { data, error } = await appState.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      appState.currentUser = data.user;
    }

    await routeAfterAuth();
  } catch (error) {
    setAuthError(readableError(error));
  } finally {
    setLoading(els.authSubmitButton, false);
  }
}

function setAuthError(message) {
  els.authMessage.textContent = message || "";
}

function createDefaultSetup() {
  return {
    caffeineTracker: false,
    fitnessTracker: false,
    sweetDrinksTracker: false,
    habitsTracker: false,
    waterTracker: false,
    sleepTracker: false,
    moodTracker: false,
    notesTracker: true,
    remindersTracker: true,
    caffeineLimit: 400,
    customHabits: []
  };
}

function renderOnboardingStep() {
  const step = onboardingSteps[appState.onboardingIndex];
  const progress = ((appState.onboardingIndex + 1) / onboardingSteps.length) * 100;
  els.onboardingProgress.style.width = `${progress}%`;
  appState.selectedAnswer = null;

  if (step.final) {
    els.onboardingCard.innerHTML = `
      <p class="eyebrow">Final Step</p>
      <h2 id="onboarding-question">${escapeHtml(step.question)}</h2>
      <p class="muted">${escapeHtml(step.hint)}</p>
      <button id="finish-onboarding-button" class="btn btn-primary btn-wide" type="button">Dashboard öffnen</button>
    `;
    document.getElementById("finish-onboarding-button").addEventListener("click", finishOnboarding);
    return;
  }

  els.onboardingCard.innerHTML = `
    <p class="eyebrow">Step ${appState.onboardingIndex + 1} von ${onboardingSteps.length - 1}</p>
    <h2 id="onboarding-question">${escapeHtml(step.question)}</h2>
    <p class="muted">${escapeHtml(step.hint)}</p>
    <div class="answer-grid">
      <button class="answer-card" data-answer="yes" type="button">Ja</button>
      <button class="answer-card" data-answer="no" type="button">Nein</button>
    </div>
    <div id="onboarding-extra"></div>
    <button id="onboarding-next-button" class="btn btn-primary btn-wide" type="button" disabled>Weiter</button>
  `;

  els.onboardingCard.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => selectOnboardingAnswer(button.dataset.answer));
  });
  document.getElementById("onboarding-next-button").addEventListener("click", goToNextOnboardingStep);
}

function selectOnboardingAnswer(answer) {
  const step = onboardingSteps[appState.onboardingIndex];
  appState.selectedAnswer = answer;
  els.onboardingCard.querySelectorAll("[data-answer]").forEach((button) => {
    button.classList.toggle("selected", button.dataset.answer === answer);
  });

  if (answer === "yes") step.yes();
  if (answer === "no") step.no();

  renderOnboardingExtra(step, answer);
  document.getElementById("onboarding-next-button").disabled = false;
}

function renderOnboardingExtra(step, answer) {
  const extra = document.getElementById("onboarding-extra");
  if (!extra) return;
  if (!step.habits || answer !== "yes") {
    extra.innerHTML = "";
    return;
  }

  extra.innerHTML = `
    <div class="habit-builder">
      <div class="row">
        <input id="onboarding-habit-input" type="text" placeholder="z. B. 10 Minuten lesen">
        <button id="add-onboarding-habit-button" class="btn btn-secondary" type="button">Hinzufügen</button>
      </div>
      <ul id="onboarding-habit-list" class="tag-list"></ul>
    </div>
  `;
  document.getElementById("add-onboarding-habit-button").addEventListener("click", addOnboardingHabit);
  document.getElementById("onboarding-habit-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addOnboardingHabit();
    }
  });
  renderOnboardingHabits();
}

function addOnboardingHabit() {
  const input = document.getElementById("onboarding-habit-input");
  const value = input.value.trim();
  if (!value) return;
  if (!appState.userSetup.customHabits.includes(value)) appState.userSetup.customHabits.push(value);
  input.value = "";
  renderOnboardingHabits();
}

function renderOnboardingHabits() {
  const list = document.getElementById("onboarding-habit-list");
  if (!list) return;
  list.innerHTML = appState.userSetup.customHabits.map((habit) => `
    <li class="tag">
      <span>${escapeHtml(habit)}</span>
      <button class="icon-btn remove-btn" data-remove-habit="${escapeAttr(habit)}" type="button" aria-label="Habit entfernen">×</button>
    </li>
  `).join("");
  list.querySelectorAll("[data-remove-habit]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.userSetup.customHabits = appState.userSetup.customHabits.filter((habit) => habit !== button.dataset.removeHabit);
      renderOnboardingHabits();
    });
  });
}

function goToNextOnboardingStep() {
  if (!appState.selectedAnswer) return;
  appState.onboardingIndex += 1;
  renderOnboardingStep();
}

async function finishOnboarding() {
  const button = document.getElementById("finish-onboarding-button");
  setLoading(button, true, "Speichere...");
  try {
    await saveProfile({
      name: appState.profile?.name || appState.currentUser?.user_metadata?.name || appState.currentUser?.email?.split("@")[0] || "LifeLooper",
      caffeine_enabled: appState.userSetup.caffeineTracker,
      caffeine_limit: appState.userSetup.caffeineLimit || 400,
      fitness_enabled: appState.userSetup.fitnessTracker,
      sweet_drinks_enabled: appState.userSetup.sweetDrinksTracker,
      habits_enabled: appState.userSetup.habitsTracker,
      water_enabled: appState.userSetup.waterTracker,
      sleep_enabled: appState.userSetup.sleepTracker,
      mood_enabled: appState.userSetup.moodTracker,
      notes_enabled: appState.userSetup.notesTracker,
      reminders_enabled: appState.userSetup.remindersTracker,
      custom_habits: appState.userSetup.customHabits,
      theme_color: appState.profile?.theme_color || "system",
      onboarding_completed: true
    });
    setupRealtimeSubscription();
    await loadDashboard();
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    setLoading(button, false);
  }
}

async function loadProfile() {
  if (!appState.currentUser) return null;
  const { data, error } = await appState.client
    .from("profiles")
    .select("*")
    .eq("user_id", appState.currentUser.id)
    .maybeSingle();
  if (error) throw error;
  appState.profile = data;
  applyColorway(data?.theme_color || "system");
  return data;
}

async function saveProfile(values) {
  if (!appState.currentUser) throw new Error("Keine aktive Session gefunden.");
  const payload = {
    user_id: appState.currentUser.id,
    ...values,
    updated_at: new Date().toISOString()
  };
  const { data, error } = await appState.client
    .from("profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  appState.profile = data;
  applyColorway(data?.theme_color || "system");
  return data;
}

async function loadDashboard() {
  if (!appState.currentUser) return;
  setDashboardMessage("Lade deine Daten...");
  showScreen("dashboard");

  try {
    await loadProfile();
    const [caffeineLogs, sweetDrinksLogs, fitnessLogs, habitLogs, notes, reminders, wellnessLogs, streakDates] = await Promise.all([
      fetchTodayRows("caffeine_logs", "created_at"),
      fetchTodayRows("sweet_drinks_logs", "created_at"),
      fetchTodayRows("fitness_logs", "created_at"),
      fetchHabitLogs(),
      fetchTodayRows("notes", "created_at", true),
      fetchReminders(),
      fetchTodayRows("wellness_logs", "created_at", true),
      fetchActivityDates()
    ]);

    appState.dashboardData = { caffeineLogs, sweetDrinksLogs, fitnessLogs, habitLogs, notes, reminders, wellnessLogs, streakDates };
    renderDashboard();
    scheduleReminderNotifications();
    setDashboardMessage("");
  } catch (error) {
    setDashboardMessage(readableError(error), true);
    showToast(readableError(error), "error");
  }
}

async function fetchTodayRows(table, dateColumn, optional = false) {
  const range = getSelectedDateRange();
  const { data, error } = await appState.client
    .from(table)
    .select("*")
    .eq("user_id", appState.currentUser.id)
    .gte(dateColumn, range.start)
    .lt(dateColumn, range.end)
    .order(dateColumn, { ascending: false });
  if (error) {
    if (optional && isMissingTableError(error)) return [];
    throw error;
  }
  return data || [];
}

async function fetchHabitLogs() {
  const { data, error } = await appState.client
    .from("habit_logs")
    .select("*")
    .eq("user_id", appState.currentUser.id)
    .eq("log_date", appState.selectedDate)
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return data || [];
}

async function fetchReminders() {
  const { data, error } = await appState.client
    .from("reminders")
    .select("*")
    .eq("user_id", appState.currentUser.id)
    .order("reminder_time", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function fetchActivityDates() {
  const sources = await Promise.all([
    fetchRecentDateValues("caffeine_logs", "created_at"),
    fetchRecentDateValues("sweet_drinks_logs", "created_at"),
    fetchRecentDateValues("fitness_logs", "created_at"),
    fetchRecentDateValues("notes", "created_at", true),
    fetchRecentDateValues("wellness_logs", "created_at", true),
    fetchRecentDateValues("habit_logs", "log_date", true)
  ]);

  return [...new Set(sources.flat().filter(Boolean))].sort();
}

async function fetchRecentDateValues(table, dateColumn, optional = false) {
  const since = new Date();
  since.setDate(since.getDate() - 89);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await appState.client
    .from(table)
    .select(dateColumn)
    .eq("user_id", appState.currentUser.id)
    .gte(dateColumn, dateColumn === "log_date" ? toLocalDateString(since) : since.toISOString());

  if (error) {
    if (optional && isMissingTableError(error)) return [];
    throw error;
  }

  return (data || []).map((row) => normalizeActivityDate(row[dateColumn]));
}

function renderDashboard() {
  const profile = appState.profile;
  if (!profile) {
    els.dashboardGrid.innerHTML = `<div class="module-card"><p class="empty-state">Kein Profil gefunden.</p></div>`;
    return;
  }

  els.dashboardTitle.textContent = `Hallo, ${profile.name || "LifeLooper"}`;
  setTodayLabel();
  els.dashboardGrid.innerHTML = "";

  const modules = [renderDateNavigator(), renderStreakModule(), renderInsightsModule()];
  if (profile.caffeine_enabled) modules.push(renderCaffeineModule());
  if (profile.sweet_drinks_enabled) modules.push(renderSweetDrinksModule());
  if (profile.fitness_enabled) modules.push(renderFitnessModule());
  if (profile.habits_enabled) modules.push(renderHabitsModule());
  if (profile.water_enabled || profile.sleep_enabled || profile.mood_enabled) modules.push(renderWellnessModule());
  if (profile.notes_enabled) modules.push(renderNotesModule());
  if (profile.reminders_enabled) modules.push(renderRemindersModule());

  els.dashboardGrid.innerHTML = modules.length
    ? modules.join("")
    : `<div class="module-card"><h3>Noch keine Module aktiv</h3><p class="empty-state">Öffne Settings und aktiviere deine Tracker.</p></div>`;

  bindDashboardModuleEvents();
  renderDashboardCharts();
}

function renderDateNavigator() {
  const selected = new Date(`${appState.selectedDate}T12:00:00`);
  const isToday = appState.selectedDate === getLocalDateString();
  const label = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(selected);

  return `
    <section class="module-card date-card wide-card" aria-label="Tagesauswahl">
      <div class="date-nav">
        <button class="icon-btn" data-day-shift="-1" type="button" aria-label="Vorheriger Tag">&lt;</button>
        <div>
          <p class="eyebrow">${isToday ? "Heute" : "Archiv"}</p>
          <h3>${escapeHtml(label)}</h3>
        </div>
        <div class="date-actions">
          <button class="icon-btn" data-day-shift="1" type="button" aria-label="Nächster Tag" ${isToday ? "disabled" : ""}>&gt;</button>
          <button class="btn btn-secondary" id="today-button" type="button" ${isToday ? "disabled" : ""}>Heute</button>
        </div>
      </div>
    </section>
  `;
}

function renderStreakModule() {
  const stats = getStreakStats(appState.dashboardData.streakDates);
  const badges = getEarnedBadges(stats);
  const weekItems = stats.lastSevenDays.map((day) => `
    <div class="streak-day ${day.active ? "active" : ""}" title="${escapeAttr(day.label)}">
      <span>${escapeHtml(day.shortLabel)}</span>
    </div>
  `).join("");
  const badgeItems = badges.map((badge) => `
    <span class="badge-chip ${badge.earned ? "earned" : ""}">
      <strong>${escapeHtml(badge.icon)}</strong>${escapeHtml(badge.label)}
    </span>
  `).join("");

  return `
    <section class="module-card streak-card ${stats.todayActive ? "streak-pop" : ""}" aria-label="Streak">
      <div class="module-head">
        <div>
          <p class="eyebrow">Streak</p>
          <h3><span class="metric">${stats.current}</span> Tage</h3>
        </div>
        <span class="streak-badge">${stats.todayActive ? "Heute aktiv" : "Heute offen"}</span>
      </div>
      <p class="empty-state">${escapeHtml(stats.message)}</p>
      <div class="streak-week" aria-label="Letzte 7 Tage">${weekItems}</div>
      <div class="streak-stats">
        <span><strong>${stats.activeDays}</strong> aktive Tage</span>
        <span><strong>${stats.longest}</strong> bester Lauf</span>
      </div>
      <div class="badge-row" aria-label="Erfolge">${badgeItems}</div>
    </section>
  `;
}

function renderInsightsModule() {
  const summary = getTodaySummary();
  return `
    <section class="module-card insight-card wide-card" aria-label="Insights">
      <div class="module-head">
        <div>
          <p class="eyebrow">Insights</p>
          <h3>Energiekurve heute</h3>
        </div>
        <span class="streak-badge">${summary.score}/100 Fokus</span>
      </div>
      <div class="chart-wrap">
        <canvas id="energy-chart" aria-label="Energiekurve" role="img"></canvas>
      </div>
      <div class="insight-strip">
        <span><strong>${summary.caffeine} mg</strong>Koffein</span>
        <span><strong>${summary.water} ml</strong>Wasser</span>
        <span><strong>${summary.doneHabits}</strong>Habits</span>
      </div>
    </section>
  `;
}

function renderCaffeineModule() {
  const logs = appState.dashboardData.caffeineLogs;
  const total = logs.reduce((sum, item) => sum + Number(item.amount_mg || 0), 0);
  const limit = Number(appState.profile.caffeine_limit || 400);
  const percent = Math.min(100, Math.round((total / limit) * 100));
  const status = total < 300 ? "green" : total <= 400 ? "yellow" : "red";
  const statusText = status === "green" ? "Grün" : status === "yellow" ? "Gelb" : "Rot";
  const items = logs.map((log) => `<li class="log-item"><span>${escapeHtml(log.drink_type || "Getränk")}</span><strong>${log.amount_mg} mg</strong></li>`).join("");

  return `
    <section class="module-card" aria-label="Koffein">
      <div class="module-head">
        <div>
          <p class="eyebrow">Koffein</p>
          <h3>${total} mg heute</h3>
        </div>
        <span class="status-${status}">${statusText}</span>
      </div>
      <div class="meter"><div class="meter-fill fill-${status}" style="width:${percent}%"></div></div>
      <p class="empty-state">Tageslimit: ${limit} mg</p>
      <div class="module-actions">
        <button class="pill-button" data-caffeine="Kaffee|80" type="button">Kaffee +80</button>
        <button class="pill-button" data-caffeine="Energy Drink|160" type="button">Energy +160</button>
        <button class="pill-button" data-caffeine="Cola|40" type="button">Cola +40</button>
      </div>
      <div class="row compact-row">
        <input id="custom-caffeine-name-input" type="text" placeholder="Eigenes Getraenk">
        <input id="custom-caffeine-mg-input" type="number" min="1" step="5" placeholder="mg">
        <button id="add-custom-caffeine-button" class="btn btn-secondary" type="button">Loggen</button>
      </div>
      <ul class="log-list">${items || `<li class="empty-state">Heute noch kein Koffein geloggt.</li>`}</ul>
    </section>
  `;
}

function renderSweetDrinksModule() {
  const logs = appState.dashboardData.sweetDrinksLogs;
  const items = logs.map((log) => `<li class="log-item"><span>${escapeHtml(log.type)}</span><span>${formatTime(log.created_at)}</span></li>`).join("");
  return `
    <section class="module-card" aria-label="Süßgetränke">
      <div class="module-head">
        <div>
          <p class="eyebrow">Süßgetränke</p>
          <h3><span class="metric">${logs.length}</span> heute</h3>
        </div>
      </div>
      <div class="module-actions">
        <button class="pill-button" data-sweet-drink="Cola" type="button">Cola</button>
        <button class="pill-button" data-sweet-drink="Fanta" type="button">Fanta</button>
        <button class="pill-button" data-sweet-drink="Energy Sugar" type="button">Energy Sugar</button>
      </div>
      <div class="row">
        <input id="custom-sweet-drink-input" type="text" placeholder="Eigenes Getränk">
        <button id="add-custom-sweet-drink-button" class="btn btn-secondary" type="button">Loggen</button>
      </div>
      <ul class="log-list">${items || `<li class="empty-state">Heute noch keine Süßgetränke.</li>`}</ul>
    </section>
  `;
}

function renderFitnessModule() {
  const logs = appState.dashboardData.fitnessLogs;
  const items = logs.map((log) => `
    <li class="log-item">
      <label class="check-row">
        <input type="checkbox" data-fitness-toggle="${log.id}" ${log.done ? "checked" : ""}>
        <span class="${log.done ? "done" : ""}">${escapeHtml(log.workout_name)}</span>
      </label>
      <span>${formatTime(log.created_at)}</span>
    </li>
  `).join("");

  return `
    <section class="module-card" aria-label="Fitness">
      <div class="module-head">
        <div>
          <p class="eyebrow">Fitness</p>
          <h3>${logs.filter((item) => item.done).length} von ${logs.length} erledigt</h3>
        </div>
      </div>
      <div class="row">
        <input id="workout-name-input" type="text" placeholder="Workout-Name">
        <button id="add-workout-button" class="btn btn-secondary" type="button">Hinzufügen</button>
      </div>
      <ul class="log-list">${items || `<li class="empty-state">Heute noch kein Workout.</li>`}</ul>
    </section>
  `;
}

function renderHabitsModule() {
  const habits = Array.isArray(appState.profile.custom_habits) ? appState.profile.custom_habits : [];
  const logs = appState.dashboardData.habitLogs;
  const items = habits.map((habit) => {
    const log = logs.find((item) => item.habit_name === habit);
    const completed = Boolean(log?.completed);
    return `
      <li class="log-item">
        <label class="check-row">
          <input type="checkbox" data-habit-toggle="${escapeAttr(habit)}" ${completed ? "checked" : ""}>
          <span class="${completed ? "done" : ""}">${escapeHtml(habit)}</span>
        </label>
        <span>${completed ? "Heute done" : "Offen"}</span>
      </li>
    `;
  }).join("");

  return `
    <section class="module-card" aria-label="Habits">
      <div class="module-head">
        <div>
          <p class="eyebrow">Habits</p>
          <h3>${logs.filter((item) => item.completed).length} erledigt</h3>
        </div>
      </div>
      <ul class="log-list">${items || `<li class="empty-state">Noch keine Custom Habits angelegt.</li>`}</ul>
    </section>
  `;
}

function renderWellnessModule() {
  const logs = appState.dashboardData.wellnessLogs;
  const latestSleep = logs.find((log) => log.type === "sleep");
  const waterLogs = logs.filter((log) => log.type === "water");
  const waterTotal = waterLogs
    .reduce((sum, log) => sum + Number(log.value || 0), 0);
  const waterGoal = getWaterGoal();
  const waterPercent = Math.min(100, Math.round((waterTotal / waterGoal) * 100));
  const waterItems = waterLogs.map((log) => `
    <li class="log-item">
      <span>${formatTime(log.created_at)}</span>
      <div class="item-actions">
        <strong>${Number(log.value || 0)} ml</strong>
        <button class="icon-btn remove-btn" data-delete-wellness="${log.id}" type="button" aria-label="Wasser entfernen">x</button>
      </div>
    </li>
  `).join("");
  const latestMood = logs.find((log) => log.type === "mood");

  return `
    <section class="module-card" aria-label="Wellness">
      <div class="module-head">
        <div>
          <p class="eyebrow">Wellness</p>
          <h3>Daily Check-in</h3>
        </div>
      </div>
      ${appState.profile.water_enabled ? `
        <div class="mini-metric"><strong>${waterTotal} ml</strong><span>von ${waterGoal} ml Wasser</span></div>
        <div class="meter"><div class="meter-fill fill-green" style="width:${waterPercent}%"></div></div>
        <div class="module-actions">
          <button class="pill-button" data-wellness="water|250" type="button">+250 ml</button>
          <button class="pill-button" data-wellness="water|500" type="button">+500 ml</button>
        </div>
        <div class="row compact-row">
          <input id="custom-water-ml-input" type="number" min="1" step="50" placeholder="ml">
          <button id="add-custom-water-button" class="btn btn-secondary" type="button">Wasser loggen</button>
        </div>
        <ul class="log-list">${waterItems || `<li class="empty-state">Heute noch kein Wasser.</li>`}</ul>
      ` : ""}
      ${appState.profile.sleep_enabled ? `
        <div class="row compact-row">
          <input id="sleep-hours-input" type="number" min="0" max="24" step="0.5" placeholder="${latestSleep ? `${latestSleep.value} h Schlaf` : "Schlafstunden"}">
          <button id="save-sleep-button" class="btn btn-secondary" type="button">Schlaf</button>
        </div>
      ` : ""}
      ${appState.profile.mood_enabled ? `
        <div class="module-actions mood-actions">
          <button class="pill-button" data-mood="Super" type="button">Super</button>
          <button class="pill-button" data-mood="Okay" type="button">Okay</button>
          <button class="pill-button" data-mood="Low" type="button">Low</button>
        </div>
        <p class="empty-state">Mood heute: ${escapeHtml(latestMood?.note || "noch offen")}</p>
      ` : ""}
    </section>
  `;
}

function renderNotesModule() {
  const notes = appState.dashboardData.notes;
  const items = notes.map((note) => `
    <li class="log-item note-item">
      <div>
        <span>${escapeHtml(note.body)}</span>
        <p class="tiny-text">${formatTime(note.created_at)}</p>
      </div>
      <button class="icon-btn remove-btn" data-delete-note="${note.id}" type="button" aria-label="Notiz entfernen">x</button>
    </li>
  `).join("");

  return `
    <section class="module-card" aria-label="Notizen">
      <div class="module-head">
        <div>
          <p class="eyebrow">Notizen</p>
          <h3>Tagesjournal</h3>
        </div>
      </div>
      <div class="journal-prompts">
        <button class="pill-button" data-journal-prompt="Heute lief gut: " type="button">Gut</button>
        <button class="pill-button" data-journal-prompt="Energie / Mood: " type="button">Energie</button>
        <button class="pill-button" data-journal-prompt="Morgen wichtig: " type="button">Morgen</button>
      </div>
      <textarea id="note-input" rows="5" maxlength="900" placeholder="Was war heute wichtig? Gedanken, Fortschritt, Energie, To-dos..."></textarea>
      <p id="note-counter" class="tiny-text">0 / 900</p>
      <button id="add-note-button" class="btn btn-secondary btn-wide" type="button">Notiz speichern</button>
      <ul class="log-list">${items || `<li class="empty-state">Heute noch keine Notiz.</li>`}</ul>
    </section>
  `;
}

function renderRemindersModule() {
  const reminders = appState.dashboardData.reminders;
  const items = reminders.map((reminder) => `
    <li class="log-item">
      <div>
        <strong>${escapeHtml(reminder.title)}</strong>
        <p class="tiny-text">${escapeHtml(reminder.category || "Reminder")} um ${escapeHtml(reminder.reminder_time)}</p>
      </div>
      <div class="item-actions">
        <label class="switch small-switch" for="reminder-${reminder.id}">
          <input id="reminder-${reminder.id}" type="checkbox" data-reminder-toggle="${reminder.id}" ${reminder.enabled ? "checked" : ""}>
          <span class="slider"></span>
        </label>
        <button class="icon-btn remove-btn" data-delete-reminder="${reminder.id}" type="button" aria-label="Reminder entfernen">x</button>
      </div>
    </li>
  `).join("");

  return `
    <section class="module-card" aria-label="Erinnerungen">
      <div class="module-head">
        <div>
          <p class="eyebrow">Erinnerungen</p>
          <h3>Routinen & Termine</h3>
        </div>
      </div>
      <div class="row compact-row">
        <input id="reminder-title-input" type="text" placeholder="z. B. Lernen, Wasser, Termin">
        <input id="reminder-time-input" type="time">
      </div>
      <div class="row compact-row">
        <input id="reminder-category-input" type="text" placeholder="Kategorie, z. B. Alltag">
        <button id="add-reminder-button" class="btn btn-secondary" type="button">Erinnern</button>
      </div>
      <p class="empty-state">Erinnerungen erscheinen in der App, wenn LifeLoop offen ist.</p>
      <ul class="log-list">${items || `<li class="empty-state">Noch keine Erinnerungen.</li>`}</ul>
    </section>
  `;
}

function bindDashboardModuleEvents() {
  els.dashboardGrid.querySelectorAll("[data-day-shift]").forEach((button) => {
    button.addEventListener("click", () => changeSelectedDate(Number(button.dataset.dayShift)));
  });
  document.getElementById("today-button")?.addEventListener("click", () => {
    appState.selectedDate = getLocalDateString();
    loadDashboard();
  });

  els.dashboardGrid.querySelectorAll("[data-caffeine]").forEach((button) => {
    button.addEventListener("click", () => {
      const [drinkType, amount] = button.dataset.caffeine.split("|");
      addCaffeineLog(drinkType, Number(amount), button);
    });
  });

  const caffeineButton = document.getElementById("add-custom-caffeine-button");
  const caffeineNameInput = document.getElementById("custom-caffeine-name-input");
  const caffeineMgInput = document.getElementById("custom-caffeine-mg-input");
  if (caffeineButton && caffeineNameInput && caffeineMgInput) {
    const saveCustomCaffeine = () => addCaffeineLog(caffeineNameInput.value.trim(), Number(caffeineMgInput.value), caffeineButton);
    caffeineButton.addEventListener("click", saveCustomCaffeine);
    [caffeineNameInput, caffeineMgInput].forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") saveCustomCaffeine();
      });
    });
  }

  els.dashboardGrid.querySelectorAll("[data-sweet-drink]").forEach((button) => {
    button.addEventListener("click", () => addSweetDrinkLog(button.dataset.sweetDrink, button));
  });

  const sweetButton = document.getElementById("add-custom-sweet-drink-button");
  const sweetInput = document.getElementById("custom-sweet-drink-input");
  if (sweetButton && sweetInput) {
    sweetButton.addEventListener("click", () => addSweetDrinkLog(sweetInput.value.trim(), sweetButton));
    sweetInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") addSweetDrinkLog(sweetInput.value.trim(), sweetButton);
    });
  }

  const workoutButton = document.getElementById("add-workout-button");
  const workoutInput = document.getElementById("workout-name-input");
  if (workoutButton && workoutInput) {
    workoutButton.addEventListener("click", () => addFitnessLog(workoutInput.value.trim(), workoutButton));
    workoutInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") addFitnessLog(workoutInput.value.trim(), workoutButton);
    });
  }

  els.dashboardGrid.querySelectorAll("[data-fitness-toggle]").forEach((input) => {
    input.addEventListener("change", () => toggleFitnessDone(input.dataset.fitnessToggle, input.checked));
  });

  els.dashboardGrid.querySelectorAll("[data-habit-toggle]").forEach((input) => {
    input.addEventListener("change", () => toggleHabitDone(input.dataset.habitToggle, input.checked));
  });

  els.dashboardGrid.querySelectorAll("[data-wellness]").forEach((button) => {
    button.addEventListener("click", () => {
      const [type, value] = button.dataset.wellness.split("|");
      addWellnessLog(type, Number(value), "", button);
    });
  });

  const waterButton = document.getElementById("add-custom-water-button");
  const waterInput = document.getElementById("custom-water-ml-input");
  if (waterButton && waterInput) {
    waterButton.addEventListener("click", () => addWellnessLog("water", Number(waterInput.value), "ml", waterButton));
    waterInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") addWellnessLog("water", Number(waterInput.value), "ml", waterButton);
    });
  }

  els.dashboardGrid.querySelectorAll("[data-delete-wellness]").forEach((button) => {
    button.addEventListener("click", () => deleteRow("wellness_logs", button.dataset.deleteWellness, button));
  });

  els.dashboardGrid.querySelectorAll("[data-mood]").forEach((button) => {
    button.addEventListener("click", () => addWellnessLog("mood", 0, button.dataset.mood, button));
  });

  const sleepButton = document.getElementById("save-sleep-button");
  const sleepInput = document.getElementById("sleep-hours-input");
  if (sleepButton && sleepInput) {
    sleepButton.addEventListener("click", () => addWellnessLog("sleep", Number(sleepInput.value), "Stunden", sleepButton));
  }

  const noteButton = document.getElementById("add-note-button");
  const noteInput = document.getElementById("note-input");
  const noteCounter = document.getElementById("note-counter");
  if (noteButton && noteInput) {
    noteButton.addEventListener("click", () => addNote(noteInput.value.trim(), noteButton));
    noteInput.addEventListener("input", () => {
      if (noteCounter) noteCounter.textContent = `${noteInput.value.length} / 900`;
    });
    els.dashboardGrid.querySelectorAll("[data-journal-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        noteInput.value = `${noteInput.value}${noteInput.value ? "\n" : ""}${button.dataset.journalPrompt}`;
        noteInput.focus();
        if (noteCounter) noteCounter.textContent = `${noteInput.value.length} / 900`;
      });
    });
  }

  els.dashboardGrid.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", () => deleteRow("notes", button.dataset.deleteNote, button));
  });

  const reminderButton = document.getElementById("add-reminder-button");
  if (reminderButton) {
    reminderButton.addEventListener("click", () => {
      const title = document.getElementById("reminder-title-input").value.trim();
      const time = document.getElementById("reminder-time-input").value;
      const category = document.getElementById("reminder-category-input").value.trim();
      addReminder(title, time, category, reminderButton);
    });
  }

  els.dashboardGrid.querySelectorAll("[data-reminder-toggle]").forEach((input) => {
    input.addEventListener("change", () => toggleReminder(input.dataset.reminderToggle, input.checked));
  });

  els.dashboardGrid.querySelectorAll("[data-delete-reminder]").forEach((button) => {
    button.addEventListener("click", () => deleteRow("reminders", button.dataset.deleteReminder, button));
  });
}

async function addCaffeineLog(drinkType, amountMg, button) {
  if (!drinkType || !Number.isFinite(amountMg) || amountMg <= 0) return showToast("Bitte Getraenk und mg eingeben.", "error");
  await runAction(button, async () => {
    const { error } = await appState.client.from("caffeine_logs").insert({
      user_id: appState.currentUser.id,
      drink_type: drinkType,
      amount_mg: amountMg,
      created_at: getLogTimestampForSelectedDate()
    });
    if (error) throw error;
    await loadDashboard();
  });
}

async function addSweetDrinkLog(type, button) {
  if (!type) return;
  await runAction(button, async () => {
    const { error } = await appState.client.from("sweet_drinks_logs").insert({
      user_id: appState.currentUser.id,
      type,
      created_at: getLogTimestampForSelectedDate()
    });
    if (error) throw error;
    await loadDashboard();
  });
}

async function addFitnessLog(workoutName, button) {
  if (!workoutName) return;
  await runAction(button, async () => {
    const { error } = await appState.client.from("fitness_logs").insert({
      user_id: appState.currentUser.id,
      workout_name: workoutName,
      done: false,
      created_at: getLogTimestampForSelectedDate()
    });
    if (error) throw error;
    await loadDashboard();
  });
}

async function toggleFitnessDone(id, done) {
  try {
    const { error } = await appState.client
      .from("fitness_logs")
      .update({ done })
      .eq("id", id)
      .eq("user_id", appState.currentUser.id);
    if (error) throw error;
    await loadDashboard();
  } catch (error) {
    showToast(readableError(error), "error");
  }
}

async function toggleHabitDone(habitName, completed) {
  try {
    const existing = appState.dashboardData.habitLogs.find((log) => log.habit_name === habitName);
    if (existing) {
      const { error } = await appState.client
        .from("habit_logs")
        .update({ completed })
        .eq("id", existing.id)
        .eq("user_id", appState.currentUser.id);
      if (error) throw error;
    } else if (completed) {
      const { error } = await appState.client.from("habit_logs").insert({
        user_id: appState.currentUser.id,
        habit_name: habitName,
        completed: true,
        log_date: appState.selectedDate
      });
      if (error) throw error;
    }
    await loadDashboard();
  } catch (error) {
    showToast(readableError(error), "error");
  }
}

async function addWellnessLog(type, value, note, button) {
  if (type !== "mood" && (!Number.isFinite(value) || value <= 0)) return showToast("Bitte einen gueltigen Wert eingeben.", "error");
  await runAction(button, async () => {
    const { error } = await appState.client.from("wellness_logs").insert({
      user_id: appState.currentUser.id,
      type,
      value,
      note,
      created_at: getLogTimestampForSelectedDate()
    });
    if (error) throw error;
    await loadDashboard();
  });
}

async function addNote(body, button) {
  if (!body) return showToast("Notiz darf nicht leer sein.", "error");
  await runAction(button, async () => {
    const { error } = await appState.client.from("notes").insert({
      user_id: appState.currentUser.id,
      body,
      created_at: getLogTimestampForSelectedDate()
    });
    if (error) throw error;
    await loadDashboard();
  });
}

async function addReminder(title, reminderTime, category, button) {
  if (!title || !reminderTime) return showToast("Titel und Uhrzeit fuer die Erinnerung eingeben.", "error");
  await runAction(button, async () => {
    const { error } = await appState.client.from("reminders").insert({
      user_id: appState.currentUser.id,
      title,
      reminder_time: reminderTime,
      category: category || "Alltag",
      enabled: true
    });
    if (error) throw error;
    await loadDashboard();
  });
}

async function toggleReminder(id, enabled) {
  try {
    const { error } = await appState.client
      .from("reminders")
      .update({ enabled })
      .eq("id", id)
      .eq("user_id", appState.currentUser.id);
    if (error) throw error;
    await loadDashboard();
  } catch (error) {
    showToast(readableError(error), "error");
  }
}

async function deleteRow(table, id, button) {
  await runAction(button, async () => {
    const { error } = await appState.client
      .from(table)
      .delete()
      .eq("id", id)
      .eq("user_id", appState.currentUser.id);
    if (error) throw error;
    await loadDashboard();
  });
}

function renderSettings() {
  const profile = appState.profile;
  if (!profile) {
    els.settingsContent.innerHTML = `<p class="empty-state">Kein Profil geladen.</p>`;
    return;
  }

  els.settingsContent.innerHTML = `
    <section class="settings-section">
      <h3>Profil</h3>
      <div class="field">
        <label for="settings-name-input">Name</label>
        <input id="settings-name-input" type="text" value="${escapeAttr(profile.name || "")}">
      </div>
      <button id="save-name-button" class="btn btn-secondary" type="button">Name speichern</button>
    </section>

    <section class="settings-section">
      <h3>Module</h3>
      ${renderSettingsToggle("settings-caffeine-enabled", "Koffein", profile.caffeine_enabled)}
      ${renderSettingsToggle("settings-fitness-enabled", "Fitness", profile.fitness_enabled)}
      ${renderSettingsToggle("settings-sweet-enabled", "Süßgetränke", profile.sweet_drinks_enabled)}
      ${renderSettingsToggle("settings-habits-enabled", "Habits", profile.habits_enabled)}
      ${renderSettingsToggle("settings-water-enabled", "Wasser", profile.water_enabled)}
      ${renderSettingsToggle("settings-sleep-enabled", "Schlaf", profile.sleep_enabled)}
      ${renderSettingsToggle("settings-mood-enabled", "Mood", profile.mood_enabled)}
      ${renderSettingsToggle("settings-notes-enabled", "Notizen", profile.notes_enabled)}
      ${renderSettingsToggle("settings-reminders-enabled", "Erinnerungen", profile.reminders_enabled)}
    </section>

    <section class="settings-section">
      <h3>Colorway</h3>
      <div class="colorway-grid">
        ${renderColorwayButton("system", "System", "#d8dde8")}
        ${renderColorwayButton("light", "White", "#ffffff")}
        ${renderColorwayButton("classic", "Classic", "#454694")}
        ${renderColorwayButton("blue", "Blue", "#2f80ff")}
        ${renderColorwayButton("green", "Green", "#22a06b")}
        ${renderColorwayButton("rose", "Rose", "#b94a74")}
        ${renderColorwayButton("mono", "Mono", "#777777")}
      </div>
    </section>

    <section class="settings-section">
      <h3>Koffein-Limit</h3>
      <div class="row">
        <input id="settings-caffeine-limit" type="number" min="1" step="10" value="${Number(profile.caffeine_limit || 400)}">
        <button id="save-caffeine-limit-button" class="btn btn-secondary" type="button">Speichern</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>Wasser-Ziel</h3>
      <div class="row">
        <input id="settings-water-goal" type="number" min="250" step="50" value="${getWaterGoal()}">
        <button id="save-water-goal-button" class="btn btn-secondary" type="button">Speichern</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>Custom Habits</h3>
      <div class="row">
        <input id="settings-habit-input" type="text" placeholder="Neue Gewohnheit">
        <button id="settings-add-habit-button" class="btn btn-secondary" type="button">Hinzufügen</button>
      </div>
      <ul id="settings-habit-list" class="tag-list"></ul>
    </section>

    <section class="settings-section">
      <h3>Konto</h3>
      <button id="reset-data-button" class="btn btn-danger" type="button">Daten zurücksetzen</button>
      <button id="logout-button" class="btn btn-secondary" type="button">Logout</button>
    </section>
  `;

  bindSettingsEvents();
  renderSettingsHabits();
}

function renderSettingsToggle(id, label, checked) {
  return `
    <div class="toggle-row">
      <span>${escapeHtml(label)}</span>
      <label class="switch" for="${id}">
        <input id="${id}" type="checkbox" ${checked ? "checked" : ""}>
        <span class="slider"></span>
      </label>
    </div>
  `;
}

function renderColorwayButton(value, label, color) {
  const active = (appState.profile?.theme_color || "system") === value;
  return `
    <button class="colorway-button ${active ? "active" : ""}" data-colorway="${value}" type="button">
      <span class="color-dot" style="background:${color}"></span>
      <span>${label}</span>
    </button>
  `;
}

function bindSettingsEvents() {
  document.getElementById("save-name-button").addEventListener("click", async (event) => {
    const name = document.getElementById("settings-name-input").value.trim();
    if (!name) return showToast("Name darf nicht leer sein.", "error");
    await updateSettings({ name }, event.currentTarget);
  });

  document.getElementById("save-caffeine-limit-button").addEventListener("click", async (event) => {
    const caffeineLimit = Number(document.getElementById("settings-caffeine-limit").value);
    if (!Number.isFinite(caffeineLimit) || caffeineLimit < 1) return showToast("Bitte ein gültiges Limit eingeben.", "error");
    await updateSettings({ caffeine_limit: caffeineLimit }, event.currentTarget);
  });

  document.getElementById("save-water-goal-button").addEventListener("click", async (event) => {
    const waterGoal = Number(document.getElementById("settings-water-goal").value);
    if (!Number.isFinite(waterGoal) || waterGoal < 250) return showToast("Bitte ein gueltiges Wasserziel eingeben.", "error");
    setWaterGoal(waterGoal);
    await runAction(event.currentTarget, async () => {
      renderSettings();
      await loadDashboard();
      openOverlay("settings");
      showToast("Wasserziel gespeichert.");
    });
  });

  const toggleMap = [
    ["settings-caffeine-enabled", "caffeine_enabled"],
    ["settings-fitness-enabled", "fitness_enabled"],
    ["settings-sweet-enabled", "sweet_drinks_enabled"],
    ["settings-habits-enabled", "habits_enabled"],
    ["settings-water-enabled", "water_enabled"],
    ["settings-sleep-enabled", "sleep_enabled"],
    ["settings-mood-enabled", "mood_enabled"],
    ["settings-notes-enabled", "notes_enabled"],
    ["settings-reminders-enabled", "reminders_enabled"]
  ];

  toggleMap.forEach(([id, key]) => {
    document.getElementById(id).addEventListener("change", async (event) => {
      await updateSettings({ [key]: event.target.checked }, event.target);
    });
  });

  document.getElementById("settings-add-habit-button").addEventListener("click", addSettingsHabit);
  document.getElementById("settings-habit-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") addSettingsHabit();
  });
  document.getElementById("reset-data-button").addEventListener("click", resetUserData);
  document.getElementById("logout-button").addEventListener("click", logout);

  document.querySelectorAll("[data-colorway]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      await updateSettings({ theme_color: button.dataset.colorway }, event.currentTarget);
    });
  });
}

function renderSettingsHabits() {
  const list = document.getElementById("settings-habit-list");
  if (!list) return;
  const habits = Array.isArray(appState.profile.custom_habits) ? appState.profile.custom_habits : [];
  list.innerHTML = habits.map((habit) => `
    <li class="tag">
      <span>${escapeHtml(habit)}</span>
      <button class="icon-btn remove-btn" data-settings-remove-habit="${escapeAttr(habit)}" type="button" aria-label="Habit entfernen">×</button>
    </li>
  `).join("") || `<li class="empty-state">Keine Habits angelegt.</li>`;

  list.querySelectorAll("[data-settings-remove-habit]").forEach((button) => {
    button.addEventListener("click", async () => {
      const nextHabits = getProfileHabits().filter((habit) => habit !== button.dataset.settingsRemoveHabit);
      await updateSettings({ custom_habits: nextHabits }, button);
      renderSettingsHabits();
    });
  });
}

async function addSettingsHabit() {
  const input = document.getElementById("settings-habit-input");
  const value = input.value.trim();
  if (!value) return;
  const habits = getProfileHabits();
  if (!habits.includes(value)) habits.push(value);
  input.value = "";
  await updateSettings({ custom_habits: habits, habits_enabled: true }, document.getElementById("settings-add-habit-button"));
  document.getElementById("settings-habits-enabled").checked = true;
  renderSettingsHabits();
}

async function updateSettings(values, control) {
  await runAction(control, async () => {
    await saveProfile(values);
    renderSettings();
    await loadDashboard();
    openOverlay("settings");
    showToast("Gespeichert.");
  });
}

async function resetUserData() {
  const confirmed = window.confirm("Wirklich alle heutigen und nutzerbezogenen Logs löschen und das Profil zurücksetzen?");
  if (!confirmed) return;

  const button = document.getElementById("reset-data-button");
  await runAction(button, async () => {
    const tables = ["caffeine_logs", "sweet_drinks_logs", "fitness_logs", "habit_logs", "notes", "reminders", "wellness_logs"];
    const results = await Promise.all(tables.map((table) => (
      appState.client.from(table).delete().eq("user_id", appState.currentUser.id)
    )));
    const firstError = results.find((result) => result.error)?.error;
    if (firstError) throw firstError;

    await saveProfile({
      caffeine_enabled: false,
      caffeine_limit: 400,
      fitness_enabled: false,
      sweet_drinks_enabled: false,
      habits_enabled: false,
      water_enabled: false,
      sleep_enabled: false,
      mood_enabled: false,
      notes_enabled: true,
      reminders_enabled: true,
      custom_habits: [],
      theme_color: "system",
      onboarding_completed: false
    });

    closeOverlay("settings");
    appState.onboardingIndex = 0;
    appState.userSetup = createDefaultSetup();
    showScreen("onboarding");
    renderOnboardingStep();
    showToast("Daten zurückgesetzt.");
  });
}

async function logout() {
  try {
    cleanupRealtimeSubscription();
    destroyDashboardCharts();
    const { error } = await appState.client.auth.signOut();
    if (error) throw error;
    appState.currentUser = null;
    appState.profile = null;
    clearReminderTimers();
    appState.dashboardData = { caffeineLogs: [], sweetDrinksLogs: [], fitnessLogs: [], habitLogs: [], notes: [], reminders: [], wellnessLogs: [], streakDates: [] };
    closeOverlay("settings");
    showScreen("start");
  } catch (error) {
    showToast(readableError(error), "error");
  }
}

function getProfileHabits() {
  return Array.isArray(appState.profile?.custom_habits) ? [...appState.profile.custom_habits] : [];
}

function getWaterGoal() {
  const userKey = appState.currentUser?.id || "local";
  const saved = Number(localStorage.getItem(`lifeloop-water-goal-${userKey}`));
  return Number.isFinite(saved) && saved >= 250 ? saved : 2500;
}

function setWaterGoal(value) {
  const userKey = appState.currentUser?.id || "local";
  localStorage.setItem(`lifeloop-water-goal-${userKey}`, String(Math.round(value)));
}

function applyColorway(colorway) {
  const colorMap = {
    system: getSystemColorway(),
    light: { bg: "#f4f7fb", body2: "#e8edf5", surface: "#ffffff", surface2: "#eef3fa", text: "#121722", muted: "rgba(18, 23, 34, 0.68)", line: "rgba(18, 23, 34, 0.13)", accent: "#3157d4", accent2: "#0f9f9a", rgb: "49, 87, 212" },
    white: { bg: "#f4f7fb", body2: "#e8edf5", surface: "#ffffff", surface2: "#eef3fa", text: "#121722", muted: "rgba(18, 23, 34, 0.68)", line: "rgba(18, 23, 34, 0.13)", accent: "#3157d4", accent2: "#0f9f9a", rgb: "49, 87, 212" },
    classic: { bg: "#15171c", body2: "#0f1116", surface: "#20242f", surface2: "#292f3d", text: "#f5f7ff", muted: "rgba(245, 247, 255, 0.74)", line: "rgba(255,255,255,0.16)", accent: "#454694", accent2: "#5678ff", rgb: "69, 70, 148" },
    blue: { bg: "#101820", body2: "#0b1219", surface: "#172432", surface2: "#203449", text: "#f4fbff", muted: "rgba(244, 251, 255, 0.74)", line: "rgba(255,255,255,0.16)", accent: "#2f80ff", accent2: "#70c7ff", rgb: "47, 128, 255" },
    green: { bg: "#111a16", body2: "#0b120f", surface: "#18271f", surface2: "#203529", text: "#f4fff8", muted: "rgba(244, 255, 248, 0.74)", line: "rgba(255,255,255,0.16)", accent: "#22a06b", accent2: "#7ee2a8", rgb: "34, 160, 107" },
    rose: { bg: "#1d1419", body2: "#140d11", surface: "#2b1c24", surface2: "#3a2530", text: "#fff7fa", muted: "rgba(255, 247, 250, 0.74)", line: "rgba(255,255,255,0.16)", accent: "#b94a74", accent2: "#ff8fb3", rgb: "185, 74, 116" },
    mono: { bg: "#151515", body2: "#101010", surface: "#222222", surface2: "#303030", text: "#f6f6f6", muted: "rgba(246, 246, 246, 0.72)", line: "rgba(255,255,255,0.16)", accent: "#777777", accent2: "#bdbdbd", rgb: "119, 119, 119" }
  };
  const selected = colorMap[colorway] || colorMap.classic;
  document.documentElement.style.setProperty("--bg", selected.bg);
  document.documentElement.style.setProperty("--body-2", selected.body2 || selected.bg);
  document.documentElement.style.setProperty("--surface", selected.surface);
  document.documentElement.style.setProperty("--surface-2", selected.surface2);
  document.documentElement.style.setProperty("--surface-3", `rgba(${selected.rgb}, 0.32)`);
  document.documentElement.style.setProperty("--text", selected.text);
  document.documentElement.style.setProperty("--muted", selected.muted);
  document.documentElement.style.setProperty("--line", selected.line || "rgba(255,255,255,0.16)");
  document.documentElement.style.setProperty("--purple", selected.accent);
  document.documentElement.style.setProperty("--blue", selected.accent2);
  document.documentElement.style.setProperty("--accent-rgb", selected.rgb);
  document.documentElement.style.setProperty("--shadow", `0 16px 40px rgba(${selected.rgb}, 0.18)`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", selected.bg);
}

function getSystemColorway() {
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
  if (prefersLight) {
    return {
      bg: "#f4f7fb",
      body2: "#e8edf5",
      surface: "#ffffff",
      surface2: "#eef3fa",
      text: "#121722",
      muted: "rgba(18, 23, 34, 0.68)",
      line: "rgba(18, 23, 34, 0.13)",
      accent: "#3157d4",
      accent2: "#0f9f9a",
      rgb: "49, 87, 212"
    };
  }

  return {
    bg: "#15171c",
    body2: "#0f1116",
    surface: "#20242f",
    surface2: "#292f3d",
    text: "#f5f7ff",
    muted: "rgba(245, 247, 255, 0.74)",
    line: "rgba(255,255,255,0.16)",
    accent: "#454694",
    accent2: "#5678ff",
    rgb: "69, 70, 148"
  };
}

function setupSystemThemeListener() {
  const matcher = window.matchMedia?.("(prefers-color-scheme: light)");
  if (!matcher) return;
  matcher.addEventListener?.("change", () => {
    if ((appState.profile?.theme_color || "system") === "system") applyColorway("system");
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // PWA enhancement only: the app still works if registration is blocked.
    });
  });
}

function setupRealtimeSubscription() {
  if (!appState.client || !appState.currentUser || appState.realtimeChannel) return;
  const tables = ["caffeine_logs", "sweet_drinks_logs", "fitness_logs", "habit_logs", "notes", "wellness_logs", "reminders", "profiles"];
  let channel = appState.client.channel(`lifeloop-${appState.currentUser.id}`);

  tables.forEach((table) => {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: table === "profiles" ? `user_id=eq.${appState.currentUser.id}` : `user_id=eq.${appState.currentUser.id}`
      },
      queueDashboardReload
    );
  });

  appState.realtimeChannel = channel.subscribe();
}

function queueDashboardReload() {
  window.clearTimeout(appState.dashboardReloadTimer);
  appState.dashboardReloadTimer = window.setTimeout(() => {
    if (appState.currentUser) loadDashboard();
  }, 420);
}

function cleanupRealtimeSubscription() {
  window.clearTimeout(appState.dashboardReloadTimer);
  appState.dashboardReloadTimer = null;
  if (!appState.client || !appState.realtimeChannel) return;
  appState.client.removeChannel(appState.realtimeChannel);
  appState.realtimeChannel = null;
}

function scheduleReminderNotifications() {
  clearReminderTimers();
  const reminders = appState.dashboardData.reminders.filter((reminder) => reminder.enabled);
  reminders.forEach((reminder) => {
    const delay = getDelayUntilTime(reminder.reminder_time);
    if (delay === null) return;
    const timerId = window.setTimeout(() => showReminderNotification(reminder), delay);
    appState.reminderTimers.push(timerId);
  });
}

function clearReminderTimers() {
  appState.reminderTimers.forEach((timerId) => window.clearTimeout(timerId));
  appState.reminderTimers = [];
}

function getDelayUntilTime(timeValue) {
  if (!timeValue) return null;
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  const delay = target.getTime() - Date.now();
  return delay > 0 ? delay : null;
}

function showReminderNotification(reminder) {
  showToast(`Erinnerung: ${reminder.title}`);
}

async function runAction(control, action) {
  setLoading(control, true);
  try {
    await action();
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    setLoading(control, false);
  }
}

function setLoading(button, isLoading, loadingText) {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText || "Lädt...";
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function setDashboardMessage(message, isError = false) {
  els.dashboardMessage.textContent = message || "";
  els.dashboardMessage.classList.toggle("hidden", !message);
  els.dashboardMessage.style.color = isError ? "#ff9ba4" : "#aeb6c9";
}

function setTodayLabel() {
  if (!els.todayLabel) return;
  els.todayLabel.textContent = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${appState.selectedDate}T12:00:00`));
}

function getTodayRange() {
  return getDateRange(getLocalDateString());
}

function getSelectedDateRange() {
  return getDateRange(appState.selectedDate);
}

function getDateRange(dateKey) {
  const start = new Date();
  const [year, month, day] = String(dateKey || getLocalDateString()).split("-").map(Number);
  start.setFullYear(year, month - 1, day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function getLogTimestampForSelectedDate() {
  const now = new Date();
  const selected = new Date(`${appState.selectedDate}T12:00:00`);
  selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return selected.toISOString();
}

function changeSelectedDate(dayShift) {
  const next = addDays(new Date(`${appState.selectedDate}T12:00:00`), dayShift);
  const today = new Date(`${getLocalDateString()}T12:00:00`);
  appState.selectedDate = toLocalDateString(next > today ? today : next);
  loadDashboard();
}

function getLocalDateString() {
  const now = new Date();
  return toLocalDateString(now);
}

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeActivityDate(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalDateString(date);
}

function getStreakStats(dates) {
  const activeSet = new Set((dates || []).filter(Boolean));
  const today = new Date();
  const todayKey = toLocalDateString(today);
  const yesterday = addDays(today, -1);
  const startKey = activeSet.has(todayKey) ? todayKey : toLocalDateString(yesterday);
  let current = 0;
  let cursor = new Date(startKey);

  while (activeSet.has(toLocalDateString(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const ordered = [...activeSet].sort();
  let longest = 0;
  let running = 0;
  let previous = null;

  ordered.forEach((dateKey) => {
    if (previous && daysBetween(previous, dateKey) === 1) {
      running += 1;
    } else {
      running = 1;
    }
    longest = Math.max(longest, running);
    previous = dateKey;
  });

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const dateKey = toLocalDateString(date);
    return {
      active: activeSet.has(dateKey),
      label: new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" }).format(date),
      shortLabel: new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(date).slice(0, 2)
    };
  });

  return {
    current,
    longest,
    activeDays: activeSet.size,
    todayActive: activeSet.has(todayKey),
    lastSevenDays,
    message: activeSet.has(todayKey)
      ? "Stark, heute zählt schon für deinen Lauf."
      : "Logge heute eine Sache, um deinen Streak weiterzuführen."
  };
}

function getEarnedBadges(stats) {
  const milestones = [
    { days: 1, icon: "★", label: "Start" },
    { days: 3, icon: "♦", label: "3 Tage" },
    { days: 7, icon: "◆", label: "7 Tage konsequent" },
    { days: 14, icon: "✦", label: "14 Tage Fokus" },
    { days: 30, icon: "●", label: "30 Tage Loop" }
  ];

  return milestones.map((badge) => ({
    ...badge,
    earned: stats.longest >= badge.days
  }));
}

function getTodaySummary() {
  const caffeine = appState.dashboardData.caffeineLogs.reduce((sum, item) => sum + Number(item.amount_mg || 0), 0);
  const water = appState.dashboardData.wellnessLogs
    .filter((log) => log.type === "water")
    .reduce((sum, log) => sum + Number(log.value || 0), 0);
  const doneHabits = appState.dashboardData.habitLogs.filter((item) => item.completed).length;
  const doneFitness = appState.dashboardData.fitnessLogs.filter((item) => item.done).length;
  const mood = appState.dashboardData.wellnessLogs.find((log) => log.type === "mood")?.note || "";
  const moodBoost = mood === "Super" ? 14 : mood === "Okay" ? 7 : mood === "Low" ? -8 : 0;
  const caffeineLimit = Number(appState.profile?.caffeine_limit || 400);
  const caffeineBalance = caffeine > caffeineLimit ? -16 : caffeine > 0 ? Math.min(12, Math.round(caffeine / 45)) : 0;
  const waterBoost = Math.min(16, Math.round((water / getWaterGoal()) * 16));
  const score = clamp(50 + waterBoost + doneHabits * 8 + doneFitness * 10 + moodBoost + caffeineBalance, 0, 100);

  return { caffeine, water, doneHabits, doneFitness, mood, score };
}

function getEnergyChartData() {
  const base = getTodaySummary().score;
  const points = [
    { label: "Morgen", value: base - 6 },
    { label: "Mittag", value: base },
    { label: "Nachmittag", value: base - 3 },
    { label: "Abend", value: base - 8 }
  ];

  appState.dashboardData.caffeineLogs.forEach((log) => {
    const index = getDaySegmentIndex(log.created_at);
    points[index].value += Math.min(14, Number(log.amount_mg || 0) / 35);
  });

  appState.dashboardData.wellnessLogs.forEach((log) => {
    const index = getDaySegmentIndex(log.created_at);
    if (log.type === "water") points[index].value += Math.min(8, Number(log.value || 0) / 180);
    if (log.type === "sleep") points[0].value += Number(log.value || 0) >= 7 ? 10 : -6;
    if (log.type === "mood") points[index].value += log.note === "Super" ? 12 : log.note === "Okay" ? 6 : -8;
  });

  appState.dashboardData.fitnessLogs.forEach((log) => {
    if (log.done) points[getDaySegmentIndex(log.created_at)].value += 12;
  });

  const habitBoost = appState.dashboardData.habitLogs.filter((log) => log.completed).length * 6;
  points[3].value += habitBoost;

  return {
    labels: points.map((point) => point.label),
    values: points.map((point) => clamp(Math.round(point.value), 0, 100))
  };
}

function renderDashboardCharts() {
  destroyDashboardCharts();
  const canvas = document.getElementById("energy-chart");
  if (!canvas || !window.Chart) return;

  const chartData = getEnergyChartData();
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--purple").trim() || "#5678ff";
  const textColor = styles.getPropertyValue("--text").trim() || "#f5f7ff";
  const lineColor = styles.getPropertyValue("--line").trim() || "rgba(255,255,255,0.16)";

  appState.charts.energy = new Chart(canvas, {
    type: "line",
    data: {
      labels: chartData.labels,
      datasets: [{
        label: "Energie",
        data: chartData.values,
        borderColor: accent,
        backgroundColor: createChartGradient(canvas, accent),
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.42,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 520, easing: "easeOutQuart" },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: lineColor }, ticks: { color: textColor } },
        y: { min: 0, max: 100, grid: { color: lineColor }, ticks: { color: textColor, stepSize: 25 } }
      }
    }
  });
}

function destroyDashboardCharts() {
  Object.values(appState.charts).forEach((chart) => chart?.destroy?.());
  appState.charts = {};
}

function createChartGradient(canvas, accent) {
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height || 220);
  gradient.addColorStop(0, `${accent}55`);
  gradient.addColorStop(1, `${accent}05`);
  return gradient;
}

function getDaySegmentIndex(value) {
  const hour = new Date(value || Date.now()).getHours();
  if (hour < 11) return 0;
  if (hour < 15) return 1;
  if (hour < 19) return 2;
  return 3;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysBetween(previousDateKey, nextDateKey) {
  const previous = new Date(`${previousDateKey}T00:00:00`);
  const next = new Date(`${nextDateKey}T00:00:00`);
  return Math.round((next - previous) / 86400000);
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function readableError(error) {
  const message = error?.message || String(error || "Unbekannter Fehler");
  if (message.includes("Failed to fetch")) return "Supabase ist nicht erreichbar. Prüfe URL, Key und Netzwerk.";
  if (message.includes("relation") && message.includes("does not exist")) return "Eine Supabase-Tabelle fehlt. Führe das SQL-Schema aus.";
  return message;
}

function isMissingTableError(error) {
  const message = error?.message || "";
  return message.includes("relation") && message.includes("does not exist");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : ""}`;
  toast.textContent = message;
  els.toastArea.appendChild(toast);
  window.setTimeout(() => toast.remove(), 4600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
