const TICKETS = [
      {
        id: "big", label: "Prop Builder (Big One)", risk: 15, win: 525,
        legs: [
          { id: "b1", text: "To Win: WAS", sub: "LAS @ WAS", game: "wnba", type: "winner", team: "WSH" },
          { id: "b2", text: "Double Result: WAS/WAS", sub: "Excl OT", game: "wnba", type: "double", team: "WSH" },
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
          { id: "c1", text: "MIL Brewers -120", sub: "MLB", game: "mil", type: "winner", team: "MIL" },
          { id: "c2", text: "TOTAL u4½", sub: "Makhachev vs Garry", game: "ufc", type: "ufc-under" }
        ]
      }
    ];

    const KEY = "pcc-mobile-v1";
    let live = { mil: null, bos: null, wnba: null, ufc: null };

    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) { return {}; } }
    function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e) {} }

    function evalLeg(leg) {
      if (leg.game === "mil" || leg.game === "bos") {
        const g = live[leg.game];
        if (!g) return { s: "pending", n: "" };
        const my = leg.team === g.home ? g.homeScore : (leg.team === g.away ? g.awayScore : null);
        const opp = leg.team === g.home ? g.awayScore : g.homeScore;
        const inn = g.period || 1;
        const myLs = g.ls[leg.team] || [];
        const oppLs = g.ls[leg.team === g.home ? g.away : g.home] || [];

        if (leg.type === "winner") {
          if (g.final) return my > opp ? { s: "won", n: "Final" } : { s: "lost", n: "Final" };
          if (my > opp) return { s: "leaning", n: "Up " + my + "-" + opp };
          if (my < opp) return { s: "threat", n: "Down " + my + "-" + opp };
          return { s: "pending", n: "Tied " + my + "-" + opp };
        }
        if (leg.type === "1st-draw") {
          if (inn === 1 && !g.final) return { s: "pending", n: "Still 1st" };
          const a = myLs[0] != null ? +myLs[0] : null, b = oppLs[0] != null ? +oppLs[0] : null;
          if (a != null && b != null) return (a === 0 && b === 0) ? { s: "won", n: "0-0" } : { s: "lost", n: a + "-" + b };
          return { s: "pending", n: "" };
        }
        if (leg.type === "f5") {
          if (g.final || inn > 5) {
            const mf = myLs.slice(0,5).reduce(function(x,y){return x+(+y||0)},0);
            const of = oppLs.slice(0,5).reduce(function(x,y){return x+(+y||0)},0);
            if (myLs.length >= 5) return mf > of ? { s: "won", n: "F5 " + mf + "-" + of } : mf < of ? { s: "lost", n: "F5 " + mf + "-" + of } : { s: "pending", n: "F5 tied" };
          }
          if (my > opp) return { s: "leaning", n: "Ahead" };
          if (my < opp) return { s: "threat", n: "Behind" };
          return { s: "pending", n: "Tied" };
        }
        if (leg.type === "ks-under") {
          const ks = g.misKs;
          if (ks == null) return { s: "pending", n: "" };
          if (g.final) return ks < 8.5 ? { s: "won", n: ks + " Ks" } : { s: "lost", n: ks + " Ks" };
          if (ks >= 9) return { s: "lost", n: ks + " Ks" };
          if (ks >= 7) return { s: "threat", n: ks + " Ks" };
          return { s: "leaning", n: ks + " Ks" };
        }
      }
      if (leg.game === "wnba") {
        const g = live.wnba;
        if (!g) return { s: "pending", n: "" };
        const my = leg.team === g.home ? g.homeScore : g.awayScore;
        const opp = leg.team === g.home ? g.awayScore : g.homeScore;
        if (g.final) return my > opp ? { s: "won", n: "Final" } : { s: "lost", n: "Final" };
        if (my > opp) return { s: "leaning", n: "Up " + my + "-" + opp };
        if (my < opp) return { s: "threat", n: "Down " + my + "-" + opp };
        return { s: "pending", n: "Tied" };
      }
      return { s: "pending", n: "" };
    }

    function dots(n, filled, type) {
      var h = "";
      for (var i = 0; i < n; i++) h += '<span class="dot ' + (i < filled ? type : "") + '"></span>';
      return h;
    }
    function diamond(o1, o2, o3) {
      return '<div class="diamond">' +
        '<div class="base b2 ' + (o2 ? "occ" : "") + '"></div>' +
        '<div class="base b1 ' + (o1 ? "occ" : "") + '"></div>' +
        '<div class="base b3 ' + (o3 ? "occ" : "") + '"></div>' +
        '<div class="base home"></div></div>';
    }

    function renderGames() {
      var el = document.getElementById("games");
      var html = "";
      var mil = live.mil;
      if (mil) {
        var ks = mil.misKs;
        var kCls = ks == null ? "" : ks >= 9 ? "bad" : ks >= 7 ? "warn" : "good";
        html += '<div class="card ' + (mil.live ? "live" : "") + '">' +
          '<div class="card-h"><span>MIL @ LAD ' + (mil.live ? '<span class="live-badge">LIVE</span>' : "") + '</span><span style="color:#a1a1aa;font-weight:400">' + mil.detail + '</span></div>' +
          '<div class="card-b">' +
            '<div class="score-row">' +
              '<div class="teams">' +
                '<div class="team-line"><span>MIL</span><span class="s">' + mil.awayScore + '</span></div>' +
                '<div class="team-line"><span>LAD</span><span class="s">' + mil.homeScore + '</span></div>' +
              '</div>' +
              (!mil.final ? diamond(mil.on1, mil.on2, mil.on3) : "") +
              '<div class="count">' +
                (!mil.final ?
                  '<div class="count-row"><span class="label">B</span>' + dots(4, mil.balls, "b") + '</div>' +
                  '<div class="count-row"><span class="label">S</span>' + dots(3, mil.strikes, "s") + '</div>' +
                  '<div class="count-row"><span class="label">O</span>' + dots(3, mil.outs, "o") + '</div>' : "") +
              '</div>' +
            '</div>' +
            (mil.lsHtml || "") +
            (mil.lastPlay ? '<div class="last">' + mil.lastPlay + '</div>' : "") +
            '<a class="gc" href="https://www.espn.com/mlb/game/_/gameId/' + mil.id + '" target="_blank">Full Gamecast →</a>' +
            '<div class="track">' +
              '<div class="track-title">Tracking</div>' +
              '<div class="k-big ' + kCls + '">' + (ks != null ? ks : "–") + '<span class="k-sub">/8.5</span></div>' +
              '<div style="font-size:11px;color:#a1a1aa;margin-bottom:6px">' + (mil.misLine || "Misiorowski") + '</div>' +
              '<div class="track-line"><span class="l">MIL lead</span><span>' + (mil.awayScore - mil.homeScore > 0 ? "+" : "") + (mil.awayScore - mil.homeScore) + '</span></div>' +
              '<div class="track-line"><span class="l">1st Inn</span><span>' + (mil.ls.MIL && mil.ls.MIL[0] != null ? mil.ls.MIL[0] : "?") + "-" + (mil.ls.LAD && mil.ls.LAD[0] != null ? mil.ls.LAD[0] : "?") + '</span></div>' +
            '</div>' +
          '</div></div>';
      }

      var bos = live.bos;
      if (bos) {
        html += '<div class="card ' + (bos.live ? "live" : "") + '">' +
          '<div class="card-h"><span>BOS @ PIT ' + (bos.live ? '<span class="live-badge">LIVE</span>' : "") + '</span><span style="color:#a1a1aa;font-weight:400">' + bos.detail + '</span></div>' +
          '<div class="card-b">' +
            '<div class="score-row">' +
              '<div class="teams">' +
                '<div class="team-line"><span>BOS</span><span class="s">' + bos.awayScore + '</span></div>' +
                '<div class="team-line"><span>PIT</span><span class="s">' + bos.homeScore + '</span></div>' +
              '</div>' +
              (!bos.final ? diamond(bos.on1, bos.on2, bos.on3) : "") +
              '<div class="count">' +
                (!bos.final ?
                  '<div class="count-row"><span class="label">B</span>' + dots(4, bos.balls, "b") + '</div>' +
                  '<div class="count-row"><span class="label">S</span>' + dots(3, bos.strikes, "s") + '</div>' +
                  '<div class="count-row"><span class="label">O</span>' + dots(3, bos.outs, "o") + '</div>' : "") +
              '</div>' +
            '</div>' +
            (bos.lsHtml || "") +
            (bos.lastPlay ? '<div class="last">' + bos.lastPlay + '</div>' : "") +
            '<a class="gc" href="https://www.espn.com/mlb/game/_/gameId/' + bos.id + '" target="_blank">Full Gamecast →</a>' +
            '<div class="track">' +
              '<div class="track-title">Tracking</div>' +
              '<div class="track-line"><span class="l">BOS lead</span><span>' + (bos.awayScore - bos.homeScore > 0 ? "+" : "") + (bos.awayScore - bos.homeScore) + '</span></div>' +
              '<div class="track-line"><span class="l">1st Inn</span><span>' + (bos.ls.BOS && bos.ls.BOS[0] != null ? bos.ls.BOS[0] : "?") + "-" + (bos.ls.PIT && bos.ls.PIT[0] != null ? bos.ls.PIT[0] : "?") + '</span></div>' +
            '</div>' +
          '</div></div>';
      }

      if (live.wnba) {
        var g = live.wnba;
        html += '<div class="card ' + (g.live ? "live" : "") + '">' +
          '<div class="card-h"><span>WNBA · LA @ WSH</span><span style="color:#a1a1aa;font-weight:400">' + g.detail + '</span></div>' +
          '<div class="card-b">' +
            '<div class="team-line"><span>LA</span><span class="s">' + g.awayScore + '</span></div>' +
            '<div class="team-line"><span>WSH</span><span class="s">' + g.homeScore + '</span></div>' +
            '<a class="gc" href="https://www.espn.com/wnba/game/_/gameId/' + g.id + '" target="_blank">Gamecast →</a>' +
            '<div class="track"><div class="track-title">Tracking</div>' +
            '<div class="track-line"><span class="l">WSH lead</span><span>' + (g.homeScore - g.awayScore > 0 ? "+" : "") + (g.homeScore - g.awayScore) + '</span></div></div>' +
          '</div></div>';
      }

      if (live.ufc) {
        html += '<div class="card">' +
          '<div class="card-h"><span>UFC 330 · Makhachev vs Garry</span><span style="color:#a1a1aa;font-weight:400">' + live.ufc.detail + '</span></div>' +
          '<div class="card-b"><div style="font-size:12px;color:#a1a1aa">Track total rounds for u4½</div>' +
          '<a class="gc" href="https://www.espn.com/mma/fightcenter/_/id/' + live.ufc.id + '/league/ufc" target="_blank">Fight Center →</a></div></div>';
      }

      el.innerHTML = html || '<div class="err">Waiting for games…</div>';
    }

    function renderTickets() {
      var st = load();
      var el = document.getElementById("tickets");
      var total = 0, done = 0, secured = 0, html = "";

      TICKETS.forEach(function(t) {
        var checkedCount = 0;
        t.legs.forEach(function(l) { if (st[l.id]) checkedCount++; });
        var complete = checkedCount === t.legs.length;
        total += t.legs.length;
        done += checkedCount;
        if (complete) secured += t.win;

        html += '<div class="ticket ' + (complete ? "won" : "") + '">' +
          '<div class="ticket-h"><div class="name">' + t.label + (complete ? ' <span class="pill won">WON</span>' : "") + '</div>' +
          '<div class="meta"><div style="color:' + (complete ? "#34d399" : "#d4d4d8") + ';font-weight:600">$' + t.risk + ' → $' + t.win + '</div>' +
          '<div style="color:#71717a">' + checkedCount + '/' + t.legs.length + '</div></div></div>';

        t.legs.forEach(function(l) {
          var checked = !!st[l.id];
          var ev = evalLeg(l);
          html += '<label class="leg">' +
            '<input type="checkbox" data-id="' + l.id + '" ' + (checked ? "checked" : "") + '>' +
            '<div class="leg-body"><div class="leg-top">' +
            '<span class="leg-text ' + (checked ? "done" : "") + '">' + l.text + '</span>' +
            '<span class="pill ' + ev.s + '">' + ev.s + '</span></div>' +
            '<div class="leg-sub">' + l.sub + (ev.n ? " · " + ev.n : "") + '</div></div></label>';
        });
        html += '</div>';
      });

      el.innerHTML = html;
      document.getElementById("secured").textContent = "$" + secured.toFixed(0);
      document.getElementById("prog-text").textContent = done + "/" + total;
      document.getElementById("prog-bar").style.width = (total ? (done / total * 100) : 0) + "%";

      var boxes = el.querySelectorAll("input[type=checkbox]");
      for (var i = 0; i < boxes.length; i++) {
        boxes[i].onchange = function() {
          var s = load();
          s[this.getAttribute("data-id")] = this.checked;
          save(s);
          renderTickets();
        };
      }
    }

    function renderAll() {
      renderGames();
      renderTickets();
    }

    async function fetchLive() {
      try {
        var mlb = await (await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=20260815")).json();
        var wnba = await (await fetch("https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard?dates=20260815")).json();
        var ufc = await (await fetch("https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard")).json();

        var milId, bosId;
        (mlb.events || []).forEach(function(e) {
          var a = (e.competitions && e.competitions[0] && e.competitions[0].competitors || []).map(function(c) { return c.team && c.team.abbreviation; });
          if (a.indexOf("MIL") >= 0 && a.indexOf("LAD") >= 0) milId = e.id;
          if (a.indexOf("BOS") >= 0 && a.indexOf("PIT") >= 0) bosId = e.id;
        });

        var sums = {};
        if (milId) sums.mil = await (await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=" + milId)).json();
        if (bosId) sums.bos = await (await fetch("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=" + bosId)).json();

        function parse(sum, ev, id) {
          if (!sum && !ev) return null;
          var comp = (sum && sum.header && sum.header.competitions || ev && ev.competitions || [])[0] || {};
          var st = (comp.status && comp.status.type) || {};
          var comps = comp.competitors || [];
          var home = comps.filter(function(c){return c.homeAway==="home"})[0] || {};
          var away = comps.filter(function(c){return c.homeAway==="away"})[0] || {};
          var sit = (sum && sum.situation) || {};
          var plays = (sum && sum.plays) || [];
          var last = plays.length ? plays[plays.length-1].text : "";

          var ls = {};
          comps.forEach(function(c) {
            ls[c.team && c.team.abbreviation] = (c.linescores || []).map(function(x){return x.displayValue});
          });

          var misKs = null, misLine = "";
          ((sum && sum.boxscore && sum.boxscore.players) || []).forEach(function(team) {
            var abbr = team.team && team.team.abbreviation;
            (team.statistics || []).forEach(function(sg) {
              if (((sg.type || sg.name || "") + "").toLowerCase().indexOf("pitch") >= 0) {
                var labels = sg.labels || sg.names || [];
                var kIdx = -1;
                for (var i=0;i<labels.length;i++) if (labels[i]==="K" || labels[i]==="SO") kIdx = i;
                var ipIdx = labels.indexOf("IP"), hIdx = labels.indexOf("H"), erIdx = labels.indexOf("ER"), bbIdx = labels.indexOf("BB");
                (sg.athletes || []).forEach(function(a) {
                  var name = (a.athlete && a.athlete.displayName) || "";
                  if (abbr === "MIL" && /misiorowski/i.test(name)) {
                    var stats = a.stats || [];
                    misKs = kIdx >= 0 ? parseInt(stats[kIdx]) || 0 : null;
                    misLine = (stats[ipIdx]||"?") + "IP " + (stats[hIdx]||0) + "H " + (stats[erIdx]||0) + "ER " + (stats[bbIdx]||0) + "BB";
                  }
                });
              }
            });
          });

          var lsHtml = "", maxI = 0;
          Object.keys(ls).forEach(function(k){ if (ls[k].length > maxI) maxI = ls[k].length; });
          if (maxI) {
            lsHtml = '<table class="ls"><tr><td></td>';
            for (var i=1;i<=Math.min(maxI,9);i++) lsHtml += '<td>' + i + '</td>';
            lsHtml += '<td class="r">R</td></tr>';
            [away, home].forEach(function(c) {
              var ab = (c.team && c.team.abbreviation) || "?";
              var row = ls[ab] || [];
              lsHtml += '<tr><td>' + ab + '</td>';
              for (var i=0;i<Math.min(maxI,9);i++) lsHtml += '<td>' + (row[i] != null ? row[i] : "") + '</td>';
              lsHtml += '<td class="r">' + (c.score != null ? c.score : "") + '</td></tr>';
            });
            lsHtml += '</table>';
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
            on1: !!sit.onFirst, on2: !!sit.onSecond, on3: !!sit.onThird,
            lastPlay: last, ls: ls, lsHtml: lsHtml, misKs: misKs, misLine: misLine
          };
        }

        live.mil = parse(sums.mil, (mlb.events || []).filter(function(e){return e.id == milId})[0], milId);
        live.bos = parse(sums.bos, (mlb.events || []).filter(function(e){return e.id == bosId})[0], bosId);

        var we = (wnba.events || []).filter(function(e) {
          var a = (e.competitions && e.competitions[0] && e.competitions[0].competitors || []).map(function(c){return c.team && c.team.abbreviation});
          return a.indexOf("WSH") >= 0 && (a.indexOf("LA") >= 0 || a.indexOf("LAS") >= 0);
        })[0];
        if (we) {
          var c = we.competitions[0];
          var st = (c.status && c.status.type) || {};
          var home = c.competitors.filter(function(x){return x.homeAway==="home"})[0];
          var away = c.competitors.filter(function(x){return x.homeAway==="away"})[0];
          live.wnba = {
            id: we.id,
            home: home && home.team && home.team.abbreviation,
            away: away && away.team && away.team.abbreviation,
            homeScore: +(home && home.score) || 0,
            awayScore: +(away && away.score) || 0,
            detail: st.shortDetail || st.description || "",
            live: st.state === "in",
            final: !!st.completed
          };
        }

        var ue = (ufc.events || []).filter(function(e){ return /makhachev|330|garry/i.test(e.name || ""); })[0];
        if (ue) {
          var st = (ue.status && ue.status.type) || {};
          live.ufc = { id: ue.id, detail: st.shortDetail || st.description || "In Progress", live: st.state === "in" };
        }

        renderAll();
      } catch (e) {
        console.error(e);
        document.getElementById("games").innerHTML = '<div class="err">Could not load live data.<br>Check connection and tap Refresh.</div>';
      }
    }

    document.getElementById("refresh").onclick = fetchLive;
    document.getElementById("reset").onclick = function() {
      if (confirm("Reset all checkmarks?")) {
        localStorage.removeItem(KEY);
        renderTickets();
      }
    };

    fetchLive();
    setInterval(fetchLive, 20000);
