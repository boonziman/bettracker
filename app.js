const TICKETS = [
  {
    id: "big", label: "Prop Builder", risk: 15, win: 525,
    legs: [
      { id: "b1", text: "To Win: WAS", sub: "LAS @ WAS", game: "wnba", type: "winner", team: "WSH" },
      { id: "b2", text: "Double Result: WAS / WAS", sub: "Excl OT", game: "wnba", type: "double", team: "WSH" },
      { id: "b3", text: "To Win: BOS", sub: "BOS @ PIT", game: "bos", type: "winner", team: "BOS" },
      { id: "b4", text: "To Win: MIL", sub: "MIL @ LAD", game: "mil", type: "winner", team: "MIL" },
      { id: "b5", text: "1st Inning DRAW", sub: "MIL @ LAD", game: "mil", type: "1st-draw" },
      { id: "b6", text: "1st Inning DRAW", sub: "BOS @ PIT", game: "bos", type: "1st-draw" },
      { id: "b7", text: "1st Half (5 Inn): BOS", sub: "BOS @ PIT", game: "bos", type: "f5", team: "BOS" },
      { id: "b8", text: "1st Half (5 Inn): MIL", sub: "MIL @ LAD", game: "mil", type: "f5", team: "MIL" }
    ]
  },
  {
    id: "mis", label: "Misiorowski Prop", risk: 15, win: 43.65,
    legs: [
      { id: "m1", text: "Misiorowski Under 8.5 Ks", sub: "MIL @ LAD", game: "mil", type: "ks-under" },
      { id: "m2", text: "To Win: MIL", sub: "MIL @ LAD", game: "mil", type: "winner", team: "MIL" }
    ]
  },
  {
    id: "combo", label: "MIL + UFC Total", risk: 25, win: 80,
    legs: [
      { id: "c1", text: "MIL Brewers −120", sub: "Action", game: "mil", type: "winner", team: "MIL" },
      { id: "c2", text: "Total u4½", sub: "Makhachev vs Garry", game: "ufc", type: "ufc-under" }
    ]
  }
];

const KEY = "pcc-v7";
const SNAP = "pcc-v7-snap";
const POLL = 8000;
const live = { mil: null, bos: null, wnba: null, ufc: null };
let lastHash = "";
let lastAt = 0;
let fetching = false;
let timer = null;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}
function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
}
function autoOn() { return document.getElementById("autolock").checked; }

function leadStr(a, b) {
  const d = a - b;
  if (d > 0) return "+" + d;
  return String(d);
}

function evalLeg(leg) {
  if (leg.game === "mil" || leg.game === "bos") {
    const g = live[leg.game];
    if (!g) return { s: "pending", n: "" };
    const my = teamScore(g, leg.team);
    const opp = oppScore(g, leg.team);
    const inn = g.period || 1;
    const myLs = (g.ls[leg.team] || []);
    const oppAbbr = leg.team === g.home ? g.away : g.home;
    const oppLs = g.ls[oppAbbr] || [];

    if (leg.type === "winner") {
      if (g.final) return my > opp ? { s: "won", n: "Final " + my + "–" + opp } : { s: "lost", n: "Final " + my + "–" + opp };
      if (my > opp) return { s: "leaning", n: "Up " + my + "–" + opp };
      if (my < opp) return { s: "threat", n: "Down " + my + "–" + opp };
      return { s: "pending", n: "Tied " + my + "–" + opp };
    }
    if (leg.type === "1st-draw") {
      const a = myLs[0] != null ? +myLs[0] : null;
      const b = oppLs[0] != null ? +oppLs[0] : null;
      if (inn === 1 && !g.final) {
        if (a != null && b != null && (a > 0 || b > 0)) return { s: "lost", n: "1st " + a + "–" + b };
        return { s: "pending", n: "Still 1st" };
      }
      if (a != null && b != null) return a === 0 && b === 0 ? { s: "won", n: "1st 0–0" } : { s: "lost", n: "1st " + a + "–" + b };
      return { s: "pending", n: "" };
    }
    if (leg.type === "f5") {
      const settled = g.final || inn > 5 || (inn === 5 && /Mid|End/i.test(g.detail || ""));
      const mf = myLs.slice(0, 5).reduce(function (x, y) { return x + (+y || 0); }, 0);
      const of = oppLs.slice(0, 5).reduce(function (x, y) { return x + (+y || 0); }, 0);
      if (settled && (myLs.length >= 4 || g.final)) {
        if (mf > of) return { s: "won", n: "F5 " + mf + "–" + of };
        if (mf < of) return { s: "lost", n: "F5 " + mf + "–" + of };
        return { s: "pending", n: "F5 tied " + mf + "–" + of };
      }
      if (my > opp) return { s: "leaning", n: "Thru now " + my + "–" + opp };
      if (my < opp) return { s: "threat", n: "Thru now " + my + "–" + opp };
      return { s: "pending", n: "Tied" };
    }
    if (leg.type === "ks-under") {
      const ks = g.misKs;
      if (ks == null) return { s: "pending", n: "" };
      if (ks >= 9) return { s: "lost", n: ks + " Ks" };
      if (g.misDone || g.final) return ks < 8.5 ? { s: "won", n: ks + " Ks, done" } : { s: "lost", n: ks + " Ks" };
      if (ks >= 7) return { s: "threat", n: ks + " Ks — 2 left" };
      return { s: "leaning", n: ks + " Ks" };
    }
  }
  if (leg.game === "wnba") {
    const g = live.wnba;
    if (!g) return { s: "pending", n: "" };
    const my = teamScore(g, leg.team);
    const opp = oppScore(g, leg.team);
    const hf = halfScores(g);
    if (leg.type === "winner") {
      if (g.final) return my > opp ? { s: "won", n: "Final " + my + "–" + opp } : { s: "lost", n: "Final " + my + "–" + opp };
      if (g.ot) return { s: "threat", n: "OT " + my + "–" + opp };
      if (my > opp) return { s: "leaning", n: "Up " + my + "–" + opp };
      if (my < opp) return { s: "threat", n: "Down " + my + "–" + opp };
      return { s: "pending", n: "Tied" };
    }
    if (leg.type === "double") {
      if (hf.ready) {
        if (hf.mine <= hf.opp) return { s: "lost", n: "1H " + hf.mine + "–" + hf.opp };
        if (g.ot) return { s: "lost", n: "OT — excl OT" };
        if (g.final) return my > opp ? { s: "won", n: "1H + final" } : { s: "lost", n: "Lost 2H" };
        return { s: "leaning", n: "1H " + hf.mine + "–" + hf.opp };
      }
      if (my > opp) return { s: "leaning", n: "Ahead" };
      if (my < opp) return { s: "threat", n: "Behind" };
      return { s: "pending", n: "1H live" };
    }
  }
  if (leg.game === "ufc") {
    const g = live.ufc;
    if (!g) return { s: "pending", n: "" };
    if (g.mainDone) {
      const r = g.mainRounds || 0;
      if (r < 5) return { s: "won", n: "Ended R" + r };
      return { s: "lost", n: "Went the distance / R5+" };
    }
    if (g.mainLive) {
      const p = g.mainPeriod || 1;
      if (p >= 5) return { s: "lost", n: "In R5" };
      if (p >= 4) return { s: "threat", n: "R" + p + " — need a finish" };
      return { s: "leaning", n: "R" + p + " of 5" };
    }
    return { s: "pending", n: g.detail || "Not started" };
  }
  return { s: "pending", n: "" };
}

function teamScore(g, team) {
  if (!team) return 0;
  if (team === g.home) return g.homeScore;
  if (team === g.away) return g.awayScore;
  return 0;
}
function oppScore(g, team) {
  if (team === g.home) return g.awayScore;
  return g.homeScore;
}
function halfScores(g) {
  const mine = (g.ls[g.home === "WSH" ? "WSH" : "WSH"] || g.ls.WSH || []);
  const opp = g.ls.LA || g.ls.LAS || [];
  const ready = mine.length >= 2 && opp.length >= 2;
  const m = mine.slice(0, 2).reduce(function (a, b) { return a + (+b || 0); }, 0);
  const o = opp.slice(0, 2).reduce(function (a, b) { return a + (+b || 0); }, 0);
  return { ready: ready || g.halftime || g.final, mine: m, opp: o };
}

function maybeAutolock() {
  if (!autoOn()) return;
  const s = load();
  let changed = false;
  TICKETS.forEach(function (t) {
    t.legs.forEach(function (l) {
      const ev = evalLeg(l);
      if (ev.s === "won" && !s[l.id]) { s[l.id] = true; changed = true; }
    });
  });
  if (changed) save(s);
}

function pips(n, filled, kind) {
  var h = "";
  for (var i = 0; i < n; i++) h += '<span class="pip ' + kind + (i < filled ? " on" : "") + '"></span>';
  return h;
}
function diamond(a, b, c) {
  return '<div class="diamond">' +
    '<div class="base b2' + (b ? " on" : "") + '"></div>' +
    '<div class="base b1' + (a ? " on" : "") + '"></div>' +
    '<div class="base b3' + (c ? " on" : "") + '"></div>' +
    '<div class="base home"></div></div>';
}

function esc(s) {
  var out = String(s == null ? "" : s);
  out = out.split("&").join(String.fromCharCode(38)+"amp;");
  out = out.split("<").join(String.fromCharCode(38)+"lt;");
  out = out.split(">").join(String.fromCharCode(38)+"gt;");
  out = out.split('"').join(String.fromCharCode(38)+"quot;");
  return out;
}
function renderGames() {
  var el = document.getElementById("games");
  var html = "";

  function mlbCard(g, title, trackHtml) {
    if (!g) return "";
    return '<article class="card ' + (g.live ? "is-live" : "") + (g.final ? " is-final" : "") + '">' +
      '<div class="card-h"><span>' + esc(title) + (g.live ? '<span class="badge-live">LIVE</span>' : "") +
      '</span><span class="when">' + esc(g.detail) + "</span></div>" +
      '<div class="card-b">' +
        '<div class="scoreboard">' +
          '<div class="teams">' +
            '<div class="tl"><span class="name">' + esc(g.away) + '</span><span class="sc">' + g.awayScore + "</span></div>" +
            '<div class="tl"><span class="name">' + esc(g.home) + '</span><span class="sc">' + g.homeScore + "</span></div>" +
          "</div>" +
          (!g.final ? diamond(g.on1, g.on2, g.on3) : "") +
          '<div class="counts">' + (!g.final ?
            '<div class="cr"><b>B</b>' + pips(4, g.balls, "b") + "</div>" +
            '<div class="cr"><b>S</b>' + pips(3, g.strikes, "s") + "</div>" +
            '<div class="cr"><b>O</b>' + pips(3, g.outs, "o") + "</div>" : "") +
          "</div>" +
        "</div>" +
        (g.lsHtml || "") +
        (g.matchup ? '<div class="matchup">' + g.matchup + "</div>" : "") +
        (g.lastPlay ? '<div class="last">' + esc(g.lastPlay) + "</div>" : "") +
        (g.id ? '<a class="gc" href="https://www.espn.com/mlb/game/_/gameId/' + g.id + '" target="_blank" rel="noopener">ESPN Gamecast</a>' : "") +
        trackHtml +
      "</div></article>";
  }

  if (live.mil) {
    var m = live.mil;
    var ks = m.misKs;
    var kcls = ks == null ? "" : ks >= 9 ? "bad" : ks >= 7 ? "warn" : "ok";
    var tr = '<div class="track"><div class="track-h">Tracking</div>' +
      '<div class="kstat"><span class="big ' + kcls + '">' + (ks != null ? ks : "–") + '</span><span class="of">/ 8.5 Ks</span></div>' +
      '<div class="pline">' + esc(m.misLine || "Misiorowski") + (m.misDone ? " · outing over" : "") + "</div>" +
      '<div class="kv"><span>MIL lead</span><span>' + leadStr(m.awayScore, m.homeScore) + "</span></div>" +
      '<div class="kv"><span>1st inning</span><span>' + esc((m.ls.MIL && m.ls.MIL[0] != null ? m.ls.MIL[0] : "–") + "–" + (m.ls.LAD && m.ls.LAD[0] != null ? m.ls.LAD[0] : "–")) + "</span></div>" +
      '<div class="kv"><span>Score now / F5</span><span>' + m.awayScore + "–" + m.homeScore + "</span></div>" +
      miniPills(["b4", "b5", "b8", "m1", "m2", "c1"]) +
      "</div>";
    html += mlbCard(m, "MIL @ LAD", tr);
  }

  if (live.bos) {
    var b = live.bos;
    var trb = '<div class="track"><div class="track-h">Tracking</div>' +
      '<div class="kv"><span>BOS lead</span><span>' + leadStr(b.awayScore, b.homeScore) + "</span></div>" +
      '<div class="kv"><span>1st inning</span><span>' + esc((b.ls.BOS && b.ls.BOS[0] != null ? b.ls.BOS[0] : "–") + "–" + (b.ls.PIT && b.ls.PIT[0] != null ? b.ls.PIT[0] : "–")) + "</span></div>" +
      '<div class="kv"><span>Score now / F5</span><span>' + b.awayScore + "–" + b.homeScore + "</span></div>" +
      miniPills(["b3", "b6", "b7"]) +
      "</div>";
    html += mlbCard(b, "BOS @ PIT", trb);
  }

  if (live.wnba) {
    var w = live.wnba;
    var hf = halfScores(w);
    html += '<article class="card ' + (w.live ? "is-live" : "") + '">' +
      '<div class="card-h"><span>WNBA · LA @ WSH' + (w.live ? '<span class="badge-live">LIVE</span>' : "") +
      '</span><span class="when">' + esc(w.detail) + "</span></div>" +
      '<div class="card-b">' +
        '<div class="tl"><span class="name">LA</span><span class="sc">' + w.awayScore + "</span></div>" +
        '<div class="tl"><span class="name">WSH</span><span class="sc">' + w.homeScore + "</span></div>" +
        (w.lsHtml || "") +
        (w.id ? '<a class="gc" href="https://www.espn.com/wnba/game/_/gameId/' + w.id + '" target="_blank" rel="noopener">ESPN Gamecast</a>' : "") +
        '<div class="track"><div class="track-h">Tracking</div>' +
        '<div class="kv"><span>WSH lead</span><span>' + leadStr(w.homeScore, w.awayScore) + "</span></div>" +
        '<div class="kv"><span>1st half</span><span>' + (hf.ready ? hf.mine + "–" + hf.opp : "in progress") + "</span></div>" +
        miniPills(["b1", "b2"]) +
        "</div></div></article>";
  }

  if (live.ufc) {
    var u = live.ufc;
    html += '<article class="card ' + (u.live ? "is-live" : "") + '">' +
      '<div class="card-h"><span>UFC 330 · Makhachev vs Garry</span><span class="when">' + esc(u.detail) + "</span></div>" +
      '<div class="card-b">' +
        '<div class="kv"><span>Main event</span><span>' + esc(u.mainState || "Scheduled") + "</span></div>" +
        '<div class="kv"><span>Card pulse</span><span>' + esc(u.cardNote || "—") + "</span></div>" +
        '<div class="kv"><span>u4½ needs</span><span>Finish before R5</span></div>' +
        '<a class="gc" href="https://www.espn.com/mma/fightcenter/_/id/' + (u.id || "600059185") + '/league/ufc" target="_blank" rel="noopener">ESPN Fight Center</a>' +
        miniPills(["c2"]) +
      "</div></article>";
  }

  el.innerHTML = html || '<div class="skel">Waiting on ESPN…</div>';
}

function miniPills(ids) {
  var map = {};
  TICKETS.forEach(function (t) { t.legs.forEach(function (l) { map[l.id] = l; }); });
  var h = '<div class="legs-mini">';
  ids.forEach(function (id) {
    var l = map[id];
    if (!l) return;
    var ev = evalLeg(l);
    h += '<span class="pill ' + ev.s + '">' + esc(l.text.replace("Misiorowski ", "").replace("Double Result: ", "DR ")) + "</span>";
  });
  return h + "</div>";
}

function renderTickets() {
  maybeAutolock();
  var st = load();
  var el = document.getElementById("tickets");
  var total = 0, done = 0, secured = 0, html = "";

  TICKETS.forEach(function (t) {
    var evs = t.legs.map(evalLeg);
    var dead = evs.some(function (e) { return e.s === "lost"; });
    var allWon = evs.every(function (e) { return e.s === "won"; });
    var checked = 0;
    t.legs.forEach(function (l) { if (st[l.id]) checked++; });
    var complete = checked === t.legs.length;
    total += t.legs.length;
    done += checked;
    if (complete && !dead) secured += t.win;

    var cls = complete || allWon ? "won" : dead ? "dead" : "";
    html += '<article class="ticket ' + cls + '"><div class="th">' +
      '<div class="name">' + esc(t.label) +
      (dead ? ' <span class="pill lost">Dead</span>' : complete || allWon ? ' <span class="pill won">Won</span>' : "") +
      "</div><div class=\"meta\"><div style=\"color:" + (complete ? "var(--ok)" : "var(--fg)") + '">$' + t.risk + " → $" + t.win +
      "</div><div style=\"color:var(--fg-subtle)\">" + checked + "/" + t.legs.length + "</div></div></div>";

    t.legs.forEach(function (l, i) {
      var ev = evs[i];
      var on = !!st[l.id];
      html += '<label class="leg"><input type="checkbox" data-id="' + l.id + '"' + (on ? " checked" : "") + ">" +
        '<div><div class="leg-top"><span class="lt' + (on ? " done" : "") + '">' + esc(l.text) +
        '</span><span class="pill ' + ev.s + '">' + ev.s + "</span></div>" +
        '<div class="lsub">' + esc(l.sub) + (ev.n ? " · " + ev.n : "") + "</div></div></label>";
    });
    html += "</article>";
  });

  el.innerHTML = html;
  document.getElementById("secured").textContent = "$" + secured.toFixed(0);
  document.getElementById("prog-text").textContent = done + " / " + total + " legs";
  document.getElementById("prog-bar").style.width = (total ? (done / total * 100) : 0) + "%";

  el.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
    cb.onchange = function () {
      var s = load();
      s[cb.getAttribute("data-id")] = cb.checked;
      save(s);
      renderTickets();
    };
  });
}

function renderAll() {
  renderGames();
  renderTickets();
}

function dateStr() {
  var p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p.replace(/-/g, "");
}

function parseMlb(sum, ev, id) {
  if (!sum && !ev) return null;
  var comp = ((sum && sum.header && sum.header.competitions) || (ev && ev.competitions) || [])[0] || {};
  var st = (comp.status && comp.status.type) || {};
  var comps = comp.competitors || [];
  var home = comps.filter(function (c) { return c.homeAway === "home"; })[0] || {};
  var away = comps.filter(function (c) { return c.homeAway === "away"; })[0] || {};
  var sit = (sum && sum.situation) || {};
  var plays = (sum && sum.plays) || [];
  var last = "";
  if (plays.length) last = plays[plays.length - 1].text || "";
  else if (sit.lastPlay && sit.lastPlay.text) last = sit.lastPlay.text;

  var ls = {};
  comps.forEach(function (c) {
    ls[c.team && c.team.abbreviation] = (c.linescores || []).map(function (x) { return x.displayValue; });
  });

  var misKs = null, misLine = "", misDone = false, matchup = "";
  var pitchers = [];
  ((sum && sum.boxscore && sum.boxscore.players) || []).forEach(function (team) {
    var abbr = team.team && team.team.abbreviation;
    (team.statistics || []).forEach(function (sg) {
      if (String(sg.type || sg.name || "").toLowerCase().indexOf("pitch") < 0 && sg.labels && sg.labels[0] !== "IP") return;
      if ((sg.labels || [])[0] !== "IP" && String(sg.type || "").toLowerCase() !== "pitching") return;
      var labels = sg.labels || sg.names || [];
      var kIdx = labels.indexOf("K"); if (kIdx < 0) kIdx = labels.indexOf("SO");
      var ipIdx = labels.indexOf("IP"), hIdx = labels.indexOf("H"), erIdx = labels.indexOf("ER"), bbIdx = labels.indexOf("BB"), pcIdx = labels.indexOf("PC");
      (sg.athletes || []).forEach(function (a) {
        var name = (a.athlete && a.athlete.displayName) || "";
        var stats = a.stats || [];
        pitchers.push({ abbr: abbr, name: name, stats: stats });
        if (abbr === "MIL" && /misiorowski/i.test(name)) {
          misKs = kIdx >= 0 ? parseInt(stats[kIdx], 10) || 0 : null;
          misLine = name.split(" ").pop() + "  " + (stats[ipIdx] || "?") + " IP  " + (stats[hIdx] || 0) + " H  " +
            (stats[erIdx] || 0) + " ER  " + (stats[bbIdx] || 0) + " BB  " + (kIdx >= 0 ? stats[kIdx] : "?") + " K" +
            (pcIdx >= 0 ? "  " + stats[pcIdx] + " P" : "");
        }
      });
      if (abbr === "MIL") {
        var milP = (sg.athletes || []);
        if (milP.length) {
          var lastP = milP[milP.length - 1];
          var ln = (lastP.athlete && lastP.athlete.displayName) || "";
          if (misKs != null && !/misiorowski/i.test(ln)) misDone = true;
        }
      }
    });
  });
  if (pitchers.length) {
    var cur = pitchers[pitchers.length - 1];
    matchup = "P: <strong>" + esc(cur.name) + "</strong>";
  }
  if (sit.pitcher && sit.pitcher.athlete) {
    matchup = "P: <strong>" + esc(sit.pitcher.athlete.displayName || sit.pitcher.athlete.shortName || "") + "</strong>";
  }
  if (sit.batter && sit.batter.athlete) {
    matchup += " vs <strong>" + esc(sit.batter.athlete.displayName || sit.batter.athlete.shortName || "") + "</strong>";
  }

  var maxI = 0;
  Object.keys(ls).forEach(function (k) { if (ls[k].length > maxI) maxI = ls[k].length; });
  var lsHtml = "";
  if (maxI) {
    lsHtml = '<table class="ls"><tr><td></td>';
    for (var i = 1; i <= Math.min(maxI, 9); i++) lsHtml += "<td>" + i + "</td>";
    lsHtml += '<td class="r">R</td></tr>';
    [away, home].forEach(function (c) {
      var ab = (c.team && c.team.abbreviation) || "?";
      var row = ls[ab] || [];
      lsHtml += "<tr><td>" + ab + "</td>";
      for (var j = 0; j < Math.min(maxI, 9); j++) lsHtml += "<td>" + (row[j] != null ? row[j] : "") + "</td>";
      lsHtml += '<td class="r">' + (c.score != null ? c.score : "") + "</td></tr>";
    });
    lsHtml += "</table>";
  }

  return {
    id: id || (ev && ev.id),
    home: home.team && home.team.abbreviation,
    away: away.team && away.team.abbreviation,
    homeScore: +(home.score) || 0,
    awayScore: +(away.score) || 0,
    detail: st.shortDetail || st.detail || "",
    live: st.state === "in",
    final: !!st.completed,
    period: st.period,
    balls: sit.balls || 0, strikes: sit.strikes || 0, outs: sit.outs || 0,
    on1: !!(sit.onFirst), on2: !!(sit.onSecond), on3: !!(sit.onThird),
    lastPlay: last, ls: ls, lsHtml: lsHtml,
    misKs: misKs, misLine: misLine, misDone: misDone, matchup: matchup
  };
}

function parseWnba(ev) {
  if (!ev) return null;
  var c = ev.competitions[0];
  var st = (c.status && c.status.type) || {};
  var home = c.competitors.filter(function (x) { return x.homeAway === "home"; })[0];
  var away = c.competitors.filter(function (x) { return x.homeAway === "away"; })[0];
  var ls = {};
  [home, away].forEach(function (x) {
    ls[x.team && x.team.abbreviation] = (x.linescores || []).map(function (q) { return q.displayValue; });
  });
  var maxI = Math.max((ls[home.team.abbreviation] || []).length, (ls[away.team.abbreviation] || []).length);
  var lsHtml = "";
  if (maxI) {
    lsHtml = '<table class="ls"><tr><td></td>';
    for (var i = 1; i <= maxI; i++) lsHtml += "<td>" + (i <= 4 ? "Q" + i : "OT") + "</td>";
    lsHtml += '<td class="r">T</td></tr>';
    [away, home].forEach(function (x) {
      var ab = x.team.abbreviation;
      var row = ls[ab] || [];
      lsHtml += "<tr><td>" + ab + "</td>";
      for (var j = 0; j < maxI; j++) lsHtml += "<td>" + (row[j] != null ? row[j] : "") + "</td>";
      lsHtml += '<td class="r">' + (x.score || "") + "</td></tr>";
    });
    lsHtml += "</table>";
  }
  return {
    id: ev.id,
    home: home.team.abbreviation, away: away.team.abbreviation,
    homeScore: +(home.score) || 0, awayScore: +(away.score) || 0,
    detail: st.shortDetail || st.description || "",
    live: st.state === "in", final: !!st.completed,
    halftime: /halftime/i.test(st.shortDetail || st.description || ""),
    ot: (st.period || 0) > 4 || /OT/i.test(st.shortDetail || ""),
    period: st.period, ls: ls, lsHtml: lsHtml
  };
}

function parseUfc(ev) {
  if (!ev) return null;
  var st = (ev.status && ev.status.type) || {};
  var main = null, liveFight = null, lastFinal = null;
  (ev.competitions || []).forEach(function (c) {
    var names = (c.competitors || []).map(function (x) {
      return ((x.athlete || {}).displayName || (x.athlete || {}).shortName || "");
    });
    var blob = names.join(" ");
    var cst = (c.status && c.status.type) || {};
    var rec = { names: names, state: cst.state, detail: cst.shortDetail, period: (c.status || {}).period, clock: (c.status || {}).displayClock };
    if (/makhachev|garry/i.test(blob)) main = rec;
    if (cst.state === "in") liveFight = rec;
    if (cst.state === "post") lastFinal = rec;
  });
  var cardNote = liveFight ? (liveFight.names.join(" vs ") + " · " + (liveFight.detail || "")) :
    lastFinal ? "Last: " + lastFinal.names.join(" vs ") : "Prelims";
  return {
    id: ev.id,
    live: st.state === "in" || !!(main && main.state === "in"),
    detail: (main && main.state === "pre") ? (main.detail || st.shortDetail) : (st.shortDetail || st.description || ""),
    mainState: main ? (main.state === "pre" ? "Not started" : main.state === "in" ? ("Live " + (main.detail || "")) : "Final") : "—",
    mainLive: !!(main && main.state === "in"),
    mainDone: !!(main && (main.state === "post" || main.detail === "Final")),
    mainPeriod: main && main.period,
    mainRounds: main && main.period,
    cardNote: cardNote
  };
}

async function jget(url) {
  var r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("espn " + r.status);
  return r.json();
}

async function fetchLive() {
  if (fetching) return;
  fetching = true;
  document.getElementById("refresh").disabled = true;
  try {
    var day = dateStr();
    var pack = await Promise.all([
      jget("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=" + day),
      jget("https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=" + day),
      jget("https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard")
    ]);
    var mlb = pack[0], wnba = pack[1], ufc = pack[2];
    var milEv, bosEv, milId, bosId;
    (mlb.events || []).forEach(function (e) {
      var a = ((e.competitions && e.competitions[0] && e.competitions[0].competitors) || []).map(function (c) { return c.team && c.team.abbreviation; });
      if (a.indexOf("MIL") >= 0 && a.indexOf("LAD") >= 0) { milEv = e; milId = e.id; }
      if (a.indexOf("BOS") >= 0 && a.indexOf("PIT") >= 0) { bosEv = e; bosId = e.id; }
    });

    live.mil = parseMlb(null, milEv, milId);
    live.bos = parseMlb(null, bosEv, bosId);
    var we = (wnba.events || []).filter(function (e) {
      var a = ((e.competitions && e.competitions[0] && e.competitions[0].competitors) || []).map(function (c) { return c.team && c.team.abbreviation; });
      return a.indexOf("WSH") >= 0 && (a.indexOf("LA") >= 0 || a.indexOf("LAS") >= 0);
    })[0];
    live.wnba = parseWnba(we);
    var ue = (ufc.events || []).filter(function (e) { return /makhachev|330|garry/i.test(e.name || ""); })[0];
    live.ufc = parseUfc(ue);
    renderAll();

    var sums = await Promise.all([
      milId ? jget("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=" + milId) : null,
      bosId ? jget("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=" + bosId) : null
    ]);
    if (sums[0]) live.mil = parseMlb(sums[0], milEv, milId);
    if (sums[1]) live.bos = parseMlb(sums[1], bosEv, bosId);

    lastAt = Date.now();
    try { localStorage.setItem(SNAP, JSON.stringify(live)); } catch (e) {}
    renderAll();
    document.getElementById("live-dot").classList.remove("off");
    tickAgo();
  } catch (e) {
    console.error(e);
    if (!live.mil && !live.bos) {
      document.getElementById("games").innerHTML = '<div class="err">Could not reach ESPN. Tap Refresh.</div>';
    }
    document.getElementById("live-dot").classList.add("off");
  } finally {
    fetching = false;
    document.getElementById("refresh").disabled = false;
  }
}

function tickAgo() {
  var el = document.getElementById("ago");
  if (!lastAt) { el.textContent = "idle"; return; }
  var s = Math.round((Date.now() - lastAt) / 1000);
  el.textContent = s <= 1 ? "just now" : s + "s ago";
}

function boot() {
  try {
    var snap = JSON.parse(localStorage.getItem(SNAP));
    if (snap) {
      live.mil = snap.mil; live.bos = snap.bos; live.wnba = snap.wnba; live.ufc = snap.ufc;
      renderAll();
    } else renderTickets();
  } catch (e) { renderTickets(); }

  document.getElementById("refresh").onclick = fetchLive;
  document.getElementById("reset").onclick = function () {
    if (confirm("Reset all checkmarks?")) { localStorage.removeItem(KEY); renderTickets(); }
  };
  document.getElementById("autolock").onchange = renderTickets;

  fetchLive();
  timer = setInterval(fetchLive, POLL);
  setInterval(tickAgo, 1000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) fetchLive();
  });
}

boot();
