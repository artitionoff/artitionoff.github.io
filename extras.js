// Кузинар: фото к рецептам + «Поделиться» и импорт. Подключается ПОСЛЕ app.js.
(function () {
  var css = ".card{display:flex;align-items:center;gap:12px}.th{width:64px;height:64px;flex:none;object-fit:cover;border-radius:16px}" +
    ".hero{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:24px;display:block;margin:0 0 12px}" +
    ".photo{display:grid;place-items:center;height:150px;border:2px dashed var(--line);border-radius:22px;background:var(--card) center/cover no-repeat;color:var(--mute);margin-bottom:10px;text-align:center}" +
    ".imp{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:10px 14px;margin-bottom:10px}.imp summary{color:var(--green)}.imp textarea{margin-top:8px}";
  document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>");

  var pending = null;
  function persist() {
    try { localStorage.setItem("cz_mine", JSON.stringify(mine)); return true; }
    catch (e) { alert("Не хватило места в памяти телефона. Фото не сохранено."); return false; }
  }
  var enc = function (o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  var dec = function (s) { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))))); };
  function pack(r) { return { t: r.title, c: r.category, m: r.time, s: r.servings, l: r.level, i: r.ingredients.map(function (x) { return [x.name, x.amount, x.unit]; }), p: r.steps }; }
  function unpack(o) {
    if (!o || typeof o.t !== "string" || !Array.isArray(o.i) || !Array.isArray(o.p)) throw 0;
    return { id: "my" + Date.now() + Math.floor(Math.random() * 1000), title: o.t.slice(0, 120), category: CATS.indexOf(o.c) > -1 ? o.c : "Другое",
      time: +o.m || 0, servings: +o.s || 1, level: ["Легко", "Средне", "Сложно"].indexOf(o.l) > -1 ? o.l : "Легко",
      ingredients: o.i.slice(0, 60).map(function (x) { return { name: String(x[0] || "").slice(0, 120), amount: String(x[1] || "").slice(0, 30), unit: String(x[2] || "").slice(0, 30) }; }).filter(function (x) { return x.name; }),
      steps: o.p.slice(0, 60).map(function (s) { return String(s).slice(0, 1000); }).filter(Boolean) };
  }
  function importFrom(text) {
    var m = String(text).match(/r=([\w-]+)/), code = m ? m[1] : String(text).trim();
    try {
      var r = unpack(dec(code));
      mine.push(r); persist(); st.tab = "all"; st.cat = "Все"; st.open = r.id; render();
    } catch (e) { alert("Не получилось прочитать рецепт. Проверь ссылку или код."); }
  }
  function shrink(file, cb) {
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () {
      var s = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      cb(c.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = function () { alert("Не удалось открыть фото"); };
    img.src = u;
  }

  // Список с миниатюрами
  listHtml = function () {
    var q = st.q.toLowerCase();
    var rs = all().filter(function (r) { return (st.tab !== "fav" || favs.indexOf(r.id) > -1) && (st.cat === "Все" || r.category === st.cat) && r.title.toLowerCase().indexOf(q) > -1; });
    if (!rs.length) return '<p class="empty">' + (st.tab === "fav" ? "В избранном пусто. Открой рецепт и нажми «В избранное»." : "Ничего не найдено.") + "</p>";
    return rs.map(function (r) {
      return '<button class="card" data-act="open" data-v="' + esc(r.id) + '">' + (r.photo ? '<img class="th" src="' + r.photo + '" alt="">' : "") +
        "<div><h3>" + esc(r.title) + '</h3><div class="meta">' + esc(r.category) + " · " + r.time + " мин · " + r.servings + " порц. · " + esc(r.level) + "</div></div></button>";
    }).join("");
  };

  // Дорисовываем экраны после каждого render()
  var baseRender = render;
  render = function () {
    baseRender();
    var app = $("#app");
    if (st.open) {
      var r = all().find(function (x) { return x.id === st.open; });
      if (!r) return;
      if (r.photo) app.firstElementChild.insertAdjacentHTML("afterend", '<img class="hero" src="' + r.photo + '" alt="">');
      var f = app.querySelector('[data-act="fav"]');
      if (f) f.insertAdjacentHTML("afterend", '<button class="btn alt" data-act="share" data-v="' + esc(r.id) + '">Поделиться</button>');
    } else if (st.tab === "add") {
      pending = null;
      var p = app.querySelector("p.meta");
      if (p) p.insertAdjacentHTML("afterend",
        '<label class="photo" id="ph"><input type="file" id="f-photo" accept="image/*" hidden><span>Добавить фото блюда</span></label>' +
        '<details class="imp"><summary>Импорт по ссылке или коду</summary><textarea id="imp" rows="2" placeholder="Вставь ссылку или код рецепта"></textarea><button class="btn alt" data-act="import">Добавить рецепт</button></details>');
    }
  };

  document.addEventListener("change", function (e) {
    if (e.target.id !== "f-photo" || !e.target.files[0]) return;
    shrink(e.target.files[0], function (d) {
      pending = d; var ph = $("#ph");
      ph.style.backgroundImage = "url(" + d + ")"; ph.querySelector("span").textContent = "";
    });
  });
  // До обработчика сохранения из app.js (capture), чтобы дописать фото к новому рецепту
  document.addEventListener("click", function (e) {
    if (!e.target.closest('[data-act="save"]')) return;
    var n = mine.length;
    setTimeout(function () {
      if (mine.length > n) { if (pending) { mine[mine.length - 1].photo = pending; if (!persist()) delete mine[mine.length - 1].photo; } pending = null; render(); }
    }, 0);
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    if (b.dataset.act === "import") importFrom($("#imp").value);
    if (b.dataset.act === "share") {
      var r = all().find(function (x) { return x.id === b.dataset.v; }); if (!r) return;
      var text = "🍳 " + r.title + "\n" + r.category + " · " + r.time + " мин · " + r.servings + " порц. · " + r.level +
        "\n\nИнгредиенты:\n" + r.ingredients.map(function (i) { return "• " + i.name + " — " + i.amount + " " + i.unit; }).join("\n") +
        "\n\nПриготовление:\n" + r.steps.map(function (s, k) { return (k + 1) + ". " + s; }).join("\n") +
        "\n\nДобавить в Кузинар: " + location.origin + location.pathname + "#r=" + enc(pack(r));
      if (navigator.share) navigator.share({ title: r.title, text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { alert("Рецепт скопирован. Отправь его кому хочешь."); });
    }
  });

  render();
  if (/^#r=/.test(location.hash)) {
    var code = location.hash.slice(1); history.replaceState(null, "", location.pathname);
    try { var r0 = unpack(dec(code.slice(2))); if (confirm("Добавить рецепт «" + r0.title + "» в Кузинар?")) importFrom(code); } catch (e) {}
  }
})();
