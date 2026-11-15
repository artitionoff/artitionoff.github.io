// Кузинар: расчёт калорий. Подключается после extras.js и products.js.
(function () {
  document.head.insertAdjacentHTML("beforeend", "<style>.kc{color:var(--mute);font-size:14px;white-space:nowrap}" +
    ".kpill{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:10px 14px;margin:0 0 12px}.kpill b{font-size:18px}.kpill small{display:block;color:var(--mute)}</style>");
  var norm = function (s) { return String(s || "").toLowerCase().replace(/ё/g, "е").trim(); };

  function find(name) {
    var n = " " + norm(name).replace(/,/g, "."), best = null, len = 0;
    PRODUCTS.forEach(function (p) { p.a.forEach(function (a) { if (n.indexOf(" " + a) > -1 && a.length > len) { best = p; len = a.length; } }); });
    return best;
  }
  function num(a) {
    var s = String(a == null ? "" : a).trim().replace(/,/g, "."); if (!s) return null;
    var m = s.match(/^([\d.]+)\s*[-–]\s*([\d.]+)$/); if (m) return (+m[1] + +m[2]) / 2;
    var t = 0, ok = false;
    s.split(/\s+/).forEach(function (p) { var f = p.match(/^(\d+)\/(\d+)$/), v = f ? +f[1] / +f[2] : parseFloat(p); if (!isNaN(v)) { t += v; ok = true; } });
    return ok ? t : null;
  }
  function grams(p, a, unit) {
    var n = num(a); if (n === null) return null;
    var u = norm(unit).replace(/[.\s]/g, ""), d = p.ml;
    if (/^(г|гр|грамм|грамма|граммов)$/.test(u)) return n;
    if (u === "кг") return n * 1000;
    if (u === "мл") return n * (d || 1);
    if (u === "л") return n * 1000 * (d || 1);
    if (/^(стл|столов)/.test(u)) { var t = p.tbsp || (d && 15 * d); return t ? n * t : null; }
    if (/^(чл|чайн)/.test(u)) { var c = p.tsp || (d && 5 * d); return c ? n * c : null; }
    if (/^стакан/.test(u)) { var s = p.cup || (d && 250 * d); return s ? n * s : null; }
    if (/^щепот/.test(u)) return n;
    if (/^головк/.test(u)) { var h = p.head || p.piece; return h ? n * h : null; }
    if (/^пуч/.test(u)) return p.bunch ? n * p.bunch : null;
    if (u === "" || /^(шт|штук|зубч|долек|кусок|кусоч|ломт)/.test(u)) return p.piece ? n * p.piece : null;
    return null;
  }
  function kcalOf(i) {
    var p = find(i.name);
    if (!p && i.k100 > 0) { var g2 = grams({}, i.amount, i.unit); return g2 === null ? null : Math.round(g2 * i.k100 / 100); }
    if (!p) return null;
    if (p.kcal === 0) return 0;
    var g = grams(p, i.amount, i.unit);
    return g === null ? null : Math.round(g * p.kcal / 100);
  }
  function calc(r) {
    var rows = (r.ingredients || []).map(kcalOf), tot = 0, known = 0;
    rows.forEach(function (k) { if (k !== null) { tot += k; known++; } });
    return { rows: rows, tot: tot, known: known, all: rows.length, per: Math.round(tot / (r.servings || 1)) };
  }
  window.czCalc = calc; window.czFind = find; window.czGrams = grams;
  function byId(id) { return all().find(function (x) { return x.id === id; }); }

  var list0 = listHtml;
  listHtml = function () {
    return list0().replace(/(data-v="([^"]+)">[\s\S]*?<div class="meta">)([^<]*)/g, function (m, a, id, t) {
      var r = byId(id), c = r && calc(r);
      return a + t + (c && c.known && c.tot ? " · ≈ " + c.per + " ккал" : "");
    });
  };

  var render0 = render;
  render = function () {
    render0();
    if (!st.open) return;
    var r = byId(st.open), app = $("#app"); if (!r) return;
    var c = calc(r); if (!c.known || !c.tot) return;
    (r.ingredients || []).forEach(function (i, k) {
      var li = app.querySelectorAll("ul.ing li")[k];
      if (li && c.rows[k]) li.insertAdjacentHTML("beforeend", ' <span class="kc">· ' + c.rows[k] + " ккал</span>");
    });
    var p = app.querySelector("p.meta");
    if (p) p.insertAdjacentHTML("afterend", '<div class="kpill"><b>≈ ' + c.per + " ккал на порцию</b><small>Всего ≈ " + c.tot + " ккал, считается по сырым продуктам" +
      (c.known < c.all ? ". Учтено " + c.known + " из " + c.all + " ингредиентов" : "") + "</small></div>");
  };
  render();
})();
