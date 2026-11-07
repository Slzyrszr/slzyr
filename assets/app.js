/* 名词手册 — 逻辑层
   纯静态：无网络请求、无构建依赖，可直接双击 index.html 打开 */
(function () {
  'use strict';

  var D = window.TERM_DATA;
  var view = document.getElementById('view');
  var barEl = document.getElementById('bar');
  if (!D || !D.terms) {
    view.innerHTML = '<div class="empty">数据文件 assets/data.js 未能加载。<br>请确认它与 index.html 在同一目录下。</div>';
    return;
  }

  /* ---------------- 索引 ---------------- */

  var TERMS = D.terms;
  var BY_ID = {};
  var GROUPS = { b: D.groups.b || [], c: D.groups.c || [] };
  var GROUP_BY_ID = {};
  var SUBJECT = { b: '生物化学', c: '细胞生物学' };

  TERMS.forEach(function (t) { BY_ID[t.id] = t; });
  ['b', 'c'].forEach(function (s) {
    GROUPS[s].forEach(function (g) { g.s = s; GROUP_BY_ID[g.id] = g; });
  });

  var IDX = TERMS.map(function (t) {
    return {
      t: t,
      n: t.n.toLowerCase(),
      e: (t.e || '').toLowerCase(),
      d: (t.d || '').toLowerCase()
    };
  });

  var groupCache = {};
  function listOf(gid) {
    if (!groupCache[gid]) groupCache[gid] = TERMS.filter(function (t) { return t.g === gid; });
    return groupCache[gid];
  }

  var EXAM = {
    b: TERMS.filter(function (t) { return t.x && t.s === 'b'; }),
    c: TERMS.filter(function (t) { return t.x && t.s === 'c'; })
  };

  /* ---------------- 本地存储 ---------------- */

  var LS = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem(k);
        return v ? JSON.parse(v) : d;
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var state = {
    subj: LS.get('tb.subj', 'b') === 'c' ? 'c' : 'b',
    fav: LS.get('tb.fav', []),
    recent: LS.get('tb.recent', []),
    fs: LS.get('tb.fs', 17),
    q: '',
    qSubj: 'all'
  };
  if (!(state.fav instanceof Array)) state.fav = [];
  if (!(state.recent instanceof Array)) state.recent = [];
  if ([15, 17, 19].indexOf(state.fs) < 0) state.fs = 17;

  function isFav(id) { return state.fav.indexOf(id) > -1; }

  function toggleFav(id) {
    var i = state.fav.indexOf(id);
    if (i > -1) state.fav.splice(i, 1);
    else state.fav.unshift(id);
    LS.set('tb.fav', state.fav);
    return i < 0;
  }

  function pushRecent(id) {
    var i = -1;
    for (var k = 0; k < state.recent.length; k++) {
      if (state.recent[k] && state.recent[k].id === id) { i = k; break; }
    }
    if (i > -1) state.recent.splice(i, 1);
    state.recent.unshift({ id: id, t: Date.now() });
    if (state.recent.length > 60) state.recent.length = 60;
    LS.set('tb.recent', state.recent);
  }

  function applyFont() {
    document.documentElement.style.setProperty('--read', state.fs + 'px');
  }
  applyFont();

  /* ---------------- 工具 ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mark(text, q) {
    text = String(text == null ? '' : text);
    if (!q) return esc(text);
    var low = text.toLowerCase();
    var i = low.indexOf(q);
    if (i < 0) return esc(text);
    var out = '', pos = 0;
    while (i >= 0) {
      out += esc(text.slice(pos, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>';
      pos = i + q.length;
      i = low.indexOf(q, pos);
    }
    return out + esc(text.slice(pos));
  }

  function snippet(text, q, len) {
    text = String(text || '');
    var i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i < 0) return text.slice(0, len);
    var s = Math.max(0, i - 14);
    return (s > 0 ? '…' : '') + text.slice(s, s + len);
  }

  function subjectOf(t) { return SUBJECT[t.s] || ''; }
  function groupName(t) { var g = GROUP_BY_ID[t.g]; return g ? g.name : ''; }

  var toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._tm);
    toastEl._tm = setTimeout(function () { toastEl.classList.remove('show'); }, 1400);
  }

  var ICON = {
    back: '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4.5L7.5 12 15 19.5"/></svg>',
    search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.6"/><path d="M15.5 15.5L21 21"/></svg>',
    star: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/></svg>',
    starOn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/></svg>'
  };

  /* ---------------- 顶栏 ---------------- */

  function setBar(cfg) {
    barEl.className = 'bar' + (cfg.home ? ' home' : '');
    var left = cfg.home ? '' : '<button class="iconbtn" data-act="back" aria-label="返回">' + ICON.back + '</button>';
    barEl.innerHTML =
      '<div class="bar-in">' + left +
      '<div class="bar-title">' + esc(cfg.title || '') + '</div>' +
      (cfg.right || '') + '</div>';
  }

  /* ---------------- 路由 ---------------- */

  var curHash = location.hash || '#/';
  var trail = [curHash];
  var scrollMemo = {};
  var backTo = '#/';   // 逻辑上的上一层，由进入方式决定

  function parseHash() {
    var h = (location.hash || '#/').replace(/^#/, '');
    return h.split('/').filter(function (x) { return x !== ''; });
  }

  function go(hash) {
    if (hash === (location.hash || '#/')) { render(); return; }
    location.hash = hash;
  }

  function back() {
    var t = backTo || '#/';
    backTo = '#/';
    go(t);
  }

  function saveScroll() {
    if (view) scrollMemo[curHash] = view.scrollTop;
  }

  function render() {
    var p = parseHash();
    var route = p[0] || '';
    view.classList.remove('fade');

    if (route === 'g' && GROUP_BY_ID[p[1]]) viewGroup(p[1]);
    else if (route === 'all') viewAll(p[1] === 'c' ? 'c' : 'b');
    else if (route === 'q') viewSearch(decodeURIComponent(p[1] || ''));
    else if (route === 't' && BY_ID[p[1]]) viewDetail(p[1]);
    else if (route === 'fav') viewFav();
    else if (route === 'recent') viewRecent();
    else if (route === 'exam') viewExam();
    else {
      // 未知 / 失效的地址：回到首页并清掉脏 hash
      if (location.hash && location.hash !== '#/') {
        try { history.replaceState(null, '', '#/'); } catch (err) {}
      }
      viewHome();
    }

    curHash = location.hash || '#/';
    view.scrollTop = scrollMemo[curHash] || 0;
    void view.offsetWidth;
    view.classList.add('fade');
  }

  /* ---------------- 通用片段 ---------------- */

  function termRow(t, q, bare) {
    var html = '<button class="row" data-act="term" data-id="' + t.id + '"><span class="row-main">' +
      '<span class="row-n">' + mark(t.n, q) + '</span>';
    if (t.e && t.e.toLowerCase() !== t.n.toLowerCase()) {
      html += '<span class="row-e">' + mark(t.e, q) + '</span>';
    }
    if (q) html += '<span class="row-d">' + mark(snippet(t.d, q, 46), q) + '</span>';
    html += '</span>';
    if (t.x && !bare) html += '<span class="tagx">真题</span>';
    html += '<i class="chev"></i></button>';
    return html;
  }

  function groupRow(g) {
    return '<button class="row" data-act="group" data-g="' + g.id + '">' +
      '<span class="row-main"><span class="row-n">' + esc(g.name) + '</span></span>' +
      '<span class="count">' + g.count + '</span><i class="chev"></i></button>';
  }

  /* ---------------- 首页 ---------------- */

  function viewHome() {
    var s = state.subj;
    var gs = GROUPS[s];
    var parts = [];
    gs.forEach(function (g) { if (parts.indexOf(g.part) < 0) parts.push(g.part); });
    var total = gs.reduce(function (a, g) { return a + g.count; }, 0);

    setBar({ home: true, title: '名词手册' });

    var html = '';
    html += '<div class="hero"><button class="searchbox" data-act="search">' + ICON.search +
      '<span>搜索名词 / 英文 / 释义</span></button></div>';

    html += '<div class="seg">' +
      '<button data-act="seg" data-s="b" class="' + (s === 'b' ? 'on' : '') + '">生物化学<span>' + countOf('b') + '</span></button>' +
      '<button data-act="seg" data-s="c" class="' + (s === 'c' ? 'on' : '') + '">细胞生物学<span>' + countOf('c') + '</span></button>' +
      '</div>';

    html += '<div class="tiles">' +
      '<button class="tile" data-act="fav"><b>收藏</b><span>已存 ' + state.fav.length + ' 条</span></button>' +
      '<button class="tile" data-act="recent"><b>最近</b><span>看过 ' + state.recent.length + ' 条</span></button>' +
      '<button class="tile" data-act="random"><b>随机</b><span>抽一条看看</span></button>' +
      '</div>';

    if (EXAM.b.length || EXAM.c.length) {
      html += '<div class="card tight"><button class="row" data-act="exam">' +
        '<span class="row-main"><span class="row-n">历年考题</span>' +
        '<span class="row-e">源表标注考过的名词</span></span>' +
        '<span class="count">' + (EXAM.b.length + EXAM.c.length) + '</span><i class="chev"></i></button></div>';
    }

    parts.forEach(function (p) {
      if (parts.length > 1) html += '<div class="sec">' + esc(p) + '</div>';
      html += '<div class="card">';
      gs.forEach(function (g) { if (g.part === p) html += groupRow(g); });
      html += '</div>';
    });

    html += '<button class="more" data-act="all" data-s="' + s + '">浏览全部 ' + total + ' 条 →</button>';
    html += '<div class="foot">共 ' + (D.meta.count || TERMS.length) + ' 条 · 更新于 ' +
      esc(D.meta.updated || '') + '</div>';

    view.innerHTML = html;
  }

  function countOf(s) {
    return GROUPS[s].reduce(function (a, g) { return a + g.count; }, 0);
  }

  /* ---------------- 分类列表 ---------------- */

  function viewGroup(gid) {
    var g = GROUP_BY_ID[gid];
    var list = listOf(gid);
    setBar({
      title: g.name,
      right: '<span class="bar-count">' + list.length + ' 条</span>'
    });
    var sub = g.part && g.part !== SUBJECT[g.s]
      ? SUBJECT[g.s] + ' · ' + g.part
      : (g.part || SUBJECT[g.s]);
    var html = '<div class="sec">' + esc(sub) + '</div><div class="card">';
    list.forEach(function (t) { html += termRow(t, ''); });
    html += '</div>';
    view.innerHTML = html;
  }

  /* ---------------- 全部 ---------------- */

  function viewAll(s) {
    setBar({ title: '全部 · ' + SUBJECT[s] });
    var html = '';
    GROUPS[s].forEach(function (g) {
      html += '<div class="sec">' + esc(g.name) + '</div><div class="card">';
      listOf(g.id).forEach(function (t) { html += termRow(t, ''); });
      html += '</div>';
    });
    view.innerHTML = html;
  }

  /* ---------------- 搜索 ---------------- */

  function search(q, sub) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    var out = [];
    for (var i = 0; i < IDX.length; i++) {
      var it = IDX[i], t = it.t;
      if (sub !== 'all' && t.s !== sub) continue;
      var sc = -1;
      if (it.n === q || (it.e && it.e === q)) sc = 0;
      else if (it.n.indexOf(q) === 0) sc = 1;
      else if (it.e && it.e.indexOf(q) === 0) sc = 1.5;
      else if (it.n.indexOf(q) > -1) sc = 2;
      else if (it.e && it.e.indexOf(q) > -1) sc = 3;
      else if (it.d.indexOf(q) > -1) sc = 4;
      if (sc < 0) continue;
      out.push({ t: t, sc: sc });
    }
    out.sort(function (a, b) {
      return a.sc - b.sc || a.t.n.length - b.t.n.length || (a.t.n < b.t.n ? -1 : 1);
    });
    return out;
  }

  function viewSearch(q) {
    state.q = q;
    setBar({ title: '搜索' });

    var html = '<div class="searchbar"><div class="field">' + ICON.search +
      '<input id="q" type="search" inputmode="search" autocomplete="off" autocorrect="off" ' +
      'autocapitalize="off" spellcheck="false" placeholder="名词、英文、释义里的词">' +
      '<button class="clear" data-act="clearq" aria-label="清空">×</button></div></div>' +
      '<div class="chips">' +
      '<button class="chip ' + (state.qSubj === 'all' ? 'on' : '') + '" data-act="qsub" data-s="all">全部</button>' +
      '<button class="chip ' + (state.qSubj === 'b' ? 'on' : '') + '" data-act="qsub" data-s="b">生物化学</button>' +
      '<button class="chip ' + (state.qSubj === 'c' ? 'on' : '') + '" data-act="qsub" data-s="c">细胞生物学</button>' +
      '</div><div id="res"></div>';

    view.innerHTML = html;
    var input = document.getElementById('q');
    input.value = q;
    input.addEventListener('input', onType);
    input.addEventListener('search', onType);
    renderResults();

    if (!q) {
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
    }
  }

  function onType(e) {
    var q = e.target.value;
    state.q = q;
    try { history.replaceState(null, '', '#/q' + (q ? '/' + encodeURIComponent(q) : '')); } catch (err) {}
    renderResults();
  }

  function renderResults() {
    var box = document.getElementById('res');
    if (!box) return;
    var q = state.q.trim();
    if (!q) {
      box.innerHTML = '<div class="empty">输入关键词开始搜索<br>可以搜中文名、英文名，也可以搜释义里的说法</div>';
      return;
    }
    var list = search(q, state.qSubj);
    if (!list.length) {
      box.innerHTML = '<div class="empty">没有找到与「' + esc(q) + '」相关的名词<br>试试更短的词，或换用英文缩写</div>';
      return;
    }
    var limit = 150;
    var head = '<div class="hint">共 ' + list.length + ' 条' +
      (list.length > limit ? '，显示前 ' + limit + ' 条' : '') + '</div>';
    var html = head + '<div class="card">';
    for (var i = 0; i < list.length && i < limit; i++) html += termRow(list[i].t, q.toLowerCase());
    html += '</div>';
    box.innerHTML = html;
  }

  /* ---------------- 详情 ---------------- */

  function viewDetail(id) {
    var t = BY_ID[id];
    var g = GROUP_BY_ID[t.g] || { name: '', s: t.s, part: '' };
    pushRecent(id);

    setBar({
      title: g.name,
      right: '<button class="iconbtn ghost" data-act="fs" aria-label="字号">Aa</button>' +
        '<button class="iconbtn' + (isFav(id) ? ' on' : '') + '" id="favbtn" data-act="fav1" data-id="' + id + '" aria-label="收藏">' +
        (isFav(id) ? ICON.starOn : ICON.star) + '</button>'
    });

    var list = listOf(t.g);
    var i = list.indexOf(t);
    var prev = i > 0 ? list[i - 1] : null;
    var next = i > -1 && i < list.length - 1 ? list[i + 1] : null;

    var html = '<article class="detail">';
    html += '<h1 class="d-n">' + esc(t.n) + '</h1>';
    if (t.e && t.e.toLowerCase() !== t.n.toLowerCase()) html += '<div class="d-e">' + esc(t.e) + '</div>';
    html += '<div class="d-tags">' +
      '<span class="t">' + esc(SUBJECT[t.s]) + '</span>' +
      (g.name ? '<span class="t">' + esc(g.name) + '</span>' : '') +
      (t.x ? '<span class="t x">历年考题</span>' : '') +
      '</div>';
    html += '<div class="d-body">' + esc(t.d) + '</div>';
    if (t.src) html += '<div class="d-src">出处：' + esc(t.src) + '</div>';

    html += '<div class="d-nav">' +
      '<button data-act="jump" data-id="' + (prev ? prev.id : '') + '"' + (prev ? '' : ' disabled') + '>' +
      (prev ? '‹ ' + esc(prev.n) : '已到第一篇') + '</button>' +
      '<button data-act="jump" data-id="' + (next ? next.id : '') + '"' + (next ? '' : ' disabled') + '>' +
      (next ? esc(next.n) + ' ›' : '已是最后一篇') + '</button>' +
      '</div>';

    html += '</article>';
    view.innerHTML = html;
  }

  /* ---------------- 历年考题 ---------------- */

  function viewExam() {
    setBar({ title: '历年考题' });
    var html = '';
    ['b', 'c'].forEach(function (s) {
      var list = EXAM[s];
      if (!list.length) return;
      html += '<div class="sec">' + SUBJECT[s] + ' · ' + list.length + ' 条</div><div class="card">';
      list.forEach(function (t) { html += termRow(t, '', true); });
      html += '</div>';
    });
    if (!html) html = '<div class="empty">源表里没有标注考题</div>';
    view.innerHTML = html;
  }

  /* ---------------- 收藏 / 最近 ---------------- */

  function viewFav() {
    setBar({ title: '收藏' });
    var list = state.fav.map(function (id) { return BY_ID[id]; }).filter(Boolean);
    if (!list.length) {
      view.innerHTML = '<div class="empty">还没有收藏<br>在名词详情页右上角点☆即可保存</div>';
      return;
    }
    var html = '<div class="hint">' + list.length + ' 条</div><div class="card">';
    list.forEach(function (t) { html += termRow(t, ''); });
    view.innerHTML = html + '</div>';
  }

  function viewRecent() {
    setBar({ title: '最近浏览' });
    var list = state.recent.map(function (r) { return BY_ID[r.id]; }).filter(Boolean);
    if (!list.length) {
      view.innerHTML = '<div class="empty">还没有浏览记录</div>';
      return;
    }
    var html = '<div class="hint">' + list.length + ' 条，按时间倒序</div><div class="card">';
    list.forEach(function (t) { html += termRow(t, ''); });
    view.innerHTML = html + '</div>';
  }

  /* ---------------- 交互 ---------------- */

  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el) return;
    var act = el.getAttribute('data-act');

    if (act === 'back') { back(); return; }

    if (act === 'term') {
      var tid = el.getAttribute('data-id');
      if (tid && BY_ID[tid]) {
        if (BY_ID[tid].id === (parseHash()[1] || '')) return;
        backTo = location.hash || '#/';
        go('#/t/' + tid);
      }
      return;
    }

    if (act === 'jump') {
      var jid = el.getAttribute('data-id');
      if (jid && BY_ID[jid]) go('#/t/' + jid);
      return;
    }

    if (act === 'group') {
      backTo = '#/';
      go('#/g/' + el.getAttribute('data-g'));
      return;
    }

    if (act === 'seg') {
      var s = el.getAttribute('data-s');
      if (s !== state.subj) {
        state.subj = s;
        LS.set('tb.subj', s);
        render();
      }
      return;
    }

    if (act === 'search') { go('#/q'); return; }

    if (act === 'clearq') {
      var inp = document.getElementById('q');
      if (inp) { inp.value = ''; inp.focus(); }
      state.q = '';
      try { history.replaceState(null, '', '#/q'); } catch (err) {}
      renderResults();
      return;
    }

    if (act === 'qsub') {
      state.qSubj = el.getAttribute('data-s');
      Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
        c.classList.toggle('on', c === el);
      });
      renderResults();
      return;
    }

    if (act === 'fav1') {
      var id = el.getAttribute('data-id');
      var added = toggleFav(id);
      el.classList.toggle('on', added);
      el.innerHTML = added ? ICON.starOn : ICON.star;
      toast(added ? '已收藏' : '已取消收藏');
      return;
    }

    if (act === 'fs') {
      var sizes = [15, 17, 19];
      state.fs = sizes[(sizes.indexOf(state.fs) + 1) % sizes.length];
      LS.set('tb.fs', state.fs);
      applyFont();
      toast('字号 ' + state.fs + 'px');
      return;
    }

    if (act === 'fav') { go('#/fav'); return; }
    if (act === 'recent') { go('#/recent'); return; }
    if (act === 'exam') { go('#/exam'); return; }
    if (act === 'all') { go('#/all/' + el.getAttribute('data-s')); return; }

    if (act === 'random') {
      var pool = GROUPS[state.subj];
      if (!pool.length) return;
      var g = pool[Math.floor(Math.random() * pool.length)];
      var arr = listOf(g.id);
      var t = arr[Math.floor(Math.random() * arr.length)];
      if (t) go('#/t/' + t.id);
      return;
    }
  });

  window.addEventListener('hashchange', function () {
    saveScroll();
    trail.push(location.hash || '#/');
    render();
  });

  window.addEventListener('pagehide', function () { saveScroll(); });

  render();
})();
