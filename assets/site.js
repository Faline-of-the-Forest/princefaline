/* Prince Faline's RPG Diaries — page interactions from the redesign mock
   (filters, sorts, views, ledger grouping, calendar tips, top lists, search,
   the one-shot viewer, the games player slider). Pages are fully rendered at
   build time; this only rearranges what is already there. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function dur(m) { return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0"); }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }

  // Reads a toolbar's segmented buttons, selects and search box into a state
  // object, and calls apply() whenever one of them changes.
  function toolbar(id, apply) {
    var bar = document.getElementById(id);
    if (!bar) return null;
    var st = {};
    $$(".seg", bar).forEach(function (seg) {
      var on = $("button.on", seg) || $("button", seg);
      st[seg.dataset.key] = on.dataset.v;
      $$("button", seg).forEach(function (b) {
        b.addEventListener("click", function () {
          $$("button", seg).forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          st[seg.dataset.key] = b.dataset.v;
          apply(st, seg.dataset.key);
        });
      });
    });
    $$("select[data-key],input[data-key]", bar).forEach(function (el) {
      st[el.dataset.key] = el.value;
      el.addEventListener(el.tagName === "INPUT" ? "input" : "change", function () { st[el.dataset.key] = el.value; apply(st, el.dataset.key); });
    });
    apply(st, "");
    return st;
  }
  function reorder(container, items) { items.forEach(function (el) { container.appendChild(el); }); }
  var by = {
    text: function (k) { return function (a, b) { return a.dataset[k].localeCompare(b.dataset[k]); }; },
    desc: function (k) { return function (a, b) { return (+b.dataset[k] || 0) - (+a.dataset[k] || 0) || 0; }; },
    descStr: function (k) { return function (a, b) { return (b.dataset[k] || "").localeCompare(a.dataset[k] || ""); }; }
  };

  // ---------- the ledger ----------
  function initLedger() {
    var table = document.getElementById("ledger");
    if (!table) return;
    var body = $("tbody", table), more = document.getElementById("lg-more");
    var rows = $$("tr", body), showAll = false, st;
    function apply(s, key) {
      st = s;
      if (key === "q") showAll = !!s.q;
      var q = (s.q || "").trim().toLowerCase();
      var list = rows.filter(function (r) {
        var d = r.dataset;
        return (!s.year || d.year === s.year) && (s.type === "all" || d.type === s.type) && (!s.sys || d.sys === s.sys) && (!q || d.text.indexOf(q) >= 0);
      });
      var key2 = { month: "month", campaign: "camp", system: "sys" }[s.group || "month"];
      if (s.group && s.group !== "month") list.sort(function (a, b) { return a.dataset[key2].localeCompare(b.dataset[key2]) || b.dataset.n - a.dataset.n; });
      var total = list.length;
      if (!showAll) list = list.slice(0, 14);
      body.innerHTML = "";
      var cur = null;
      list.forEach(function (r) {
        var k = r.dataset[key2];
        if (k !== cur) {
          cur = k;
          var g = document.createElement("tr");
          g.className = "grp";
          g.innerHTML = '<th colspan="5">' + esc(k) + "</th>";
          body.appendChild(g);
        }
        $(".d", r).textContent = s.group === "month" || !s.group ? r.dataset.dshort : r.dataset.dfull;
        body.appendChild(r);
      });
      if (!total) body.innerHTML = '<tr><td colspan="5" class="empty">No sessions match. Clear a filter to see more.</td></tr>';
      more.hidden = total <= 14;
      more.textContent = showAll ? "Show fewer" : "Show all " + total + " sessions";
    }
    more.addEventListener("click", function () { showAll = !showAll; apply(st, ""); });
    toolbar("lg-tools", apply);
  }

  // ---------- campaigns ----------
  function initCampaigns() {
    var posters = document.getElementById("c-posters"), list = document.getElementById("c-list");
    if (!posters) return;
    var cards = $$(".poster", posters), rows = $$("tbody tr", list);
    var sorts = { recent: by.descStr("last"), long: by.desc("count"), old: function (a, b) { return a.dataset.first.localeCompare(b.dataset.first); }, az: by.text("name") };
    toolbar("c-tools", function (s) {
      [cards, rows].forEach(function (set) {
        set.forEach(function (el) { el.hidden = !((s.status === "all" || el.dataset.status === s.status) && (!s.sys || el.dataset.sys === s.sys)); });
        reorder(set[0] && set[0].parentNode, set.slice().sort(sorts[s.sort || "recent"]));
      });
      posters.hidden = s.view === "list";
      list.hidden = s.view !== "list";
    });
  }

  // ---------- one-shots ----------
  function initOneShots() {
    var sysBox = document.getElementById("os-systems"), gamesBox = document.getElementById("os-games");
    if (!sysBox) return;
    var systems = $$(".system", sysBox), shots = $$(".shot", gamesBox), none = document.getElementById("os-none");
    systems.forEach(function (el) { el._games = JSON.parse(el.dataset.games); el._chips = $$(".chip", el); });
    toolbar("os-tools", function (s) {
      var games = s.view === "games", shown = 0;
      $$("#os-tools [data-only]").forEach(function (el) { el.hidden = el.dataset.only !== (games ? "games" : "systems"); });
      sysBox.hidden = games; gamesBox.hidden = !games;
      if (!games) {
        systems.forEach(function (el) {
          var g = el._games.filter(function (x) { return !s.year || x[0] === s.year; });
          el._n = g.length; el._min = g.reduce(function (a, x) { return a + x[1]; }, 0); el._last = g.length ? g[0][2] : "";
          el.hidden = !g.length;
          if (g.length) { shown++; el._chips[0].textContent = plural(g.length, "one-shot"); el._chips[1].textContent = dur(el._min); }
        });
        var sorts = { count: function (a, b) { return b._n - a._n || a.dataset.name.localeCompare(b.dataset.name); }, time: function (a, b) { return b._min - a._min; }, recent: function (a, b) { return b._last.localeCompare(a._last); }, az: by.text("name") };
        reorder(sysBox, systems.slice().sort(sorts[s.sortS || "count"]));
      } else {
        shots.forEach(function (el) { el.hidden = !((!s.year || el.dataset.year === s.year) && (!s.sys || el.dataset.sys === s.sys)); if (!el.hidden) shown++; });
        var gs = { recent: by.descStr("date"), time: by.desc("min"), az: function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); } };
        reorder(gamesBox, shots.slice().sort(gs[s.sortG || "recent"]));
      }
      none.hidden = shown > 0;
    });
  }

  // ---------- shelf ----------
  function initShelf() {
    var covers = document.getElementById("sh-covers"), bySys = document.getElementById("sh-system");
    if (!covers) return;
    var books = $$(".book", covers);
    toolbar("sh-tools", function (s) {
      var ok = function (el) { return s.type === "all" || el.dataset.type === s.type; };
      var sort = s.sort === "az" ? function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); } : function (a, b) { return b.dataset.stars - a.dataset.stars || a.dataset.name.localeCompare(b.dataset.name); };
      books.forEach(function (el) { el.hidden = !ok(el); });
      reorder(covers, books.slice().sort(sort));
      $$(".sys-row", bySys).forEach(function (row) {
        var bs = $$(".book", row);
        bs.forEach(function (el) { el.hidden = !ok(el); });
        reorder($(".books", row), bs.slice().sort(sort));
        row.hidden = !bs.some(function (el) { return !el.hidden; });
      });
      covers.hidden = s.view === "system";
      bySys.hidden = s.view !== "system";
    });
  }

  // ---------- games ----------
  function initGames() {
    var grid = document.getElementById("g-grid");
    if (!grid) return;
    var list = document.getElementById("g-list"), tiles = $$(".tile", grid), rows = $$("tbody tr", list);
    var pl = document.getElementById("pl"), plVal = document.getElementById("plVal"), plClear = document.getElementById("plClear");
    var players = 0, st;
    function apply(s) {
      st = s;
      var q = (s.q || "").trim().toLowerCase(), shown = 0;
      var sorts = { new: by.desc("i"), az: function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); }, big: by.desc("max") };
      [tiles, rows].forEach(function (set, k) {
        set.forEach(function (el) {
          var d = el.dataset;
          el.hidden = !((s.kind === "all" || d.kind === s.kind) && (!players || (+d.min <= players && +d.max >= players)) && (!q || d.text.indexOf(q) >= 0));
          if (!k && !el.hidden) shown++;
        });
        reorder(set[0] && set[0].parentNode, set.slice().sort(sorts[s.sort || "new"]));
      });
      grid.hidden = s.view === "list" || !shown;
      list.hidden = s.view !== "list" || !shown;
      document.getElementById("g-none").hidden = shown > 0;
      document.getElementById("g-count").textContent = shown + " of " + tiles.length + " games";
      plVal.textContent = players ? players + " players" : "Any";
      plClear.hidden = !players;
      pl.classList.toggle("unset", !players);
    }
    function setPl() { players = +pl.value; apply(st); }
    pl.addEventListener("input", setPl);
    pl.addEventListener("pointerdown", function () { if (!players) setPl(); });
    plClear.addEventListener("click", function () { players = 0; pl.value = 2; apply(st); });
    toolbar("g-tools", apply);
  }

  // ---------- home: calendar tips and top lists ----------
  function initRecord() {
    var pick = document.getElementById("top-pick");
    if (pick) pick.addEventListener("change", function () { $$(".top-list").forEach(function (el) { el.hidden = el.dataset.top !== pick.value; }); });
    var dataEl = document.getElementById("tip-data"), tip = document.getElementById("tip");
    if (!dataEl || !tip) return;
    var data = JSON.parse(dataEl.textContent);
    var M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    function show(el) {
      var d = el.dataset.d;
      tip.innerHTML = "<b>" + (+d.slice(8, 10)) + " " + M[+d.slice(5, 7) - 1] + " " + d.slice(0, 4) + "</b>" + (data[d] || []).map(function (x) { return "<span>" + esc(x[0]) + "<small>" + esc(x[1]) + ", " + esc(x[2]) + "</small></span>"; }).join("");
      tip.hidden = false;
      var r = el.getBoundingClientRect(), w = tip.offsetWidth;
      tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
      tip.style.top = (r.top + scrollY - tip.offsetHeight - 8) + "px";
    }
    document.addEventListener("mouseover", function (e) { if (e.target.dataset && e.target.dataset.d) show(e.target); else tip.hidden = true; });
    document.addEventListener("focusin", function (e) { if (e.target.dataset && e.target.dataset.d) show(e.target); });
    document.addEventListener("click", function (e) { if (e.target.dataset && e.target.dataset.d) show(e.target); });
  }

  // ---------- global search ----------
  function initSearch() {
    var q = document.getElementById("q"), box = document.getElementById("results");
    if (!q) return;
    var index = null, loading = null;
    function load() { return loading || (loading = fetch("/search.json").then(function (r) { return r.json(); }).then(function (d) { index = d; }).catch(function () { index = []; })); }
    function run() {
      var t = q.value.trim().toLowerCase();
      if (!t) { box.hidden = true; return; }
      if (!index) { load().then(run); return; }
      var out = index.filter(function (x) { return x[1].toLowerCase().indexOf(t) >= 0; });
      var sessions = out.filter(function (x) { return /^Session/.test(x[0]); }).slice(0, 6);
      out = out.filter(function (x) { return !/^Session/.test(x[0]); }).concat(sessions).slice(0, 12);
      box.hidden = false;
      box.innerHTML = out.map(function (x) { return '<a href="' + esc(x[2]) + '"><small>' + esc(x[0]) + "</small>" + esc(x[1]) + "</a>"; }).join("") || "<p>Nothing found. Try a campaign, a system or a player codename.</p>";
    }
    q.addEventListener("focus", load);
    q.addEventListener("input", run);
    q.addEventListener("keydown", function (e) { if (e.key === "Escape") { q.value = ""; box.hidden = true; } if (e.key === "Enter") { var a = $("a", box); if (a) location.href = a.href; } });
    document.addEventListener("click", function (e) { if (!e.target.closest(".gsearch")) box.hidden = true; });
  }

  // ---------- the one-shot viewer ----------
  function initShots() {
    var dataEl = document.getElementById("shot-data");
    if (!dataEl) return;
    var all = JSON.parse(dataEl.textContent), list = all, idx = 0;
    var dlg = document.createElement("dialog");
    dlg.id = "shot";
    document.body.appendChild(dlg);
    var TONES = [["#5f391d","#fdefc8"],["#b3101c","#fdefc8"],["#7c8a5b","#24160a"],["#d9b25a","#3a2413"],["#3f4f2c","#f2e7b4"],["#a79362","#24160a"],["#ead9a8","#5f391d"]];
    function pic(url, label, cls) {
      var t = TONES[String(label).split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 0) % TONES.length];
      return '<div class="pic ' + cls + '" style="--bg:' + t[0] + ";--fg:" + t[1] + '"><span class="pic-t">' + esc(label) + "</span>" + (url ? '<img src="' + esc(url) + '" alt="" onload="this.parentNode.classList.add(\'has\')" onerror="this.remove()">' : "") + "</div>";
    }
    var chip = function (t, c) { return '<span class="chip ' + (c || "") + '">' + t + "</span>"; };
    function draw() {
      var s = list[idx];
      dlg.innerHTML = '<form method="dialog"><button class="x" aria-label="Close">Close</button></form>' +
        '<button type="button" class="arrow prev" aria-label="Previous one-shot"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<button type="button" class="arrow next" aria-label="Next one-shot"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>' +
        '<div class="shot-in"><div class="shot-side">' + pic(s.img, s.t, "sq") +
          (s.cast && s.cast.length ? '<h3>Cast</h3><ul class="shot-cast">' + s.cast.map(function (c) { var who = '<i>' + esc(c.player) + '</i>'; return '<li><b>' + esc(c.name) + '</b>' + (c.player ? '<span>Played by ' + (c.href ? '<a href="' + esc(c.href) + '">' + who + '</a>' : who) + '</span>' : '') + '</li>'; }).join("") + '</ul>' : "") +
          (s.book ? '<h3>Materials</h3><ul class="shot-cast"><li><a href="' + esc(s.book.href) + '"><b>' + esc(s.book.t) + "</b></a></li></ul>" : "") +
          '<h3>Entry</h3><ul class="shot-cast"><li><a href="' + esc(s.href) + '"><b>Open its own page</b></a></li></ul></div>' +
        '<div class="shot-txt"><p class="chips"><a href="' + esc(s.sysHref) + '">' + chip(esc(s.sys) + (s.ed ? " " + esc(s.ed) : ""), "g") + "</a>" + chip(esc(s.d)) + chip(esc(s.m)) + chip("#" + s.n) + "</p>" +
          "<h2>" + esc(s.t) + "</h2>" + (s.w.length ? s.w.map(function (p) { return '<p class="ph" style="font-style:normal;color:var(--ink)">' + esc(p) + "</p>"; }).join("") : '<p class="ph">No write-up yet.</p>') + "</div></div>" +
        '<div class="strip-nav">' + list.map(function (x, i) { return '<button type="button" data-i="' + i + '" class="' + (i === idx ? "on" : "") + '" title="' + esc(x.t) + '" aria-label="' + esc(x.t) + '">' + pic(x.img, x.t, "sq tiny") + "</button>"; }).join("") + "</div>";
      $(".prev", dlg).onclick = function () { step(-1); };
      $(".next", dlg).onclick = function () { step(1); };
      $$(".strip-nav button", dlg).forEach(function (b) { b.onclick = function () { idx = +b.dataset.i; draw(); }; });
      var on = $(".strip-nav .on", dlg);
      if (on) on.scrollIntoView({ block: "nearest", inline: "center" });
    }
    function step(d) { idx = (idx + d + list.length) % list.length; draw(); }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.shot[data-shot]");
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      // walk the cards currently visible, in their current order
      var visible = $$("a.shot[data-shot]").filter(function (el) { return !el.hidden && !(el.closest("[hidden]")); }).map(function (el) { return +el.dataset.shot; });
      list = visible.map(function (n) { return all.find(function (x) { return x.n === n; }); }).filter(Boolean);
      idx = Math.max(0, list.findIndex(function (x) { return x.n === +a.dataset.shot; }));
      draw();
      dlg.showModal();
    });
    addEventListener("keydown", function (e) { if (!dlg.open) return; if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); });
  }


  // Episode theme songs: each pill opens a popover with the Spotify embed.
  // The player is only created on first open and kept afterwards so music
  // carries on when the popover closes. With Spotify's iFrame API the pill
  // also stays crimson while the song is actually playing.
  function initSongs() {
    var btns = $$(".song-btn[data-embed]");
    if (!btns.length) return;
    var openPop = null, api = null, apiWait = [];
    var ALLOW = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    function loadApi(cb) {
      if (api !== null) return cb(api);
      apiWait.push(cb);
      if (apiWait.length > 1) return;
      var done = false;
      var finish = function (a) { if (done) return; done = true; api = a; apiWait.splice(0).forEach(function (f) { f(a); }); };
      window.onSpotifyIframeApiReady = function (IFrameAPI) { finish(IFrameAPI); };
      var sc = document.createElement("script");
      sc.src = "https://open.spotify.com/embed/iframe-api/v1"; sc.async = true;
      sc.onerror = function () { finish(false); };
      document.head.appendChild(sc);
      setTimeout(function () { finish(false); }, 5000);
    }
    // Crimson + pause icon while the song plays (or is about to, on first click);
    // without Spotify's API, while the player is open.
    function paint(b) { b.classList.toggle("on", !!(b._playing || b._pending || (!b._ctl && b._open))); }
    function place(b, pop) {
      var li = b.closest("li") || b.parentNode, lr = li.getBoundingClientRect(), br = b.getBoundingClientRect();
      pop.style.top = (br.bottom - lr.top + 6) + "px";
      if (innerWidth < 600) { pop.style.left = "0"; pop.style.width = "100%"; }
      else { pop.style.width = ""; pop.style.left = Math.max(0, Math.min(br.left - lr.left, lr.width - 340)) + "px"; }
    }
    function plainFrame(src) {
      var f = document.createElement("iframe");
      f.src = src; f.loading = "lazy"; f.title = "Spotify player";
      f.setAttribute("allow", ALLOW);
      return f;
    }
    function swap(slot, node) { slot.parentNode.insertBefore(node, slot); slot.parentNode.removeChild(slot); }
    function build(b) {
      var pop = document.createElement("div");
      pop.className = "song-pop"; pop.id = "song-pop-" + Math.random().toString(36).slice(2, 8);
      pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", b.getAttribute("aria-label"));
      b.setAttribute("aria-controls", pop.id);
      (b.closest("li") || b.parentNode).appendChild(pop);
      var slot = document.createElement("div"); pop.appendChild(slot);
      var src = b.dataset.embed, m = src.match(/embed\/(track|album|playlist)\/([A-Za-z0-9]+)/);
      loadApi(function (A) {
        var plain = function () { if (slot.parentNode) swap(slot, plainFrame(src)); b._pending = false; paint(b); };
        setTimeout(function () { if (b._pending) { b._pending = false; paint(b); } }, 6000);
        if (!A || !m) { plain(); return; }
        try {
          A.createController(slot, { uri: "spotify:" + m[1] + ":" + m[2], width: "100%", height: 152 }, function (ctl) {
            var f = pop.querySelector("iframe");
            if (f) { f.setAttribute("allow", ALLOW); f.setAttribute("loading", "lazy"); }
            ctl.addListener("playback_update", function (e) {
              var d = e.data || {};
              b._playing = !d.isPaused && !(d.duration && d.position >= d.duration);
              b._pending = false;
              paint(b);
            });
            b._ctl = ctl;
            ctl.addListener("ready", function () { if (b._wantPlay) { b._wantPlay = false; ctl.play(); } });
          });
        } catch (err) { plain(); }
      });
      return pop;
    }
    // The popover fades out after 5s left alone; hovering or focusing it
    // holds it open, and leaving it starts the 5s again.
    var IDLE = 5000;
    function idle(b) {
      clearTimeout(b._idle);
      b._pop.classList.remove("fading");
      if (b._hover) return;
      b._idle = setTimeout(function () {
        b._pop.classList.add("fading");
        b._idle = setTimeout(function () { close(b); }, 400);
      }, IDLE);
    }
    function close(b) {
      if (!b || !b._pop) return;
      clearTimeout(b._idle); b._pop.classList.remove("fading");
      b._pop.hidden = true; b._open = false; b.setAttribute("aria-expanded", "false"); paint(b);
      if (openPop === b) openPop = null;
    }
    function open(b) {
      if (openPop && openPop !== b) close(openPop);
      if (!b._pop) {
        b._pop = build(b);
        var hold = function () { b._hover = true; idle(b); }, release = function () { b._hover = false; idle(b); };
        b._pop.addEventListener("mouseenter", hold); b._pop.addEventListener("mouseleave", release);
        b._pop.addEventListener("focusin", hold); b._pop.addEventListener("focusout", release);
      }
      b._pop.hidden = false; b._open = true; b.setAttribute("aria-expanded", "true"); paint(b);
      place(b, b._pop); openPop = b; idle(b);
    }
    // Clicking the pill plays or pauses its song (and shows the player).
    // Starting one song pauses any other. Without Spotify's API there is no
    // way to control playback, so the pill just opens and closes the player.
    function toggle(b) {
      btns.forEach(function (o) { if (o !== b && o._playing && o._ctl) o._ctl.pause(); });
      if (!b._pop) { b._wantPlay = true; b._pending = true; open(b); return; }
      if (b._ctl) { open(b); b._ctl.togglePlay(); return; }
      if (api === false) { if (b._open) close(b); else open(b); return; }
      open(b);
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); toggle(b); });
    });
    document.addEventListener("click", function (e) {
      if (openPop && !openPop._pop.contains(e.target) && !openPop.contains(e.target)) close(openPop);
    });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && openPop) { var b = openPop; close(b); b.focus(); } });
    addEventListener("resize", function () { if (openPop) place(openPop, openPop._pop); });
  }

  function init() { initSearch(); initLedger(); initCampaigns(); initOneShots(); initShelf(); initGames(); initRecord(); initShots(); initSongs(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
