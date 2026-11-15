// Кузинар: выбор продукта из базы в форме рецепта + расчёт калорий на лету. Подключается после calories.js.
(function () {
  var UNITS = ["г", "кг", "мл", "л", "шт", "ст. л.", "ч. л.", "стакан", "щепотка", "зубчик", "головка", "пучок"];
  document.head.insertAdjacentHTML("beforeend", "<style>.kh{margin:-2px 0 10px;font-size:14px;color:var(--mute);min-height:1px}" +
    ".k100{display:inline-block;width:110px;margin:0 0 0 6px;padding:6px 10px}</style>");

  function ensureLists() {
    if ($("#cz-prod")) return;
    var names = PRODUCTS.map(function (p) { return p.name; }).sort(function (a, b) { return a.localeCompare(b, "ru"); });
    document.body.insertAdjacentHTML("beforeend",
      '<datalist id="cz-prod">' + names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + "</datalist>" +
      '<datalist id="cz-unit">' + UNITS.map(function (u) { return '<option value="' + esc(u) + '">'; }).join("") + "</datalist>");
  }
  function prepRows() {
    var box = $("#ings"); if (!box) return;
    box.querySelectorAll(".row").forEach(function (row) {
      var n = row.querySelector(".in-n"), u = row.querySelector(".in-u");
      n.setAttribute("list", "cz-prod"); n.setAttribute("autocomplete", "off"); u.setAttribute("list", "cz-unit");
      var nx = row.nextElementSibling;
      if (!(nx && nx.classList.contains("kh"))) row.insertAdjacentHTML("afterend",
        '<div class="kh"><span class="ht"></span><span class="kx" hidden> Калории на 100 г: <input class="k100" type="number" min="0" inputmode="decimal" placeholder="ккал"></span></div>');
    });
  }
  function updateHint(row) {
    var h = row.nextElementSibling; if (!h || !h.classList.contains("kh")) return;
    var n = row.querySelector(".in-n").value.trim(), a = row.querySelector(".in-a").value.trim(), u = row.querySelector(".in-u").value.trim();
    var ht = h.querySelector(".ht"), kx = h.querySelector(".kx");
    if (!n) { ht.textContent = ""; kx.hidden = true; return; }
    var p = czFind(n); kx.hidden = !!p;
    if (p) {
      if (p.kcal === 0) { ht.textContent = "Не влияет на калорийность: " + p.name; return; }
      var g = a ? czGrams(p, a, u) : null;
      ht.textContent = g !== null ? "≈ " + Math.round(g * p.kcal / 100) + " ккал · " + p.name : p.name + " · " + p.kcal + " ккал на 100 г" + (a ? ". Выбери единицу из списка" : "");
    } else {
      var k = +h.querySelector(".k100").value, g2 = a && k > 0 ? czGrams({}, a, u) : null;
      ht.textContent = !k ? "Нет в базе. Укажи калории, чтобы они посчитались" : g2 !== null ? "≈ " + Math.round(g2 * k / 100) + " ккал" : "Для своего продукта используй г, кг, мл или л";
    }
  }

  document.addEventListener("input", function (e) {
    var t = e.target; if (!t.matches || !t.matches("#ings .in-n,#ings .in-a,#ings .in-u,#ings .k100")) return;
    var row = t.closest(".row") || (t.closest(".kh") && t.closest(".kh").previousElementSibling);
    if (row) updateHint(row);
  });
  // До сохранения из app.js: запоминаем «свои» калории, потом дописываем к новому рецепту
  document.addEventListener("click", function (e) {
    if (!e.target.closest('[data-act="save"]')) return;
    var ks = [].slice.call(document.querySelectorAll("#ings .row")).map(function (r) {
      var k = r.nextElementSibling && r.nextElementSibling.querySelector(".k100");
      return { n: r.querySelector(".in-n").value.trim(), k: k ? +k.value : 0 };
    }).filter(function (x) { return x.n; });
    var n = mine.length;
    setTimeout(function () {
      if (mine.length <= n) return;
      var r = mine[mine.length - 1], ch = false;
      if (r.ingredients.length !== ks.length) return;
      r.ingredients.forEach(function (i, j) { if (ks[j].k > 0 && !czFind(i.name)) { i.k100 = ks[j].k; ch = true; } });
      if (ch) { try { localStorage.setItem("cz_mine", JSON.stringify(mine)); } catch (x) {} render(); }
    }, 0);
  }, true);

  var render0 = render;
  render = function () {
    render0();
    if (st.open || st.tab !== "add") return;
    ensureLists(); prepRows();
    var box = $("#ings"); if (box) new MutationObserver(prepRows).observe(box, { childList: true });
  };
})();
