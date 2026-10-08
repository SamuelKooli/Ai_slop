(() => {
  "use strict";

  const canvas = document.querySelector("#arena");
  const ctx = canvas.getContext("2d");
  const $ = (selector) => document.querySelector(selector);
  let W = 960;
  let H = 600;
  const TAU = Math.PI * 2;

  const colors = {
    cyan: "#628e83",
    pink: "#ce8b8e",
    gold: "#d3ae69",
    violet: "#a394b9",
    blue: "#7fa8bb",
    white: "#f6f7ff"
  };

  let mode = "ready";
  let frameId = 0;
  let lastFrame = 0;
  let bestScore = readBest();
  let soundOn = false;
  let audioContext = null;
  let shake = 0;
  let toastTimer = 0;

  const keys = new Set();
  const enemies = [];
  const bullets = [];
  const particles = [];
  const stars = Array.from({ length: 95 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4 + 0.3,
    phase: Math.random() * TAU
  }));

  const player = {
    x: W / 2, y: H / 2, r: 13,
    hp: 100, maxHp: 100, speed: 255,
    angle: -Math.PI / 2, invulnerable: 0,
    dashTime: 0, dashCooldown: 0,
    dashX: 0, dashY: -1,
    fireTimer: 0
  };

  let score = 0;
  let kills = 0;
  let wave = 1;
  let waveTime = 30;
  let spawnTimer = 0;
  let weaponDamage = 1;


  const rarityColors = { Common: "#abb1c8", Uncommon: "#59f3dc", Rare: "#75baff", Epic: "#a794ff", Legendary: "#ffd773" };
  const gear = [
    { id: "pulse", name: "Pulse blaster", slot: "weapon", rarity: "Common", text: "Reliable single pulses.", shots: 1, speed: 590, damage: 1, rate: 1 },
    { id: "scatter", name: "Scattergun", slot: "weapon", rarity: "Uncommon", text: "Three spreading pellets; short range, slower fire.", shots: 3, speed: 380, damage: 0.65, rate: 1.7 },
    { id: "rail", name: "Rail lance", slot: "weapon", rarity: "Rare", text: "Fast bolts pierce four targets.", shots: 1, speed: 850, damage: 1.7, rate: 1.8, pierce: 3 },
    { id: "frost", name: "Frost needle", slot: "weapon", rarity: "Rare", text: "Rapid ice needles slow enemies by 35%.", shots: 1, speed: 620, damage: 0.65, rate: 0.65, frost: true },
    { id: "plasma", name: "Plasma mortar", slot: "weapon", rarity: "Epic", text: "Explosive plasma deals splash damage.", shots: 1, speed: 400, damage: 2, rate: 2.1, splash: 72 },
    { id: "nova", name: "Nova array", slot: "weapon", rarity: "Legendary", text: "Twin piercing energy bolts.", shots: 2, speed: 700, damage: 1.2, rate: 1.1, pierce: 2 },
    { id: "coil", name: "Recovery coil", slot: "relic", rarity: "Common", text: "Heal 10 hull when a new wave begins." },
    { id: "venom", name: "Venom injector", slot: "relic", rarity: "Uncommon", text: "Hits poison enemies for 3 seconds. Refreshes, never stacks." },
    { id: "magnetCore", name: "Warding charm", slot: "relic", rarity: "Rare", text: "Take 10% less damage from enemies and projectiles." },
    { id: "reactor", name: "Overclock reactor", slot: "relic", rarity: "Epic", text: "20% faster firing, but 15 less max hull." },
    { id: "phoenix", name: "Phoenix heart", slot: "relic", rarity: "Legendary", text: "Survive one fatal hit per run with 35% hull." }
  ];
  const metaUpgrades = [
    { id: "power", title: "ARSENAL", text: "+6% base damage per rank." },
    { id: "hull", title: "HULL", text: "+5 max hull per rank." },
    { id: "rapid", title: "HOTTER BARREL", text: "Increase firing speed with diminishing returns." },
    { id: "speed", title: "TRAIL BOOTS", text: "Increase movement speed with diminishing returns." },
    { id: "dash", title: "DASH BATTERY", text: "Improve dash recharge with diminishing returns." }
  ];

  const meta = readMeta();
  let elapsed = 0, threat = 1, bossSpawned = false, revived = false;
  let deathReport = "", baseTab = "upgrades", packResult = null, startWave = 1;
  const hostileShots = [];
  let selectedRelicSlot = 0;
  function readMeta() {
    const fresh = { points: 0, runs: 0, bestWave: 1, ranks: { power: 0, hull: 0, rapid: 0, speed: 0, dash: 0 },
      owned: ["pulse"], itemLevels: { pulse: 1 }, weapon: "pulse", relicSlots: 1, relics: [null], pity: 0 };
    try {
      const data = JSON.parse(localStorage.getItem("riftRunnersMetaV2"));
      if (!data || typeof data !== "object") return fresh;
      for (const key of ["points", "runs", "bestWave", "pity"]) {
        if (Number.isSafeInteger(data[key]) && data[key] >= 0) fresh[key] = data[key];
      }
      for (const key of Object.keys(fresh.ranks)) {
        if (Number.isSafeInteger(data.ranks?.[key]) && data.ranks[key] >= 0) fresh.ranks[key] = Math.min(10000, data.ranks[key]);
      }
      if (data.ranks?.speed === undefined && Number.isSafeInteger(data.ranks?.salvage) && data.ranks.salvage > 0) fresh.ranks.speed = Math.min(10000, data.ranks.salvage);
      if (Array.isArray(data.owned)) fresh.owned = [...new Set(["pulse", ...data.owned.filter(id => gear.some(g => g.id === id))])];
      for (const id of fresh.owned) fresh.itemLevels[id] = Number.isSafeInteger(data.itemLevels?.[id]) && data.itemLevels[id] > 0 ? Math.min(10000, data.itemLevels[id]) : 1;
      if (fresh.owned.includes(data.weapon) && gear.some(g => g.id === data.weapon && g.slot === "weapon")) fresh.weapon = data.weapon;
      if (Number.isSafeInteger(data.relicSlots)) fresh.relicSlots = Math.max(1, Math.min(5, data.relicSlots));
      const source = Array.isArray(data.relics) ? data.relics : [data.relic];
      const seen = new Set();
      fresh.relics = Array.from({ length: fresh.relicSlots }, (_, slot) => {
        const id = source[slot];
        if (!fresh.owned.includes(id) || !gear.some(g => g.id === id && g.slot === "relic") || seen.has(id)) return null;
        seen.add(id); return id;
      });
    } catch (_) {}
    return fresh;
  }

  function saveMeta() {
    try { localStorage.setItem("riftRunnersMetaV2", JSON.stringify(meta)); }
    catch (_) { showToast("Storage unavailable: progress lasts this session only."); }
  }
  function hasRelic(id) { return meta.relics.includes(id); }
  function slotCost() { return [15, 30, 50, 75][meta.relicSlots - 1]; }
  function buyRelicSlot() {
    if (!["ready", "gameover"].includes(mode) || meta.relicSlots >= 5 || meta.points < slotCost()) return;
    meta.points -= slotCost(); meta.relicSlots++; meta.relics.push(null);
    selectedRelicSlot = meta.relicSlots - 1; saveMeta(); showBase(); showToast("RELIC SLOT " + meta.relicSlots + " UNLOCKED");
  }
  function slotPurchaseCard() {
    const maxed = meta.relicSlots >= 5;
    const card = makeChoice(maxed ? "ALL 5 RELIC SLOTS UNLOCKED" : "UNLOCK RELIC SLOT " + (meta.relicSlots + 1),
      "Equip one different relic per slot. All equipped effects work together. Slots are permanent.",
      maxed ? "COMPLETE" : slotCost() + " POINTS", buyRelicSlot, "equipment");
    card.disabled = maxed || meta.points < slotCost(); return card;
  }
  function equipItem(id) {
    if (!["ready", "gameover"].includes(mode) || !meta.owned.includes(id)) return;
    const item = gear.find(g => g.id === id);
    if (!item) return;
    if (item.slot === "weapon") meta.weapon = id;
    else {
      const existing = meta.relics.indexOf(id);
      if (existing >= 0) meta.relics[existing] = null;
      else meta.relics[selectedRelicSlot] = id;
    }
    saveMeta(); showBase();
  }

  function itemLevel(id) { return id ? meta.itemLevels[id] || 1 : 1; }
  function itemPower(id) { return 1 + (itemLevel(id) - 1) * 0.08; }
  function relicStats(id) {
    const bonus = itemLevel(id) - 1;
    return { healing: 10 + bonus * 2, poison: 0.3 * (1 + bonus * 0.1),
      reduction: 0.1 + 0.35 * bonus / (bonus + 10),
      fireMultiplier: 0.8 - 0.3 * bonus / (bonus + 10),
      reviveFraction: 0.35 + 0.4 * bonus / (bonus + 10) };
  }
  function itemDescription(item) {
    if (item.slot === "weapon") return item.text + " Damage +" + Math.round((itemPower(item.id) - 1) * 100) + "% from item levels.";
    const stats = relicStats(item.id);
    const details = {
      coil: "Heal " + stats.healing + " hull when a new wave begins.",
      venom: "Hits poison for 3 seconds at " + stats.poison.toFixed(2) + "x base damage per second. Refreshes, never stacks.",
      magnetCore: "Take " + Math.round(stats.reduction * 100) + "% less damage.",
      reactor: Math.round((1 - stats.fireMultiplier) * 100) + "% faster firing, but 15 less max hull.",
      phoenix: "Revive once per run with " + Math.round(stats.reviveFraction * 100) + "% hull."
    };
    return details[item.id] || item.text;
  }

  function unlockedWave() { return Math.max(1, Math.min(meta.bestWave - 2, 1 + Math.floor(meta.ranks.power / 2) * 2)); }
  function showBase() {
    if (!["ready", "gameover"].includes(mode)) return;
    resetButton();
    selectedRelicSlot = Math.min(selectedRelicSlot, meta.relicSlots - 1);
    startWave = Math.min(startWave, unlockedWave());
    const cards = [];
    for (const tab of ["upgrades", "packs", "equipment"]) {
      const card = makeChoice(tab.toUpperCase(), tab === baseTab ? "Currently selected" : "Open " + tab, "", () => {
        baseTab = tab; showBase();
      }, tab === "packs" ? "pack" : tab);
      card.classList.add("base-tab"); cards.push(card);
    }
    if (baseTab === "upgrades") {
      for (const upgrade of metaUpgrades) {
        const rank = meta.ranks[upgrade.id], cost = 5 + rank * 3 + Math.floor(rank * rank / 4);
        const card = makeChoice(upgrade.title + " / RANK " + rank, upgrade.text + " Permanent; no rank cap.", cost + " POINTS", () => {
          if (meta.points < cost) return;
          meta.points -= cost; meta.ranks[upgrade.id]++; saveMeta(); showBase();
        }, upgrade.id);
        card.disabled = meta.points < cost; cards.push(card);
      }
      cards.push(slotPurchaseCard());
    } else if (baseTab === "packs") {
      const card = makeChoice("OPEN RIFT PACK", "One gear item. Common 45%, Uncommon 28%, Rare 17%, Epic 8%, Legendary 2%. Duplicates level up that item permanently. At least Rare every 10 packs.", "8 POINTS", openPack, "pack");
      card.classList.add("pack-card"); card.disabled = meta.points < 8; cards.push(card);
      if (packResult) {
        const reveal = makeChoice(packResult.item.name, itemDescription(packResult.item) + (packResult.duplicate ? " Duplicate fused: LV " + packResult.previousLevel + " -> LV " + itemLevel(packResult.item.id) + "." : " Added to your equipment at LV 1."), packResult.item.rarity.toUpperCase() + " / LV " + itemLevel(packResult.item.id), () => {
          baseTab = "equipment"; showBase();
        }, packResult.item.id);
        reveal.style.borderColor = rarityColors[packResult.item.rarity];
        reveal.classList.add("pack-reveal"); cards.push(reveal);
      }
      cards.push(makeChoice("GUARANTEE", "Rare or better in " + (10 - meta.pity) + " more packs. Packs use points earned after death.", "", () => {}, "points"));
    } else {
      cards.push(slotPurchaseCard());
      meta.relics.forEach((id, slot) => {
        const item = gear.find(g => g.id === id);
        const card = makeChoice("RELIC SLOT " + (slot + 1), item ? item.name + " / LV " + itemLevel(id) : "Empty. Select this slot, then choose a relic below.",
          selectedRelicSlot === slot ? "SELECTED" : "SELECT", () => { selectedRelicSlot = slot; showBase(); }, id || "equipment");
        card.classList.toggle("equipped", selectedRelicSlot === slot); cards.push(card);
      });
      for (const item of gear.filter(g => meta.owned.includes(g.id))) {
        const equipped = item.slot === "weapon" ? meta.weapon === item.id : hasRelic(item.id);
        const slot = meta.relics.indexOf(item.id);
        const action = item.slot === "weapon" ? (equipped ? "EQUIPPED" : "EQUIP") :
          equipped ? "REMOVE / SLOT " + (slot + 1) : "EQUIP / SLOT " + (selectedRelicSlot + 1);
        const card = makeChoice(item.name + " / LV " + itemLevel(item.id), itemDescription(item), action, () => equipItem(item.id), item.id);
        card.style.borderColor = rarityColors[item.rarity]; card.classList.toggle("equipped", equipped); cards.push(card);
      }
    }
    cards.push(makeChoice("STARTING WAVE " + startWave, "Unlock skips by reaching higher waves and buying Arsenal ranks. Highest available: " + unlockedWave() + ". Skipped waves award no points.", "CHANGE", () => {
      startWave = startWave >= unlockedWave() ? 1 : Math.min(unlockedWave(), startWave + 2); showBase();
    }, "skip"));
    setScreen("HANGAR // " + meta.points + " UPGRADE POINTS", "Fall. Upgrade.<br><em>Go further.</em>",
      deathReport || "Survive, defeat enemies, then collect permanent points after death. Upgrade and equip in the hangar before your next run.", "DROP IN / WAVE " + startWave, cards);
    updateHud();
  }

  function openPack() {
    if (!["ready", "gameover"].includes(mode) || meta.points < 8) return;
    meta.points -= 8;
    const roll = Math.random() * 100;
    let rarity = roll < 45 ? "Common" : roll < 73 ? "Uncommon" : roll < 90 ? "Rare" : roll < 98 ? "Epic" : "Legendary";
    if (meta.pity >= 9 && ["Common", "Uncommon"].includes(rarity)) rarity = "Rare";
    meta.pity = ["Rare", "Epic", "Legendary"].includes(rarity) ? 0 : meta.pity + 1;
    const pool = gear.filter(g => g.rarity === rarity && g.id !== "pulse");
    const item = pool[Math.floor(Math.random() * pool.length)], duplicate = meta.owned.includes(item.id);
    const previousLevel = duplicate ? itemLevel(item.id) : 0;
    if (!duplicate) meta.owned.push(item.id);
    meta.itemLevels[item.id] = previousLevel + 1;
    packResult = { item, duplicate, previousLevel }; saveMeta(); showBase(); playSound(820, 0.14);
  }
  function killEnemy(enemy) {
    const index = enemies.indexOf(enemy);
    if (index < 0) return;
    score += enemy.score * wave; kills++;

    burst(enemy.x, enemy.y, enemy.color, 13); enemies.splice(index, 1);
  }
  function hurtPlayer(damage) {
    if (player.invulnerable > 0 || mode !== "play") return;
    player.hp -= damage * (hasRelic("magnetCore") ? 1 - relicStats("magnetCore").reduction : 1); player.invulnerable = 0.65; shake = 9;
    burst(player.x, player.y, colors.pink, 12);
    if (player.hp <= 0) {
      if (hasRelic("phoenix") && !revived) {
        revived = true; player.hp = player.maxHp * relicStats("phoenix").reviveFraction; player.invulnerable = 2; showToast("PHOENIX HEART // SECOND CHANCE");
      } else { player.hp = 0; finishRun(); }
    }
  }


  function readBest() {
    try {
      return Number(localStorage.getItem("riftRunnersBest")) || 0;
    } catch (_) {
      return 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem("riftRunnersBest", String(bestScore));
    } catch (_) {
      // High scores still work for this run if storage is blocked.
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const oldW = W, oldH = H;
    const scale = Math.min(rect.width, rect.height) / 600;
    W = rect.width / scale; H = rect.height / scale;
    for (const entity of [player, ...enemies, ...bullets, ...hostileShots, ...particles, ...stars]) {
      entity.x *= W / oldW; entity.y *= H / oldH;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }

  new ResizeObserver(resizeCanvas).observe(canvas);
  resizeCanvas();

  function formatScore(value) {
    return String(Math.floor(value)).padStart(6, "0");
  }

  function updateHud() {
    $("#scoreHud").textContent = formatScore(score);
    $("#bestScore").textContent = formatScore(bestScore);
    $("#pointsTop").textContent = meta.points;
    $("#killsHud").textContent = kills;
    $("#waveHud").textContent = String(wave).padStart(2, "0");
    const time = Math.floor(elapsed);
    $("#survivalHud").textContent = Math.floor(time / 60) + ":" + String(time % 60).padStart(2, "0");
    $("#timeHud").textContent = Math.max(0, Math.ceil(waveTime));
    $("#healthText").textContent = Math.ceil(player.hp) + " / " + player.maxHp;
    $("#healthBar").style.width = Math.max(0, player.hp / player.maxHp * 100) + "%";
    const gun = gear.find(g => g.id === meta.weapon);
    $("#weaponName").textContent = gun.name;
    $("#weaponLevel").textContent = gun.rarity.toUpperCase() + " / LV " + itemLevel(gun.id);
    const weaponIcon = $("#weaponIcon");
    if (weaponIcon.dataset.icon !== meta.weapon) { weaponIcon.replaceChildren(RiftIcons.make(meta.weapon)); weaponIcon.dataset.icon = meta.weapon; }
    const relicHud = $("#relicHud");
    const signature = meta.relics.map((id, slot) => slot + ":" + id + ":" + itemLevel(id)).join("|");
    if (relicHud.dataset.loadout !== signature) {
      relicHud.replaceChildren();
      meta.relics.forEach((id, slot) => {
        const item = gear.find(g => g.id === id);
        const chip = document.createElement("div"); chip.className = "gear-chip relic-chip";
        const label = item ? item.name + ", level " + itemLevel(id) + ", slot " + (slot + 1) + ". " + itemDescription(item) : "Relic slot " + (slot + 1) + ": empty";
        chip.title = label; chip.setAttribute("aria-label", label);
        const note = document.createElement("small"); note.textContent = id ? (slot + 1) + " / LV " + itemLevel(id) : "SLOT " + (slot + 1);
        chip.append(RiftIcons.make(id || "equipment"), note); relicHud.append(chip);
      });
      relicHud.dataset.loadout = signature;
    }
    $("#dashReady").classList.toggle("cooldown", player.dashCooldown > 0);
    $("#dashReady").lastChild.textContent = player.dashCooldown > 0 ? " DASH " + player.dashCooldown.toFixed(1) + "s" : " DASH READY";
  }

  function setScreen(kicker, title, text, buttonText, choices) {
    $("#screenKicker").textContent = kicker;
    $("#screenTitle").innerHTML = title;
    $("#screenText").textContent = text;
    $("#mainButton").textContent = buttonText;
    $("#screenChoices").replaceChildren();
    if (choices) {
      const list = document.createElement("div");
      list.className = "choice-list";
      choices.forEach((choice) => list.appendChild(choice));
      $("#screenChoices").appendChild(list);
    }
    $("#screen").classList.remove("hidden");
  }

  function hideScreen() {
    $("#screen").classList.add("hidden");
  }

  function makeChoice(title, detail, trailing, callback, icon = "equipment") {
    const button = document.createElement("button");
    button.className = "choice"; button.type = "button";
    const copy = document.createElement("div"); copy.className = "choice-copy";
    const head = document.createElement("strong");
    const name = document.createElement("span"); name.textContent = title;
    const cost = document.createElement("span"); cost.className = "cost"; cost.textContent = trailing || "";
    const note = document.createElement("small"); note.textContent = detail;
    head.append(name, cost); copy.append(head, note);
    button.append(RiftIcons.make(icon), copy);
    button.addEventListener("click", () => {
      if (mode === "ready" || mode === "gameover") callback();
    });
    return button;
  }

  function showReady() { mode = "ready"; showBase(); }

  function beginRun() {
    score = 0;
    kills = 0;
    wave = startWave;
    elapsed = 0; bossSpawned = false; revived = false; hostileShots.length = 0;
    const gun = gear.find(g => g.id === meta.weapon);
    threat = 1 + meta.ranks.power * 0.025 + meta.ranks.rapid * 0.015 + Math.max(0, gun.damage * itemPower(gun.id) * gun.shots / gun.rate - 1) * 0.12;
    waveTime = 30;
    spawnTimer = 0.25;
    weaponDamage = 1 + meta.ranks.power * 0.06;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    player.x = W / 2;
    player.y = H / 2;
    player.maxHp = 100 + meta.ranks.hull * 5 - (hasRelic("reactor") ? 15 : 0);
    player.hp = player.maxHp;
    player.speed = 255 * (1 + 0.4 * meta.ranks.speed / (meta.ranks.speed + 6));
    player.invulnerable = 1.5;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.fireTimer = 0.1;
    hideScreen();
    mode = "play";
    updateHud();
    playSound(580, 0.08);
  }



  function startNextWave() {
    waveTime = 30; spawnTimer = 0.35;
    if (hasRelic("coil")) player.hp = Math.min(player.maxHp, player.hp + relicStats("coil").healing);
    showToast("WAVE " + String(wave).padStart(2, "0") + " // KEEP GOING");
  }

  function finishRun() {
    if (mode !== "play") return;
    const earned = Math.max(1, Math.floor(elapsed / 12 + kills / 10));
    meta.points += earned; meta.runs++; meta.bestWave = Math.max(meta.bestWave, wave);
    if (score > bestScore) bestScore = score;
    saveBest(); saveMeta(); mode = "gameover";
    deathReport = "Wave " + wave + " • " + Math.floor(elapsed) + "s survived • " + kills + " kills. Death recovered " + earned + " upgrade points.";
    showBase(); playSound(130, 0.2);
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1250);
  }


  function playSound(frequency, duration) {
    if (!soundOn) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start();
      osc.stop(audioContext.currentTime + duration);
    } catch (_) {
      // Sound is optional.
    }
  }

  function setDirection() {
    let dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    let dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
    const length = Math.hypot(dx, dy);
    if (length) {
      dx /= length;
      dy /= length;
      player.angle = Math.atan2(dy, dx);
    }
    return { x: dx, y: dy, moving: length > 0 };
  }

  function tryDash() {
    if (mode !== "play" || player.dashCooldown > 0) return;
    let { x, y, moving } = setDirection();
    if (!moving) {
      x = Math.cos(player.angle);
      y = Math.sin(player.angle);
    }
    player.dashX = x;
    player.dashY = y;
    player.dashTime = 0.2;
    player.dashCooldown = 0.75 + 1.6 / (1 + meta.ranks.dash * 0.2);
    player.invulnerable = Math.max(player.invulnerable, 0.36);
    burst(player.x, player.y, colors.cyan, 16);
    playSound(390, 0.09);
    updateHud();
  }

  function spawnEnemy() {
    if (enemies.length >= 130) return;
    const edge = Math.floor(Math.random() * 4), margin = 30;
    let x, y;
    if (edge === 0) { x = Math.random() * W; y = -margin; }
    else if (edge === 1) { x = W + margin; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + margin; }
    else { x = -margin; y = Math.random() * H; }
    const roll = Math.random();
    let kind = wave >= 4 && roll < 0.16 ? "spitter" : wave >= 2 && roll < 0.40 ? "zipper" : wave >= 3 && roll > 0.75 ? "bruiser" : "drifter";
    if (wave % 5 === 0 && !bossSpawned) { kind = "warden"; bossSpawned = true; showToast("RIFT WARDEN INCOMING"); }
    const scale = Math.pow(1.19, wave - 1) * threat;
    const data = {
      drifter: { r: 12, hp: 2.4, speed: 78, color: colors.pink, score: 10 },
      zipper: { r: 9, hp: 1.8, speed: 142, color: colors.gold, score: 16 },
      bruiser: { r: 19, hp: 9, speed: 58, color: colors.violet, score: 30 },
      spitter: { r: 14, hp: 5, speed: 70, color: colors.blue, score: 24 },
      warden: { r: 30, hp: 60, speed: 66, color: colors.gold, score: 150 }
    }[kind];
    enemies.push({ x, y, r: data.r, hp: data.hp * scale, maxHp: data.hp * scale,
      speed: data.speed + Math.min(190, (wave - 1) * 6), color: data.color, score: data.score,
      kind, wobble: Math.random() * TAU, poison: 0, poisonDps: 0, slow: 0, fire: 1.5 });
  }

  function shoot() {
    let target = null, nearest = 520;
    for (const enemy of enemies) {
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (distance < nearest) { nearest = distance; target = enemy; }
    }
    if (!target) return;
    const gun = gear.find(g => g.id === meta.weapon);
    const angle = Math.atan2(target.y - player.y, target.x - player.x);
    player.angle = angle;
    for (let n = 0; n < gun.shots; n++) {
      const a = angle + (n - (gun.shots - 1) / 2) * 0.18;
      bullets.push({ x: player.x + Math.cos(a) * 17, y: player.y + Math.sin(a) * 17,
        vx: Math.cos(a) * gun.speed, vy: Math.sin(a) * gun.speed,
        r: gun.splash ? 7 : 4, damage: weaponDamage * gun.damage * itemPower(gun.id),
        life: 1.2, pierce: gun.pierce || 0, splash: gun.splash || 0,
        hit: new Set(), color: rarityColors[gun.rarity], frost: gun.frost || false });
    }
    playSound(650, 0.035);
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU;
      const speed = 35 + Math.random() * 190;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.48,
        maxLife: 0.68,
        size: 1.5 + Math.random() * 3,
        color
      });
    }
  }



  function update(dt) {
    elapsed += dt;
    const direction = setDirection();
    const dashSpeed = player.dashTime > 0 ? 3.5 : 1;
    if (player.dashTime > 0) {
      player.x += player.dashX * player.speed * 3.5 * dt;
      player.y += player.dashY * player.speed * 3.5 * dt;
      player.dashTime = Math.max(0, player.dashTime - dt);
    } else if (direction.moving) {
      player.x += direction.x * player.speed * dt * dashSpeed;
      player.y += direction.y * player.speed * dt * dashSpeed;
    }
    player.x = Math.max(player.r + 10, Math.min(W - player.r - 10, player.x));
    player.y = Math.max(player.r + 30, Math.min(H - player.r - 10, player.y));
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.fireTimer -= dt;

    const fireRate = Math.max(0.07, 0.42 / (1 + meta.ranks.rapid * 0.1)) * gear.find(g => g.id === meta.weapon).rate * (hasRelic("reactor") ? relicStats("reactor").fireMultiplier : 1);
    if (player.fireTimer <= 0) {
      shoot();
      player.fireTimer = fireRate;
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.10, 0.95 * Math.pow(0.88, wave - 1) / Math.sqrt(threat)) * (0.8 + Math.random() * 0.4);
      if (wave >= 7) spawnEnemy();
    }

    waveTime -= dt;
    if (waveTime <= 0) {
      wave++;
      bossSpawned = false;
      startNextWave();
      return;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
      let spent = false;
      for (const enemy of enemies.slice()) {
        if (bullet.hit.has(enemy) || Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) >= enemy.r + bullet.r) continue;
        bullet.hit.add(enemy); enemy.hp -= bullet.damage;
        if (hasRelic("venom")) { enemy.poison = 3; enemy.poisonDps = weaponDamage * relicStats("venom").poison; }
        if (bullet.frost) enemy.slow = 2;
        burst(bullet.x, bullet.y, bullet.color, 4);
        if (bullet.splash) {
          for (const nearby of enemies.slice()) {
            if (nearby !== enemy && Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y) < bullet.splash) {
              nearby.hp -= bullet.damage * 0.7;
              if (nearby.hp <= 0) killEnemy(nearby);
            }
          }
          burst(enemy.x, enemy.y, bullet.color, 22);
        }
        if (enemy.hp <= 0) killEnemy(enemy);
        if (bullet.pierce <= 0) { spent = true; break; }
        bullet.pierce--;
      }
      if (spent || bullet.life <= 0 || bullet.x < -20 || bullet.x > W + 20 || bullet.y < -20 || bullet.y > H + 20) bullets.splice(i, 1);
    }
    for (const enemy of enemies.slice()) {
      if (enemy.poison > 0) {
        enemy.hp -= enemy.poisonDps * Math.min(dt, enemy.poison);
        enemy.poison = Math.max(0, enemy.poison - dt);
        if (enemy.hp <= 0) { killEnemy(enemy); continue; }
      }
      enemy.slow = Math.max(0, enemy.slow - dt);
      const dx = player.x - enemy.x, dy = player.y - enemy.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      enemy.wobble += dt * 5;
      const ranged = enemy.kind === "spitter" || enemy.kind === "warden";
      const move = ranged && distance < 230 ? -0.35 : 1;
      enemy.x += dx / distance * enemy.speed * dt * move * (enemy.slow > 0 ? 0.65 : 1);
      enemy.y += dy / distance * enemy.speed * dt * move * (enemy.slow > 0 ? 0.65 : 1);
      if (ranged) {
        enemy.fire -= dt;
        if (enemy.fire <= 0 && hostileShots.length < 160) {
          enemy.fire = Math.max(0.65, 2.2 - wave * 0.04);
          const base = Math.atan2(dy, dx);
          for (const offset of enemy.kind === "warden" ? [-0.3, 0, 0.3] : [0]) {
            hostileShots.push({ x: enemy.x, y: enemy.y, vx: Math.cos(base + offset) * 205, vy: Math.sin(base + offset) * 205, life: 5 });
          }
        }
      }
      if (distance < player.r + enemy.r) {
        hurtPlayer((enemy.kind === "warden" ? 30 : enemy.kind === "bruiser" ? 23 : 16) + Math.floor(wave / 4) * 2);
        if (mode !== "play") return;
      }
    }
    for (let i = hostileShots.length - 1; i >= 0; i--) {
      const shot = hostileShots[i];
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      if (Math.hypot(shot.x - player.x, shot.y - player.y) < player.r + 5) {
        hostileShots.splice(i, 1); hurtPlayer(12 + wave);
        if (mode !== "play") return;
      } else if (shot.life <= 0) hostileShots.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.08, dt);
      particle.vy *= Math.pow(0.08, dt);
      particle.life -= dt;
      if (particle.life <= 0) particles.splice(i, 1);
    }

    shake = Math.max(0, shake - dt * 27);
    if (score > bestScore) bestScore = score;
    updateHud();
  }

  function drawBackground(time) {
    ctx.fillStyle = "#e7e6ce"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#d4d8bb";
    for (const star of stars) {
      ctx.beginPath(); ctx.ellipse(star.x, star.y, 12 + star.r * 15, 5 + star.r * 6, star.phase, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#b5bea0"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(star.x, star.y); ctx.quadraticCurveTo(star.x - 3, star.y - 7, star.x + 2, star.y - 10); ctx.stroke();
    }
    ctx.strokeStyle = "#8a967b"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 35); ctx.stroke();
    ctx.strokeStyle = "#faf4df"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(16, 16, W - 32, H - 32, 30); ctx.stroke();
  }

  function drawEnemy(enemy, time) {
    const bob = Math.sin(time * 7 + enemy.wobble) * 2;
    const r = enemy.r;
    ctx.save(); ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = "#49544125"; ctx.beginPath(); ctx.ellipse(0, r * 0.8, r * 1.05, r * 0.35, 0, 0, TAU); ctx.fill();
    ctx.translate(0, bob);
    ctx.fillStyle = enemy.poison > 0 ? "#83ac65" : enemy.color;
    ctx.strokeStyle = "#403d46"; ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.5);
    ctx.bezierCurveTo(-r * 1.4, -r * 0.7, -r * 0.4, -r * 1.2, 0, -r);
    ctx.bezierCurveTo(r * 0.8, -r * 1.2, r * 1.3, -r * 0.2, r, r * 0.5);
    ctx.quadraticCurveTo(r * 0.7, r * 1.15, 0, r * 0.85);
    ctx.quadraticCurveTo(-r * 0.8, r * 1.1, -r, r * 0.5); ctx.fill(); ctx.stroke();
    if (enemy.kind === "warden" || enemy.kind === "bruiser") {
      ctx.fillStyle = "#f4d89c"; ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.6); ctx.lineTo(-r * 0.9, -r * 1.4); ctx.lineTo(-r * 0.2, -r * 0.9);
      ctx.moveTo(r * 0.7, -r * 0.6); ctx.lineTo(r * 0.9, -r * 1.4); ctx.lineTo(r * 0.2, -r * 0.9); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "#fff9eb";
    for (const x of [-r * 0.32, r * 0.32]) {
      ctx.beginPath(); ctx.ellipse(x, -r * 0.15, r * 0.23, r * 0.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#403d46"; ctx.beginPath(); ctx.arc(x + 1, -r * 0.1, Math.max(2, r * 0.09), 0, TAU); ctx.fill(); ctx.fillStyle = "#fff9eb";
    }
    ctx.strokeStyle = "#403d46"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-r * 0.25, r * 0.4); ctx.quadraticCurveTo(0, r * 0.55, r * 0.25, r * 0.35); ctx.stroke();
    if (enemy.slow > 0) { ctx.strokeStyle = "#6b9fb4"; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.stroke(); }
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = "#403d4640"; ctx.fillRect(-r, r + 6, r * 2, 4);
      ctx.fillStyle = "#a45f62"; ctx.fillRect(-r, r + 6, r * 2 * Math.max(0, enemy.hp / enemy.maxHp), 4);
    }
    ctx.restore();
  }

  function drawPlayer(time) {
    if (player.invulnerable > 0 && Math.floor(time * 18) % 2 === 0) return;
    ctx.save(); ctx.translate(player.x, player.y);
    ctx.fillStyle = "#49544130"; ctx.beginPath(); ctx.ellipse(0, 13, 17, 6, 0, 0, TAU); ctx.fill();
    const bob = Math.sin(time * 9) * (setDirection().moving ? 2 : 0.5);
    ctx.translate(0, bob); ctx.lineWidth = 2.5; ctx.strokeStyle = "#3d4546";
    ctx.fillStyle = "#628e83"; ctx.beginPath(); ctx.roundRect(-11, -2, 22, 19, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f1d7b6"; ctx.beginPath(); ctx.arc(0, -7, 11, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#55756b"; ctx.beginPath(); ctx.ellipse(0, -15, 14, 5, -0.1, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-8, -23, 16, 10, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#3d4546"; ctx.beginPath(); ctx.arc(-4, -7, 1.6, 0, TAU); ctx.arc(4, -7, 1.6, 0, TAU); ctx.fill();
    ctx.rotate(player.angle); ctx.fillStyle = "#cfb18c"; ctx.beginPath(); ctx.roundRect(6, -4, 20, 8, 3); ctx.fill(); ctx.stroke();
    if (player.dashTime > 0) { ctx.strokeStyle = "#628e8380"; ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(-35, -8); ctx.moveTo(-22, 5); ctx.lineTo(-42, 5); ctx.stroke(); }
    ctx.restore();
  }

  function draw(time) {
    ctx.save();
    if (shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawBackground(time);

    for (const bullet of bullets) {
      ctx.shadowColor = bullet.color;
      ctx.shadowBlur = 0;
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.r, 0, TAU);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (const shot of hostileShots) {
      ctx.fillStyle = colors.pink; ctx.beginPath(); ctx.arc(shot.x, shot.y, 5, 0, TAU); ctx.fill();
    }
    for (const enemy of enemies) drawEnemy(enemy, time);

    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

    drawPlayer(time);
    ctx.restore();
  }

  function loop(timestamp) {
    const dt = Math.min(0.04, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    if (mode === "play") update(dt);
    draw(timestamp / 1000);
    frameId = requestAnimationFrame(loop);
  }

  function resetButton() {
    $("#mainButton").classList.remove("is-locked");
    $("#mainButton").disabled = false;
  }

  $("#mainButton").addEventListener("click", () => {
    if (mode === "ready" || mode === "gameover") {
      resetButton();
      beginRun();
    }
  });

  $("#fullscreenButton").addEventListener("click", async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch (_) { showToast("Fullscreen unavailable. The arena still fills your window."); }
  });
  document.addEventListener("fullscreenchange", () => {
    $("#fullscreenButton").textContent = document.fullscreenElement ? "EXIT FULLSCREEN" : "FULLSCREEN";
  });
  $("#resetProgressButton").addEventListener("click", () => {
    if (!window.confirm("Reset all progress? This clears your points, upgrades, gear, item levels, wave record and high score. This cannot be undone.")) return;
    try {
      localStorage.removeItem("riftRunnersMetaV2");
      localStorage.removeItem("riftRunnersBest");
    } catch (_) {}
    Object.assign(meta, { points: 0, runs: 0, bestWave: 1, ranks: { power: 0, hull: 0, rapid: 0, speed: 0, dash: 0 },
      owned: ["pulse"], itemLevels: { pulse: 1 }, weapon: "pulse", relicSlots: 1, relics: [null], pity: 0 });
    bestScore = 0; score = 0; kills = 0; elapsed = 0; wave = 1; waveTime = 30; weaponDamage = 1;
    startWave = 1; selectedRelicSlot = 0; deathReport = ""; baseTab = "upgrades"; packResult = null; revived = false; bossSpawned = false;
    enemies.length = 0; bullets.length = 0; particles.length = 0; hostileShots.length = 0; keys.clear();
    player.maxHp = 100; player.hp = 100; player.speed = 255; player.x = W / 2; player.y = H / 2;
    player.dashTime = 0; player.dashCooldown = 0; player.invulnerable = 0;
    saveMeta(); saveBest(); mode = "ready"; showBase(); showToast("Progress reset. A fresh start.");
  });

  $("#soundButton").addEventListener("click", (event) => {
    soundOn = !soundOn;
    event.currentTarget.textContent = soundOn ? "SOUND ON" : "SOUND OFF";
    event.currentTarget.classList.toggle("sound-on", soundOn);
    if (soundOn) playSound(700, 0.08);
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    keys.add(key);
    if ((key === " " || key === "shift") && mode === "play") tryDash();
    if (key === "enter" && (mode === "ready" || mode === "gameover")) beginRun();

  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("blur", () => keys.clear());

  document.querySelectorAll("[data-key]").forEach((button) => {
    const key = button.dataset.key;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      keys.add(key);
    });
    const release = () => keys.delete(key);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  $("#mobileDash").addEventListener("pointerdown", (event) => {
    event.preventDefault();
    tryDash();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (mode === "ready" || mode === "gameover") beginRun();

    if (mode === "play" && event.pointerType === "touch") {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * W;
      const y = (event.clientY - rect.top) / rect.height * H;
      if (x < W * 0.36) keys.add("a");
      else if (x > W * 0.64) keys.add("d");
      if (y < H * 0.4) keys.add("w");
      else if (y > H * 0.65) keys.add("s");
    }
  });

  canvas.addEventListener("pointerup", () => {
    keys.delete("a"); keys.delete("d"); keys.delete("w"); keys.delete("s");
  });

  function startLoop() {
    if (!frameId) {
      lastFrame = performance.now();
      frameId = requestAnimationFrame(loop);
    }
  }

  function endRunMessage() {
    $("#runMessage").textContent = mode === "play" ? "DON'T STAND STILL." : "CATCH YOUR BREATH.";
  }

  document.querySelectorAll("[data-icon]").forEach(node => node.replaceChildren(RiftIcons.make(node.dataset.icon)));
  showReady();
  updateHud();
  startLoop();
})();