// ===== Garage / run logic (v16: weapons) =====
// Every stat is on one scale: 1000 = median, no caps. Upgrades: 3 cards (families) x 3 stats, each with its own tier.
const WORLDS = [
  { name: "Desert", terr: "sand" }, { name: "Jungle", terr: "rough" }, { name: "Flooded city", terr: "water" },
  { name: "Frozen tundra", terr: "ice" }, { name: "Canyon", terr: "rough" }, { name: "Volcanic field", terr: "heat" }];
const BODIES = Object.keys(Models.BODY).map(n => [n, Models.BODY[n].type]);
const BOSSES = [
  { name: "Scrap Golem", model: "Bulldozer", color: 0x9a5a2b, size: 4, kind: "golem", hp: 5000, pace: 0.9, arm: 1500, mr: 1000, phys: 2000, weapons: ["shotgun", "mines", "spiked"],
    what: "A slow wall of metal that drops scrap across the road. Big, heavy rides and rams at speed break it; it slows as it takes damage." },
  { name: "Sky Wyrm", model: "Dragon", color: 0x7b2cbf, size: 3, kind: "wyrm", hp: 12000, pace: 1.1, arm: 2000, mr: 6000, phys: 2500, weapons: ["flare", "acidspit", "firetrail"],
    what: "It flies above the road and only dips low to breathe fire on the pack. Hit it when it dives, or reach it with Jump or Wings. Magic resist protects you from the fire." },
  { name: "Juggernaut", model: "Tank", color: 0x2b2b33, size: 4.5, kind: "jugg", hp: 30000, pace: 1.2, arm: 4000, mr: 3000, phys: 5000, weapons: ["minigun", "rockets", "mines"],
    what: "Fast, heavily armoured and escorted by six hunters. Only big rams and crits get through its armour." }];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pick = a => a[Math.floor(Math.random() * a.length)];
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fmt = n => Math.round(n).toLocaleString('en-US');

let S;
const C = () => S.car;
const st = k => C().st[k];
const maxHP = () => st("Health");
// the pack grows every race: driving stats 6%, toughness 7%, the rest 3%
function rivalG() { return { drv: Math.pow(1.06, S.done), tough: Math.pow(1.07, S.done), other: Math.pow(1.03, S.done) }; }
function pace() { return st("Speed") / 1000 * (0.8 + 0.2 * Math.min(2.5, st("Off-road") / 1000)) * Math.pow(st("Handling") / 1000, 0.25); }
function rivalPace() { const g = rivalG().drv; return g * (0.8 + 0.2 * Math.min(2.5, g)) * Math.pow(g, 0.25); }
function pctFrom(r) { return clamp(0.5 / Math.pow(r, 1.6), 0.003, 0.99); }
function predicted() { return pctFrom(pace() / rivalPace()); }
function place(p) { return Math.max(1, Math.ceil(p * S.field)); }
function rivalPick() { const m = pick(BODIES)[0]; return { name: m + " #" + Math.floor(rand(1, 2500)), model: m }; }
function hunterCount() { return S.race === 6 && S.chapter === 3 ? 6 : 1 + clamp(Math.floor((pace() / rivalPace() - 0.9) * 4), 0, 3); }
function elimCount() { return 1; }   // only the last-placed racer is eliminated, AI included
function boss() { const B = BOSSES[S.chapter - 1]; B.speed = Math.round(1000 * rivalG().drv * B.pace); return B; }   // set against the pack
function prepRace() {
  const str = rand(0.8, 1.4), b = rivalPick();
  S.bounty = { name: b.name, model: b.model, str };
  S.hunters = Array.from({ length: hunterCount() }, rivalPick);
  S.next = pick(WORLDS); S.gotBounty = false; S.phase = "pre";
}
function newRun(bodyName) {
  const b = Models.BODY[bodyName];
  S = { chapter: 1, race: 1, done: 0, field: 100, gold: 0, phase: "pre", options: [], shop: [], rerolled: false, hunterKnown: false, openFam: null,
    car: { name: bodyName, type: b.type, ability: Stats.ABIL[bodyName], wings: false, weapons: [], st: Object.assign({}, Stats.RIDES[bodyName]), hp: Stats.RIDES[bodyName].Health, buys: 0, picks: 0 } };
  S.log = ["2,500 racers enter the tournament. You are one of them, riding a " + bodyName + ".", "Chapter 1 boss: the " + boss().name + "."];
  prepRace(); render();
}
function backToMenu() { Menu.show(); }
function toggleFam(f) { S.openFam = S.openFam === f ? null : f; render(); }

// ---------- upgrades ----------
function rollTier(base) {
  const l = (st("Luck") - 1000) / 1000, lb = Math.floor(l) + (Math.random() < l - Math.floor(l) ? 1 : 0);
  return Math.max(1, base + Math.floor(rand(-2, 3)) + lb);
}
const PACK = { driving: "Speed demon", defence: "Ironhide", terrain: "Pathfinder", hunting: "Scavenger", weapons: "Brawler" };
const famStats = f => Stats.FAMS[f].stats.filter(k => !Stats.UNUSED.has(k));
const PACK_FAMS = Stats.FAM_KEYS.filter(f => f !== "weapons" && famStats(f).length >= 3);   // Brawler package stays out for v16 (deferred)
function makePackage(fam, base) {
  const items = shuffle(famStats(fam)).slice(0, 3).map(stat => ({ stat, tier: rollTier(base - 1) }));
  const others = shuffle(Stats.ACTIVE.filter(k => !items.some(u => u.stat === k)));
  for (let i = 0; i < 2; i++) items.push({ stat: others[i], tier: rollTier(base - 1) });
  if (!C().wings && Math.random() < 0.1) items[4] = { stat: "Wings", tier: 0 };   // rare: wings for any ride
  return { fam, name: PACK[fam], items };
}
function offerCards(base, lean) {
  S.baseTier = base;
  const fams = [lean && PACK_FAMS.includes(lean) ? lean : pick(PACK_FAMS)];
  for (const f of shuffle(PACK_FAMS)) if (fams.length < 3 && !fams.includes(f)) fams.push(f);
  S.options = fams.map(f => makePackage(f, base)); S.options[0].lean = !!lean;
  S.phase = "reward";
}
function applyUp(u) {
  const c = C(), before = maxHP();
  if (u.stat === "Wings") { c.wings = true; return; }
  Stats.applyTier(c.st, u.stat, u.tier); c.picks++;
  if (u.stat === "Health") c.hp += maxHP() - before;
}
function upText(u) { return u.stat === "Wings" ? "Wings" : Stats.INFO[u.stat][0] + " " + Stats.effect(u.tier) + " (tier " + u.tier + ")"; }
function choose(ci) { const p = S.options[ci]; p.items.forEach(applyUp); S.log.push("Took the " + p.name + " package: " + p.items.map(upText).join(", ") + "."); offerWeapons(); }
function chooseRepair() { C().hp = maxHP(); S.log.push("Fully repaired instead of upgrading."); offerWeapons(); }

// ---------- weapons (v16): a second pick after every race, 1 of 3 ----------
function offerWeapons() {
  const l = (st("Luck") - 1000) / 1000, base = clamp(Weapons.pickBase(S.done) + (S.wBonus || 0) + (Math.random() < l - Math.floor(l) ? 1 : 0) + Math.floor(l), 1, 10);
  S.wBonus = 0; S.wOffer = Weapons.offer(3, base); S.wSel = null; S.phase = "weapon"; render();
}
function takeWeapon(i) {
  const c = C(), w = S.wOffer[i];
  if (c.weapons.length < 3) { c.weapons.push(w); S.log.push("New weapon: " + Weapons.label(w) + " in slot " + c.weapons.length + "."); return openShop(); }
  S.wSel = S.wSel === i ? null : i; render();
}
function replaceWeapon(slot) {
  const c = C(), w = S.wOffer[S.wSel]; if (!w) return;
  S.log.push("Swapped " + Weapons.label(c.weapons[slot]) + " in slot " + (slot + 1) + " for " + Weapons.label(w) + ".");
  c.weapons[slot] = w; openShop();
}
function skipWeapon() { S.log.push("Skipped the weapon pick."); openShop(); }
function shopTier() { return rollTier(clamp(1 + Math.floor(Math.pow(Math.random(), 1.5) * 5) + (S.chapter - 1) * 2, 1, 9)) + (C().name === "Shopping trolley" ? 1 : 0); }
function genShop(n) { return Array.from({ length: n }, () => { const t = shopTier(); return { stat: pick(Stats.ACTIVE), tier: t, price: 10 + Math.min(t, 14) * Math.min(t, 14) * 2 }; }); }
function openShop() { S.shop = genShop(S.gotBounty ? 5 : 3); S.rerolled = false; S.phase = "shop"; render(); }
function price(u) { return Math.round(u.price * (1 + 0.25 * C().buys)); }
function buy(i) { const u = S.shop[i]; if (u.sold || S.gold < price(u)) return; S.gold -= price(u); C().buys++; applyUp(u); u.sold = true; S.log.push("Bought " + upText(u) + "."); render(); }
function repair() { S.gold -= 25; C().hp = Math.min(maxHP(), C().hp + maxHP() * 0.4); render(); }
function reroll() { S.gold -= 10; S.rerolled = true; S.shop = genShop(S.shop.length); render(); }
function reveal() { S.gold -= 20; S.hunterKnown = true; render(); }

// ---------- races ----------
function bossParams() {
  const B = boss(), G = rivalG(), s = Stats.rival(B.model, G, 1);
  Object.assign(s, { Speed: B.speed, Accel: Math.max(1000, B.speed), Handling: Math.max(1500, B.speed), "Off-road": 2000, Health: B.hp, Armour: B.arm, "Magic resist": B.mr, Physical: B.phys, Regen: 0, Lifesteal: 0 });
  return { name: B.name, model: B.model, color: B.color, size: B.size, kind: B.kind, stats: s, weapons: B.weapons.map(id => ({ id, tier: 1 + S.chapter })) };   // stronger versions of player weapons
}
function raceParams() {
  const c = C(), isBoss = S.race === 6;
  return { world: S.next.name, stats: Object.assign({}, c.st), weapons: c.weapons.slice(), rivalPicks: S.done, playerHP: c.hp, playerModel: c.name, playerAbility: c.ability, wings: !!c.wings, chapter: S.chapter, rivalG: rivalG(),
    gridSlot: Math.round(predicted() * (S.field - 1)), nRivals: S.field - 1, elimCount: elimCount(), boss: isBoss ? bossParams() : null,
    targetName: S.bounty.name, targetModel: S.bounty.model, targetStr: S.bounty.str,
    hunterNames: S.hunters.map(h => h.name), hunterModels: S.hunters.map(h => h.model), hunterKnown: S.hunterKnown };
}
function driveRace(seed) {
  if (document.activeElement) document.activeElement.blur();
  const ec = elimCount(), isBoss = S.race === 6;
  const P = raceParams();
  if (seed) P.seed = seed;
  if (typeof Net !== 'undefined' && Net.active()) {
    // everyone in this race gets the same track; other players' cars come in live, yours goes out
    P.remote = Net.remoteCars; P.send = Net.sendCar; P.myName = Net.me().n;
    P.nRivals = Math.max(8, S.field - Net.players().filter(p => p.presence.al).length);
    Net.raceStart();
  }
  Race.startRace(P, (rank, total, res) => {
    if (typeof Net !== 'undefined' && Net.active()) Net.raceEnd();
    const head = (isBoss ? "Boss race" : "Race " + S.race) + ", chapter " + S.chapter + ": the " + S.next.name + ". ";
    if (res.crashed || res.destroyed || res.bossBeatYou) {
      S.done++; C().hp = 0;
      S.log.push(head + (res.bossBeatYou ? "The " + boss().name + " crossed the line before you." : res.crashed ? "You fell into a pit." : "Your ride was wrecked mid-race.") + " Run over.");
      S.phase = "over"; return render();
    }
    C().hp = res.hp;
    if (isBoss) return resolveBoss({ driven: true, share: res.bossShare, wrecked: res.bossDead, rank, total, kills: res.playerKills, coins: res.coins, raceDamage: res.damage, newField: total - 1 - res.deadRivals });
    const elim = rank > total - ec;
    const pct = elim ? 0.9 : Math.min((rank - 0.5) / total, 0.84);
    resolveRace(pct, { driven: true, rank, total, newField: total - ec - res.deadRivals, kills: res.playerKills, bounty: res.bountyClaimed, raceDamage: res.damage, deadRivals: res.deadRivals,
      hunterKills: res.hunterKills, air: res.airTime, coins: res.coins, shortcuts: res.shortcuts });
  });
}
function simDamage() { return Math.max(0, Math.round(90 * rivalG().tough * (1 + 0.12 * Math.min(3, S.done)) * rand(0.5, 1.5) * 2000 / (1000 + st("Armour")) - st("Shield") / 10)); }   // the Shield soaks some of it   // rivals carry weapons too
const wScore = () => Weapons.simScore(C().weapons) * (st("Physical") + st("Magic")) / 2000;
function simRace() {
  S.log.push("(Quick sim)");
  resolveRace(clamp(pctFrom(pace() / rivalPace()) + gauss() * 0.12, 0.002, 1), {});
}
function resolveRace(pct, o) {
  const c = C(), w = S.next, pred = predicted(), G = rivalG(), goldK = st("Gold") / 1000;
  const rank = place(pct), predRank = place(pred), power = maxHP() / (1000 * G.tough);
  let dmg = 0, kills, gotBounty;
  if (o.driven) { kills = o.kills || 0; gotBounty = !!o.bounty; }
  else { const wk = 1 + wScore(); dmg = simDamage(); kills = Math.floor(Math.random() * 1.6 * power * wk); gotBounty = Math.random() < clamp(0.3 * power * wk * st("Bounty") / 1000 / S.bounty.str, 0.03, 0.85); }
  const air = o.driven ? o.air : rand(1, 5) * st("Jump") / 1000, shortcuts = o.driven ? o.shortcuts : Math.round(rand(0, 3) * Math.min(1, st("Off-road") / 1500));
  const hKills = o.driven ? (o.hunterKills || 0) : (Math.random() < 0.25 * power ? 1 : 0), coins = o.driven ? o.coins : Math.round(rand(3, 15));
  S.log.push("Race " + S.race + ", chapter " + S.chapter + ": the " + w.name + ".");
  S.log.push("Finished " + rank + " of " + S.field + " (predicted " + predRank + "). Lost " + fmt(o.driven ? o.raceDamage : dmg) + " health. Wrecked " + kills + " rival(s)" + (o.deadRivals ? "; " + o.deadRivals + " racers were wrecked or fell in total." : "."));
  S.done++;
  c.hp -= dmg;
  if (c.hp <= 0) { S.log.push("Your ride was wrecked. Run over."); S.phase = "over"; return render(); }
  if (rank >= S.field) { S.log.push("You finished last and were eliminated. Run over."); S.phase = "over"; return render(); }
  const hpFrac = clamp(c.hp / maxHP(), 0, 1);
  let gold = (Math.round(30 * (1 - pct)) + Math.round(Math.max(0, pred - pct) * 80) + kills * 6 + hKills * 15 + coins) * goldK;
  if (hKills) S.log.push("You wrecked " + hKills + " of your hunters!");
  if (coins) S.log.push("Collected " + coins + " coins" + (c.name === "Ice cream van" ? " (doubled by Sweet deals)" : "") + ".");
  if (pct < pred) S.log.push("You beat your prediction.");
  if (gotBounty) { const b = Math.round(40 * S.bounty.str * goldK * st("Bounty") / 1000); gold += b; S.log.push("You wrecked your bounty target, " + S.bounty.name + "! +" + b + " gold and a bigger shop."); }
  if (c.name === "Ice cream van") gold = (gold + coins * goldK) * 1.5;
  gold = Math.round(gold); S.gold += gold; S.log.push("Earned " + gold + " gold.");
  const before = S.field;
  S.field = o.driven ? Math.max(8, o.newField) : Math.max(8, S.field - 1 - Math.floor(rand(1, 6)));
  S.log.push((before - S.field) + " racers didn't make it. " + S.field + " left.");
  if (c.type === "bio") c.hp = maxHP();
  S.gotBounty = gotBounty;
  // ---- race score: it isn't just about being fast ----
  const parts = [["finish", 40 * (1 - pct)], ["beat prediction", Math.min(30, Math.max(0, pred - pct) * 40)], ["wrecks", kills * 10], ["bounty", gotBounty ? 25 : 0],
    ["hunters", hKills * 8], ["airtime", Math.min(15, air * 2)], ["shortcuts", shortcuts * 6], ["health left", hpFrac * 10]];
  const score = Math.round(parts.reduce((a, p) => a + p[1], 0));
  let tier = clamp(Math.round(score / 11) + (S.chapter - 1), 1, 10);
  if (c.name === "Shopping trolley") tier = Math.min(10, tier + 1);
  S.log.push("RACE SCORE " + score + " = " + parts.filter(p => p[1] >= 0.5).map(p => p[0] + " " + Math.round(p[1])).join(" + "));
  S.log.push("Your score sets a base tier of " + tier + ". Each upgrade in each package rolls around it.");
  const FAMOF = { finish: "driving", "beat prediction": "driving", wrecks: "defence", bounty: "hunting", hunters: "defence", airtime: "terrain", shortcuts: "terrain", "health left": "defence" };
  const best = parts.slice().sort((a, b) => b[1] - a[1])[0];
  offerCards(tier, FAMOF[best[0]]); render();
}
function simBoss() {
  const B = boss(), dealt = 700 * (1 + 1.5 * wScore()) * maxHP() / 1000 * (1 + st("Crit") / 10000) * (st("Bounty") / 1000) * 2000 / (1000 + B.arm) * rand(0.7, 1.3);
  const share = clamp(dealt / B.hp, 0, 1), slowed = B.speed * (1 - 0.5 * Math.min(1, share + 0.25));
  S.log.push("(Quick sim)");
  C().hp -= Math.round(simDamage() * 1.5);
  if (C().hp <= 0) { S.done++; S.log.push("The " + B.name + " wrecked you. Run over."); S.phase = "over"; return render(); }
  if (st("Speed") * 0.85 * rand(0.92, 1.08) < slowed) { S.done++; S.log.push("Boss race: the " + B.name + " crossed the line before you. Run over."); S.phase = "over"; return render(); }
  resolveBoss({ share, wrecked: share >= 0.75, newField: Math.max(8, Math.round(S.field * 0.8)) });
}
function resolveBoss(o) {
  const c = C(), B = boss(), goldK = st("Gold") / 1000;
  S.done++;
  S.log.push("Boss race vs the " + B.name + ": you took off " + Math.round(o.share * 100) + "% of its health" + (o.wrecked ? " and it was WRECKED." : " and beat it to the line.") + (o.driven ? " You finished " + o.rank + " of " + o.total + "." : ""));
  if (S.chapter === 3) { S.phase = "win"; return render(); }
  const gold = Math.round((40 * S.chapter + 300 * S.chapter * o.share + (o.wrecked ? 150 * S.chapter : 0) + (o.coins || 0)) * goldK); S.gold += gold;
  S.log.push("+" + gold + " gold for your part in the fight.");
  if (o.newField) S.field = Math.max(8, o.newField);
  if (c.type === "bio") c.hp = maxHP();
  S.gotBounty = false;
  const tier = o.wrecked && o.share >= 0.2 ? 10 : clamp(Math.round(3 + o.share * 14 + (S.chapter - 1)), 1, 10);
  S.wBonus = Math.round(o.share * 4);   // more boss damage, higher-tier weapon pick
  S.log.push(tier === 10 && o.wrecked ? "Wrecking the boss earns base tier 10." : "Your damage earns a base tier of " + tier + ".");
  offerCards(tier); render();
}
function nextRace() {
  if (S.race === 6) {
    S.chapter++; S.race = 1; S.field = 100;
    S.log.push("Chapter " + S.chapter + " begins. Circuits merge: 100 racers. The boss will be the " + boss().name + ".");
  } else S.race++;
  prepRace(); render();
  if (typeof Net !== 'undefined' && Net.active()) Net.toGarage();
}

// ---------- views ----------
const kmh = v => Math.round(v / 10) + " km/h";
function upBtn(u, on, extra) {
  const cur = st(u.stat), nv = Object.assign({}, { v: cur }); const tmp = { [u.stat]: cur }; Stats.applyTier(tmp, u.stat, u.tier);
  return '<div class="uItem" onclick="' + on + '"><span class="uT" style="background:' + Stats.tierCol(u.tier) + '">T' + u.tier + '</span>' +
    '<div><b>' + Stats.INFO[u.stat][0] + ' ' + Stats.effect(u.tier) + '</b><br><small>' + fmt(cur) + ' &rarr; <b>' + fmt(tmp[u.stat]) + '</b> &middot; ' + Stats.INFO[u.stat][2](tmp[u.stat]) + '</small></div>' + (extra || '') + '</div>';
}
function upLine(u) {
  if (u.stat === "Wings") return '<div class="uItem"><span class="uT" style="background:#fff">W</span><div><b>Wings</b><br><small>Glide after ramps and drops: hold accelerate in the air</small></div></div>';
  const cur = st(u.stat), tmp = { [u.stat]: cur }; Stats.applyTier(tmp, u.stat, u.tier);
  return '<div class="uItem"><span class="uT" style="background:' + Stats.tierCol(u.tier) + '">T' + u.tier + '</span><div><b>' + Stats.INFO[u.stat][0] + ' ' + Stats.effect(u.tier) + '</b><br><small>' + fmt(cur) + ' &rarr; <b>' + fmt(tmp[u.stat]) + '</b></small></div></div>';
}
const VIEWS = {
  pre: () => {
    const G = rivalG(), multi = typeof Net !== 'undefined' && Net.active(), isBoss = S.race === 6, B = boss();
    const raceButtons = multi
      ? '<br><b>Vote:</b> <button class="' + (Net.myVote() === 'drive' ? 'on' : '') + '" onclick="Net.castVote(\'drive\')">Drive it</button><button class="' + (Net.myVote() === 'sim' ? 'on' : '') + '" onclick="Net.castVote(\'sim\')">Simulate it</button>' +
        ' <span class="dim">' + (Net.myVote() ? 'You voted ' + (Net.myVote() === 'drive' ? 'DRIVE' : 'SIMULATE') + '. Waiting for the others...' : 'The race starts for everyone once all players have voted.') + '</span>'
      : '<br><button onclick="driveRace()">Drive the race!</button><button onclick="' + (isBoss ? 'simBoss()' : 'simRace()') + '">Quick sim</button>';
    const cmp = '<div class="cmp"><div><span>You</span><b>' + kmh(st("Speed")) + '</b><small>' + fmt(C().hp) + ' / ' + fmt(maxHP()) + ' health</small></div>' +
      '<div><span>Average rival</span><b>' + kmh(1000 * G.drv) + '</b><small>' + fmt(1000 * G.tough) + ' health' + (S.done ? ' &middot; <span class="bad">+' + Math.round((G.drv - 1) * 100) + '% speed since race 1</span>' : '') + '</small></div>' +
      (isBoss ? '<div class="bossC"><span>' + B.name + '</span><b>' + kmh(B.speed) + '</b><small>' + fmt(B.hp) + ' health &middot; armour ' + fmt(B.arm) + '</small></div>' : '') + '</div>';
    if (isBoss) return '<h2>Boss race: the ' + B.name + '</h2>' + B.what + cmp +
      'The boss starts on the grid with everyone, as fast as the pack or faster. <b class="bad">If it crosses the finish line before you, your run ends.</b> It slows down as it loses health, and the more of its health you take off, the better your reward. Wrecking it earns a tier 10 card.' +
      '<br>World: <b>' + S.next.name + '</b> &middot; ' + (S.field - 1) + ' other survivors race with you.' + raceButtons;
    return '<h2>Next race: ' + S.next.name + '</h2>' + S.field + ' racers. You start around <b>' + place(predicted()) + '</b> on the grid. Only <b>last place</b> is eliminated.' + cmp +
      'Bounty target: <b style="color:#ffd166">' + S.bounty.name + '</b> - marked in gold in the race. Wreck it to claim the bounty.' +
      '<br>Hunting you: <b style="color:#c77dff">' + S.hunters.length + ' hunter' + (S.hunters.length > 1 ? 's' : '') + '</b> ' + (S.hunterKnown ? '(' + S.hunters.map(h => h.name).join(', ') + ') - marked in purple' : '- identities unknown') +
      '<br><span class="dim">Your base upgrade tier comes from your race score: finish position, beating your prediction, wrecks, bounty, hunters wrecked, airtime, shortcuts and health left.</span>' + raceButtons;
  },
  reward: () => '<h2>Pick one package <span class="dim" style="font-size:14px;font-weight:400">you get all 5 upgrades &middot; base tier ' + S.baseTier + ' &middot; tiers 1-9 add 50 each, tier 10+ multiplies</span></h2><div class="row">' +
    S.options.map((p, ci) => { const F = Stats.FAMS[p.fam]; return '<div class="ucard pack" style="--c:' + F.color + '" onclick="choose(' + ci + ')"><div class="uHead">' + p.name + (p.lean ? ' <span class="dim" style="font-weight:400">&middot; how you raced</span>' : '') + '</div>' + p.items.map(u => upLine(u)).join('') + '<button>Take ' + p.name + '</button></div>'; }).join('') + '</div>' +
    (C().type === "mech" && C().hp < maxHP() - 1 ? '<button onclick="chooseRepair()">Full repair instead (' + fmt(C().hp) + ' / ' + fmt(maxHP()) + ')</button>' : ''),
  weapon: () => {
    const c = C(), full = c.weapons.length >= 3;
    return '<h2>Pick a weapon <span class="dim" style="font-size:14px;font-weight:400">' + (full ? 'all 3 slots are full: a new weapon replaces one you choose, or skip' : 'it goes into an empty slot &middot; ' + c.weapons.length + ' of 3 used') + '</span></h2>' +
      '<div class="dim" style="margin-bottom:6px">Your slots: ' + Weapons.slotsLine(c.weapons) + '</div><div class="row">' +
      S.wOffer.map((w, i) => { const d = Weapons.DEFS[w.id]; return '<div class="ucard pack' + (S.wSel === i ? ' on' : '') + '" style="--c:' + Weapons.SLOT_COL[d.slot] + '" onclick="takeWeapon(' + i + ')"><div class="uHead">' + Weapons.label(w) + '</div>' + Weapons.card(w) + '<button>' + (full ? (S.wSel === i ? 'Selected' : 'Choose') : 'Take it') + '</button></div>'; }).join('') + '</div>' +
      (full && S.wSel !== null ? '<div style="margin:8px 0"><b>Replace which slot?</b> ' + c.weapons.map((w, i) => '<button onclick="replaceWeapon(' + i + ')">Slot ' + (i + 1) + ': ' + Weapons.label(w) + '</button>').join('') + '</div>' : '') +
      '<button onclick="skipWeapon()">Skip the weapon</button>';
  },
  shop: () => {
    const c = C();
    return '<h2>Garage shop - ' + S.gold + ' gold</h2><div class="row">' + S.shop.map((u, i) => u.sold ? '<div class="ucard sold">Sold</div>' :
      '<div class="ucard' + (S.gold < price(u) ? ' poor' : '') + '" style="--c:' + Stats.FAMS[Stats.famOf(u.stat)].color + '"><div class="uHead">' + Stats.FAMS[Stats.famOf(u.stat)].label + ' &middot; ' + price(u) + ' gold</div>' + upBtn(u, 'buy(' + i + ')') + '</div>').join('') + '</div>' +
      '<button onclick="repair()" ' + (c.type !== "mech" || c.hp >= maxHP() - 1 || S.gold < 25 ? "disabled" : "") + '>Repair 40% (25 gold)</button>' +
      '<button onclick="reroll()" ' + (S.rerolled || S.gold < 10 ? "disabled" : "") + '>Reroll shop, once (10 gold)</button>' +
      '<button onclick="reveal()" ' + (S.hunterKnown || S.gold < 20 ? "disabled" : "") + '>Reveal your hunters (20 gold)</button>' +
      '<button onclick="nextRace()">' + (S.race === 5 ? "On to the boss" : S.race === 6 ? "Next chapter" : "Next race") + ' &rarr;</button>';
  },
  over: () => '<h2 class="bad">Run over</h2>You reached chapter ' + S.chapter + ', ' + (S.race === 6 ? 'the boss' : 'race ' + S.race) + ' with a ' + C().name + ' at ' + fmt(maxHP()) + ' health (size x' + (maxHP() / 1000).toFixed(2) + ').<br>' +
    (typeof Net !== 'undefined' && Net.active()
      ? '<button onclick="newRun(C().name);Net.toGarage()">Start a fresh run (joins the next race)</button><button onclick="Net.leave();backToMenu()">Leave the game</button>'
      : '<button onclick="backToMenu()">Back to the menu</button><button onclick="newRun(C().name)">Same ride again</button>'),
  win: () => '<h2 class="good">You survived the whole tournament!</h2>Your ' + C().name + ' finished at ' + fmt(maxHP()) + ' health, ' + (maxHP() / 1000).toFixed(1) + ' times normal size.<br><button onclick="backToMenu()">Back to the menu</button>'
};
function render() {
  const c = C(), hpPct = clamp(c.hp / maxHP(), 0, 1) * 100;
  document.getElementById("hud").innerHTML =
    '<div class="gTop"><div><b>Chapter ' + S.chapter + '</b> &middot; ' + (S.race < 6 ? 'Race ' + S.race + ' of 5' : '<b class="bad">BOSS</b>') + '</div><div>Racers left <b>' + S.field + '</b></div><div>Gold <b style="color:#ffd23f">' + S.gold + '</b></div><div>Boss: <b>' + boss().name + '</b></div></div>' +
    '<div class="gRide"><div><b style="font-size:18px">' + c.name + '</b> <span class="dim">' + (c.type === "bio" ? "biological: heals after every race" : "mechanical: damage sticks until repaired") + ' &middot; size x' + (maxHP() / 1000).toFixed(2) + '</span><br>' +
    'Ability <b style="color:' + Stats.ABILITY[c.ability].color + '">' + c.ability + '</b> (Space): ' + Stats.ABILITY[c.ability].desc + (c.wings ? ' &middot; <b class="good">Wings</b>' : '') +
    '<br>Weapons (keys 1, 2, 3): ' + Weapons.slotsLine(c.weapons) + '</div>' +
    '<div class="gHP"><div style="width:' + hpPct.toFixed(1) + '%;background:' + (hpPct > 60 ? '#4caf50' : hpPct > 30 ? '#ffb703' : '#e63946') + '"></div><span>' + fmt(Math.max(0, c.hp)) + ' / ' + fmt(maxHP()) + ' health</span></div></div>' +
    Stats.panel(c.st, S.openFam, 'toggleFam', rivalG());
  document.getElementById("main").innerHTML = VIEWS[S.phase]();
  document.getElementById("log").textContent = S.log.slice(-14).join("\n");
  if (typeof Net !== 'undefined' && Net.active()) {
    if ((S.phase === 'over' || S.phase === 'win') && Net.me().al) Net.out();
    Net.renderPanel();
  }
}
window.addEventListener('error', e => { const l = document.getElementById('log'); if (l) l.textContent = 'ERROR: ' + e.message + '\n' + l.textContent; });

// ===== Multiplayer over the page's live room =====
// Everything travels in presence (anyone viewing may set it): name, ride, status, vote, car state.
// The host (first to join) publishes decisions: start the tournament, and each race's mode, world and seed.
// Without a room (opened as a local file, or not shared with you) the game is single-player.
const Net = (function () {
  let room = null, multi = false, lastE = 0, myVote = null, hostSince = 0;
  const me = { n: '', j: Date.now(), st: 'menu', ride: null, rd: false, al: true };
  let carCache = null, raceE = 0, lastHeard = {};
  const redraw = () => { try { if (typeof Menu !== 'undefined') Menu.lobbyRefresh(); if (typeof render === 'function' && S && document.getElementById('players')) renderPanel(); } catch (e) {} };

  // ---- a stand-in room for testing two tabs locally (only with ?mockroom) ----
  function mockRoom() {
    const bc = new BroadcastChannel('rr-mock'), peer = Math.random().toString(36).slice(2, 10), others = new Map();
    let mine = {}, handlers = [], snap = Object.freeze([]), pending = false;
    const rebuild = () => {
      const now = Date.now(), list = [{ peer, presence: Object.freeze({ ...mine }), isMe: true, sameTab: true, kind: 'viewer', guest: false, by: null, updatedAt: now }];
      for (const [p, o] of others) { if (now - o.seen > 4000) { others.delete(p); continue; } list.push({ peer: p, presence: o.presence, isMe: false, sameTab: false, kind: 'viewer', guest: false, by: null, updatedAt: o.at }); }
      snap = Object.freeze(list);
      if (!pending) { pending = true; setTimeout(() => { pending = false; handlers.forEach(h => h({ peers: snap, joined: [], left: [], updated: [] })); }, 16); }
    };
    bc.onmessage = e => { const m = e.data; if (m.peer === peer) return; if (m.bye) others.delete(m.peer); else others.set(m.peer, { presence: Object.freeze(m.presence), seen: Date.now(), at: Date.now() }); rebuild(); };
    setInterval(() => { bc.postMessage({ peer, presence: mine }); rebuild(); }, 1000);
    window.addEventListener('beforeunload', () => bc.postMessage({ peer, bye: true }));
    rebuild();
    return {
      presence: async patch => { for (const k in patch) { if (patch[k] === null) delete mine[k]; else mine[k] = patch[k]; } bc.postMessage({ peer, presence: mine }); rebuild(); },
      peers: () => snap, onPeers: h => { handlers.push(h); setTimeout(() => h({ peers: snap, joined: snap, left: [], updated: [] }), 0); return () => {}; },
      connected: () => true
    };
  }

  async function init() {
    try {
      if (/mockroom/.test(location.search)) room = mockRoom();
      else if (window.claude && window.claude.use) room = await window.claude.use('room');
    } catch (e) { room = null; }
    if (!room) return false;
    room.onPeers(onPeers, () => { room = null; multi = false; redraw(); });
    return true;
  }
  const available = () => !!room;
  function send(patch) { Object.assign(me, patch); if (room && multi) room.presence(patch).catch(() => {}); }
  const players = () => room ? room.peers().filter(p => p.kind === 'viewer' && p.presence && p.presence.n && p.presence.st && p.presence.st !== 'menu') : [];
  function host() { const ps = players().slice().sort((a, b) => (a.presence.j - b.presence.j) || (a.peer < b.peer ? -1 : 1)); return ps[0] || null; }
  const isHost = () => { const h = host(); return !!(h && h.sameTab); };
  const nameOf = p => String(p.presence.n || 'Someone').slice(0, 18);

  // ---- lobby ----
  function join(name) { multi = true; me.n = String(name).slice(0, 18); send({ n: me.n, j: me.j, st: 'lobby', rd: false, al: true }); }
  function leave() { send({ st: 'menu', rd: false, car: null, v: null }); multi = false; }
  function setRide(ride, ready) { send({ ride, rd: !!ready }); }
  function startTournament() { if (!isHost()) return; decide({ k: 'begin' }); }

  // ---- votes and decisions ----
  function decide(d) { d.e = lastE + 1; d.t = Date.now(); send({ d }); }
  // everyone still in the tournament gets a say: players still racing or shopping are waited for (the host can force a start)
  function voters() { return players().filter(p => p.presence.al && (p.presence.st === 'garage' || p.presence.st === 'race')); }
  function castVote(m) { myVote = m; send({ v: { e: lastE + 1, m } }); redraw(); checkVotes(); }
  function tally() {
    const vs = voters(), e = lastE + 1, c = { drive: 0, sim: 0 };
    let n = 0; for (const p of vs) { const v = p.presence.v; if (v && v.e === e && c[v.m] !== undefined) { c[v.m]++; n++; } }
    return { c, n, total: vs.length };
  }
  function resolveMode(force) {
    const t = tally();
    if (!force && (t.total === 0 || t.n < t.total)) return null;
    const mode = t.c.drive > t.c.sim ? 'drive' : t.c.sim > t.c.drive ? 'sim' : (Math.random() < 0.5 ? 'drive' : 'sim');
    return { mode, tie: t.c.drive === t.c.sim, c: t.c };
  }
  function checkVotes(force) {
    if (!multi || !isHost()) return;
    const r = resolveMode(force); if (!r) return;
    decide({ k: 'race', m: r.mode, tie: r.tie, dv: r.c.drive, sv: r.c.sim, w: Math.floor(Math.random() * WORLDS.length), seed: 1 + Math.floor(Math.random() * 2e9) });
  }
  function forceStart() { checkVotes(true); }

  function onPeers() {
    // the newest decision anyone is showing (normally the host's)
    let best = null;
    for (const p of players()) { const d = p.presence.d; if (d && typeof d.e === 'number' && d.e > lastE && (!best || d.e > best.e)) best = d; }
    if (best) handleDecision(best);
    if (isHost()) { if (!hostSince) hostSince = Date.now(); checkVotes(); } else hostSince = 0;
    redraw();
  }
  function handleDecision(d) {
    lastE = d.e; myVote = null;
    if (!multi) return;
    if (d.k === 'begin') { if (me.st === 'lobby' && me.ride) { Menu.hide(); newRun(me.ride); toGarage(); } return; }
    if (d.k === 'race') {
      if (me.st !== 'garage' || !S || S.phase !== 'pre' || !me.al) { S && S.log && S.log.push('A race started while you were busy. You sat this one out.'); redraw(); return; }
      const how = d.m === 'drive' ? 'DRIVE' : 'SIMULATE';
      S.log.push('The players voted ' + d.dv + ' drive / ' + d.sv + ' simulate' + (d.tie ? ' - a tie, so it was chosen at random' : '') + ': ' + how + '.');
      S.next = WORLDS[d.w % WORLDS.length];
      raceE = d.e;
      send({ rd: false, v: null });
      if (d.m === 'drive') driveRace(d.seed);
      else if (S.race === 6) simBoss();
      else simRace();
    }
  }
  function toGarage() { send({ st: 'garage', rd: true, al: true, v: null, car: null, info: info() }); redraw(); }
  function notReady() { send({ rd: false, info: info() }); }
  function out() { send({ al: false, rd: false, car: null, st: 'garage', info: info() }); }
  function info() { return S ? { ch: S.chapter, rc: S.race, f: S.field, ride: S.car ? S.car.name : me.ride } : null; }

  // ---- in a race: my car out, everyone else's in ----
  function raceStart() { send({ st: 'race', re: raceE }); }
  function sendCar(c) { if (!multi) return; send({ car: c }); }
  function raceEnd() { send({ car: null, st: 'garage', rd: false, info: info() }); }
  function remoteCars() {
    if (!room || !multi) return [];
    return players().filter(p => !p.sameTab && p.presence.car && p.presence.re === raceE).map(p => ({ peer: p.peer, name: nameOf(p), car: p.presence.car }));
  }
  const othersInRace = () => remoteCars().length;

  // ---- players panel in the garage ----
  function renderPanel() {
    const el = document.getElementById('players'); if (!el) return;
    if (!multi) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const h = host(), t = tally(), e = lastE + 1;
    const rows = players().map(p => {
      const pr = p.presence, i = pr.info || {}, v = pr.v && pr.v.e === e ? pr.v.m : null;
      const status = pr.st === 'race' ? 'racing' : !pr.al ? 'out' : pr.st === 'lobby' ? 'in the lobby' : pr.rd ? (v ? 'voted ' + (v === 'drive' ? 'DRIVE' : 'SIMULATE') : 'ready to vote') : 'in the garage';
      return '<div class="pl' + (p.sameTab ? ' you' : '') + '"><b>' + esc(nameOf(p)) + '</b>' + (p.sameTab ? ' (you)' : '') + (h && h.peer === p.peer ? ' <span class="dim">host</span>' : '') +
        '<span>' + esc(i.ride || pr.ride || '') + (i.ch ? ' · ch ' + i.ch + ' race ' + i.rc : '') + '</span><em>' + status + '</em></div>';
    }).join('');
    el.innerHTML = '<h2>Players</h2>' + rows +
      '<div class="dim" style="margin-top:6px">Votes for the next race: <b>' + t.c.drive + '</b> drive · <b>' + t.c.sim + '</b> simulate · ' + t.n + ' of ' + t.total + ' ready players voted. A split is decided at random.</div>' +
      (isHost() && t.n > 0 && t.n < t.total ? '<button onclick="Net.forceStart()">Start now without the rest</button>' : '');
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { init, available, active: () => multi, join, leave, setRide, startTournament, players, isHost, host, nameOf, esc,
    castVote, myVote: () => myVote, forceStart, tally, toGarage, notReady, out, raceStart, sendCar, raceEnd, remoteCars, othersInRace, renderPanel,
    raceSeed: () => raceE, me: () => me };
})();

// ===== Start menu: title screen + ride selection with a 3D preview =====
const Menu = (function () {
  const STATS = [["Speed", "spd", 0.75, 1.3], ["Handling", "hdl", 0.7, 1.4], ["Health", "hp", 60, 200], ["Armour", "arm", 0.6, 1.8],
    ["Ramming", "ram", 0.5, 1.6], ["Off-road", "off", 0.6, 1.35], ["Jump", "jump", 0.55, 1.65]];
  let toonGrad = null;
  let el, tab = "bio", selected = "Horse", renderer, scene, camera, holder, rafId = null, t0 = 0, legs = [], wheels = [];

  function names(type) { return Object.keys(Models.BODY).filter(n => Models.BODY[n].type === type); }

  function build() {
    el = document.getElementById('menu');
    el.innerHTML = `
      <div id="mTitle" class="mScreen">
        <div class="mLogo">RACING<br>ROGUELIKE</div>
        <div class="mTag">2,500 racers enter. Five races a chapter. One boss. Survive.</div>
        <div class="mName"><label for="mNameIn">Your racer name</label><input id="mNameIn" maxlength="18" placeholder="Type a name" autocomplete="off"></div>
        <div class="mBtns"><button class="mBig" id="mTogether" onclick="Menu.together()" disabled>Play together</button><button class="mBig mAlt" onclick="Menu.solo()">Play solo</button></div>
        <div id="mNetNote" class="dim">Checking for other players...</div>
        <div class="mQual">Graphics: <button id="qHigh" onclick="Menu.setQ('high')">High</button><button id="qLow" onclick="Menu.setQ('low')">Low</button>
          <span class="dim">High adds glow, outlines, swaying grass and sharper shadows. Use Low if the race stutters.</span></div>
        <div class="mHow">
          <div><b>Race</b> point to point through a random world. The bottom 15% are eliminated.</div>
          <div><b>Score</b> from your finish, wrecks, your bounty, airtime, shortcuts and health left. It sets your upgrade tier.</div>
          <div><b>Upgrade</b> between races. Rivals get stronger every race, and the stronger you get, the more hunters come for you.</div>
        </div>
      </div>
      <div id="mLobby" class="mScreen" style="display:none">
        <div class="mHead"><button onclick="Menu.leaveLobby()">&larr; Leave</button><h2>Lobby</h2><span class="dim">Everyone with this page open can join.</span></div>
        <div id="mLobbyList"></div>
        <div id="mLobbyAct"></div>
      </div>
      <div id="mSelect" class="mScreen" style="display:none">
        <div class="mHead"><button onclick="Menu.toTitle()">&larr; Back</button><h2>Choose your ride</h2><span class="dim">Test mode: all 20 are unlocked.</span></div>
        <div class="mBody">
          <div class="mLeft">
            <div class="mTabs"><button id="tabBio" onclick="Menu.setTab('bio')">Biological</button><button id="tabMech" onclick="Menu.setTab('mech')">Mechanical</button></div>
            <div id="mTypeNote" class="dim"></div>
            <div id="mGrid" class="mGrid"></div>
          </div>
          <div class="mRight">
            <canvas id="mPreview" width="460" height="300"></canvas>
            <div id="mInfo"></div>
            <button class="mBig" id="mStart" onclick="Menu.start()">Start run</button>
          </div>
        </div>
      </div>`;
  }

  function setTab(t) {
    tab = t;
    if (Models.BODY[selected].type !== t) selected = names(t)[0];
    document.getElementById('tabBio').className = t === 'bio' ? 'on' : '';
    document.getElementById('tabMech').className = t === 'mech' ? 'on' : '';
    document.getElementById('mTypeNote').innerHTML = t === 'bio'
      ? 'Living mounts: lower health, but they <b>heal fully after every race</b>.'
      : 'Machines: tougher, but <b>damage sticks</b> until you repair.';
    document.getElementById('mGrid').innerHTML = names(t).map(n => {
      const b = Models.BODY[n], col = '#' + new THREE.Color(Models.get(n).palette[0]).getHexString();
      return '<div class="mTile' + (n === selected ? ' sel' : '') + '" onclick="Menu.pick(\'' + n + '\')"><span class="sw" style="background:' + col + '"></span><b>' + n + '</b><small>' + Stats.ABIL[n] + '</small></div>';
    }).join('');
    pick(selected);
  }

  let openFam = 'driving';
  function fam(f) { openFam = openFam === f ? null : f; pick(selected); }
  function pick(n) {
    selected = n;
    document.querySelectorAll('.mTile').forEach(t => t.classList.toggle('sel', t.textContent.startsWith(n)));
    const b = Models.BODY[n];
    document.getElementById('mInfo').innerHTML =
      '<h2 style="margin:6px 0 2px">' + n + ' <span class="dim" style="font-size:14px">' + (b.type === 'bio' ? 'Biological' : 'Mechanical') + '</span></h2>' +
      Stats.panel(Stats.RIDES[n], openFam, 'Menu.fam') +
      '<div class="mAb">Size <b>x' + b.size.toFixed(2) + '</b> - size and weight come from Health. Heavier rides push lighter ones aside, and a ride twice another\'s size runs it over.</div>' +
      '<div class="mAb"><b style="color:' + Stats.ABILITY[Stats.ABIL[n]].color + '">Ability: ' + Stats.ABIL[n] + '</b> <span class="dim">(Space)</span><br>' + Stats.ABILITY[Stats.ABIL[n]].desc + '</div>';
    document.getElementById('mStart').textContent = (mode === 'multi' ? 'Ready with the ' : 'Start run with the ') + n;
    showModel(n);
  }

  // ---------- 3D preview ----------
  function initPreview() {
    const cv = document.getElementById('mPreview');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    scene = new THREE.Scene();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    camera = new THREE.PerspectiveCamera(38, cv.width / cv.height, 0.1, 100);
    camera.position.set(11.5, 6.4, 11.5); camera.lookAt(0, 1.9, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.1));
    const sun = new THREE.DirectionalLight(0xfff2dd, 1.4); sun.position.set(5, 10, 4); scene.add(sun);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.3, 40), new THREE.MeshLambertMaterial({ color: 0x3a352f }));
    disc.position.y = -0.15; scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.06, 6, 60), new THREE.MeshBasicMaterial({ color: 0xe8b04a }));
    ring.rotation.x = Math.PI / 2; scene.add(ring);
    holder = new THREE.Group(); scene.add(holder);
  }
  function showModel(n) {
    if (!renderer) initPreview();
    while (holder.children.length) holder.remove(holder.children[0]);
    const Mo = Models.get(n);
    if (!toonGrad) { const d = new Uint8Array([90, 150, 210, 255]); toonGrad = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); toonGrad.minFilter = toonGrad.magFilter = THREE.NearestFilter; toonGrad.needsUpdate = true; }
    const T = c => new THREE.MeshToonMaterial({ color: c, gradientMap: toonGrad });
    const mats = { paint: T(Mo.palette[0]), second: T(Mo.second), dark: T(0x1e1e1e), glass: new THREE.MeshStandardMaterial({ color: 0x1c2c3c, roughness: 0.1, metalness: 0.6 }), light: T(0xf2ead8) };
    holder.scale.setScalar((Models.BODY[n] || {}).size || 1);
    const ol = new THREE.MeshBasicMaterial({ color: 0x15110e, side: THREE.BackSide });
    ol.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * 0.055;'); };
    for (const k in Mo.geos) { holder.add(new THREE.Mesh(Mo.geos[k], mats[k])); if (k === 'paint' || k === 'second') holder.add(new THREE.Mesh(Mo.geos[k], ol)); }
    legs = Mo.legs.map(l => { const pv = new THREE.Group(); pv.position.set(l.x, l.hip, l.z); pv.add(new THREE.Mesh(l.geo, mats[l.slot])); holder.add(pv); return { pv, phase: l.phase }; });
    wheels = Mo.wheels.map(w => { const pv = new THREE.Group(); pv.position.set(w.x, w.r, w.z);
      pv.add(new THREE.Mesh(w.tire, new THREE.MeshLambertMaterial({ color: 0x161616 })), new THREE.Mesh(w.rim, new THREE.MeshLambertMaterial({ color: 0xbbbbbb }))); holder.add(pv); return { pv, r: w.r }; });
    if (Mo.wing) for (const sd of [1, -1]) { const pv = new THREE.Group(); pv.position.set(-0.2, 2.5, sd * 0.35); pv.rotation.y = sd > 0 ? 0 : Math.PI; pv.add(new THREE.Mesh(Mo.wing, mats.second)); pv.userData.sd = sd; holder.add(pv); legs.push({ wing: pv, sd }); }
  }
  function loop(now) {
    rafId = requestAnimationFrame(loop);
    const t = (now - t0) / 1000;
    holder.rotation.y = t * 0.6;
    for (const l of legs) { if (l.wing) l.wing.rotation.x = -l.sd * (0.2 + Math.sin(t * 4) * 0.35); else l.pv.rotation.z = Math.sin(t * 5 + l.phase) * 0.4; }
    for (const w of wheels) w.pv.rotation.z -= 0.05 / w.r;
    renderer.render(scene, camera);
  }

  let mode = 'solo';
  function show() {
    if (!el) build();
    el.style.display = 'block';
    let nm = ''; try { nm = localStorage.getItem('rr_name') || ''; } catch (e) {}
    const ni = document.getElementById('mNameIn'); if (ni && !ni.value) ni.value = nm;
    toTitle();
  }
  function hide() { stop(); if (el) el.style.display = 'none'; }
  function netReady(ok) {
    const b = document.getElementById('mTogether'), n = document.getElementById('mNetNote');
    if (!b) return;
    b.disabled = !ok;
    n.textContent = ok ? 'Multiplayer is on: friends who open this page can join your lobby.'
      : 'Multiplayer works when this game is opened as a shared Claude page. Solo works anywhere.';
  }
  function getName() {
    const v = (document.getElementById('mNameIn').value || '').trim().replace(/[\u0000-\u001f]/g, '').slice(0, 18);
    if (v) try { localStorage.setItem('rr_name', v); } catch (e) {}
    return v;
  }
  function together() {
    const nm = getName(); if (!nm) { document.getElementById('mNameIn').focus(); document.getElementById('mNetNote').textContent = 'Type a name first.'; return; }
    mode = 'multi'; Net.join(nm); toSelect();
  }
  function solo() { mode = 'solo'; toSelect(); }
  function toLobby() {
    ['mTitle', 'mSelect'].forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById('mLobby').style.display = 'block'; stop(); lobbyRefresh();
  }
  function leaveLobby() { Net.leave(); mode = 'solo'; toTitle(); }
  function lobbyRefresh() {
    const L = document.getElementById('mLobby'); if (!L || L.style.display === 'none' || !Net.active()) return;
    const ps = Net.players(), h = Net.host(), ready = ps.filter(p => p.presence.st === 'lobby' && p.presence.rd), inLobby = ps.filter(p => p.presence.st === 'lobby');
    const running = ps.filter(p => p.presence.st === 'garage' || p.presence.st === 'race');
    document.getElementById('mLobbyList').innerHTML = ps.map(p => {
      const pr = p.presence;
      return '<div class="pl' + (p.sameTab ? ' you' : '') + '"><b>' + Net.esc(Net.nameOf(p)) + '</b>' + (p.sameTab ? ' (you)' : '') + (h && h.peer === p.peer ? ' <span class="dim">host</span>' : '') +
        '<span>' + Net.esc(pr.ride || 'choosing a ride') + '</span><em>' + (pr.st === 'lobby' ? (pr.rd ? 'ready' : 'not ready') : pr.st === 'race' ? 'racing' : 'in a run') + '</em></div>';
    }).join('') || '<div class="dim">Connecting...</div>';
    let act = '<button onclick="Menu.toSelectFromLobby()">Change ride</button> ';
    if (running.length) act += '<span class="dim">A tournament is already running. You will join it when the next race is decided.</span>';
    else if (Net.isHost()) act += ready.length === inLobby.length && ready.length > 0
      ? '<button class="mBig" onclick="Net.startTournament()">Start the tournament (' + ready.length + ' player' + (ready.length > 1 ? 's' : '') + ')</button>'
      : '<span class="dim">Waiting for everyone to be ready (' + ready.length + ' of ' + inLobby.length + ').</span>';
    else act += '<span class="dim">Waiting for ' + Net.esc(h ? Net.nameOf(h) : 'the host') + ' to start the tournament.</span>';
    document.getElementById('mLobbyAct').innerHTML = act;
  }
  function toSelectFromLobby() { Net.setRide(selected, false); toSelect(); }
  function setQ(q) { Race.setQuality(q); document.getElementById('qHigh').className = q === 'high' ? 'on' : ''; document.getElementById('qLow').className = q === 'low' ? 'on' : ''; }
  function toTitle() { setQ(Race.getQuality()); document.getElementById('mTitle').style.display = 'flex'; document.getElementById('mSelect').style.display = 'none'; document.getElementById('mLobby').style.display = 'none'; stop(); }
  function toSelect() {
    document.getElementById('mTitle').style.display = 'none'; document.getElementById('mLobby').style.display = 'none'; document.getElementById('mSelect').style.display = 'block';
    setTab(tab);
    if (!rafId) { t0 = performance.now(); rafId = requestAnimationFrame(loop); }
  }
  function stop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  function start() {
    if (mode === 'multi' && Net.active()) { Net.setRide(selected, true); toLobby(); return; }
    stop(); el.style.display = 'none'; newRun(selected); window.scrollTo(0, 0);
  }
  return { show, hide, toTitle, toSelect, setTab, pick, fam, start, setQ, netReady, together, solo, leaveLobby, lobbyRefresh, toSelectFromLobby };
})();
Menu.show();
Net.init().then(ok => Menu.netReady(ok)).catch(() => Menu.netReady(false));
