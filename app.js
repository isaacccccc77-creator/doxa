(function () {
  "use strict";

  const STORAGE_KEY = "doxa.decks.v1";
  const PROFILE_KEY = "doxa.profile.v1";
  const DISMISS_KEY = "doxa.installDismissed";

  const XP_KNOWN = 8;
  const XP_LEARNING = 2;
  const XP_SESSION_BONUS = 20;
  const XP_STREAK_BONUS = 15;
  const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];

  // Shelves of the cupboard. Order here is the order they're displayed in.
  const BADGE_GROUPS = [
    { id: "start", label: "First Steps", note: "Getting the shelf started" },
    { id: "streak", label: "Consistency", note: "Showing up, day after day" },
    { id: "mastery", label: "Mastery", note: "Cards you genuinely know" },
    { id: "writing", label: "The Writing Desk", note: "Answers in your own words" },
    { id: "curios", label: "Curiosities", note: "Odd hours and happy returns" },
    { id: "sittings", label: "The Reading Room", note: "Time spent properly sat down" },
  ];

  // Every badge is the same shape: a number you're working towards and a
  // way to read that number off your progress. That gives locked badges a
  // real progress bar instead of a shrug, which is the whole point — you
  // should always be able to see what's within reach.
  const BADGES = [
    // First Steps
    { id: "first_deck", icon: "📚", label: "First Deck", group: "start", target: 1,
      desc: "Create your very first deck.", value: (c) => c.deckCount },
    { id: "first_session", icon: "🎬", label: "Opening Night", group: "start", target: 1,
      desc: "Finish a study session from start to end.", value: (c) => c.stats.sessions },
    { id: "cards_written_10", ladder: "cards_written", icon: "✍️", label: "Card Writer", group: "start", target: 10,
      desc: "Write 10 cards of your own.", value: (c) => c.cardCount },
    { id: "cards_written_50", ladder: "cards_written", icon: "🗃️", label: "Deck Builder", group: "start", target: 50,
      desc: "Write 50 cards of your own.", value: (c) => c.cardCount },

    // Consistency
    { id: "streak_3", ladder: "streak", icon: "🌱", label: "Sprout", group: "streak", target: 3,
      desc: "Study three days in a row.", value: (c) => c.bestStreak },
    { id: "streak_7", ladder: "streak", icon: "🔥", label: "Kindling", group: "streak", target: 7,
      desc: "Keep a streak going for a full week.", value: (c) => c.bestStreak },
    { id: "streak_14", ladder: "streak", icon: "⭐", label: "Fortnight", group: "streak", target: 14,
      desc: "Fourteen days without missing one.", value: (c) => c.bestStreak },
    { id: "streak_30", ladder: "streak", icon: "🏔️", label: "Summit", group: "streak", target: 30,
      desc: "A thirty-day streak. Properly hard.", value: (c) => c.bestStreak },
    { id: "study_days_25", icon: "📅", label: "Regular", group: "streak", target: 25,
      desc: "Study on 25 different days — streak or not.", value: (c) => c.stats.studyDays },

    // Mastery
    { id: "cards_10", ladder: "mastered", icon: "🎯", label: "Ten Down", group: "mastery", target: 10,
      desc: "Get 10 cards to Known.", value: (c) => c.mastered },
    { id: "cards_50", ladder: "mastered", icon: "🧠", label: "Fifty Strong", group: "mastery", target: 50,
      desc: "Get 50 cards to Known.", value: (c) => c.mastered },
    { id: "cards_150", ladder: "mastered", icon: "👑", label: "Scholar", group: "mastery", target: 150,
      desc: "Get 150 cards to Known.", value: (c) => c.mastered },
    { id: "perfect_1", ladder: "perfect", icon: "✨", label: "Clean Sweep", group: "mastery", target: 1,
      desc: "Finish a session without missing a single card.", value: (c) => c.stats.perfectSessions },
    { id: "perfect_10", ladder: "perfect", icon: "💎", label: "Flawless Ten", group: "mastery", target: 10,
      desc: "Ten clean sweeps.", value: (c) => c.stats.perfectSessions },
    { id: "level_5", ladder: "level", icon: "🎖️", label: "Level Five", group: "mastery", target: 5,
      desc: "Reach level 5.", value: (c) => c.level },
    { id: "level_10", ladder: "level", icon: "🏆", label: "Level Ten", group: "mastery", target: 10,
      desc: "Reach level 10.", value: (c) => c.level },
    { id: "paper_1", ladder: "papers", icon: "📄", label: "Sat a Paper", group: "mastery", target: 1,
      desc: "Sit a mock paper from start to marked finish.", value: (c) => c.stats.papers || 0 },
    { id: "paper_5", ladder: "papers", icon: "🗞", label: "Five Papers", group: "mastery", target: 5,
      desc: "Sit five mock papers.", value: (c) => c.stats.papers || 0 },
    { id: "paper_80", icon: "🎓", label: "Eighty Percent", group: "mastery", target: 80,
      desc: "Score 80% or more on a mock paper.", value: (c) => c.stats.bestPaper || 0 },

    // The Writing Desk
    { id: "essay_1", ladder: "essays", icon: "📝", label: "First Draft", group: "writing", target: 1,
      desc: "Write your first full essay answer.", value: (c) => c.stats.essaysWritten },
    { id: "essayist", ladder: "essays", icon: "🖋️", label: "Essayist", group: "writing", target: 5,
      desc: "Write five essay answers.", value: (c) => c.stats.essaysWritten },
    { id: "essay_25", ladder: "essays", icon: "📜", label: "Prolific", group: "writing", target: 25,
      desc: "Write twenty-five essay answers.", value: (c) => c.stats.essaysWritten },
    { id: "words_1000", ladder: "words", icon: "🪶", label: "A Thousand Words", group: "writing", target: 1000,
      desc: "Write 1,000 words across your essays.", value: (c) => c.stats.essayWords },
    { id: "words_10000", ladder: "words", icon: "📖", label: "Ten Thousand", group: "writing", target: 10000,
      desc: "Write 10,000 words across your essays.", value: (c) => c.stats.essayWords },
    { id: "long_form", icon: "🧵", label: "Long Form", group: "writing", target: 300,
      desc: "Write a single answer of 300 words or more.", value: (c) => c.stats.longestEssay },

    // Curiosities
    { id: "early_bird", icon: "🌅", label: "Early Bird", group: "curios", target: 1,
      desc: "Finish a session before 7am.", value: (c) => c.stats.earlyBird },
    { id: "night_owl", icon: "🦉", label: "Night Owl", group: "curios", target: 1,
      desc: "Finish a session after 11pm.", value: (c) => c.stats.nightOwl },
    { id: "weekend_5", icon: "🛋️", label: "Weekend Scholar", group: "curios", target: 5,
      desc: "Study on five weekend days.", value: (c) => c.stats.weekendSessions },
    { id: "comeback", icon: "🌤️", label: "Comeback", group: "curios", target: 1,
      desc: "Come back after a break of three days or more.", value: (c) => c.stats.comebacks },
    { id: "collector", icon: "🗂️", label: "Collector", group: "curios", target: 5,
      desc: "Keep five decks on the go at once.", value: (c) => c.deckCount },

    // The Reading Room
    { id: "sitting_1", ladder: "sittings", icon: "🕯", label: "Sat Down", group: "sittings", target: 1,
      desc: "Finish your first sitting.", value: (c) => c.stats.sittings },
    { id: "sitting_10", ladder: "sittings", icon: "🕰", label: "Regular Sitter", group: "sittings", target: 10,
      desc: "Finish ten sittings.", value: (c) => c.stats.sittings },
    { id: "sitting_long", icon: "🌙", label: "Long Haul", group: "sittings", target: 50,
      desc: "Finish a single sitting of 50 cards.", value: (c) => c.stats.longestSitting },
    { id: "sitting_cards", icon: "📿", label: "Thousand Cards", group: "sittings", target: 1000,
      desc: "Review 1,000 cards inside sittings.", value: (c) => c.stats.sittingCards },
    { id: "sampler", icon: "🎧", label: "Sampler", group: "sittings", target: 4,
      desc: "Finish a sitting in each of the four soundscapes.",
      value: (c) => SOUNDSCAPES.filter((sc) => sc.id !== "silence" &&
        (c.stats.scapeCounts || {})[sc.id] > 0).length },
  ];

  const AVATAR_OPTIONS = [
    { emoji: "🦊", bg: "gold" },
    { emoji: "🦉", bg: "teal" },
    { emoji: "🐢", bg: "sage" },
    { emoji: "🦁", bg: "coral" },
    { emoji: "🐼", bg: "violet" },
    { emoji: "🐝", bg: "gold" },
    { emoji: "🐬", bg: "teal" },
    { emoji: "🦋", bg: "violet" },
    { emoji: "🐙", bg: "coral" },
    { emoji: "🐨", bg: "sage" },
  ];

  const GREETINGS = [
    { main: (n) => `Hello, ${n}!`, sub: "What shall we do today?" },
    { main: (n, t) => `Good ${t}, ${n}!`, sub: "Let's make today count." },
    { main: (n) => `Hey ${n}!`, sub: "Ready to learn something new?" },
    { main: (n) => `Welcome back, ${n}!`, sub: "Your flashcards are waiting." },
    { main: (n) => `Great to see you, ${n}!`, sub: "Let's get studying." },
  ];

  // ---------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.from(document.querySelectorAll(sel)); }
  function vibrate(ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 7) return days + "d ago";
    return new Date(ts).toLocaleDateString();
  }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  // Safety net for the hardware/gesture back button on mobile: without
  // this, pressing back while mid-quiz exits the installed app instead of
  // stepping back in it. We push a single history entry the first time the
  // user leaves the home screen; consuming it (via back) always returns to
  // home rather than trying to model every screen's exact "back" target.
  let navGuardActive = false;
  function showScreen(id) {
    $all(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    $all(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === id));
    window.scrollTo(0, 0);
    if (id === "screen-home") {
      navGuardActive = false;
    } else if (!navGuardActive) {
      navGuardActive = true;
      try { history.pushState({ doxaGuard: true }, ""); } catch (e) {}
    }
  }
  window.addEventListener("popstate", () => {
    navGuardActive = false;
    endSitting(false);
    stopPaperClock();
    const active = $(".screen.active");
    if (active && active.id !== "screen-home") {
      renderHome();
      showScreen("screen-home");
    }
  });

  function shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------------------------------------------------------------
  // Profile (XP, level, streak, badges, reminder)
  // ---------------------------------------------------------------
  function loadProfile() {
    let p;
    try { p = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch (e) { p = null; }
    if (!p) p = {};
    p.xp = p.xp || 0;
    p.streak = p.streak || { count: 0, best: 0, lastStudyDate: null };
    p.badges = p.badges || {};
    p.reminder = p.reminder || { enabled: false, lastNotifiedDate: null };
    p.flags = p.flags || {};
    p.stats = p.stats || {};
    const st = p.stats;
    st.sessions = st.sessions || 0;
    st.perfectSessions = st.perfectSessions || 0;
    st.cardsGraded = st.cardsGraded || 0;
    // Older profiles kept the essay counter on flags; carry it over once.
    st.essaysWritten = st.essaysWritten || (p.flags.essaysWritten || 0);
    st.essayWords = st.essayWords || 0;
    st.longestEssay = st.longestEssay || 0;
    st.studyDays = st.studyDays || 0;
    st.earlyBird = st.earlyBird || 0;
    st.nightOwl = st.nightOwl || 0;
    st.weekendSessions = st.weekendSessions || 0;
    st.weekendDate = st.weekendDate || null;
    st.comebacks = st.comebacks || 0;
    st.reviewedToday = st.reviewedToday || 0;
    st.reviewedDate = st.reviewedDate || null;
    st.sittings = st.sittings || 0;
    st.sittingCards = st.sittingCards || 0;
    st.longestSitting = st.longestSitting || 0;
    st.scapeCounts = st.scapeCounts || {};
    st.papers = st.papers || 0;
    st.bestPaper = st.bestPaper || 0;
    // Badges you've earned but not yet seen in the Cupboard. They get the
    // reveal, and put a pip on the tab until you go and look.
    p.badgeSeen = p.badgeSeen || {};
    p.name = p.name || "";
    p.avatarEmoji = p.avatarEmoji || AVATAR_OPTIONS[0].emoji;
    p.avatarBg = p.avatarBg || AVATAR_OPTIONS[0].bg;
    p.avatarPhoto = p.avatarPhoto || "";
    p.exams = Array.isArray(p.exams) ? p.exams : [];
    p.theme = p.theme || "parchment";
    p.paperSize = p.paperSize || 10;
    p.scape = p.scape || "rain";
    p.sittingTarget = p.sittingTarget || 25;
    p.sfx = p.sfx !== false;
    return p;
  }
  function saveProfile(p) {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
    catch (e) { toast("Couldn't save — your browser's storage may be full or private."); }
  }
  let profile = loadProfile();

  // ---------------------------------------------------------------
  // Login / profile setup: name + avatar, shown once before the first
  // visit to home, reopenable later by tapping the avatar bubble. No
  // real accounts — everything stays local, this is just personalization.
  // ---------------------------------------------------------------
  const AVATAR_BG_CLASSES = AVATAR_OPTIONS.map((o) => "avatar-bg-" + o.bg)
    .filter((c, i, arr) => arr.indexOf(c) === i);
  let draftAvatarEmoji = AVATAR_OPTIONS[0].emoji;
  let draftAvatarBg = AVATAR_OPTIONS[0].bg;
  let draftAvatarPhoto = "";

  function setBubbleAvatar(el, emoji, bg, photo) {
    AVATAR_BG_CLASSES.forEach((c) => el.classList.remove(c));
    if (photo) {
      el.innerHTML = `<img src="${photo}" alt="" />`;
    } else {
      el.classList.add("avatar-bg-" + bg);
      el.textContent = emoji;
    }
  }

  function renderAvatarGrid() {
    const grid = $("#avatar-grid");
    grid.innerHTML = "";
    AVATAR_OPTIONS.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "avatar-option avatar-bg-" + opt.bg;
      const selected = !draftAvatarPhoto && opt.emoji === draftAvatarEmoji && opt.bg === draftAvatarBg;
      if (selected) btn.classList.add("selected");
      btn.textContent = opt.emoji;
      btn.setAttribute("aria-label", "Choose avatar " + opt.emoji);
      btn.addEventListener("click", () => {
        draftAvatarEmoji = opt.emoji;
        draftAvatarBg = opt.bg;
        draftAvatarPhoto = "";
        renderAvatarGrid();
      });
      grid.appendChild(btn);
    });
  }

  function showAvatarPhotoPreview(photo) {
    if (photo) {
      $("#avatar-preview-img").src = photo;
      $("#avatar-preview-wrap").classList.remove("hidden");
      $("#avatar-grid").classList.add("hidden");
    } else {
      $("#avatar-preview-wrap").classList.add("hidden");
      $("#avatar-grid").classList.remove("hidden");
    }
  }

  function openProfileScreen(isOnboarding) {
    draftAvatarEmoji = profile.avatarEmoji;
    draftAvatarBg = profile.avatarBg;
    draftAvatarPhoto = profile.avatarPhoto;
    $("#profile-name-input").value = profile.name || "";
    $("#login-title").textContent = isOnboarding ? "Welcome to Doxa" : "Edit your profile";
    $("#login-back-btn").classList.toggle("hidden", isOnboarding);
    showAvatarPhotoPreview(draftAvatarPhoto);
    renderAvatarGrid();
    showScreen("screen-login");
  }

  $("#profile-avatar-btn").addEventListener("click", () => openProfileScreen(false));

  $("#avatar-upload-btn").addEventListener("click", () => $("#avatar-upload-input").click());

  $("#avatar-upload-input").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Downscale to a small square so a full-resolution photo doesn't
        // blow up localStorage — this only ever needs to fill a tiny circle.
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        draftAvatarPhoto = canvas.toDataURL("image/jpeg", 0.85);
        showAvatarPhotoPreview(draftAvatarPhoto);
      };
      img.onerror = () => toast("Couldn't read that image.");
      img.src = reader.result;
    };
    reader.onerror = () => toast("Couldn't read that image.");
    reader.readAsDataURL(file);
  });

  $("#avatar-remove-photo-btn").addEventListener("click", () => {
    draftAvatarPhoto = "";
    showAvatarPhotoPreview("");
    renderAvatarGrid();
  });

  $("#profile-save-btn").addEventListener("click", () => {
    const name = $("#profile-name-input").value.trim();
    if (!name) {
      toast("Tell us your name first.");
      return;
    }
    profile.name = name.slice(0, 24);
    profile.avatarPhoto = draftAvatarPhoto;
    if (!draftAvatarPhoto) {
      profile.avatarEmoji = draftAvatarEmoji;
      profile.avatarBg = draftAvatarBg;
    }
    saveProfile(profile);
    renderHome();
    showScreen("screen-home");
  });

  function renderProfileHeader() {
    setBubbleAvatar($("#profile-avatar-btn"), profile.avatarEmoji, profile.avatarBg, profile.avatarPhoto);
    const name = profile.name || "there";
    const hour = new Date().getHours();
    const timeWord = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    const dayIndex = Math.floor(Date.now() / 86400000);
    const g = GREETINGS[(dayIndex + name.length) % GREETINGS.length];
    $("#greeting-text").textContent = g.main(name, timeWord);
    $("#greeting-sub").textContent = g.sub;
  }

  function levelInfo(xp) {
    let level = 1, needed = 100, total = 0;
    while (xp >= total + needed) {
      total += needed;
      level++;
      needed = Math.round(needed * 1.35);
    }
    return { level, into: xp - total, needed, total };
  }

  function addXp(amount) {
    const before = levelInfo(profile.xp).level;
    profile.xp += amount;
    const after = levelInfo(profile.xp);
    saveProfile(profile);
    renderHeaderChips();
    return { amount, leveledUp: after.level > before, newLevel: after.level };
  }

  function renderHeaderChips() {
    $("#streak-count").textContent = profile.streak.count || 0;
    const li = levelInfo(profile.xp);
    $("#level-num").textContent = li.level;
    $("#xp-fill").style.width = Math.round((li.into / li.needed) * 100) + "%";
    $("#xp-label").innerHTML = `${li.into}<small>/ ${li.needed}</small>`;
  }

  function touchStreak() {
    const today = todayStr();
    if (profile.streak.lastStudyDate === today) return;
    const gap = profile.streak.lastStudyDate
      ? daysBetween(profile.streak.lastStudyDate, today)
      : null;
    profile.stats.studyDays++;
    if (gap !== null && gap >= 3) profile.stats.comebacks++;
    let newCount;
    if (gap === 1) {
      newCount = (profile.streak.count || 0) + 1;
    } else {
      newCount = 1;
    }
    profile.streak.count = newCount;
    profile.streak.best = Math.max(profile.streak.best || 0, newCount);
    profile.streak.lastStudyDate = today;
    saveProfile(profile);
    renderHeaderChips();
    addXp(XP_STREAK_BONUS);
    let milestoneHit = false;
    if (newCount > 1) {
      toast(`${newCount}-day streak`);
      if (STREAK_MILESTONES.includes(newCount)) {
        milestoneHit = true;
        burstConfetti();
        vibrate([15, 40, 15, 40, 15]);
      }
    }
    celebrateBadges(checkBadges(), milestoneHit);
  }

  // Called once per finished session — the odd-hours badges and the
  // clean-sweep counters all key off this.
  function recordSession(perfect) {
    const st = profile.stats;
    const now = new Date();
    st.sessions++;
    if (perfect) st.perfectSessions++;
    const hour = now.getHours();
    if (hour < 7) st.earlyBird++;
    if (hour >= 23) st.nightOwl++;
    const day = now.getDay();
    const today = todayStr();
    // Weekend study is counted per day, not per session, so five sessions
    // on one Sunday is still one weekend.
    if ((day === 0 || day === 6) && st.weekendDate !== today) {
      st.weekendDate = today;
      st.weekendSessions++;
    }
    saveProfile(profile);
  }

  function totalKnownAcrossDecks(decks) {
    let count = 0;
    for (const deck of decks) {
      for (const qid in deck.mastery) {
        const m = deck.mastery[qid];
        if (m && m.state === "known") count++;
      }
    }
    return count;
  }

  // Everything a badge might want to measure itself against, gathered once.
  function badgeContext() {
    const decks = loadDecks();
    let cardCount = 0;
    for (const deck of decks) cardCount += deck.questions.length;
    return {
      deckCount: decks.length,
      cardCount,
      mastered: totalKnownAcrossDecks(decks),
      bestStreak: profile.streak.best || 0,
      level: levelInfo(profile.xp).level,
      stats: profile.stats,
    };
  }

  function badgeProgress(badge, ctx) {
    const value = Math.max(0, badge.value(ctx));
    return {
      value,
      target: badge.target,
      pct: Math.min(100, Math.round((value / badge.target) * 100)),
      done: value >= badge.target,
    };
  }

  function checkBadges() {
    const ctx = badgeContext();
    const newly = [];
    for (const b of BADGES) {
      if (!profile.badges[b.id] && badgeProgress(b, ctx).done) {
        profile.badges[b.id] = Date.now();
        newly.push(b);
      }
    }
    if (newly.length) saveProfile(profile);
    return newly;
  }

  // Badges won outside a study session have no results screen to land on,
  // so they announce themselves.
  function celebrateBadges(newly, skipConfetti) {
    if (!newly.length) return;
    const b = newly[0];
    toast(newly.length === 1
      ? `${b.icon}  Badge earned — ${b.label}`
      : `${b.icon}  ${newly.length} badges earned`);
    // Streak milestones fire their own burst; don't stack a second one.
    if (!skipConfetti) { burstConfetti(40); vibrate([15, 40, 15]); }
  }

  // Locked badges you're closest to finishing, nearest first. Where badges
  // form a ladder only the next rung is offered — being told to reach level
  // ten while level five is still locked isn't a nudge, it's noise.
  function nextUpBadges(ctx, limit) {
    const seenLadders = {};
    return BADGES
      .filter((b) => !profile.badges[b.id])
      .filter((b) => {
        if (!b.ladder) return true;
        if (seenLadders[b.ladder]) return false;
        seenLadders[b.ladder] = true;
        return true;
      })
      .map((b) => ({ badge: b, prog: badgeProgress(b, ctx) }))
      .sort((a, b) => b.prog.pct - a.prog.pct || a.prog.target - b.prog.target)
      .slice(0, limit)
      .map((x) => x.badge);
  }

  // ---------------------------------------------------------------
  // THE CUPBOARD: every badge on a shelf, earned ones lit up and locked
  // ones sitting there in outline so you can see what's still to come.
  // ---------------------------------------------------------------
  const reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function unseenBadgeIds() {
    return BADGES
      .filter((b) => profile.badges[b.id] && !profile.badgeSeen[b.id])
      .map((b) => b.id);
  }

  function updateCupboardPip() {
    const any = unseenBadgeIds().length > 0;
    $all(".tab-pip").forEach((pip) => pip.classList.toggle("hidden", !any));
  }

  // Numbers that tick up to their value, the way a scoreboard does.
  function countUp(el, target) {
    const value = Number(target) || 0;
    if (reduceMotion.matches || value <= 0) { el.textContent = formatNumber(value); return; }
    const duration = 620;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatNumber(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function playOnce(el, className) {
    el.classList.remove(className);
    // Force a reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
    el.classList.add(className);
  }

  function trophyEl(badge, ctx, earned) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "trophy trophy-" + badge.group + (earned ? " earned" : " locked");
    el.setAttribute("aria-label", badge.label + (earned ? " — earned" : " — locked"));
    el.innerHTML = `
      <span class="trophy-disc"><span class="trophy-icon">${badge.icon}</span></span>
      <span class="trophy-name">${escapeHtml(badge.label)}</span>
    `;
    el.addEventListener("click", () => {
      if (!reduceMotion.matches) {
        playOnce(el, earned ? "shine" : "nudge");
        vibrate(earned ? 10 : [8, 30, 8]);
      }
      openBadgeSheet(badge, ctx);
    });
    return el;
  }

  function formatNumber(n) {
    return n.toLocaleString();
  }

  function openBadgeSheet(badge, ctx) {
    const prog = badgeProgress(badge, ctx);
    const earnedAt = profile.badges[badge.id];
    const group = BADGE_GROUPS.find((g) => g.id === badge.group);

    $("#badge-sheet-disc").className = "trophy-disc sheet-disc trophy-" + badge.group + (earnedAt ? " earned" : " locked");
    $("#badge-sheet-disc").innerHTML = `<span class="trophy-icon">${badge.icon}</span>`;
    $("#badge-sheet-shelf").textContent = group ? group.label : "";
    $("#badge-sheet-name").textContent = badge.label;
    $("#badge-sheet-desc").textContent = badge.desc;

    const status = $("#badge-sheet-status");
    const bar = $("#badge-sheet-bar");
    const fill = $("#badge-sheet-fill");
    if (earnedAt) {
      status.textContent = "Earned " + new Date(earnedAt).toLocaleDateString(undefined, {
        day: "numeric", month: "long", year: "numeric",
      });
      status.classList.add("earned");
      bar.classList.add("hidden");
    } else {
      status.textContent = `${formatNumber(prog.value)} of ${formatNumber(prog.target)}`;
      status.classList.remove("earned");
      bar.classList.remove("hidden");
      fill.style.width = prog.pct + "%";
    }

    $("#badge-sheet-wrap").classList.remove("hidden");
    // Let the browser paint the hidden state first so the slide-up runs.
    requestAnimationFrame(() => $("#badge-sheet-wrap").classList.add("open"));
  }

  function closeBadgeSheet() {
    const wrap = $("#badge-sheet-wrap");
    wrap.classList.remove("open");
    setTimeout(() => wrap.classList.add("hidden"), 220);
  }

  function renderCupboard() {
    const ctx = badgeContext();
    const earnedCount = BADGES.filter((b) => profile.badges[b.id]).length;
    const st = profile.stats;

    $("#cupboard-owner").textContent = profile.name
      ? `${profile.name}'s cupboard`
      : "Your cupboard";
    $("#cupboard-count").textContent = `${earnedCount} of ${BADGES.length} badges on the shelf`;
    setBubbleAvatar($("#cupboard-avatar"), profile.avatarEmoji, profile.avatarBg, profile.avatarPhoto);

    // The ring draws itself up to your completion each time you arrive.
    const ring = $("#cupboard-ring");
    const circumference = 2 * Math.PI * 52;
    ring.style.strokeDasharray = circumference;
    const target = circumference * (1 - earnedCount / BADGES.length);
    if (reduceMotion.matches) {
      ring.style.transition = "none";
      ring.style.strokeDashoffset = target;
    } else {
      ring.style.transition = "none";
      ring.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        ring.style.transition = "stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)";
        ring.style.strokeDashoffset = target;
      });
    }
    $("#ring-total").textContent = BADGES.length;
    countUp($("#ring-earned"), earnedCount);

    const tiles = [
      { label: "Cards mastered", raw: ctx.mastered, tone: "teal" },
      { label: "Essays written", raw: st.essaysWritten, tone: "coral" },
      { label: "Words written", raw: st.essayWords, tone: "violet" },
      { label: "Best streak", raw: ctx.bestStreak, unit: ctx.bestStreak === 1 ? "day" : "days", tone: "gold" },
      { label: "Days studied", raw: st.studyDays, tone: "sage" },
      { label: "Clean sweeps", raw: st.perfectSessions, tone: "teal" },
    ];
    $("#cupboard-stats").innerHTML = tiles.map((t) => `
      <div class="bento-tile bento-tile-${t.tone} stat-tile">
        <div class="ledger-label">${t.label}</div>
        <div class="ledger-value"><span class="tick" data-to="${t.raw}">0</span>${t.unit ? `<small>${t.unit}</small>` : ""}</div>
      </div>
    `).join("");

    $all("#cupboard-stats .tick").forEach((el) => countUp(el, el.dataset.to));

    // Nearly there — the three closest locked badges, with progress.
    const near = nextUpBadges(ctx, 3);
    const nearWrap = $("#cupboard-next-wrap");
    const nearList = $("#cupboard-next");
    nearList.innerHTML = "";
    if (near.length === 0) {
      nearWrap.classList.add("hidden");
    } else {
      nearWrap.classList.remove("hidden");
      near.forEach((b) => {
        const prog = badgeProgress(b, ctx);
        const row = document.createElement("button");
        row.type = "button";
        row.className = "next-row";
        row.innerHTML = `
          <span class="trophy-disc next-disc trophy-${b.group} locked"><span class="trophy-icon">${b.icon}</span></span>
          <span class="next-body">
            <span class="next-title">${escapeHtml(b.label)}</span>
            <span class="next-desc">${escapeHtml(b.desc)}</span>
            <span class="next-track"><span class="next-fill" style="width:${prog.pct}%"></span></span>
          </span>
          <span class="next-count">${formatNumber(prog.value)}/${formatNumber(prog.target)}</span>
        `;
        row.addEventListener("click", () => openBadgeSheet(b, ctx));
        nearList.appendChild(row);
      });
    }

    // Badges won since you last looked. They get the reveal, once.
    const fresh = unseenBadgeIds();

    // The cupboard itself: one shelf per group.
    const shelves = $("#cupboard-shelves");
    shelves.innerHTML = "";
    BADGE_GROUPS.forEach((group) => {
      const groupBadges = BADGES.filter((b) => b.group === group.id);
      const earnedHere = groupBadges.filter((b) => profile.badges[b.id]).length;

      const shelf = document.createElement("div");
      shelf.className = "shelf";
      shelf.innerHTML = `
        <div class="shelf-head">
          <div class="shelf-plate">${escapeHtml(group.label)}</div>
          <div class="shelf-tally">${earnedHere}/${groupBadges.length}</div>
        </div>
        <div class="shelf-note">${escapeHtml(group.note)}</div>
        <div class="shelf-items"></div>
        <div class="shelf-board"></div>
      `;
      const items = shelf.querySelector(".shelf-items");
      groupBadges.forEach((b, i) => {
        const t = trophyEl(b, ctx, !!profile.badges[b.id]);
        t.style.setProperty("--stagger", (i * 55) + "ms");
        if (fresh.indexOf(b.id) !== -1) {
          t.classList.add("just-earned");
          t.insertAdjacentHTML("beforeend", '<span class="trophy-new">NEW</span>');
        }
        items.appendChild(t);
      });
      shelves.appendChild(shelf);
    });

    revealShelvesOnScroll();
    if (fresh.length) celebrateNewBadges(fresh);
    updateCupboardPip();
  }

  // Each shelf's trophies drop into place as that shelf scrolls into view,
  // rather than the whole cupboard animating at once behind the fold.
  function revealShelvesOnScroll() {
    const rows = $all("#cupboard-shelves .shelf-items");
    if (reduceMotion.matches || typeof IntersectionObserver === "undefined") {
      rows.forEach((r) => r.classList.add("in-view"));
      return;
    }
    // Reveal anything that has reached the fold — including shelves a fast
    // scroll jumped clean past, which would otherwise never get a callback
    // and would sit there invisible.
    function sweep() {
      rows.forEach((row) => {
        if (row.classList.contains("in-view")) return;
        if (row.getBoundingClientRect().top < window.innerHeight * 0.9) {
          row.classList.add("in-view");
        }
      });
    }
    const io = new IntersectionObserver(sweep, { threshold: 0.15 });
    rows.forEach((r) => io.observe(r));
    // The cupboard is rendered before the screen is shown, and showing it
    // resets the scroll — so take the first reading after that has happened.
    requestAnimationFrame(sweep);
  }

  // The payoff moment: scroll the first new badge into view, let it pop,
  // then mark them seen so it only ever happens once.
  function celebrateNewBadges(ids) {
    function markSeen() {
      ids.forEach((id) => { profile.badgeSeen[id] = true; });
      saveProfile(profile);
      updateCupboardPip();
    }
    if (reduceMotion.matches) { markSeen(); return; }
    // Let the ring finish drawing, then glide down to what's new — showing
    // the screen resets the scroll, so this can't happen during the render.
    setTimeout(() => {
      const first = $("#cupboard-shelves .just-earned");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      vibrate([12, 40, 12]);
      setTimeout(() => burstConfetti(ids.length > 1 ? 60 : 36), 520);
    }, 780);
    setTimeout(markSeen, 2400);
  }

  // ---------------------------------------------------------------
  // IMAGES: anatomy, histology, radiographs. Pictures are far too big for
  // localStorage (a few would fill the whole 5MB budget), so they live in
  // IndexedDB, which is still entirely on-device and works offline — and
  // works from a file:// page too, so the single-file build keeps them.
  // Cards store only an id; the bytes are fetched when a card is shown.
  // ---------------------------------------------------------------
  const IMAGE_DB = "doxa-media";
  const IMAGE_STORE = "images";
  const MAX_IMAGE_EDGE = 1400;   // enough detail to read a radiograph
  const IMAGE_QUALITY = 0.85;

  const imageStore = (function () {
    let dbPromise = null;
    let supported = typeof indexedDB !== "undefined";

    function open() {
      if (!supported) return Promise.reject(new Error("no-indexeddb"));
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open(IMAGE_DB, 1); }
        catch (e) { supported = false; reject(e); return; }
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(IMAGE_STORE)) {
            req.result.createObjectStore(IMAGE_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => { supported = false; reject(req.error); };
      });
      return dbPromise;
    }

    function tx(mode, fn) {
      return open().then((db) => new Promise((resolve, reject) => {
        const t = db.transaction(IMAGE_STORE, mode);
        const req = fn(t.objectStore(IMAGE_STORE));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }));
    }

    return {
      // Probed once at startup so the UI can hide what it can't deliver
      // rather than offering a button that silently does nothing.
      probe() {
        return open().then(() => true).catch(() => false);
      },
      put(id, blob) { return tx("readwrite", (st) => st.put(blob, id)); },
      get(id) { return tx("readonly", (st) => st.get(id)); },
      del(id) { return tx("readwrite", (st) => st.delete(id)); },
    };
  })();

  let imagesSupported = false;
  const objectUrlCache = new Map();

  function imageUrl(id) {
    if (!id) return Promise.resolve("");
    if (objectUrlCache.has(id)) return Promise.resolve(objectUrlCache.get(id));
    return imageStore.get(id).then((blob) => {
      if (!blob) return "";
      const url = URL.createObjectURL(blob);
      objectUrlCache.set(id, url);
      return url;
    }).catch(() => "");
  }

  function forgetImageUrl(id) {
    const url = objectUrlCache.get(id);
    if (url) { try { URL.revokeObjectURL(url); } catch (e) {} objectUrlCache.delete(id); }
  }

  function deleteImage(id) {
    if (!id) return;
    forgetImageUrl(id);
    imageStore.del(id).catch(() => {});
  }

  // Show (or hide) an <img> for a card image, without blocking the render.
  function paintCardImage(imgEl, id) {
    if (!id) { imgEl.classList.add("hidden"); imgEl.removeAttribute("src"); return; }
    imgEl.dataset.imageId = id;
    imageUrl(id).then((url) => {
      // A fast tapper can move on before the blob resolves; only paint if
      // this element is still meant to be showing this image.
      if (imgEl.dataset.imageId !== id) return;
      if (!url) { imgEl.classList.add("hidden"); return; }
      imgEl.src = url;
      imgEl.classList.remove("hidden");
    });
  }

  // Shrink to something sensible before storing. A phone photo is 4MB of
  // JPEG the screen can't show anyway.
  function prepareImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) { reject(new Error("not-an-image")); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read-failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("decode-failed"));
        img.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("encode-failed")),
            "image/jpeg",
            IMAGE_QUALITY
          );
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function storeImageFile(file) {
    return prepareImageFile(file).then((blob) => {
      const id = "img" + Date.now() + Math.random().toString(36).slice(2, 8);
      return imageStore.put(id, blob).then(() => id);
    });
  }

  // ---------------------------------------------------------------
  // Full-screen image viewer — a thumbnail is no use for a radiograph.
  // ---------------------------------------------------------------
  function openLightbox(id) {
    imageUrl(id).then((url) => {
      if (!url) return;
      $("#lightbox-img").src = url;
      $("#lightbox").classList.remove("hidden");
    });
  }
  function closeLightbox() {
    $("#lightbox").classList.add("hidden");
    $("#lightbox-img").removeAttribute("src");
  }

  // Any card image can be tapped to fill the screen.
  function makeZoomable(imgEl) {
    imgEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (imgEl.dataset.imageId) openLightbox(imgEl.dataset.imageId);
    });
  }

  // ---------------------------------------------------------------
  // Storage: decks + spaced-repetition mastery
  // ---------------------------------------------------------------
  function migrateDeckMastery(deck) {
    if (!deck.mastery) deck.mastery = {};
    if (!deck.essays) deck.essays = {};
    for (const qid in deck.mastery) {
      const m = deck.mastery[qid];
      if (typeof m === "string") {
        deck.mastery[qid] = m === "known"
          ? { state: "known", reps: 1, interval: 1, dueAt: Date.now() + 86400000 }
          : { state: "learning", reps: 0, interval: 0, dueAt: Date.now() };
      } else if (m && typeof m.lapses !== "number") {
        m.lapses = 0;
      }
    }
    return deck;
  }
  function loadDecks() {
    let decks;
    try { decks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { decks = []; }
    decks.forEach(migrateDeckMastery);
    return decks;
  }
  function saveDecks(decks) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(decks)); }
    catch (e) { toast("Couldn't save — your browser's storage may be full or private."); }
  }
  function upsertDeck(deck) {
    const decks = loadDecks();
    const idx = decks.findIndex((d) => d.id === deck.id);
    if (idx >= 0) decks[idx] = deck; else decks.unshift(deck);
    saveDecks(decks);
  }
  function deleteDeck(id) {
    const deck = loadDecks().find((d) => d.id === id);
    if (deck) {
      deck.questions.forEach((q) => { deleteImage(q.imgFront); deleteImage(q.imgBack); });
    }
    saveDecks(loadDecks().filter((d) => d.id !== id));
  }

  function getMastery(deck, qid) {
    const m = deck.mastery[qid];
    if (!m) return null;
    if (typeof m === "string") return { state: m, reps: m === "known" ? 1 : 0, interval: m === "known" ? 1 : 0, dueAt: 0 };
    return m;
  }
  function isDue(deck, qid) {
    const m = getMastery(deck, qid);
    if (!m) return true;
    return (m.dueAt || 0) <= Date.now();
  }
  function dueCount(deck) { return deck.questions.filter((q) => isDue(deck, q.id)).length; }

  // ---------------------------------------------------------------
  // AMBIENCE: soundscapes synthesised on the fly with Web Audio.
  // Deliberately no audio files — a few minutes of rain as an mp3 is
  // several megabytes, and this app has to survive as one offline HTML
  // file. Filtered noise and a handful of scheduled pops get you a long
  // way, and they never loop audibly because nothing is a loop.
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // THEMES: five palettes, plus one that follows the clock. Auto isn't a
  // gimmick — a screen that stays bright at midnight is the reason people
  // stop revising in bed, and one that dims on its own doesn't need
  // remembering.
  // ---------------------------------------------------------------
  const THEMES = [
    { id: "parchment", label: "Parchment", note: "Warm paper and ink",
      swatch: ["#fffaf0", "#e5a848", "#b07f2c"], bar: "#f6efe1" },
    { id: "blossom", label: "Blossom", note: "Soft rose, italic",
      swatch: ["#fff8f8", "#e9949f", "#c4707d"], bar: "#fbeef0" },
    { id: "forest", label: "Forest", note: "Deep green, clean type",
      swatch: ["#f9fbf6", "#5da777", "#3d7f56"], bar: "#edf2ea" },
    { id: "dark", label: "Dark", note: "Amber on espresso",
      swatch: ["#221c16", "#f5c26d", "#dfa54a"], bar: "#17130f" },
    { id: "midnight", label: "Midnight", note: "Periwinkle, airy",
      swatch: ["#151a28", "#b6c3fa", "#93a8f5"], bar: "#0c101b" },
  ];

  // What the clock maps to. Dawn is pink, the working day is paper, the
  // afternoon cools off, the evening warms down, the small hours go dim.
  const THEME_CLOCK = [
    { until: 5, id: "midnight" },
    { until: 8, id: "blossom" },
    { until: 16, id: "parchment" },
    { until: 19, id: "forest" },
    { until: 22, id: "dark" },
    { until: 24, id: "midnight" },
  ];

  function themeForHour(hour) {
    for (const slot of THEME_CLOCK) if (hour < slot.until) return slot.id;
    return "parchment";
  }

  function themeById(id) {
    return THEMES.find((t) => t.id === id) || THEMES[0];
  }

  function resolvedTheme() {
    return profile.theme === "auto" ? themeForHour(new Date().getHours()) : profile.theme;
  }

  function applyTheme() {
    const id = resolvedTheme();
    document.documentElement.setAttribute("data-theme", id);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeById(id).bar);
  }

  // Auto has to keep up with the clock without being asked. Checking on
  // return to the app covers the case that matters: you left in daylight
  // and came back at midnight.
  function watchAutoTheme() {
    setInterval(() => { if (profile.theme === "auto") applyTheme(); }, 60000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && profile.theme === "auto") applyTheme();
    });
  }

  function renderThemeGrid() {
    const grid = $("#theme-grid");
    grid.innerHTML = "";
    const auto = profile.theme === "auto";
    const live = resolvedTheme();

    $("#theme-note").textContent = auto
      ? `Following the clock — right now that's ${themeById(live).label.toLowerCase()}.`
      : "Pick one, or let it follow the time of day.";

    const autoBtn = document.createElement("button");
    autoBtn.type = "button";
    autoBtn.className = "theme-btn theme-auto" + (auto ? " active" : "");
    autoBtn.dataset.theme = "auto";
    autoBtn.innerHTML = `
      <span class="theme-swatch theme-swatch-auto">
        <i style="background:#fdf1f3"></i><i style="background:#faf3e6"></i>
        <i style="background:#eff4ea"></i><i style="background:#191512"></i>
        <i style="background:#0f121e"></i>
      </span>
      <span class="theme-label">Follow the clock</span>
      <span class="theme-note">Changes as the day does</span>
    `;
    autoBtn.addEventListener("click", () => setTheme("auto"));
    grid.appendChild(autoBtn);

    THEMES.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-btn" + (!auto && profile.theme === t.id ? " active" : "");
      // Also what the theme blocks in the stylesheet key off, so the card
      // paints itself in the palette it is offering.
      btn.dataset.theme = t.id;
      btn.innerHTML = `
        <span class="theme-swatch">${t.swatch.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
        <span class="theme-label">${escapeHtml(t.label)}</span>
        <span class="theme-note">${escapeHtml(t.note)}</span>
      `;
      btn.addEventListener("click", () => setTheme(t.id));
      grid.appendChild(btn);
    });
  }

  function setTheme(id) {
    profile.theme = id;
    saveProfile(profile);
    applyTheme();
    renderThemeGrid();
    vibrate(8);
  }

  const SOUNDSCAPES = [
    { id: "silence", label: "Silence", icon: "🔕", note: "Just you and the cards" },
    { id: "rain", label: "Rain", icon: "🌧", note: "Steady, against the window" },
    { id: "fire", label: "Fireplace", icon: "🔥", note: "Low crackle, slow burn" },
    { id: "cafe", label: "Café", icon: "☕", note: "Warm hum, far-off cups" },
    { id: "train", label: "Night train", icon: "🚂", note: "Rumble and rails" },
  ];

  // D5 · F#5 · A5 · D6 — a major arpeggio landing on the octave, which is
  // the shape of nearly every "well done" sound you've ever heard. Quick
  // enough to be over before it's annoying, with the last note left to ring.
  const FANFARE = [
    { f: 587.33, t: 0.000, level: 0.16, decay: 0.85, ratio: 2.0, index: 2.8, pan: -0.35 },
    { f: 739.99, t: 0.075, level: 0.16, decay: 0.85, ratio: 2.0, index: 2.6, pan: -0.14 },
    { f: 880.00, t: 0.150, level: 0.17, decay: 0.95, ratio: 2.0, index: 2.4, pan: 0.14 },
    { f: 1174.66, t: 0.230, level: 0.20, decay: 1.90, ratio: 2.0, index: 2.2, pan: 0.00 },
    // The fifth under the landing note, quiet, so it arrives as a chord.
    { f: 880.00, t: 0.240, level: 0.09, decay: 1.70, ratio: 2.0, index: 1.8, pan: -0.22 },
  ];

  const Ambience = (function () {
    let ctx = null;
    let master = null;
    let analyser = null;
    let voices = [];
    let timers = [];
    let scape = "silence";
    let muted = false;
    let sfx = true;
    let fx = null;
    let lastFanfare = 0;
    const LEVEL = 0.42;

    function supported() {
      return typeof window !== "undefined" &&
        !!(window.AudioContext || window.webkitAudioContext);
    }

    function ensureCtx() {
      if (!supported()) return null;
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { return null; }
        master = ctx.createGain();
        master.gain.value = 0;

        // Tame the top end before anything reaches the ears: a shelf cut
        // above 3.5k and a gentle roll-off, so no scape can turn shrill.
        const shelf = ctx.createBiquadFilter();
        shelf.type = "highshelf";
        shelf.frequency.value = 4000;
        shelf.gain.value = -9;

        const roll = ctx.createBiquadFilter();
        roll.type = "lowpass";
        roll.frequency.value = 8500;
        roll.Q.value = 0.5;

        // Holds the level steady so a crackle can't jump out at you.
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -26;
        comp.knee.value = 26;
        comp.ratio.value = 4;
        comp.attack.value = 0.015;
        comp.release.value = 0.35;

        master.connect(shelf);
        shelf.connect(roll);
        roll.connect(comp);
        comp.connect(ctx.destination);

        // Permanently in line, so it always has real audio to report on.
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        comp.connect(analyser);
      }
      // Browsers start the context suspended until a real gesture; every
      // entry point here is behind a tap, so this resumes cleanly.
      if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }

    // ---- Celebration voice -------------------------------------------
    // Two-operator FM: a sine carrier whose frequency is wobbled by another
    // sine. With the modulation falling away fast you get the metallic
    // strike of a struck bar settling into a clean tone — a celesta, near
    // enough. Cheap, and it has none of the graininess of a short sample.
    function bell(dest, at, freq, level, decay, ratio, index, pan) {
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modDepth = ctx.createGain();
      const amp = ctx.createGain();

      carrier.type = "sine";
      mod.type = "sine";
      carrier.frequency.value = freq;
      mod.frequency.value = freq * ratio;

      // The strike: a lot of modulation for a few milliseconds, then almost
      // none. This is the whole difference between a bell and a beep.
      modDepth.gain.setValueAtTime(freq * index, at);
      modDepth.gain.exponentialRampToValueAtTime(freq * index * 0.02, at + decay * 0.35);
      mod.connect(modDepth);
      modDepth.connect(carrier.frequency);

      amp.gain.setValueAtTime(0.0001, at);
      amp.gain.exponentialRampToValueAtTime(level, at + 0.008);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + decay);

      carrier.connect(amp);
      let tail = amp;
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan || 0;
        amp.connect(p);
        tail = p;
      }
      tail.connect(dest);

      mod.start(at); carrier.start(at);
      mod.stop(at + decay + 0.05); carrier.stop(at + decay + 0.05);
    }

    // An impulse response built from decaying noise. Running it through a
    // one-pole lowpass as it's written darkens the tail, which is what
    // stops a synthetic reverb sounding like fizz.
    function impulse(seconds, falloff, damp) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buf = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const n = (Math.random() * 2 - 1) * Math.pow(1 - t, falloff);
          lp += (n - lp) * damp;
          d[i] = lp;
        }
      }
      return buf;
    }

    // The celebration runs on its own bus. The soundscape master is shelved
    // and rolled off hard to keep rain from hissing; a chime pushed through
    // that would come out muffled.
    function ensureFx() {
      if (fx) return fx;
      const input = ctx.createGain();
      input.gain.value = 1;

      const dry = ctx.createGain();
      dry.gain.value = 0.85;
      const wet = ctx.createGain();
      wet.gain.value = 0.3;
      const room = ctx.createConvolver();
      room.buffer = impulse(1.9, 3.0, 0.32);

      // Sweet, never sharp — the same rule the soundscapes follow.
      const tame = ctx.createBiquadFilter();
      tame.type = "highshelf";
      tame.frequency.value = 6500;
      tame.gain.value = -4;

      const out = ctx.createDynamicsCompressor();
      out.threshold.value = -15;
      out.knee.value = 20;
      out.ratio.value = 5;
      out.attack.value = 0.004;
      out.release.value = 0.25;

      input.connect(dry);
      input.connect(room);
      room.connect(wet);
      dry.connect(tame);
      wet.connect(tame);
      // The compressor holds the peaks down; this puts the level back so
      // the chime carries over a phone speaker without ever clipping.
      const makeup = ctx.createGain();
      makeup.gain.value = 2.3;

      tame.connect(out);
      out.connect(makeup);
      makeup.connect(ctx.destination);
      if (analyser) makeup.connect(analyser);

      fx = input;
      return fx;
    }

    // A rising D major arpeggio landing on the octave, a quiet body note
    // under it, and a few grains of glitter over the tail.
    function scheduleFanfare(bus, t0) {
      FANFARE.forEach((n) => {
        bell(bus, t0 + n.t, n.f, n.level, n.decay, n.ratio, n.index, n.pan);
      });

      // Two octaves below the landing note, so it has a body and doesn't
      // read as a thin beep through a phone speaker.
      const body = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      body.type = "sine";
      body.frequency.value = 146.83;
      const bt = t0 + 0.2;
      bodyGain.gain.setValueAtTime(0.0001, bt);
      bodyGain.gain.exponentialRampToValueAtTime(0.055, bt + 0.05);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, bt + 1.3);
      body.connect(bodyGain); bodyGain.connect(bus);
      body.start(bt); body.stop(bt + 1.4);

      // Glitter: three very quiet, very short strikes two octaves up,
      // scattered in time and pan. It's the difference between a sound
      // that was made and one that was generated.
      for (let i = 0; i < 3; i++) {
        const at = t0 + 0.26 + i * 0.055 + Math.random() * 0.03;
        bell(bus, at, 2349.32 * (1 + (Math.random() - 0.5) * 0.03),
             0.022, 0.5, 3.4, 1.6, (Math.random() - 0.5) * 1.2);
      }
    }

    function noiseBuffer(seconds, kind) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      if (kind === "brown") {
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        }
      } else if (kind === "pink") {
        // Pink noise falls 3dB per octave, which is roughly how natural
        // sound is distributed. White noise has equal energy per hertz, so
        // most of it lands in the top octaves — that's the hiss.
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      } else {
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      return buf;
    }

    function bed(kind, seconds) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(seconds || 4, kind);
      src.loop = true;
      src.start();
      voices.push(src);
      return src;
    }

    function filter(type, freq, q) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q) f.Q.value = q;
      return f;
    }

    function gain(value) {
      const g = ctx.createGain();
      g.gain.value = value;
      return g;
    }

    // A slow oscillator riding a gain, so the bed breathes instead of
    // sitting at one dead level.
    function breathe(target, rate, depth) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const amt = gain(depth);
      lfo.connect(amt);
      amt.connect(target);
      lfo.start();
      voices.push(lfo);
    }

    function every(minMs, maxMs, fn) {
      const wait = minMs + Math.random() * (maxMs - minMs);
      const mine = scape;
      timers.push(setTimeout(function again() {
        if (scape !== mine) return;
        fn();
        const next = minMs + Math.random() * (maxMs - minMs);
        timers.push(setTimeout(again, next));
      }, wait));
    }

    // A soft burst, shaped rather than clicked into existence. A fast
    // attack is what makes a crackle spiky, so attack is a parameter.
    function soften(o) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(Math.max(0.12, o.decay + 0.1), o.source || "pink");
      const band = filter(o.type || "bandpass", o.freq, o.q || 1.2);
      const tame = filter("lowpass", o.ceiling || 1600, 0.7);
      const g = ctx.createGain();
      const now = ctx.currentTime;
      const attack = o.attack || 0.02;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(Math.max(0.0002, o.volume), now + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, now + attack + o.decay);
      src.connect(band); band.connect(tame); tame.connect(g); g.connect(master);
      src.start(now);
      src.stop(now + attack + o.decay + 0.08);
    }

    const BUILD = {
      // Rain is mostly low-mid: water on glass, not static. Pink noise
      // rolled off hard at 1.6k, with a brown bed underneath for the body
      // you feel rather than hear.
      rain() {
        const bedNoise = bed("pink", 9);
        const shape = filter("lowpass", 2600, 0.6);
        const g = gain(0.6);
        bedNoise.connect(shape); shape.connect(g); g.connect(master);
        breathe(g.gain, 0.06, 0.1);
        // The filter drifts, so the rain rises and eases like real weather.
        breathe(shape.frequency, 0.035, 500);

        // The patter itself — a narrow band well below where hiss lives.
        const patter = bed("pink", 9);
        const patterBp = filter("bandpass", 1900, 0.65);
        const pg = gain(0.2);
        patter.connect(patterBp); patterBp.connect(pg); pg.connect(master);
        breathe(pg.gain, 0.13, 0.07);

        const body = bed("brown", 9);
        const bodyLp = filter("lowpass", 300, 0.7);
        const bg = gain(0.55);
        body.connect(bodyLp); bodyLp.connect(bg); bg.connect(master);
        breathe(bg.gain, 0.022, 0.12);

        // Occasional heavier drops on the sill.
        every(700, 2600, () => soften({
          freq: 240 + Math.random() * 300, q: 0.9, ceiling: 900,
          attack: 0.012, decay: 0.1 + Math.random() * 0.1,
          volume: 0.02 + Math.random() * 0.02, source: "brown",
        }));
      },

      // A fire is mostly warm roar; the crackles should sit inside it, not
      // on top. Low, broad, slow to arrive and slow to leave.
      fire() {
        const roar = bed("brown", 9);
        const roarLp = filter("lowpass", 280, 0.6);
        const g = gain(1.0);
        roar.connect(roarLp); roarLp.connect(g); g.connect(master);
        breathe(g.gain, 0.09, 0.14);

        const warmth = bed("pink", 9);
        const warmLp = filter("lowpass", 700, 0.5);
        const wg = gain(0.22);
        warmth.connect(warmLp); warmLp.connect(wg); wg.connect(master);
        breathe(wg.gain, 0.05, 0.08);

        // Settling embers: quiet, low, rounded.
        every(260, 1100, () => soften({
          freq: 190 + Math.random() * 520, q: 1.1, ceiling: 1100,
          attack: 0.018 + Math.random() * 0.02,
          decay: 0.14 + Math.random() * 0.22,
          volume: 0.018 + Math.random() * 0.026,
          source: "brown",
        }));
        // And now and then something shifts in the grate.
        every(5000, 14000, () => soften({
          freq: 130 + Math.random() * 160, q: 0.8, ceiling: 600,
          attack: 0.03, decay: 0.45, volume: 0.05, source: "brown",
        }));
      },

      cafe() {
        const room = bed("brown", 9);
        const roomBp = filter("bandpass", 380, 0.55);
        const g = gain(0.8);
        room.connect(roomBp); roomBp.connect(g); g.connect(master);
        breathe(g.gain, 0.07, 0.12);

        const murmur = bed("pink", 9);
        const murmurLp = filter("lowpass", 850, 0.5);
        const mg = gain(0.3);
        murmur.connect(murmurLp); murmurLp.connect(mg); mg.connect(master);
        // Conversation swells and fades across the room.
        breathe(mg.gain, 0.11, 0.18);
        breathe(murmurLp.frequency, 0.06, 180);

        // A cup finding a saucer, three tables away.
        every(4000, 13000, () => soften({
          freq: 900 + Math.random() * 700, q: 5, ceiling: 2200,
          attack: 0.006, decay: 0.16, volume: 0.012 + Math.random() * 0.01,
        }));
      },

      train() {
        const rumble = bed("brown", 9);
        const rumbleLp = filter("lowpass", 110, 0.8);
        const g = gain(1.0);
        rumble.connect(rumbleLp); rumbleLp.connect(g); g.connect(master);
        breathe(g.gain, 0.04, 0.08);

        const carriage = bed("brown", 9);
        const carriageBp = filter("bandpass", 220, 0.5);
        const cg = gain(0.4);
        carriage.connect(carriageBp); carriageBp.connect(cg); cg.connect(master);

        // Air moving down the carriage — pink and low, never a hiss.
        const air = bed("pink", 9);
        const airLp = filter("lowpass", 700, 0.6);
        const ag = gain(0.1);
        air.connect(airLp); airLp.connect(ag); ag.connect(master);
        breathe(ag.gain, 0.03, 0.04);

        // Rail joints, in pairs, at line speed.
        every(1600, 2200, () => {
          soften({ freq: 85, q: 0.9, ceiling: 260, type: "lowpass",
                   attack: 0.014, decay: 0.16, volume: 0.09, source: "brown" });
          timers.push(setTimeout(() => {
            if (scape === "train") {
              soften({ freq: 85, q: 0.9, ceiling: 260, type: "lowpass",
                       attack: 0.014, decay: 0.16, volume: 0.075, source: "brown" });
            }
          }, 185));
        });
      },
    };

    function teardown() {
      timers.forEach(clearTimeout);
      timers = [];
      voices.forEach((v) => { try { v.stop(); } catch (e) {} try { v.disconnect(); } catch (e) {} });
      voices = [];
    }

    function fadeTo(value, seconds) {
      if (!master) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(value, now + seconds);
    }

    return {
      supported,
      current() { return scape; },
      isMuted() { return muted; },

      play(id) {
        const known = SOUNDSCAPES.some((s) => s.id === id);
        const next = known ? id : "silence";
        if (next === scape && next !== "silence") return;
        if (!ensureCtx()) { scape = next; return; }
        teardown();
        scape = next;
        if (next === "silence") { fadeTo(0, 0.3); return; }
        BUILD[next]();
        fadeTo(muted ? 0 : LEVEL, 1.4);
      },

      stop() {
        if (!ctx) { scape = "silence"; return; }
        fadeTo(0, 0.5);
        const dying = voices.slice();
        const dyingTimers = timers.slice();
        scape = "silence";
        voices = [];
        timers = [];
        dyingTimers.forEach(clearTimeout);
        setTimeout(() => {
          dying.forEach((v) => { try { v.stop(); } catch (e) {} try { v.disconnect(); } catch (e) {} });
        }, 600);
      },

      setMuted(value) {
        muted = !!value;
        if (!ctx) return;
        fadeTo(muted || scape === "silence" ? 0 : LEVEL, 0.25);
      },

      setSfx(value) { sfx = value !== false; },
      sfxOn() { return sfx; },

      // A small two-note arrival, so finishing sounds like finishing.
      chime() {
        if (!sfx || muted || !ensureCtx()) return;
        const bus = ensureFx();
        [659.25, 987.77].forEach((freq, i) => {
          bell(bus, ctx.currentTime + i * 0.14, freq, 0.13, 1.0, 2.0, 2.6, i ? 0.12 : -0.12);
        });
      },

      // The sound that lands with the confetti. Synthesised rather than
      // sampled: no file to ship, nothing to load, and it works offline
      // and from file:// like the rest of the app.
      fanfare() {
        if (!sfx || muted || !ensureCtx()) return;
        // One event often fires two bursts (a badge on top of a finished
        // session). Let the first one speak.
        const now = Date.now();
        if (now - lastFanfare < 900) return;
        lastFanfare = now;

        scheduleFanfare(ensureFx(), ctx.currentTime + 0.02);

        // Step out of the way of whatever is playing, then come back.
        if (master && scape !== "silence") {
          const at = ctx.currentTime;
          master.gain.cancelScheduledValues(at);
          master.gain.setValueAtTime(master.gain.value, at);
          master.gain.linearRampToValueAtTime(LEVEL * 0.4, at + 0.12);
          master.gain.linearRampToValueAtTime(LEVEL, at + 1.9);
        }
      },

      // Renders the flourish into an offline context. Sound is the one part
      // of this app with nothing to look at, so this is how its shape gets
      // checked — and it runs the same scheduler as the live path, which a
      // second copy of the synthesis would not.
      renderFanfare(seconds) {
        const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OC) return null;
        const live = { ctx, fx, master, analyser };
        try {
          ctx = new OC(2, Math.ceil(44100 * (seconds || 3)), 44100);
        } catch (e) { return null; }
        fx = null; master = null; analyser = null;
        let rendering = null;
        try {
          scheduleFanfare(ensureFx(), 0.02);
          rendering = ctx.startRendering();
        } catch (e) { rendering = null; }
        ctx = live.ctx; fx = live.fx; master = live.master; analyser = live.analyser;
        return rendering;
      },

      // Band energies off the master bus. Sound is the one thing in this
      // app with no visible output, so this is how it gets verified.
      spectrum() {
        if (!ctx || !analyser) return null;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const nyquist = ctx.sampleRate / 2;
        const bin = (hz) => Math.round((hz / nyquist) * data.length);
        const band = (lo, hi) => {
          let sum = 0, n = 0;
          for (let i = bin(lo); i < Math.min(bin(hi), data.length); i++) { sum += data[i]; n++; }
          return n ? Math.round(sum / n) : 0;
        };
        return { low: band(20, 250), mid: band(250, 2000), high: band(2000, 9000) };
      },

      // Readable state, so the behaviour can actually be tested.
      state() {
        return {
          supported: supported(),
          ctxState: ctx ? ctx.state : "none",
          scape,
          muted,
          gain: master ? Math.round(master.gain.value * 100) / 100 : 0,
          voices: voices.length,
          sfx,
        };
      },
    };
  })();

  // The soundscapes are the one part of the app with no visible output to
  // assert on, so the engine is reachable for tests.
  window.__doxaAmbience = Ambience;
  Ambience.setSfx(profile.sfx);

  // ---------------------------------------------------------------
  // TODAY: everything due across every deck, in one place. Smart Review is
  // per-deck, so with five decks a day's revision meant opening five
  // screens — enough friction to end a daily habit. This answers the
  // question you actually open the app with, and, when you're done, the
  // one that brings you back: when is the next lot due?
  // ---------------------------------------------------------------
  // A day's worth is capped. Facing "312 due" is how people quietly stop
  // opening a revision app; a batch you can finish is how they don't.
  const TODAY_BATCH = 40;
  const AHEAD_BATCH = 20;

  function allDueEntries() {
    const out = [];
    loadDecks().forEach((deck) => {
      deck.questions.forEach((q) => {
        if (isDue(deck, q.id)) out.push({ q, deck });
      });
    });
    return out;
  }

  function allEntries() {
    const out = [];
    loadDecks().forEach((deck) => {
      deck.questions.forEach((q) => out.push({ q, deck }));
    });
    return out;
  }

  // The soonest a card that isn't due yet comes back.
  function nextDueAt() {
    let soonest = null;
    loadDecks().forEach((deck) => {
      deck.questions.forEach((q) => {
        const m = getMastery(deck, q.id);
        if (!m || !m.dueAt || m.dueAt <= Date.now()) return;
        if (soonest === null || m.dueAt < soonest) soonest = m.dueAt;
      });
    });
    return soonest;
  }

  function whenDue(ts) {
    const days = Math.ceil((ts - Date.now()) / 86400000);
    if (days <= 0) return "later today";
    if (days === 1) return "tomorrow";
    if (days <= 6) return "on " + new Date(ts).toLocaleDateString(undefined, { weekday: "long" });
    if (days <= 13) return "in a week";
    return "in " + days + " days";
  }

  function reviewedToday() {
    const st = profile.stats;
    return st.reviewedDate === todayStr() ? (st.reviewedToday || 0) : 0;
  }

  function noteReviewed() {
    const st = profile.stats;
    const today = todayStr();
    if (st.reviewedDate !== today) { st.reviewedDate = today; st.reviewedToday = 0; }
    st.reviewedToday++;
  }

  // ---------------------------------------------------------------
  // EXAMS: the question no free flashcard app answers — "will I be ready
  // in time?" Everything here is derived from your own review history;
  // there is no model of you beyond what you've actually done.
  //
  // The model, stated plainly so it can be argued with:
  //   A card counts as solid once it has been recalled correctly
  //   SOLID_REPS times, because that's the point the interval passes a
  //   week and it starts to stick. A card therefore needs
  //   (SOLID_REPS - reps) more successful reviews. At a success rate of
  //   p, that costs (SOLID_REPS - reps) / p attempts. Sum that over the
  //   cards the exam covers, compare against the review slots left
  //   (days x your pace), and spend them on the cards nearest to solid
  //   first — which is the order spaced repetition would pick anyway.
  //
  // Spacing is a second constraint: you cannot make a brand-new card
  // solid in one evening no matter how many times you look at it, so a
  // card also needs enough days for the intervals to play out.
  // ---------------------------------------------------------------
  const SOLID_REPS = 3;
  const READY_TARGET = 0.95;
  const DEFAULT_PACE = 20;
  const DEFAULT_SUCCESS = 0.8;

  // Days the schedule needs to carry a card to solid, from where it is.
  function daysToSolid(reps) {
    const ladder = [0, 1, 3];  // wait before the 1st, 2nd, 3rd review
    let days = 0;
    for (let r = reps; r < SOLID_REPS; r++) days += ladder[Math.min(r, ladder.length - 1)];
    return days;
  }

  // How often you actually get a card right, from your own history.
  function successRate() {
    const graded = profile.stats.cardsGraded || 0;
    if (graded < 20) return DEFAULT_SUCCESS;
    let lapses = 0;
    loadDecks().forEach((deck) => {
      for (const qid in deck.mastery) lapses += (deck.mastery[qid].lapses || 0);
    });
    return Math.min(0.97, Math.max(0.45, 1 - lapses / graded));
  }

  // Cards per day, averaged over the days you've actually studied.
  function dailyPace() {
    const days = profile.stats.studyDays || 0;
    const graded = profile.stats.cardsGraded || 0;
    if (days < 2 || graded < 10) return DEFAULT_PACE;
    return Math.max(5, Math.round(graded / days));
  }

  // Which exams a deck feeds into. The link only ever existed in one
  // direction — you could say what an exam covered, but standing in a deck
  // you had no idea whether it counted toward anything.
  function examsCoveringDeck(deck) {
    return loadExams().filter((exam) => {
      if (daysUntil(exam.date) < 0) return false;
      const wantDecks = exam.deckIds || [];
      const wantTags = exam.tags || [];
      if (wantDecks.length === 0 && wantTags.length === 0) return false;
      if (wantDecks.indexOf(deck.id) !== -1) return true;
      return deck.questions.some((q) => wantTags.some((t) => tagsOf(q).indexOf(t) !== -1));
    });
  }

  // An exam's scope broken into the areas it was defined by, so "how far
  // have I got" has an answer per subject rather than one blended number.
  function examBreakdown(exam) {
    if (!exam) return [];
    const decks = loadDecks();
    const wantDecks = exam.deckIds || [];
    const wantTags = exam.tags || [];
    const areas = [];

    function cardsInDeck(deck) {
      return deck.questions.map((q) => ({ q, deck }));
    }
    function cardsWithTag(tag) {
      const out = [];
      decks.forEach((deck) => deck.questions.forEach((q) => {
        if (tagsOf(q).indexOf(tag) !== -1) out.push({ q, deck });
      }));
      return out;
    }

    if (wantDecks.length === 0 && wantTags.length === 0) {
      return [];
    } else {
      wantDecks.forEach((id) => {
        const deck = decks.find((d) => d.id === id);
        if (deck) areas.push({ label: deck.title, kind: "deck", key: id, cards: cardsInDeck(deck) });
      });
      wantTags.forEach((tag) => {
        const cards = cardsWithTag(tag);
        if (cards.length) areas.push({ label: tag, kind: "tag", key: tag, cards });
      });
    }

    return areas.map((a) => {
      let solid = 0, seen = 0;
      a.cards.forEach(({ q, deck }) => {
        const m = getMastery(deck, q.id);
        const reps = m ? (m.reps || 0) : 0;
        if (reps >= SOLID_REPS) solid++;
        if (reps > 0) seen++;
      });
      return {
        label: a.label, kind: a.kind, key: a.key, cards: a.cards,
        total: a.cards.length, solid, seen, unseen: a.cards.length - seen,
        pct: a.cards.length ? Math.round((solid / a.cards.length) * 100) : 0,
      };
    }).sort((x, y) => x.pct - y.pct || y.total - x.total);
  }

  function examScopeEntries(exam) {
    const wantDecks = exam.deckIds || [];
    const wantTags = exam.tags || [];
    if (wantDecks.length === 0 && wantTags.length === 0) return [];
    const out = [];
    loadDecks().forEach((deck) => {
      const deckMatches = wantDecks.indexOf(deck.id) !== -1;
      deck.questions.forEach((q) => {
        const tagMatches = wantTags.some((t) => tagsOf(q).indexOf(t) !== -1);
        if (deckMatches || tagMatches) out.push({ q, deck });
      });
    });
    return out;
  }

  function daysUntil(dateStr) {
    // Calendar-day difference, so an exam dated today reads 0 and one
    // dated tomorrow reads 1 — not "however many hours are left".
    const target = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  // Given a pace, how much of the scope ends up solid by exam day.
  function projectReadiness(cards, days, pace, p) {
    let solidNow = 0;
    const wanting = [];
    cards.forEach((c) => {
      const reps = Math.min(c.reps, SOLID_REPS);
      if (reps >= SOLID_REPS) { solidNow++; return; }
      wanting.push({
        cost: (SOLID_REPS - reps) / p,
        needsDays: daysToSolid(reps),
      });
    });
    // Cheapest first: the cards closest to solid are the ones a sensible
    // schedule would finish off anyway.
    wanting.sort((a, b) => a.cost - b.cost);

    let budget = Math.max(0, days) * pace;
    let gained = 0;
    for (const w of wanting) {
      if (w.needsDays > days) continue;   // no amount of effort beats the calendar
      if (budget < w.cost) break;
      budget -= w.cost;
      gained++;
    }
    const total = cards.length || 1;
    return {
      solidNow,
      projected: solidNow + gained,
      total: cards.length,
      nowPct: Math.round((solidNow / total) * 100),
      projPct: Math.round(((solidNow + gained) / total) * 100),
    };
  }

  // The pace that would get you to READY_TARGET, if one exists.
  function paceForTarget(cards, days, p) {
    if (days <= 0) return null;
    let lo = 1, hi = 400, answer = null;
    for (let i = 0; i < 12; i++) {
      const mid = Math.ceil((lo + hi) / 2);
      const r = projectReadiness(cards, days, mid, p);
      if (r.projPct >= READY_TARGET * 100) { answer = mid; hi = mid - 1; }
      else { lo = mid + 1; }
      if (lo > hi) break;
    }
    return answer;
  }

  function forecastFor(exam) {
    const entries = examScopeEntries(exam);
    const days = daysUntil(exam.date);
    const p = successRate();
    const pace = dailyPace();
    const cards = entries.map(({ q, deck }) => {
      const m = getMastery(deck, q.id);
      return { reps: m ? m.reps || 0 : 0 };
    });
    const now = projectReadiness(cards, 0, 0, p);
    const proj = projectReadiness(cards, days, pace, p);
    // Worked out even when you're already on track, so the wording can
    // tell "comfortably" apart from "only just".
    const needed = paceForTarget(cards, days, p);
    const unreachable = needed === null && proj.projPct < READY_TARGET * 100;
    return {
      entries, days, pace, p,
      total: cards.length,
      solidNow: now.solidNow,
      nowPct: now.nowPct,
      projPct: proj.projPct,
      neverSeen: cards.filter((c) => c.reps === 0).length,
      needed,
      unreachable,
    };
  }

    // ---------------------------------------------------------------
  // MOCK PAPERS
  //
  // A flashcard shows you the question with the answer one tap away, on
  // your terms, as many times as you like. An exam gives you none of that:
  // cold recall, in a fixed order you didn't choose, against a clock. That
  // gap is why students who feel fluent on cards still underperform, and
  // nothing in the flashcard world rehearses it.
  //
  // So: a paper built from this exam's own cards, timed, with every answer
  // hidden until you've finished, then marked by you. And because the app
  // already predicts your readiness from review history, the score is the
  // first honest check on that prediction it has ever had.
  // ---------------------------------------------------------------
  const PAPER_SIZES = [6, 10, 16];
  const SECONDS_SHORT = 90;
  const SECONDS_ESSAY = 360;

  const paper = {
    exam: null, questions: [], index: 0, endsAt: 0, tick: null,
    marking: 0, marks: [], startedAt: 0,
  };

  function paperSeconds(questions) {
    return questions.reduce((sum, q) =>
      sum + (inferKind(q.q) === "essay" ? SECONDS_ESSAY : SECONDS_SHORT), 0);
  }

  function formatClock(seconds) {
    const s = Math.max(0, Math.round(seconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }

  // Spread the questions across the areas the exam covers rather than
  // taking a flat random sample, so one big deck can't swallow the paper.
  // A paper can be drawn from an exam (across everything it covers) or
  // from a single deck. Requiring an exam first buried the whole feature.
  function paperSourceFromExam(exam) {
    return {
      kind: "exam", id: exam.id, title: exam.title, exam,
      areas: examBreakdown(exam).filter((a) => a.total > 0),
      forecast: forecastFor(exam).projPct,
    };
  }

  function paperSourceFromDeck(deck) {
    return {
      kind: "deck", id: deck.id, title: deck.title, exam: null,
      areas: [{ label: deck.title, kind: "deck", key: deck.id,
                cards: deck.questions.map((q) => ({ q, deck })) }],
      forecast: null,
    };
  }

  function buildPaper(source, size) {
    const areas = (source.areas || []).filter((a) => a.cards.length > 0);
    if (!areas.length) return [];
    const pools = areas.map((a) => { const c = a.cards.slice(); shuffleArr(c); return c; });
    const seen = new Set();
    const out = [];
    let i = 0;
    while (out.length < size && pools.some((pool) => pool.length)) {
      const pool = pools[i % pools.length];
      i++;
      const next = pool.shift();
      if (!next || seen.has(next.q.id)) continue;
      seen.add(next.q.id);
      out.push(next);
    }
    return out;
  }

  function renderPaperSetup() {
    const source = paper.source;
    const scope = source.areas.reduce((n, a) => n + a.cards.length, 0);
    const row = $("#paper-size-row");
    row.innerHTML = "";
    const sizes = PAPER_SIZES.filter((n) => n <= scope);
    if (!sizes.length) sizes.push(scope);

    if (!profile.paperSize || sizes.indexOf(profile.paperSize) === -1) {
      profile.paperSize = sizes[Math.min(1, sizes.length - 1)];
    }

    sizes.forEach((n) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "target-btn" + (n === profile.paperSize ? " active" : "");
      btn.dataset.size = n;
      btn.innerHTML = `<span class="target-num">${n}</span><span class="target-cap">questions</span>`;
      btn.addEventListener("click", () => {
        profile.paperSize = n;
        saveProfile(profile);
        renderPaperSetup();
        vibrate(8);
      });
      row.appendChild(btn);
    });

    // Built once and kept, so the paper you are shown the plan for is the
    // paper you actually sit. Rebuilding on Begin drew a fresh random
    // sample and the promised time no longer matched the clock.
    const draft = buildPaper(source, profile.paperSize);
    paper.draft = draft;
    const essays = draft.filter((e) => inferKind(e.q) === "essay").length;
    const mins = Math.max(1, Math.round(paperSeconds(draft) / 60));
    $("#paper-plan").innerHTML = `
      <div class="plan-row"><span>${draft.length} question${draft.length === 1 ? "" : "s"}</span><span>${essays} long, ${draft.length - essays} short</span></div>
      <div class="plan-row"><span>Time allowed</span><span>${mins} minutes</span></div>
      <div class="plan-row"><span>Drawn from</span><span>${escapeHtml(source.title)}</span></div>
    `;
    $("#paper-begin-label").textContent = `Begin — ${mins} minutes`;
  }

  function openPaperSetup(source) {
    if (!source) return;
    const scope = source.areas.reduce((n, a) => n + a.cards.length, 0);
    if (!scope) { toast("Nothing to draw a paper from yet."); return; }
    paper.source = source;
    paper.exam = source.exam;
    renderPaperSetup();
    showScreen("screen-paper-setup");
  }

  $("#start-paper").addEventListener("click", () => {
    if (!currentDeck) return;
    openPaperSetup(paperSourceFromDeck(currentDeck));
  });

  $("#paper-setup-back").addEventListener("click", () => {
    if (paper.exam) openExam(paper.exam);
    else if (currentDeck) openDeckSummary(currentDeck);
    else { renderHome(); showScreen("screen-home"); }
  });

  $("#paper-begin").addEventListener("click", () => {
    const questions = (paper.draft && paper.draft.length)
      ? paper.draft
      : buildPaper(paper.source, profile.paperSize);
    if (!questions.length) return;
    paper.questions = questions.map((e) => ({ q: e.q, deck: e.deck, answer: "" }));
    paper.index = 0;
    paper.marks = new Array(questions.length).fill(null);
    paper.startedAt = Date.now();
    // Taken now, before any marking moves the cards it is built from.
    paper.projectedBefore = paper.source.forecast;
    paper.endsAt = Date.now() + paperSeconds(questions) * 1000;
    startPaperClock();
    renderPaperQuestion();
    showScreen("screen-paper");
  });

  function startPaperClock() {
    stopPaperClock();
    paper.tick = setInterval(() => {
      const left = (paper.endsAt - Date.now()) / 1000;
      $("#paper-clock").textContent = formatClock(left);
      $("#paper-clock").classList.toggle("urgent", left <= 60);
      if (left <= 0) {
        stopPaperClock();
        toast("Time. Marking now.");
        beginMarking();
      }
    }, 250);
    $("#paper-clock").textContent = formatClock((paper.endsAt - Date.now()) / 1000);
  }

  function stopPaperClock() {
    if (paper.tick) { clearInterval(paper.tick); paper.tick = null; }
  }

  function storeCurrentAnswer() {
    const item = paper.questions[paper.index];
    if (item) item.answer = $("#paper-answer").value;
  }

  function renderPaperQuestion() {
    const item = paper.questions[paper.index];
    if (!item) return;
    const kind = inferKind(item.q);
    $("#paper-count").textContent = `${paper.index + 1} / ${paper.questions.length}`;
    $("#paper-mark").textContent = kind === "essay" ? "Long answer" : "Short answer";
    $("#paper-question").textContent = item.q.prompt || "(see the picture)";
    paintCardImage($("#paper-image"), item.q.imgFront);
    $("#paper-answer").value = item.answer;
    $("#paper-answer").className = kind === "essay" ? "essay-input" : "essay-input paper-short";
    $("#paper-prev").disabled = paper.index === 0;
    $("#paper-next").textContent = paper.index === paper.questions.length - 1 ? "Last one" : "Next";

    const strip = $("#paper-strip");
    strip.innerHTML = "";
    paper.questions.forEach((it, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "strip-dot" + (i === paper.index ? " here" : "") + (it.answer.trim() ? " done" : "");
      dot.textContent = i + 1;
      dot.addEventListener("click", () => { storeCurrentAnswer(); paper.index = i; renderPaperQuestion(); });
      strip.appendChild(dot);
    });
    window.scrollTo(0, 0);
  }

  $("#paper-answer").addEventListener("input", storeCurrentAnswer);

  $("#paper-prev").addEventListener("click", () => {
    storeCurrentAnswer();
    if (paper.index > 0) { paper.index--; renderPaperQuestion(); }
  });

  $("#paper-next").addEventListener("click", () => {
    storeCurrentAnswer();
    if (paper.index < paper.questions.length - 1) { paper.index++; renderPaperQuestion(); }
    else beginMarking();
  });

  $("#paper-finish").addEventListener("click", () => {
    storeCurrentAnswer();
    const blank = paper.questions.filter((it) => !it.answer.trim()).length;
    if (blank && !confirm(`${blank} question${blank === 1 ? " is" : "s are"} still blank. Finish anyway?`)) return;
    beginMarking();
  });

  $("#paper-quit").addEventListener("click", () => {
    if (!confirm("Abandon this paper? Nothing will be recorded.")) return;
    stopPaperClock();
    if (paper.exam) openExam(paper.exam);
    else if (currentDeck) openDeckSummary(currentDeck);
    else { renderHome(); showScreen("screen-home"); }
  });

  // ---- marking ----
  function beginMarking() {
    stopPaperClock();
    storeCurrentAnswer();
    paper.marking = 0;
    renderMarking();
    showScreen("screen-marking");
  }

  function renderMarking() {
    if (paper.marking >= paper.questions.length) { finishPaper(); return; }
    const item = paper.questions[paper.marking];
    const words = countWords(item.answer);
    $("#marking-count").textContent = `${paper.marking + 1} / ${paper.questions.length}`;
    $("#marking-progress").style.width =
      Math.round((paper.marking / paper.questions.length) * 100) + "%";
    $("#marking-question").textContent = item.q.prompt || "(see the picture)";
    $("#marking-yours").textContent = item.answer.trim() || "— left blank —";
    $("#marking-words").textContent = words ? `(${words} word${words === 1 ? "" : "s"})` : "";
    $("#marking-model").textContent = item.q.answer;
    paintCardImage($("#marking-image"), item.q.imgBack);
    window.scrollTo(0, 0);
    syncMarkDock();
  }

  // The mark buttons are docked to the bottom so a long model answer can
  // never push them off screen. The veil behind them is only drawn while
  // they are genuinely floating over the answer, otherwise it reads as a
  // seam across an otherwise empty page.
  function syncMarkDock() {
    const dock = $(".mark-dock");
    if (!dock) return;
    const floating = document.documentElement.scrollHeight > window.innerHeight + 1;
    dock.classList.toggle("is-stuck", floating);
  }
  window.addEventListener("resize", syncMarkDock);

  function markCurrent(value) {
    const item = paper.questions[paper.marking];
    if (!item) return;
    paper.marks[paper.marking] = value;

    // Same three levels the cards use: full marks advance it, a half mark
    // advances it but brings it back sooner, a miss sends it back.
    gradeQuestion(item.deck, item.q.id, value === 1 ? 2 : value === 0.5 ? 1 : 0);
    upsertDeck(item.deck);

    profile.stats.cardsGraded++;
    noteReviewed();
    saveProfile(profile);
    vibrate(value === 1 ? [10] : [10, 30, 10]);
    paper.marking++;
    renderMarking();
  }

  function finishPaper() {
    const total = paper.questions.length;
    const earned = paper.marks.reduce((sum, m) => sum + (m || 0), 0);
    const pct = Math.round((earned / total) * 100);
    const minutes = Math.max(1, Math.round((Date.now() - paper.startedAt) / 60000));

    // The forecast as it stood before this paper touched anything.
    const projected = paper.projectedBefore;

    const record = { at: Date.now(), earned, total, pct, minutes, projected: projected || 0 };
    const list = loadExams();
    const exam = paper.exam ? list.find((e) => e.id === paper.exam.id) : null;
    if (exam) {
      exam.papers = exam.papers || [];
      exam.papers.push(record);
      if (exam.papers.length > 20) exam.papers = exam.papers.slice(-20);
      saveExams(list);
      paper.exam = exam;
    }

    profile.stats.papers = (profile.stats.papers || 0) + 1;
    profile.stats.bestPaper = Math.max(profile.stats.bestPaper || 0, pct);
    saveProfile(profile);

    $("#paper-score").textContent = pct + "%";
    $("#paper-score-sub").textContent =
      `${earned % 1 ? earned.toFixed(1) : earned} of ${total} · ${minutes} min`;

    const hasForecast = typeof projected === "number";
    $("#paper-reality").classList.toggle("hidden", !hasForecast);
    $("#reality-forecast").textContent = (projected || 0) + "%";
    $("#reality-actual").textContent = pct + "%";
    const drift = pct - (projected || 0);
    $("#reality-note").textContent =
      Math.abs(drift) <= 8
        ? "The forecast had you about right. It's reading your revision correctly."
        : drift < 0
          ? `The forecast was ${Math.abs(drift)} points optimistic. Recognising a card is not the same as producing the answer cold — worth more writing and less flipping.`
          : `You did ${drift} points better than projected. The forecast only counts a card solid after three correct recalls, so it lags when you actually know the material.`;

    // Which areas the marks landed in.
    const byArea = new Map();
    const sourceAreas = (paper.source && paper.source.areas) || examBreakdown(paper.exam);
    sourceAreas.forEach((a) => {
      const ids = new Set(a.cards.map((c) => c.q.id));
      let got = 0, count = 0;
      paper.questions.forEach((item, i) => {
        if (!ids.has(item.q.id)) return;
        count++;
        got += paper.marks[i] || 0;
      });
      if (count) byArea.set(a.label, { label: a.label, kind: a.kind, got, count });
    });

    const list2 = Array.from(byArea.values())
      .map((a) => Object.assign(a, { pct: Math.round((a.got / a.count) * 100) }))
      .sort((x, y) => x.pct - y.pct);

    $("#paper-areas").innerHTML = list2.map((a) => `
      <div class="area-row" role="group">
        <span class="area-head">
          <span class="area-label">${a.kind === "tag" ? "#" : ""}${escapeHtml(a.label)}</span>
          <span class="area-pct">${a.pct}%</span>
        </span>
        <span class="area-track"><span class="area-fill" style="width:${a.pct}%"></span></span>
        <span class="area-foot">${a.got % 1 ? a.got.toFixed(1) : a.got} of ${a.count}</span>
      </div>
    `).join("");

    if (pct >= 80) { burstConfetti(50); vibrate([15, 40, 15]); }
    celebrateBadges(checkBadges(), true);
    showScreen("screen-paper-result");
  }

  $("#paper-again").addEventListener("click", () => openPaperSetup(paper.source));
  $("#paper-done").addEventListener("click", () => {
    if (paper.exam) openExam(paper.exam);
    else if (currentDeck) openDeckSummary(currentDeck);
    else { renderHome(); showScreen("screen-home"); }
  });

  $("#mark-none").addEventListener("click", () => markCurrent(0));
  $("#mark-half").addEventListener("click", () => markCurrent(0.5));
  $("#mark-full").addEventListener("click", () => markCurrent(1));

    // ---------------------------------------------------------------
  // Exam screens: the list, the editor, and the forecast itself.
  // ---------------------------------------------------------------
  let editingExamId = null;
  let currentExam = null;
  const examScopeDraft = { deckIds: [], tags: [] };

  function loadExams() {
    return (profile.exams || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  }
  function saveExams(list) {
    profile.exams = list;
    saveProfile(profile);
  }

  function formatExamDate(dateStr) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "long", day: "numeric", month: "long",
    });
  }

  function countdownWords(days) {
    if (days < 0) return "passed";
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return days + " days";
  }

  function verdictFor(f) {
    if (f.days < 0) return { tone: "past", line: "This exam has passed." };
    if (f.total === 0) return { tone: "none", line: "Nothing linked yet" };
    if (f.projPct >= 95) return { tone: "good", line: "On track" };
    if (f.projPct >= 75) return { tone: "close", line: "Close" };
    return { tone: "behind", line: "Behind" };
  }

  function renderExams() {
    const list = $("#exam-list");
    const exams = loadExams();
    list.innerHTML = "";
    $("#exam-empty").classList.toggle("hidden", exams.length > 0);

    exams.forEach((exam) => {
      const f = forecastFor(exam);
      const v = verdictFor(f);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "exam-row exam-" + v.tone;
      row.innerHTML = `
        <div class="exam-row-head">
          <span class="exam-row-title">${escapeHtml(exam.title)}</span>
          <span class="exam-row-days">${countdownWords(f.days)}</span>
        </div>
        <div class="exam-row-track"><div class="exam-row-fill" style="width:${f.projPct}%"></div></div>
        <div class="exam-row-foot">
          <span class="exam-verdict-chip">${v.line}</span>
          <span>${f.total ? `${f.projPct}% projected · ${f.total} cards` : "tap to choose its decks"}</span>
        </div>
      `;
      row.addEventListener("click", () => openExam(exam));
      list.appendChild(row);
    });
    updateExamTab();
  }

  // The soonest exam rides on the tab, so the deadline is never out of sight.
  function updateExamTab() {
    const exams = loadExams().filter((e) => daysUntil(e.date) >= 0);
    const soonest = exams[0];
    const days = soonest ? daysUntil(soonest.date) : null;
    $all(".tab-countdown").forEach((el) => {
      if (days === null || days > 60) { el.classList.add("hidden"); return; }
      el.textContent = days;
      el.classList.remove("hidden");
    });
  }

  function scopeChip(label, active, onToggle) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "scope-chip" + (active ? " active" : "");
    chip.textContent = label;
    chip.addEventListener("click", onToggle);
    return chip;
  }

  function renderExamScope() {
    const decks = loadDecks();
    const deckWrap = $("#exam-scope-decks");
    deckWrap.innerHTML = "";
    decks.forEach((deck) => {
      const on = examScopeDraft.deckIds.indexOf(deck.id) !== -1;
      deckWrap.appendChild(scopeChip(deck.title, on, () => {
        const i = examScopeDraft.deckIds.indexOf(deck.id);
        if (i === -1) examScopeDraft.deckIds.push(deck.id); else examScopeDraft.deckIds.splice(i, 1);
        renderExamScope();
      }));
    });

    const tagWrap = $("#exam-scope-tags");
    tagWrap.innerHTML = "";
    allKnownTags().forEach((tag) => {
      const on = examScopeDraft.tags.indexOf(tag) !== -1;
      tagWrap.appendChild(scopeChip("#" + tag, on, () => {
        const i = examScopeDraft.tags.indexOf(tag);
        if (i === -1) examScopeDraft.tags.push(tag); else examScopeDraft.tags.splice(i, 1);
        renderExamScope();
      }));
    });

    const count = examScopeEntries({ deckIds: examScopeDraft.deckIds, tags: examScopeDraft.tags }).length;
    const picked = examScopeDraft.deckIds.length + examScopeDraft.tags.length;
    $("#exam-scope-hint").textContent = picked === 0
      ? "Nothing linked yet — pick the decks and topics this exam is actually on."
      : `${count} card${count === 1 ? "" : "s"} in scope.`;
  }

  function toggleDeckOnExam(examId, deckId) {
    const list = loadExams();
    const exam = list.find((e) => e.id === examId);
    if (!exam) return;
    exam.deckIds = exam.deckIds || [];
    const i = exam.deckIds.indexOf(deckId);
    if (i === -1) exam.deckIds.push(deckId); else exam.deckIds.splice(i, 1);
    saveExams(list);
  }

  // Which exams this deck feeds is set from the deck, because that's where
  // you are when you've just written the cards.
  function renderLinkSheet(deck) {
    const list = $("#link-sheet-list");
    const exams = loadExams().filter((e) => daysUntil(e.date) >= 0);
    list.innerHTML = "";
    $("#link-sheet-sub").textContent = exams.length
      ? `Which exams is "${deck.title}" on?`
      : "No upcoming exams yet — add one from the Exams tab first.";

    exams.forEach((exam) => {
      const on = (exam.deckIds || []).indexOf(deck.id) !== -1;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "link-row" + (on ? " on" : "");
      row.innerHTML = `
        <span class="link-check">${on ? "✓" : ""}</span>
        <span class="link-body">
          <span class="link-title">${escapeHtml(exam.title)}</span>
          <span class="link-sub">${countdownWords(daysUntil(exam.date))}</span>
        </span>
      `;
      row.addEventListener("click", () => {
        toggleDeckOnExam(exam.id, deck.id);
        vibrate(8);
        renderLinkSheet(deck);
        openDeckSummary(deck);
        // openDeckSummary swaps screens; keep the sheet up so several can
        // be ticked in one go.
        $("#link-sheet-wrap").classList.remove("hidden");
        $("#link-sheet-wrap").classList.add("open");
      });
      list.appendChild(row);
    });
  }

  function openLinkSheet() {
    if (!currentDeck) return;
    renderLinkSheet(currentDeck);
    $("#link-sheet-wrap").classList.remove("hidden");
    requestAnimationFrame(() => $("#link-sheet-wrap").classList.add("open"));
  }

  function closeLinkSheet() {
    const wrap = $("#link-sheet-wrap");
    wrap.classList.remove("open");
    setTimeout(() => wrap.classList.add("hidden"), 220);
  }

  $("#summary-link-btn").addEventListener("click", openLinkSheet);
  $("#link-sheet-close").addEventListener("click", closeLinkSheet);
  $("#link-sheet-backdrop").addEventListener("click", closeLinkSheet);

  function openExamEditor(exam) {
    editingExamId = exam ? exam.id : null;
    $("#exam-edit-title").textContent = exam ? "Edit exam" : "Add an exam";
    $("#exam-name").value = exam ? exam.title : "";
    $("#exam-date").value = exam ? exam.date : "";
    examScopeDraft.deckIds = exam ? (exam.deckIds || []).slice() : [];
    examScopeDraft.tags = exam ? (exam.tags || []).slice() : [];
    $("#exam-delete-btn").classList.toggle("hidden", !exam);
    renderExamScope();
    showScreen("screen-exam-edit");
  }

  $("#exam-add-btn").addEventListener("click", () => openExamEditor(null));
  $("#exam-edit-btn").addEventListener("click", () => { if (currentExam) openExamEditor(currentExam); });

  $("#exam-save-btn").addEventListener("click", () => {
    const title = $("#exam-name").value.trim();
    const date = $("#exam-date").value;
    if (!title) { toast("Give the exam a name."); return; }
    if (!date) { toast("Pick a date."); return; }
    if (daysUntil(date) < 0) { toast("That date has already passed."); return; }

    const list = loadExams();
    if (editingExamId) {
      const e = list.find((x) => x.id === editingExamId);
      if (e) {
        e.title = title; e.date = date;
        e.deckIds = examScopeDraft.deckIds.slice();
        e.tags = examScopeDraft.tags.slice();
      }
    } else {
      list.push({
        id: "e" + Date.now() + Math.random().toString(36).slice(2, 6),
        title, date,
        deckIds: examScopeDraft.deckIds.slice(),
        tags: examScopeDraft.tags.slice(),
      });
    }
    saveExams(list);
    toast("Exam saved.");
    renderExams();
    showScreen("screen-exams");
  });

  $("#exam-delete-btn").addEventListener("click", () => {
    if (!editingExamId) return;
    if (!confirm("Delete this exam?")) return;
    saveExams(loadExams().filter((e) => e.id !== editingExamId));
    editingExamId = null;
    currentExam = null;
    renderExams();
    showScreen("screen-exams");
  });

  function openExam(exam) {
    currentExam = exam;
    const f = forecastFor(exam);
    const v = verdictFor(f);

    $("#exam-detail-title").textContent = exam.title;
    $("#exam-countdown").textContent = f.days < 0 ? "—" : f.days;
    $("#exam-countdown-cap").textContent =
      f.days < 0 ? "this exam has passed" : f.days === 1 ? "day to go" : "days to go";
    $("#exam-date-line").textContent = formatExamDate(exam.date);

    $("#forecast-pct").textContent = f.projPct + "%";
    $("#forecast-fill").style.width = f.projPct + "%";
    $("#forecast-now").style.left = f.nowPct + "%";
    $("#forecast-now-pct").textContent = f.nowPct + "%";

    const verdict = $("#forecast-verdict");
    verdict.textContent = v.line;
    verdict.className = "verdict verdict-" + v.tone;

    $("#forecast-note").textContent = f.total === 0
      ? "Link the decks and topics this exam covers, and the forecast fills in."
      : f.days < 0
        ? "Kept for the record."
        : f.unreachable
          ? "Even at a hard pace there aren't enough days left to make all of this solid — the intervals need time to play out. Narrow what this exam covers, or accept a partial pass."
          : f.projPct >= 95 && f.needed !== null && f.needed <= f.pace * 0.7
            ? `Comfortable: your usual ${f.pace} cards a day is well clear of the ${f.needed} a day this needs.`
            : f.projPct >= 95
              ? `You get there at your usual ${f.pace} a day, but only just — it needs about ${f.needed}. Missing a couple of days would cost you.`
              : `At your usual ${f.pace} cards a day you'd reach ${f.projPct}%. About ${f.needed} a day would get you to 95%.`;

    const tiles = [
      { label: "Cards in scope", raw: f.total, tone: "teal" },
      { label: "Solid now", raw: f.solidNow, tone: "sage" },
      { label: "Never seen", raw: f.neverSeen, tone: "coral" },
    ];
    $("#exam-stats").innerHTML = tiles.map((t) => `
      <div class="bento-tile bento-tile-${t.tone} stat-tile">
        <div class="ledger-label">${t.label}</div>
        <div class="ledger-value">${formatNumber(t.raw)}</div>
      </div>
    `).join("");

    const linked = (exam.deckIds || []).length + (exam.tags || []).length > 0;
    $("#exam-unlinked").classList.toggle("hidden", linked);
    $("#exam-linked").classList.toggle("hidden", !linked);

    const areas = examBreakdown(exam);
    const areaList = $("#exam-areas");
    areaList.innerHTML = "";
    areas.forEach((a) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "area-row";
      row.innerHTML = `
        <span class="area-head">
          <span class="area-label">${a.kind === "tag" ? "#" : ""}${escapeHtml(a.label)}</span>
          <span class="area-pct">${a.pct}%</span>
        </span>
        <span class="area-track"><span class="area-fill" style="width:${a.pct}%"></span></span>
        <span class="area-foot">${a.solid} of ${a.total} solid${a.unseen ? ` · ${a.unseen} never seen` : ""}</span>
      `;
      row.addEventListener("click", () => {
        const cards = a.cards.slice();
        shuffleArr(cards);
        currentDeck = null;
        toast(`${a.kind === "tag" ? "#" : ""}${a.label} — weakest first`);
        // Cards you've never seen first, then the least practised.
        cards.sort((x, y) => {
          const rx = (getMastery(x.deck, x.q.id) || {}).reps || 0;
          const ry = (getMastery(y.deck, y.q.id) || {}).reps || 0;
          return rx - ry;
        });
        beginFlashcardsSession(cards.slice(0, TODAY_BATCH), true);
      });
      areaList.appendChild(row);
    });

    // Papers already sat, newest first.
    const papers = (exam.papers || []).slice().reverse();
    const paperWrap = $("#exam-papers-wrap");
    paperWrap.classList.toggle("hidden", papers.length === 0);
    $("#exam-papers").innerHTML = papers.map((r) => `
      <div class="paper-row">
        <span class="paper-row-score">${r.pct}%</span>
        <span class="paper-row-meta">${r.earned % 1 ? r.earned.toFixed(1) : r.earned}/${r.total} · ${r.minutes} min · ${timeAgo(r.at)}</span>
        <span class="paper-row-drift ${r.pct >= r.projected ? "over" : "under"}">${r.pct >= r.projected ? "+" : ""}${r.pct - r.projected} vs forecast</span>
      </div>
    `).join("");

    $("#exam-paper-btn").classList.toggle("hidden", !linked);

    const due = f.entries.filter(({ q, deck }) => isDue(deck, q.id)).length;
    $("#exam-study-label").textContent = due > 0 ? `Study this exam (${due} due)` : "Study this exam";
    $("#exam-method-note").textContent =
      `Worked out from your own history: you get about ${Math.round(f.p * 100)}% of cards right, and average ${f.pace} a day on the days you study. A card counts as solid after ${SOLID_REPS} correct recalls.`;

    showScreen("screen-exam");
  }

  $("#exam-pick-btn").addEventListener("click", () => {
    if (currentExam) openExamEditor(currentExam);
  });

  $("#exam-paper-btn").addEventListener("click", () => {
    if (currentExam) openPaperSetup(paperSourceFromExam(currentExam));
  });

  $("#exam-study-btn").addEventListener("click", () => {
    if (!currentExam) return;
    const entries = examScopeEntries(currentExam);
    if (!entries.length) { toast("No cards in this exam's scope yet."); return; }
    const due = entries.filter(({ q, deck }) => isDue(deck, q.id));
    const chosen = (due.length ? due : entries).slice();
    shuffleArr(chosen);
    currentDeck = null;
    beginFlashcardsSession(chosen.slice(0, TODAY_BATCH));
  });

    // ---------------------------------------------------------------
  // SITTINGS: a bounded stretch of work with a sound to sit inside and a
  // finish line you can see. Every focus app measures minutes, but
  // minutes are the wrong unit for revision — twenty-five minutes of
  // staring is not progress, forty cards is. So a sitting is counted in
  // cards, which also means it lines up with what's actually due.
  // ---------------------------------------------------------------
  const SITTING_TARGETS = [10, 25, 50];
  const sitting = {
    active: false, target: 0, done: 0, scape: "silence", startedAt: 0,
  };

  function scapeById(id) {
    return SOUNDSCAPES.find((sc) => sc.id === id) || SOUNDSCAPES[0];
  }

  function renderScapeGrid() {
    const grid = $("#scape-grid");
    grid.innerHTML = "";
    SOUNDSCAPES.forEach((sc) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scape-btn" + (sc.id === profile.scape ? " active" : "");
      btn.dataset.scape = sc.id;
      btn.innerHTML = `
        <span class="scape-icon">${sc.icon}</span>
        <span class="scape-label">${escapeHtml(sc.label)}</span>
        <span class="scape-note">${escapeHtml(sc.note)}</span>
      `;
      btn.addEventListener("click", () => {
        profile.scape = sc.id;
        saveProfile(profile);
        renderScapeGrid();
        // Play it straight away — you can't choose a sound you can't hear.
        Ambience.setMuted(false);
        Ambience.play(sc.id);
        vibrate(8);
      });
      grid.appendChild(btn);
    });
  }

  function renderSfxToggle() {
    const btn = $("#sfx-toggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", profile.sfx ? "true" : "false");
  }

  $("#sfx-toggle").addEventListener("click", () => {
    profile.sfx = !profile.sfx;
    saveProfile(profile);
    Ambience.setSfx(profile.sfx);
    renderSfxToggle();
    vibrate(8);
    // Turning it on plays it, the same way picking a soundscape does.
    if (profile.sfx) Ambience.fanfare();
  });

  function renderTargetRow() {
    const row = $("#target-row");
    row.innerHTML = "";
    const due = allDueEntries().length;
    const options = SITTING_TARGETS.slice();
    if (due > 0 && options.indexOf(due) === -1) options.push(due);

    options.forEach((n) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isDueOption = n === due && SITTING_TARGETS.indexOf(n) === -1;
      btn.className = "target-btn" + (n === profile.sittingTarget ? " active" : "");
      btn.dataset.target = n;
      btn.innerHTML = `<span class="target-num">${n}</span><span class="target-cap">${isDueOption ? "all due" : "cards"}</span>`;
      btn.addEventListener("click", () => {
        profile.sittingTarget = n;
        saveProfile(profile);
        renderTargetRow();
        updateSittingHint();
        vibrate(8);
      });
      row.appendChild(btn);
    });
  }

  function updateSittingHint() {
    const due = allDueEntries().length;
    const total = allEntries().length;
    const target = Math.min(profile.sittingTarget, Math.max(1, total));
    const topUp = Math.max(0, target - due);
    $("#sitting-begin-label").textContent = `Begin — ${target} card${target === 1 ? "" : "s"}`;
    $("#sitting-hint").textContent = total === 0
      ? "Write some cards first."
      : topUp > 0 && due > 0
        ? `${due} due, plus ${topUp} you're not due to see yet.`
        : due === 0
          ? "Nothing is due, so this will be working ahead."
          : "All of these are due.";
  }

  function renderRoom() {
    renderThemeGrid();
    renderScapeGrid();
    renderSfxToggle();
    renderTargetRow();
    updateSittingHint();
  }

  // Due first, then cards you're not due to see — a sitting you asked for
  // shouldn't end early just because your queue is short.
  function buildSittingEntries(target) {
    const due = allDueEntries();
    shuffleArr(due);
    if (due.length >= target) return due.slice(0, target);
    const dueIds = new Set(due.map((e) => e.q.id));
    const rest = allEntries().filter((e) => !dueIds.has(e.q.id));
    shuffleArr(rest);
    return due.concat(rest.slice(0, target - due.length));
  }

  $("#sitting-begin").addEventListener("click", () => {
    const total = allEntries().length;
    if (total === 0) { toast("Write some cards first."); return; }
    const target = Math.min(profile.sittingTarget, total);
    const entries = buildSittingEntries(target);
    if (!entries.length) return;

    sitting.active = true;
    sitting.target = entries.length;
    sitting.done = 0;
    sitting.scape = profile.scape;
    sitting.startedAt = Date.now();

    Ambience.setMuted(false);
    Ambience.play(profile.scape);
    updateSoundButton();
    $("#flash-sound-btn").classList.remove("hidden");

    currentDeck = null;
    beginFlashcardsSession(entries);
  });

  function updateSoundButton() {
    const btn = $("#flash-sound-btn");
    const sc = scapeById(sitting.scape);
    const off = Ambience.isMuted() || sitting.scape === "silence";
    btn.textContent = off ? "🔇" : sc.icon;
    btn.setAttribute("aria-label", off ? "Sound off" : "Mute sound");
  }

  $("#flash-sound-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (sitting.scape === "silence") { toast("This sitting is in silence."); return; }
    Ambience.setMuted(!Ambience.isMuted());
    updateSoundButton();
    vibrate(8);
  });

  // Leaving early ends the sitting: the sound shouldn't follow you out.
  function endSitting(completed) {
    if (!sitting.active) return;
    const minutes = Math.max(1, Math.round((Date.now() - sitting.startedAt) / 60000));
    sitting.active = false;
    $("#flash-sound-btn").classList.add("hidden");

    if (!completed) { Ambience.stop(); return null; }

    const st = profile.stats;
    st.sittings = (st.sittings || 0) + 1;
    st.sittingCards = (st.sittingCards || 0) + sitting.done;
    st.longestSitting = Math.max(st.longestSitting || 0, sitting.done);
    st.scapeCounts = st.scapeCounts || {};
    st.scapeCounts[sitting.scape] = (st.scapeCounts[sitting.scape] || 0) + 1;
    saveProfile(profile);

    Ambience.stop();
    setTimeout(() => Ambience.chime(), 300);
    return { cards: sitting.done, minutes, scape: sitting.scape };
  }

  // ---------------------------------------------------------------
  // TOPICS: a tag on a card, so a subject that runs through several decks
  // can be revised as one thing. Anatomy, physiology and pharmacology all
  // have cardiology in them; the deck you happened to file a card in
  // shouldn't decide what you can revise together.
  // ---------------------------------------------------------------
  const MAX_TAGS_PER_CARD = 8;
  const MAX_TAG_LENGTH = 24;

  function parseTags(text) {
    const seen = [];
    String(text || "").split(",").forEach((raw) => {
      const tag = raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
      if (tag && seen.indexOf(tag) === -1) seen.push(tag);
    });
    return seen.slice(0, MAX_TAGS_PER_CARD);
  }

  function tagsOf(q) { return Array.isArray(q.tags) ? q.tags : []; }

  // Every tag in use, with how many cards carry it and how many are due.
  function topicIndex() {
    const decks = loadDecks();
    const byTag = new Map();
    decks.forEach((deck) => {
      deck.questions.forEach((q) => {
        tagsOf(q).forEach((tag) => {
          if (!byTag.has(tag)) byTag.set(tag, { tag, cards: 0, due: 0 });
          const entry = byTag.get(tag);
          entry.cards++;
          if (isDue(deck, q.id)) entry.due++;
        });
      });
    });
    return Array.from(byTag.values())
      .sort((a, b) => b.due - a.due || b.cards - a.cards || a.tag.localeCompare(b.tag));
  }

  function allKnownTags() {
    return topicIndex().map((t) => t.tag);
  }

  // Cards carrying a tag, each paired with the deck it lives in so grading
  // can find its way home.
  function cardsForTag(tag) {
    const out = [];
    loadDecks().forEach((deck) => {
      deck.questions.forEach((q) => {
        if (tagsOf(q).indexOf(tag) !== -1) out.push({ q, deck });
      });
    });
    return out;
  }

  // A "sticking point" is a card you've missed repeatedly. Three misses is
  // the point where the problem is usually the card, not your memory —
  // it's too big, or it's really two cards wearing a trenchcoat.
  const STICKING_THRESHOLD = 3;
  function lapsesFor(deck, qid) {
    const m = getMastery(deck, qid);
    return (m && m.lapses) || 0;
  }
  function stickingPoints(deck) {
    return deck.questions
      .filter((q) => lapsesFor(deck, q.id) >= STICKING_THRESHOLD)
      .sort((a, b) => lapsesFor(deck, b.id) - lapsesFor(deck, a.id));
  }
  function deckMasteryPct(deck) {
    const total = deck.questions.length;
    if (!total) return 0;
    const known = deck.questions.filter((q) => { const m = getMastery(deck, q.id); return m && m.state === "known"; }).length;
    return Math.round((known / total) * 100);
  }

  function gradeQuestion(deck, qid, correct) {
    const prev = getMastery(deck, qid) || { state: "new", reps: 0, interval: 0, dueAt: 0 };
    let rec;
    const lapses = prev.lapses || 0;
    // 2 = knew it, 1 = shaky, 0 = missed. Booleans still work.
    const quality = correct === true ? 2 : correct === false ? 0 : correct;
    if (quality >= 1) {
      const reps = prev.reps + 1;
      let full;
      if (reps === 1) full = 1;
      else if (reps === 2) full = 3;
      else full = Math.max(1, Math.round((prev.interval || 3) * 2.2));
      const interval = quality === 2 ? full : Math.max(1, Math.round(full * 0.55));
      rec = { state: "known", reps, interval, lapses, dueAt: Date.now() + interval * 86400000 };
    } else {
      // Every miss is counted for good. A card you keep failing is worth
      // rewriting, and you can only notice that if the app remembers.
      rec = { state: "learning", reps: 0, interval: 0, lapses: lapses + 1, dueAt: Date.now() };
    }
    deck.mastery[qid] = rec;
    return rec;
  }

  // ---------------------------------------------------------------
  // App state
  // ---------------------------------------------------------------
  let currentDeck = null;

  // ---------------------------------------------------------------
  // HOME
  // ---------------------------------------------------------------
  function beginTopicSession(tag) {
    const entries = cardsForTag(tag);
    if (!entries.length) return;
    // Same rule as Smart Review: what's due, or everything if nothing is.
    const due = entries.filter(({ q, deck }) => isDue(deck, q.id));
    const chosen = due.length ? due : entries;
    // A topic review belongs to no single deck.
    currentDeck = null;
    toast(`${tag} — ${chosen.length} card${chosen.length === 1 ? "" : "s"}`);
    beginFlashcardsSession(chosen);
  }

  function renderTopics() {
    const topics = topicIndex();
    const wrap = $("#topics-wrap");
    const list = $("#topics-list");
    list.innerHTML = "";
    if (!topics.length) { wrap.classList.add("hidden"); return; }
    wrap.classList.remove("hidden");
    topics.forEach((t) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "topic-row";
      row.innerHTML = `
        <span class="topic-name">${escapeHtml(t.tag)}</span>
        <span class="topic-meta">${t.cards} card${t.cards === 1 ? "" : "s"}${t.due > 0 ? ` · <b>${t.due} due</b>` : ""}</span>
        <span class="btn-arrow">→</span>
      `;
      row.addEventListener("click", () => beginTopicSession(t.tag));
      list.appendChild(row);
    });
  }

  function renderExamLine() {
    const line = $("#today-exam");
    const upcoming = loadExams().filter((e) => daysUntil(e.date) >= 0)[0];
    if (!upcoming) { line.classList.add("hidden"); return; }
    const days = daysUntil(upcoming.date);
    if (days > 45) { line.classList.add("hidden"); return; }
    const f = forecastFor(upcoming);
    line.classList.remove("hidden");
    line.innerHTML = `<span class="today-exam-name">${escapeHtml(upcoming.title)}</span>` +
      `<span class="today-exam-days">${countdownWords(days)}</span>` +
      `<span class="today-exam-pct">${f.total ? f.projPct + "% projected" : "no cards yet"}</span>`;
    line.onclick = () => { renderExams(); openExam(upcoming); };
  }

  function renderToday() {
    renderExamLine();
    const card = $("#today-card");
    const entries = allDueEntries();
    const totalCards = allEntries().length;
    if (totalCards === 0) { card.classList.add("hidden"); return; }
    card.classList.remove("hidden");

    const reviewed = reviewedToday();
    const reviewedLine = reviewed > 0
      ? `${reviewed} card${reviewed === 1 ? "" : "s"} reviewed today`
      : "";

    if (entries.length > 0) {
      $("#today-due").classList.remove("hidden");
      $("#today-clear").classList.add("hidden");

      const deckCount = new Set(entries.map((e) => e.deck.id)).size;
      const batch = Math.min(entries.length, TODAY_BATCH);
      $("#today-num").textContent = entries.length;
      $("#today-title").textContent = `card${entries.length === 1 ? "" : "s"} due`;

      const across = deckCount > 1 ? `across ${deckCount} decks` : "";
      const overflow = entries.length > TODAY_BATCH
        ? `${batch} at a time — no need to clear it all at once`
        : "";
      $("#today-sub").textContent = [across, overflow, reviewedLine].filter(Boolean).join(" · ");
      $("#today-btn-label").textContent = entries.length > TODAY_BATCH
        ? `Review ${batch} now`
        : "Start today's review";
    } else {
      $("#today-due").classList.add("hidden");
      $("#today-clear").classList.remove("hidden");

      const next = nextDueAt();
      $("#today-clear-title").textContent = reviewed > 0 ? "All caught up" : "Nothing due today";
      $("#today-clear-sub").textContent = [
        reviewedLine,
        next ? `next review ${whenDue(next)}` : "study a deck to start the clock",
      ].filter(Boolean).join(" · ");
    }
  }

  function beginTodayReview() {
    const entries = allDueEntries();
    if (!entries.length) return;
    shuffleArr(entries);
    currentDeck = null;
    beginFlashcardsSession(entries.slice(0, TODAY_BATCH));
  }

  $("#today-start").addEventListener("click", beginTodayReview);

  $("#today-ahead").addEventListener("click", () => {
    const entries = allEntries();
    if (!entries.length) return;
    shuffleArr(entries);
    currentDeck = null;
    toast("Working ahead — these aren't due yet.");
    beginFlashcardsSession(entries.slice(0, AHEAD_BATCH));
  });

  function renderHome() {
    if (!sitting.active) Ambience.stop();
    renderToday();
    renderProfileHeader();
    renderHeaderChips();
    renderReminderUI();
    renderTopics();
    updateCupboardPip();
    updateExamTab();
    const decks = loadDecks();
    const wrap = $("#saved-decks-wrap");
    const list = $("#saved-decks");
    list.innerHTML = "";
    if (decks.length === 0) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    for (const deck of decks) {
      const due = dueCount(deck);
      const masteryPct = deckMasteryPct(deck);
      const card = document.createElement("div");
      card.className = "deck-card";
      card.innerHTML = `
        <div class="deck-card-main">
          <div class="deck-card-title-row">
            <div class="deck-card-title">${escapeHtml(deck.title)}</div>
            ${due > 0 ? `<span class="due-tag">${due} due</span>` : ""}
          </div>
          <div class="deck-card-meta">${deck.questions.length} questions · ${timeAgo(deck.createdAt)}</div>
          <div class="deck-mastery-track"><div class="deck-mastery-fill" style="width:${masteryPct}%;"></div></div>
        </div>
        <button class="icon-btn deck-delete" aria-label="Delete deck">✕</button>
      `;
      card.querySelector(".deck-card-main").addEventListener("click", () => openDeckSummary(deck));
      card.querySelector(".deck-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${deck.title}"?`)) {
          deleteDeck(deck.id);
          renderHome();
        }
      });
      list.appendChild(card);
    }
  }

  function openDeckSummary(deck) {
    currentDeck = deck;
    $("#summary-title").textContent = deck.title;
    $("#summary-count").textContent = deck.questions.length;

    const studyButtons = [$("#start-review"), $("#start-essay"), $("#start-paper")];
    const covering = examsCoveringDeck(deck);
    const upcoming = loadExams().filter((e) => daysUntil(e.date) >= 0);
    const linkBtn = $("#summary-link-btn");
    linkBtn.classList.toggle("hidden", upcoming.length === 0);
    linkBtn.textContent = covering.length
      ? "Change which exams this counts toward"
      : "Link this deck to an exam";

    const examWrap = $("#summary-exams");
    examWrap.innerHTML = "";
    examWrap.classList.toggle("hidden", covering.length === 0);
    covering.forEach((exam) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "covers-chip";
      const days = daysUntil(exam.date);
      chip.innerHTML = `<span class="covers-label">Counts toward ${escapeHtml(exam.title)}</span>` +
        `<span class="covers-days">${countdownWords(days)}</span>`;
      chip.addEventListener("click", () => { renderExams(); openExam(exam); });
      examWrap.appendChild(chip);
    });

    const essayCount = deck.questions.filter((q) => inferKind(q) === "essay").length;
    $("#essay-tile-label").textContent = essayCount ? `Essay (${essayCount})` : "Essay";
    const stuck = stickingPoints(deck);
    const stickingBtn = $("#start-sticking");
    stickingBtn.classList.toggle("hidden", stuck.length === 0);
    $("#sticking-label").textContent = `Sticking points (${stuck.length})`;
    if (deck.questions.length === 0) {
      $("#summary-sub").textContent = "This deck is empty";
      $("#due-callout").classList.add("hidden");
      studyButtons.forEach((b) => b.classList.add("hidden"));
      stickingBtn.classList.add("hidden");
      $("#start-review-all").classList.add("hidden");
      $("#manage-cards-label").textContent = "Add your first card";

    } else {
      $("#summary-sub").textContent = "questions in this deck";
      $("#due-callout").classList.remove("hidden");
      studyButtons.forEach((b) => b.classList.remove("hidden"));
      $("#manage-cards-label").textContent = "Manage cards";

      const due = dueCount(deck);
      const callout = $("#due-callout");
      if (due > 0) {
        callout.textContent = `${due} card${due === 1 ? "" : "s"} due for review`;
        callout.className = "due-callout has-due";
        $("#review-label").textContent = `Review ${due} due`;
        $("#start-review-all").classList.remove("hidden");
        $("#start-review-all").textContent = `Go through all ${deck.questions.length} instead`;
      } else {
        callout.textContent = "All caught up";
        callout.className = "due-callout all-caught";
        $("#review-label").textContent = `Review all ${deck.questions.length}`;
        // Nothing is due, so the main button already goes through everything.
        $("#start-review-all").classList.add("hidden");
      }
    }
    showScreen("screen-summary");
  }

  $("#create-empty-btn").addEventListener("click", () => {
    const titleInput = $("#deck-title").value.trim();
    const deck = {
      id: "d" + Date.now() + Math.random().toString(36).slice(2, 7),
      title: titleInput || "New deck",
      notes: "",
      createdAt: Date.now(),
      questions: [],
      mastery: {},
    };
    upsertDeck(deck);
    celebrateBadges(checkBadges());
    $("#deck-title").value = "";
    openDeckSummary(deck);
  });

  $all(".back-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      endSitting(false);
      stopPaperClock();
      if (target === "screen-home") {
        renderHome();
        showScreen("screen-home");
      } else if (target === "screen-summary" && currentDeck) {
        openDeckSummary(currentDeck);
      } else if (target === "screen-summary") {
        // A topic review isn't inside any one deck, so back means home.
        renderHome();
        showScreen("screen-home");
      } else {
        showScreen(target);
      }
    });
  });

  $("#summary-delete").addEventListener("click", () => {
    if (!currentDeck) return;
    if (confirm(`Delete "${currentDeck.title}"?`)) {
      deleteDeck(currentDeck.id);
      currentDeck = null;
      renderHome();
      showScreen("screen-home");
    }
  });

  // ---------------------------------------------------------------
  // MANAGE CARDS: add/edit/delete individual X → Y flashcards by hand
  // ---------------------------------------------------------------
  let editingCardId = null;
  let lastAddedCardId = null;

  let lastManagedDeckId = null;

  function openManageCards(deck) {
    currentDeck = deck;
    // Topics stay in the box between consecutive cards, but they shouldn't
    // follow you into a different deck — carrying "pharmacology" into your
    // anatomy deck is wrong far more often than it's right.
    if (lastManagedDeckId !== deck.id) {
      $("#card-tags").value = "";
      applyCardKind("quick");
      lastManagedDeckId = deck.id;
    }
    cancelEditCard();
    $("#manage-title").textContent = deck.title;
    renderManageList();
    showScreen("screen-manage");
  }

  function renderManageList() {
    const list = $("#manage-card-list");
    list.innerHTML = "";
    const count = currentDeck.questions.length;
    $("#manage-count-label").textContent = `${count} card${count === 1 ? "" : "s"}`;
    $("#finish-deck-btn").classList.toggle("hidden", count === 0);
    for (const q of currentDeck.questions) {
      const front = q.prompt.length > 70 ? q.prompt.slice(0, 70) + "…" : q.prompt;
      const back = q.answer.length > 70 ? q.answer.slice(0, 70) + "…" : q.answer;
      const lapses = lapsesFor(currentDeck, q.id);
      const el = document.createElement("div");
      el.className = "deck-card" + (q.id === lastAddedCardId ? " card-enter" : "");
      el.innerHTML = `
        <div class="deck-card-main">
          <div class="deck-card-title-row">
            <div class="deck-card-title">${escapeHtml(front)}</div>
            ${lapses >= STICKING_THRESHOLD ? `<span class="lapse-tag" title="Missed ${lapses} times">missed ${lapses}×</span>` : ""}
          </div>
          <div class="deck-card-meta"><span class="kind-chip kind-chip-${inferKind(q)}">${KIND_CHIP[inferKind(q)]}</span>${escapeHtml(back)}</div>
          ${tagsOf(q).length ? `<div class="card-tags">${tagsOf(q).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>
        <button class="icon-btn card-delete" aria-label="Delete card">✕</button>
      `;
      el.querySelector(".deck-card-main").addEventListener("click", () => startEditCard(q));
      el.querySelector(".card-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this card?")) deleteCard(q.id);
      });
      list.appendChild(el);
    }
    lastAddedCardId = null;
  }

  // ---------------------------------------------------------------
  // CARD KINDS: what you're writing decides what the form asks for.
  // A term and its definition, an exam question and a model answer, and
  // a picture to identify are three different jobs; one form trying to
  // explain all three through its placeholder text served none of them.
  // ---------------------------------------------------------------
  // Placeholders are examples, not instructions. What a mode is *for*
  // gets one line of its own under the picker — cramming that into a
  // placeholder made the longest one four lines of grey text you had to
  // read past before you could start typing.
  const CARD_KINDS = {
    quick: {
      blurb: "A term on the front, a short answer on the back.",
      frontLabel: "Term or question",
      frontOptional: "",
      frontPlaceholder: "Photosynthesis",
      backLabel: "Answer",
      backOptional: "(short)",
      backPlaceholder: "How plants turn light into glucose",
      backClass: "textarea-small",
      saveLabel: "Add quick card",
    },
    essay: {
      blurb: "You write yours from memory, then compare the two side by side.",
      frontLabel: "Essay question",
      frontOptional: "",
      frontPlaceholder: "Explain how enzymes speed up reactions",
      backLabel: "Model answer",
      backOptional: "",
      backPlaceholder: "The full answer you'd want to write in the exam",
      backClass: "textarea-tall",
      saveLabel: "Add essay card",
    },
    picture: {
      blurb: "The picture asks the question. A prompt is only needed if it doesn't.",
      frontLabel: "Prompt",
      frontOptional: "(optional)",
      frontPlaceholder: "Name the labelled parts",
      backLabel: "Answer",
      backOptional: "",
      backPlaceholder: "What the picture shows",
      backClass: "textarea-small",
      saveLabel: "Add picture card",
    },
  };
  const KIND_ORDER = ["quick", "essay", "picture"];
  const KIND_CHIP = { quick: "⚡ quick", essay: "📝 essay", picture: "🖼 picture" };
  let cardKind = "quick";

  // Cards written before kinds existed still belong to one.
  function inferKind(q) {
    if (q.kind && CARD_KINDS[q.kind]) return q.kind;
    if (q.imgFront) return "picture";
    if ((q.answer || "").length > 220) return "essay";
    return "quick";
  }

  function applyCardKind(kind) {
    cardKind = CARD_KINDS[kind] ? kind : "quick";
    const spec = CARD_KINDS[cardKind];
    $all(".kind-btn").forEach((b) => b.classList.toggle("active", b.dataset.kind === cardKind));

    $("#kind-blurb").textContent = spec.blurb;
    $("#card-front-label").textContent = spec.frontLabel;
    $("#card-front-optional").textContent = spec.frontOptional;
    $("#card-front").placeholder = spec.frontPlaceholder;

    $("#card-back-label").textContent = spec.backLabel;
    $("#card-back-optional").textContent = spec.backOptional;
    $("#card-back").placeholder = spec.backPlaceholder;
    $("#card-back").className = spec.backClass;

    // A picture card leads with the picture.
    $("#card-editor").classList.toggle("kind-picture", cardKind === "picture");
    $("#card-front-img-btn").textContent = cardKind === "picture"
      ? "＋ Choose the picture"
      : "＋ Add image to the front";

    if (!editingCardId) $("#card-save-btn").textContent = spec.saveLabel;
  }

  $all(".kind-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      applyCardKind(btn.dataset.kind);
      vibrate(8);
    });
  });

  // Image drafts for the card being written. "original" is what the card
  // already had, so an abandoned edit can bin the picture it uploaded and
  // a saved edit can bin the one it replaced — neither leaves orphans.
  const cardImg = { front: "", back: "", originalFront: "", originalBack: "" };

  function renderCardImageField(side) {
    const id = cardImg[side];
    const preview = $("#card-" + side + "-img-preview");
    const btn = $("#card-" + side + "-img-btn");
    if (!id) {
      preview.classList.add("hidden");
      btn.classList.remove("hidden");
      return;
    }
    btn.classList.add("hidden");
    preview.classList.remove("hidden");
    paintCardImage($("#card-" + side + "-img-thumb"), id);
  }

  function resetCardImageDrafts(q) {
    cardImg.front = (q && q.imgFront) || "";
    cardImg.back = (q && q.imgBack) || "";
    cardImg.originalFront = cardImg.front;
    cardImg.originalBack = cardImg.back;
    renderCardImageField("front");
    renderCardImageField("back");
  }

  ["front", "back"].forEach((side) => {
    $("#card-" + side + "-img-btn").addEventListener("click", () => {
      $("#card-" + side + "-img-input").click();
    });
    $("#card-" + side + "-img-remove").addEventListener("click", () => {
      // Only bin it now if it was uploaded during this edit; an image the
      // card already had is kept until the edit is actually saved.
      const original = side === "front" ? cardImg.originalFront : cardImg.originalBack;
      if (cardImg[side] && cardImg[side] !== original) deleteImage(cardImg[side]);
      cardImg[side] = "";
      renderCardImageField(side);
    });
    $("#card-" + side + "-img-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const original = side === "front" ? cardImg.originalFront : cardImg.originalBack;
      storeImageFile(file).then((id) => {
        if (cardImg[side] && cardImg[side] !== original) deleteImage(cardImg[side]);
        cardImg[side] = id;
        renderCardImageField(side);
      }).catch((err) => {
        toast(err && err.message === "not-an-image"
          ? "That file isn't an image."
          : "Couldn't save that image — your device may be out of space.");
      });
    });
  });

  makeZoomable($("#card-front-img-thumb"));
  makeZoomable($("#card-back-img-thumb"));

  // Tags already in use, offered as one-tap chips so the same subject
  // doesn't end up as "cardio", "cardiology" and "Cardiology".
  function renderTagSuggestions() {
    const current = parseTags($("#card-tags").value);
    const available = allKnownTags().filter((t) => current.indexOf(t) === -1).slice(0, 12);
    const wrap = $("#card-tag-suggestions");
    wrap.innerHTML = "";
    wrap.classList.toggle("hidden", available.length === 0);
    available.forEach((tag) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip";
      chip.textContent = tag;
      chip.addEventListener("click", () => {
        $("#card-tags").value = current.concat(tag).join(", ");
        renderTagSuggestions();
      });
      wrap.appendChild(chip);
    });
  }

  $("#card-tags").addEventListener("input", renderTagSuggestions);

  function startEditCard(q) {
    editingCardId = q.id;
    applyCardKind(inferKind(q));
    $("#card-front").value = q.prompt;
    $("#card-back").value = q.answer;
    $("#card-tags").value = tagsOf(q).join(", ");
    renderTagSuggestions();
    resetCardImageDrafts(q);
    $("#card-save-btn").textContent = "Save changes";
    $("#card-cancel-btn").classList.remove("hidden");
    $("#card-front").focus();
  }

  function cancelEditCard() {
    // Anything uploaded but never saved is dropped rather than left behind.
    if (cardImg.front && cardImg.front !== cardImg.originalFront) deleteImage(cardImg.front);
    if (cardImg.back && cardImg.back !== cardImg.originalBack) deleteImage(cardImg.back);
    editingCardId = null;
    $("#card-front").value = "";
    $("#card-back").value = "";
    // Topics are sticky between cards: consecutive cards are nearly always
    // about the same thing, and retyping "cardiology, canine" forty times
    // is how a tag system stops being used.
    renderTagSuggestions();
    resetCardImageDrafts(null);
    // Stay in the same kind — you're almost always writing a run of them.
    $("#card-save-btn").textContent = CARD_KINDS[cardKind].saveLabel;
    $("#card-cancel-btn").classList.add("hidden");
  }

  function deleteCard(id) {
    const card = currentDeck.questions.find((q) => q.id === id);
    if (card) { deleteImage(card.imgFront); deleteImage(card.imgBack); }
    currentDeck.questions = currentDeck.questions.filter((q) => q.id !== id);
    delete currentDeck.mastery[id];
    if (currentDeck.essays) delete currentDeck.essays[id];
    upsertDeck(currentDeck);
    if (editingCardId === id) cancelEditCard();
    renderManageList();
  }

  $("#manage-cards-btn").addEventListener("click", () => {
    if (!currentDeck) return;
    openManageCards(currentDeck);
  });

  $("#card-cancel-btn").addEventListener("click", cancelEditCard);

  $("#card-save-btn").addEventListener("click", () => {
    if (!currentDeck) return;
    const front = $("#card-front").value.trim();
    const back = $("#card-back").value.trim();
    if (cardKind === "picture" && !cardImg.front) {
      toast("Pick the picture this card is about.");
      return;
    }
    if (!front && !cardImg.front) {
      toast(cardKind === "essay" ? "Add the question first." : "Add the front of the card first.");
      return;
    }
    if (!back && !cardImg.back) {
      toast(cardKind === "essay" ? "Add a model answer to compare against." : "Add the answer first.");
      return;
    }
    if (editingCardId) {
      const q = currentDeck.questions.find((qq) => qq.id === editingCardId);
      if (q) {
        q.prompt = front; q.answer = back; q.answerShort = back;
        q.kind = cardKind;
        q.tags = parseTags($("#card-tags").value);
        if (cardImg.originalFront && cardImg.originalFront !== cardImg.front) deleteImage(cardImg.originalFront);
        if (cardImg.originalBack && cardImg.originalBack !== cardImg.back) deleteImage(cardImg.originalBack);
        q.imgFront = cardImg.front;
        q.imgBack = cardImg.back;
      }
    } else {
      const newCard = {
        id: "m" + Date.now() + Math.random().toString(36).slice(2, 7),
        type: "manual",
        kind: cardKind,
        prompt: front,
        answer: back,
        answerShort: back,
        sourceSentence: "",
        tags: parseTags($("#card-tags").value),
        imgFront: cardImg.front,
        imgBack: cardImg.back,
      };
      currentDeck.questions.push(newCard);
      lastAddedCardId = newCard.id;
    }
    // The drafts are now the card's own images; don't let the reset bin them.
    cardImg.originalFront = cardImg.front;
    cardImg.originalBack = cardImg.back;
    upsertDeck(currentDeck);
    celebrateBadges(checkBadges());
    cancelEditCard();
    renderManageList();
  });

  $("#finish-deck-btn").addEventListener("click", () => {
    if (!currentDeck) return;
    burstConfetti(60);
    vibrate([15, 40, 15]);
    toast("Deck complete — nice work!");
    openDeckSummary(currentDeck);
  });

  // ---------------------------------------------------------------
  // FLASHCARDS
  // ---------------------------------------------------------------
  const flash = {
    order: [], index: 0, known: 0, learning: 0, flipped: false,
    sourceEntries: [], keepOrder: false, committed: null,
    sessionXp: 0, leveledUp: false, newLevel: null,
  };

  // A topic review spans decks, so neither the card nor the deck it belongs
  // to can be read off currentDeck any more. The pool holds both for the
  // cards in play, and grading routes each answer back to its own deck.
  const pool = { byId: new Map(), deckOfCard: new Map(), decks: new Map() };

  // Sessions are lists of {q, deck} entries, never cards alone.
  function withDeck(questions, deck) {
    return questions.map((q) => ({ q, deck }));
  }

  function setSessionPool(entries) {
    pool.byId.clear();
    pool.deckOfCard.clear();
    pool.decks.clear();
    entries.forEach(({ q, deck }) => {
      pool.byId.set(q.id, q);
      pool.deckOfCard.set(q.id, deck.id);
      if (!pool.decks.has(deck.id)) pool.decks.set(deck.id, deck);
    });
  }

  function poolDeckFor(qid) {
    return pool.decks.get(pool.deckOfCard.get(qid)) || currentDeck;
  }

  // Sessions are shuffled by default. Callers that have already put the
  // cards in a deliberate order — weakest first, say — pass keepOrder,
  // otherwise the shuffle here would quietly undo their work.
  function beginFlashcardsSession(entries, keepOrder) {
    setSessionPool(entries);
    flash.sourceEntries = entries;
    flash.keepOrder = !!keepOrder;
    flash.order = entries.map((e) => e.q.id);
    if (!keepOrder) shuffleArr(flash.order);
    flash.index = 0;
    flash.known = 0;
    flash.learning = 0;
    flash.sessionXp = 0;
    flash.leveledUp = false;
    flash.newLevel = null;
    renderFlashCard();
    showScreen("screen-flash");
  }

  // One entry point. When cards are due it reviews those; when none are,
  // it goes through the deck. The old pair did the same thing whenever
  // nothing was due, which just made you choose between identical doors.
  $("#start-review").addEventListener("click", () => {
    if (!currentDeck) return;
    const due = currentDeck.questions.filter((q) => isDue(currentDeck, q.id));
    beginFlashcardsSession(withDeck(due.length ? due : currentDeck.questions, currentDeck));
  });

  // Going through everything is still possible, just not offered as an
  // equal choice — it's the exception, not the default.
  $("#start-review-all").addEventListener("click", () => {
    if (!currentDeck) return;
    beginFlashcardsSession(withDeck(currentDeck.questions, currentDeck));
  });

  $("#flash-shuffle").addEventListener("click", () => {
    const remaining = shuffleArr(flash.order.slice(flash.index));
    flash.order = flash.order.slice(0, flash.index).concat(remaining);
    renderFlashCard();
    vibrate(10);
  });

  function currentFlashQuestion() {
    return pool.byId.get(flash.order[flash.index]);
  }

  function renderFlashCard() {
    if (flash.index >= flash.order.length) {
      finishFlashcards();
      return;
    }
    const q = currentFlashQuestion();
    const card = $("#flash-card");
    card.classList.remove("flipped", "fly-left", "fly-right");
    flash.flipped = false;
    flash.committed = null;
    $("#flash-commit").classList.remove("hidden");
    $("#flash-after").classList.add("hidden");
    $("#flash-tag").textContent = q.type === "define" ? "DEFINE" : q.type === "manual" ? "CARD" : "CLOZE";
    $("#flash-front-text").textContent = q.prompt;
    $("#flash-answer-text").textContent = q.answer;
    paintCardImage($("#flash-front-img"), q.imgFront);
    paintCardImage($("#flash-back-img"), q.imgBack);
    updateFlashZoomBtn();
    $("#flash-context-text").textContent = !q.sourceSentence ? "" : q.type === "define" ? q.sourceSentence : `"${q.sourceSentence}"`;
    $("#flash-known-count").textContent = flash.known;
    $("#flash-learning-count").textContent = flash.learning;
    $("#flash-progress").style.width = Math.round((flash.index / flash.order.length) * 100) + "%";
  }

  function flipFlashCard() {
    flash.flipped = !flash.flipped;
    $("#flash-card").classList.toggle("flipped", flash.flipped);
    updateFlashZoomBtn();
    vibrate(8);
  }

  // Only offered when the side you're actually looking at has a picture.
  function updateFlashZoomBtn() {
    const q = currentFlashQuestion();
    const id = q ? (flash.flipped ? q.imgBack : q.imgFront) : "";
    $("#flash-zoom-btn").classList.toggle("hidden", !id);
  }

  // The grade is given BEFORE the answer appears. Judging yourself
  // afterwards doesn't work: once you have seen it, it all looks familiar,
  // and there is no reason to press the one that means more work. Asked
  // while the answer is still hidden, the question is simply whether you
  // can produce it — which you either can or can't.
  const COMMIT_WORDS = { 2: "you knew it", 1: "you were shaky", 0: "you had no idea" };

  function commitFlash(quality) {
    if (flash.committed !== null) return;
    const q = currentFlashQuestion();
    const deck = poolDeckFor(q.id);
    flash.committed = quality;

    profile.stats.cardsGraded++;
    noteReviewed();
    if (sitting.active) sitting.done++;
    gradeQuestion(deck, q.id, quality);
    upsertDeck(deck);
    if (quality >= 1) flash.known++; else flash.learning++;

    const xpGain = quality === 2 ? XP_KNOWN : quality === 1 ? Math.round((XP_KNOWN + XP_LEARNING) / 2) : XP_LEARNING;
    const xpResult = addXp(xpGain);
    flash.sessionXp += xpGain;
    if (xpResult.leveledUp) { flash.leveledUp = true; flash.newLevel = xpResult.newLevel; }
    touchStreak();
    vibrate(quality === 0 ? [10, 40, 10] : [10]);

    flash.flipped = true;
    $("#flash-card").classList.add("flipped");
    updateFlashZoomBtn();
    $("#flash-commit").classList.add("hidden");
    $("#flash-after").classList.remove("hidden");
    $("#flash-said").textContent = "Before you looked, " + COMMIT_WORDS[quality] + ".";
    // Owning up is only offered when there is something to own up to.
    $("#flash-correct").classList.toggle("hidden", quality === 0);
    $("#flash-correct").disabled = false;
    $("#flash-correct").textContent = "I was off";
  }

  // The one honest correction the reveal can prompt: you said you knew it,
  // then read the answer and found you didn't.
  $("#flash-correct").addEventListener("click", () => {
    if (flash.committed === null || flash.committed === 0) return;
    const q = currentFlashQuestion();
    const deck = poolDeckFor(q.id);
    if (flash.committed >= 1) flash.known--; else flash.learning--;
    flash.learning++;
    flash.committed = 0;
    gradeQuestion(deck, q.id, 0);
    upsertDeck(deck);
    $("#flash-said").textContent = "Marked as missed. It will come back soon.";
    $("#flash-correct").disabled = true;
    $("#flash-correct").textContent = "Noted";
    vibrate([10, 30, 10]);
  });

  function advanceFlash() {
    const card = $("#flash-card");
    card.classList.add(flash.committed >= 1 ? "fly-right" : "fly-left");
    setTimeout(() => {
      flash.index++;
      renderFlashCard();
    }, 220);
  }

  $("#flash-next").addEventListener("click", advanceFlash);
  $("#commit-none").addEventListener("click", () => commitFlash(0));
  $("#commit-shaky").addEventListener("click", () => commitFlash(1));
  $("#commit-known").addEventListener("click", () => commitFlash(2));

  $("#flash-stage").addEventListener("click", () => {
    if (flash.committed === null) {
      toast("Say how it went first — that's the part that counts.");
      $("#flash-commit").classList.add("shake");
      setTimeout(() => $("#flash-commit").classList.remove("shake"), 400);
      vibrate([8, 30, 8]);
      return;
    }
    // Already committed; the card is showing its answer and stays there.
  });


  (function setupSwipe() {
    const card = $("#flash-card");
    let startX = 0, startY = 0, dx = 0, dragging = false;

    card.addEventListener("pointerdown", (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY; dx = 0;
      card.setPointerCapture(e.pointerId);
      card.style.transition = "none";
    });
    card.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
      }
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      card.style.transition = "";
      card.style.transform = "";
      if (Math.abs(dx) > 90 && flash.committed === null) commitFlash(dx > 0 ? 2 : 0);
      dx = 0;
    }
    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", endDrag);
  })();

  function buildExtrasHtml(sessionXp, leveledUp, newLevel, newlyBadges) {
    const lines = [`<div class="result-line xp">+${sessionXp} XP earned</div>`];
    if (leveledUp) lines.push(`<div class="result-line levelup">Level up — now level ${newLevel}</div>`);
    newlyBadges.forEach((b) => lines.push(
      `<div class="result-line badge"><span class="result-badge-icon">${b.icon}</span>Badge earned — ${b.label}</div>`
    ));
    return lines.join("");
  }

  function finishFlashcards() {
    const total = flash.known + flash.learning;
    const sat = endSitting(true);
    recordSession(total > 0 && flash.learning === 0);
    const bonus = addXp(XP_SESSION_BONUS);
    flash.sessionXp += XP_SESSION_BONUS;
    if (bonus.leveledUp) { flash.leveledUp = true; flash.newLevel = bonus.newLevel; }
    const newlyBadges = checkBadges();

    $("#results-score").textContent = `${flash.known}/${total}`;
    $("#results-sub").textContent = `Marked known: ${flash.known} · still learning: ${flash.learning}`;
    $("#results-extras").innerHTML = buildExtrasHtml(flash.sessionXp, flash.leveledUp, flash.newLevel, newlyBadges);

    const doneBanner = $("#sitting-done");
    if (sat) {
      const sc = scapeById(sat.scape);
      $("#sitting-done-icon").textContent = sc.icon;
      $("#sitting-done-sub").textContent =
        `${sat.cards} card${sat.cards === 1 ? "" : "s"} · ${sat.minutes} min` +
        (sat.scape === "silence" ? "" : ` · ${sc.label.toLowerCase()}`);
      doneBanner.classList.remove("hidden");
      burstConfetti(40);
    } else {
      doneBanner.classList.add("hidden");
    }

    $("#missed-wrap").classList.add("hidden");
    $("#results-retry-missed").classList.add("hidden");

    if (flash.leveledUp || newlyBadges.length) { burstConfetti(); vibrate([15, 40, 15]); }

    $("#results-retry").textContent = "Study these again";
    const retryEntries = flash.sourceEntries;
    const retryOrdered = flash.keepOrder;
    $("#results-retry").onclick = () => beginFlashcardsSession(retryEntries, retryOrdered);
    $("#results-home").onclick = () => { renderHome(); showScreen("screen-home"); };
    showScreen("screen-results");
  }

  // ---------------------------------------------------------------
  // ESSAY PRACTICE: write a long answer from memory, then compare it
  // against the card's model answer and grade yourself. Same
  // spaced-repetition scheduling as flashcards — just a much longer
  // answer, which is the part exams actually test.
  // ---------------------------------------------------------------
  const MAX_SAVED_ESSAY_CHARS = 6000;

  const essay = {
    order: [], index: 0, strong: 0, weak: [], revealed: false, lastWords: 0,
    sessionXp: 0, leveledUp: false, newLevel: null,
  };

  function countWords(text) {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function currentEssayQuestion() {
    return essay.order[essay.index];
  }

  function beginEssaySession(questions) {
    setSessionPool(withDeck(questions, currentDeck));
    essay.order = questions.slice();
    shuffleArr(essay.order);
    essay.index = 0;
    essay.strong = 0;
    essay.weak = [];
    essay.sessionXp = 0;
    essay.leveledUp = false;
    essay.newLevel = null;
    renderEssayQuestion();
    showScreen("screen-essay");
  }

  $("#start-sticking").addEventListener("click", () => {
    if (!currentDeck) return;
    const stuck = stickingPoints(currentDeck);
    if (!stuck.length) return;
    toast("Worst first. If a card keeps beating you, rewrite it.");
    beginFlashcardsSession(withDeck(stuck, currentDeck));
  });

  function essayCardsFor(deck) {
    const written = deck.questions.filter((q) => inferKind(q) === "essay");
    return written.length ? written : deck.questions;
  }

  $("#start-essay").addEventListener("click", () => {
    if (!currentDeck) return;
    beginEssaySession(essayCardsFor(currentDeck));
  });

  function renderEssayQuestion() {
    if (essay.index >= essay.order.length) {
      finishEssays();
      return;
    }
    const q = currentEssayQuestion();
    essay.revealed = false;
    $("#essay-question").textContent = q.prompt;
    paintCardImage($("#essay-question-img"), q.imgFront);
    $("#essay-input").value = "";
    $("#essay-word-count").textContent = "0";
    $("#essay-write-stage").classList.remove("hidden");
    $("#essay-review-stage").classList.add("hidden");
    $("#essay-progress").style.width =
      Math.round((essay.index / essay.order.length) * 100) + "%";

    window.scrollTo(0, 0);

    const previous = currentDeck.essays && currentDeck.essays[q.id];
    $("#essay-last-attempt").textContent = previous
      ? `Last attempt: ${previous.words} word${previous.words === 1 ? "" : "s"}, ${timeAgo(previous.at)}.`
      : "Write from memory — there's no word limit.";
  }

  $("#essay-input").addEventListener("input", () => {
    $("#essay-word-count").textContent = countWords($("#essay-input").value);
  });

  $("#essay-reveal-btn").addEventListener("click", () => {
    const text = $("#essay-input").value.trim();
    if (!text) {
      toast("Write your answer first — even a rough one.");
      return;
    }
    const q = currentEssayQuestion();
    const words = countWords(text);

    // Keep the attempt so the next round can show how it compared.
    currentDeck.essays = currentDeck.essays || {};
    currentDeck.essays[q.id] = {
      text: text.slice(0, MAX_SAVED_ESSAY_CHARS),
      words,
      at: Date.now(),
    };
    upsertDeck(currentDeck);

    essay.revealed = true;
    essay.lastWords = words;
    $("#essay-model-text").textContent = q.answer;
    paintCardImage($("#essay-model-img"), q.imgBack);
    $("#essay-your-text").textContent = text;
    $("#essay-your-count").textContent = `(${words} word${words === 1 ? "" : "s"})`;
    $("#essay-write-stage").classList.add("hidden");
    $("#essay-review-stage").classList.remove("hidden");
    window.scrollTo(0, 0);
    vibrate(8);
  });

  function gradeEssay(strong) {
    const q = currentEssayQuestion();
    profile.stats.cardsGraded++;
    noteReviewed();
    if (sitting.active) sitting.done++;
    gradeQuestion(currentDeck, q.id, strong);
    upsertDeck(currentDeck);
    if (strong) essay.strong++; else essay.weak.push(q);

    profile.stats.essaysWritten++;
    profile.stats.essayWords += essay.lastWords;
    profile.stats.longestEssay = Math.max(profile.stats.longestEssay, essay.lastWords);
    saveProfile(profile);

    const xpGain = strong ? XP_KNOWN : XP_LEARNING;
    const xpResult = addXp(xpGain);
    essay.sessionXp += xpGain;
    if (xpResult.leveledUp) { essay.leveledUp = true; essay.newLevel = xpResult.newLevel; }
    touchStreak();
    vibrate(strong ? [10] : [10, 40, 10]);

    essay.index++;
    renderEssayQuestion();
  }

  $("#essay-good").addEventListener("click", () => gradeEssay(true));
  $("#essay-again").addEventListener("click", () => gradeEssay(false));

  function finishEssays() {
    $("#sitting-done").classList.add("hidden");
    const total = essay.order.length;
    recordSession(total > 0 && essay.weak.length === 0);
    const bonus = addXp(XP_SESSION_BONUS);
    essay.sessionXp += XP_SESSION_BONUS;
    if (bonus.leveledUp) { essay.leveledUp = true; essay.newLevel = bonus.newLevel; }
    const newlyBadges = checkBadges();

    $("#results-score").textContent = `${essay.strong}/${total}`;
    $("#results-sub").textContent = `${total} essay${total === 1 ? "" : "s"} written · ${essay.weak.length} to revisit`;
    $("#results-extras").innerHTML = buildExtrasHtml(essay.sessionXp, essay.leveledUp, essay.newLevel, newlyBadges);

    const missedWrap = $("#missed-wrap");
    const missedList = $("#missed-list");
    $("#missed-title").textContent = "Worth another go";
    missedList.innerHTML = "";
    if (essay.weak.length > 0) {
      missedWrap.classList.remove("hidden");
      essay.weak.forEach((q) => {
        const item = document.createElement("div");
        item.className = "missed-item";
        item.innerHTML = `<div class="missed-q">${escapeHtml(q.prompt)}</div>`;
        missedList.appendChild(item);
      });
      $("#results-retry-missed").textContent = "Rewrite these only";
      $("#results-retry-missed").classList.remove("hidden");
      $("#results-retry-missed").onclick = () => beginEssaySession(essay.weak);
    } else {
      missedWrap.classList.add("hidden");
      $("#results-retry-missed").classList.add("hidden");
    }

    if (essay.weak.length === 0 || essay.leveledUp || newlyBadges.length) {
      burstConfetti();
      vibrate([15, 40, 15]);
    }

    $("#results-retry").textContent = "Write these again";
    $("#results-retry").onclick = () => beginEssaySession(essayCardsFor(currentDeck));
    $("#results-home").onclick = () => { renderHome(); showScreen("screen-home"); };
    showScreen("screen-results");
  }

  // ---------------------------------------------------------------
  // Tab bar + badge sheet wiring
  // ---------------------------------------------------------------
  function openTab(id) {
    if (id === "screen-cupboard") renderCupboard();
    else if (id === "screen-exams") renderExams();
    else if (id === "screen-room") renderRoom();
    else renderHome();
    showScreen(id);
  }

  $all(".tab").forEach((tab) => {
    tab.addEventListener("click", () => openTab(tab.dataset.tab));
  });

  ["#essay-question-img", "#essay-model-img"].forEach((sel) => makeZoomable($(sel)));

  $("#flash-zoom-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const q = currentFlashQuestion();
    if (!q) return;
    const id = flash.flipped ? q.imgBack : q.imgFront;
    if (id) openLightbox(id);
  });
  $("#lightbox-close").addEventListener("click", closeLightbox);
  $("#lightbox").addEventListener("click", closeLightbox);
  $("#badge-sheet-close").addEventListener("click", closeBadgeSheet);
  $("#badge-sheet-backdrop").addEventListener("click", closeBadgeSheet);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("#lightbox").classList.contains("hidden")) { closeLightbox(); return; }
    if (!$("#badge-sheet-wrap").classList.contains("hidden")) closeBadgeSheet();
  });

  // ---------------------------------------------------------------
  // Celebration: lightweight canvas confetti
  // ---------------------------------------------------------------
  let confettiParticles = [];
  let confettiRunning = false;
  function resizeConfettiCanvas() {
    const c = $("#confetti-canvas");
    c.width = window.innerWidth * (window.devicePixelRatio || 1);
    c.height = window.innerHeight * (window.devicePixelRatio || 1);
  }
  window.addEventListener("resize", resizeConfettiCanvas);

  function burstConfetti(count) {
    // The sound belongs to the moment, not to the animation — turning
    // motion off shouldn't take the celebration with it.
    Ambience.fanfare();
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = $("#confetti-canvas");
    if (!canvas.width) resizeConfettiCanvas();
    const dpr = window.devicePixelRatio || 1;
    const themed = getComputedStyle(document.documentElement).getPropertyValue("--confetti");
    const colors = themed
      ? themed.split(",").map((c) => c.trim()).filter(Boolean)
      : ["#a3781f", "#c99a3a", "#4c6b47", "#8f4235"];
    const cx = canvas.width / 2;
    const n = count || 24;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI + Math.PI;
      const speed = (1.4 + Math.random() * 2.6) * dpr;
      confettiParticles.push({
        x: cx + (Math.random() - 0.5) * 100 * dpr,
        y: canvas.height * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.6 * dpr,
        size: (2.5 + Math.random() * 2.5) * dpr,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife: 80 + Math.random() * 30,
      });
    }
    if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(stepConfetti); }
  }

  function stepConfetti() {
    const canvas = $("#confetti-canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gravity = 0.13 * (window.devicePixelRatio || 1);
    confettiParticles = confettiParticles.filter((p) => p.life < p.maxLife);
    for (const p of confettiParticles) {
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vrot;
      p.life++;
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (confettiParticles.length > 0) {
      requestAnimationFrame(stepConfetti);
    } else {
      confettiRunning = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ---------------------------------------------------------------
  // Study reminder (best-effort local notification, no push backend)
  // ---------------------------------------------------------------
  function renderReminderUI() {
    const sw = $("#reminder-switch");
    const on = !!profile.reminder.enabled;
    sw.classList.toggle("on", on);
    sw.setAttribute("aria-checked", String(on));
  }

  function toggleReminder() {
    if (!profile.reminder.enabled) {
      if (!("Notification" in window)) {
        toast("Notifications aren't supported in this browser.");
        return;
      }
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          profile.reminder.enabled = true;
          saveProfile(profile);
          renderReminderUI();
          toast("Reminder on — I'll nudge you if you haven't studied yet.");
        } else {
          toast("Notification permission blocked — enable it in your browser settings to use reminders.");
        }
      });
    } else {
      profile.reminder.enabled = false;
      saveProfile(profile);
      renderReminderUI();
    }
  }
  $("#reminder-switch").addEventListener("click", toggleReminder);
  $("#reminder-switch").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleReminder(); }
  });

  function maybeSendStreakReminder() {
    if (!profile.reminder.enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const today = todayStr();
    if (profile.streak.lastStudyDate === today) return;
    if (profile.reminder.lastNotifiedDate === today) return;
    if (new Date().getHours() < 12) return;
    try {
      new Notification("Keep your streak alive", {
        body: profile.streak.count > 0
          ? `You're on a ${profile.streak.count}-day streak — study a few cards before it resets.`
          : "You haven't studied today yet — a quick review only takes a minute.",
        icon: "icons/icon-192.png",
      });
    } catch (e) {}
    profile.reminder.lastNotifiedDate = today;
    saveProfile(profile);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") maybeSendStreakReminder();
  });

  // ---------------------------------------------------------------
  // PWA install prompt
  // ---------------------------------------------------------------
  let deferredInstallPrompt = null;
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!localStorage.getItem(DISMISS_KEY) && !isStandalone()) {
      $("#install-banner-text").textContent = "Install Doxa for the full app experience.";
      $("#install-btn").classList.remove("hidden");
      $("#install-banner").classList.remove("hidden");
    }
  });

  $("#install-btn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("#install-banner").classList.add("hidden");
  });

  $("#install-dismiss").addEventListener("click", () => {
    $("#install-banner").classList.add("hidden");
    localStorage.setItem(DISMISS_KEY, "1");
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (isIos() && !isStandalone() && !localStorage.getItem(DISMISS_KEY)) {
      $("#install-btn").classList.add("hidden");
      $("#install-banner-text").textContent = "Install: tap Share, then \"Add to Home Screen\".";
      $("#install-banner").classList.remove("hidden");
    }
    maybeSendStreakReminder();
  });

  // ---------------------------------------------------------------
  // Service worker
  // ---------------------------------------------------------------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  applyTheme();
  watchAutoTheme();
  resizeConfettiCanvas();

  // Some browsers refuse IndexedDB outright (Firefox on a file:// page,
  // strict private modes). Rather than offer a button that quietly does
  // nothing, find out first and hide the image fields if it won't work.
  imageStore.probe().then((ok) => {
    imagesSupported = ok;
    if (!ok) {
      $("#card-front-img-field").classList.add("hidden");
      $("#card-back-img-field").classList.add("hidden");
    }
  });

  if (!profile.name) {
    openProfileScreen(true);
  } else {
    renderHome();
    showScreen("screen-home");
  }
})();
