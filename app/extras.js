// Кузинар: фото к рецептам + «Поделиться» и импорт. Подключается ПОСЛЕ app.js.
(function () {
  var css = ".card{display:flex;align-items:center;gap:12px}.th{width:64px;height:64px;flex:none;object-fit:cover;border-radius:16px}" +
    ".hero{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:24px;display:block;margin:0 0 12px}" +
    ".photo{display:grid;place-items:center;height:150px;border:2px dashed var(--line);border-radius:22px;background:var(--card) center/cover no-repeat;color:var(--mute);margin-bottom:10px;text-align:center}" +
    ".imp{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:10px 14px;margin-bottom:10px}.imp summary{color:var(--green)}.imp textarea{margin-top:8px}.imp input{margin-top:8px}" +
    "@keyframes fadein{from{opacity:0}to{opacity:1}}@keyframes up{from{transform:translateY(100%)}to{transform:none}}" +
    ".sheet-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;z-index:50;animation:fadein .25s}" +
    ".sheet{width:100%;max-width:640px;margin:0 auto;background:var(--bg);color:var(--ink);border-radius:28px 28px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));animation:up .5s var(--spring,ease)}" +
    ".sheet h3{margin-bottom:8px}.sheet .btn small{display:block;font-size:13px;opacity:.75}.sheet .cancel{background:transparent;color:var(--mute)}";
  document.head.insertAdjacentHTML("beforeend", "<style>" + css + "</style>");

  var pending = null;
  function persist() {
    try { localStorage.setItem("cz_mine", JSON.stringify(mine)); return true; }
    catch (e) { alert("Не хватило места в памяти телефона. Фото не сохранено."); return false; }
  }
  function toB64(b) { var s = ""; for (var i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function fromB64(t) { var s = atob(t.replace(/-/g, "+").replace(/_/g, "/")), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (x) { return new Uint8Array(x); }); }
  var canZ = typeof CompressionStream === "function" && typeof DecompressionStream === "function";
  // Код рецепта: "z" + сжатый deflate (короткий) или обычный base64 (старые ссылки и старые браузеры)
  function enc(o) {
    var raw = new TextEncoder().encode(JSON.stringify(o));
    if (!canZ) return Promise.resolve(toB64(raw));
    return pipe(raw, new CompressionStream("deflate-raw")).then(function (z) { return "z" + toB64(z); });
  }
  function dec(code) {
    if (code.charAt(0) === "z") return pipe(fromB64(code.slice(1)), new DecompressionStream("deflate-raw")).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
    return Promise.resolve(JSON.parse(new TextDecoder().decode(fromB64(code))));
  }
  function pack(r, withPhoto) { var o = { t: r.title, c: r.category, m: r.time, s: r.servings, l: r.level, i: r.ingredients.map(function (x) { return [x.name, x.amount, x.unit]; }), p: r.steps }; if (withPhoto && r.photo) o.f = r.photo; return o; }
  function unpack(o) {
    if (!o || typeof o.t !== "string" || !Array.isArray(o.i) || !Array.isArray(o.p)) throw 0;
    var r = { id: "my" + Date.now() + Math.floor(Math.random() * 1000), title: o.t.slice(0, 120), category: CATS.indexOf(o.c) > -1 ? o.c : "Другое",
      time: +o.m || 0, servings: +o.s || 1, level: ["Легко", "Средне", "Сложно"].indexOf(o.l) > -1 ? o.l : "Легко",
      ingredients: o.i.slice(0, 60).map(function (x) { return { name: String(x[0] || "").slice(0, 120), amount: String(x[1] || "").slice(0, 30), unit: String(x[2] || "").slice(0, 30) }; }).filter(function (x) { return x.name; }),
      steps: o.p.slice(0, 60).map(function (s) { return String(s).slice(0, 1000); }).filter(Boolean) };
    if (typeof o.f === "string" && o.f.length < 600000 && /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(o.f)) r.photo = o.f;
    return r;
  }
  function importFrom(text) {
    var m = String(text).match(/r=([\w-]+)/), code = m ? m[1] : String(text).trim();
    Promise.resolve().then(function () { return dec(code); }).then(function (o) {
      var r = unpack(o); mine.push(r); persist(); st.tab = "all"; st.cat = "Все"; st.open = r.id; render();
    }).catch(function () { alert("Не получилось прочитать рецепт. Проверь ссылку или код."); });
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
        '<details class="imp"><summary>Импорт по ссылке или коду</summary><textarea id="imp" rows="2" placeholder="Вставь ссылку или код, либо выбери файл рецепта ниже"></textarea><button class="btn alt" data-act="import">Добавить рецепт</button><input type="file" id="imp-file" accept="text/plain,.txt,.cuzinar"></details>');
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
  function shareText(r) {
    return "🍳 " + r.title + "\n" + r.category + " · " + r.time + " мин · " + r.servings + " порц. · " + r.level +
      "\n\nИнгредиенты:\n" + r.ingredients.map(function (i) { return "• " + i.name + " — " + i.amount + " " + i.unit; }).join("\n") +
      "\n\nПриготовление:\n" + r.steps.map(function (s, k) { return (k + 1) + ". " + s; }).join("\n");
  }
  function closeSheet() { var x = $(".sheet-bg"); if (x) x.remove(); }
  function openSheet(r) {
    closeSheet();
    document.body.insertAdjacentHTML("beforeend", '<div class="sheet-bg"><div class="sheet"><h3>Как поделиться?</h3>' +
      '<button class="btn alt" data-act="sh" data-m="text" data-v="' + esc(r.id) + '">Текстом<small>Читаемый рецепт, без ссылки</small></button>' +
      '<button class="btn alt" data-act="sh" data-m="link" data-v="' + esc(r.id) + '">Ссылкой<small>Откроется в Кузинаре и добавится сам, фото нет</small></button>' +
      (r.photo ? '<button class="btn alt" data-act="sh" data-m="photo" data-v="' + esc(r.id) + '">Текст и фото<small>Картинка блюда с подписью-рецептом</small></button>' : "") +
      '<button class="btn alt" data-act="sh" data-m="file" data-v="' + esc(r.id) + '">Файл рецепта<small>Всё сразу' + (r.photo ? ", с фото" : "") + ". Импорт через «Свой рецепт»</small></button>" +
      '<button class="btn cancel" data-act="sh-close">Отмена</button></div></div>');
  }
  function send(data, copy) {
    if (navigator.share) navigator.share(data).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(copy).then(function () { alert("Скопировано. Отправь кому хочешь."); });
  }
  function sendFile(file, r, text) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: r.title, text: text }).catch(function () {});
    else { var a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
  }
  function doShare(m, r) {
    if (m === "text") return send({ title: r.title, text: shareText(r) }, shareText(r));
    if (m === "photo") return fetch(r.photo).then(function (x) { return x.blob(); }).then(function (b) { sendFile(new File([b], "recipe.jpg", { type: "image/jpeg" }), r, shareText(r)); });
    if (m === "link") return enc(pack(r)).then(function (c) {
      var link = location.origin + location.pathname + "#r=" + c;
      send({ title: r.title, text: "Рецепт «" + r.title + "» в Кузинаре", url: link }, link);
    });
    var name = (r.title.replace(/[^\wа-яё-]+/gi, "_").slice(0, 40) || "recipe") + ".cuzinar.txt";
    return enc(pack(r, true)).then(function (c) {
      sendFile(new File([c], name, { type: "text/plain" }), r, "Рецепт «" + r.title + "» для Кузинара. Импорт: Свой рецепт → Импорт → выбрать файл.");
    });
  }
  document.addEventListener("change", function (e) {
    if (e.target.id !== "imp-file" || !e.target.files[0]) return;
    var rd = new FileReader(); rd.onload = function () { importFrom(rd.result); }; rd.readAsText(e.target.files[0]);
  });
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("sheet-bg")) return closeSheet();
    var b = e.target.closest("[data-act]"); if (!b) return;
    var a = b.dataset.act;
    if (a === "import") importFrom($("#imp").value);
    if (a === "sh-close") closeSheet();
    if (a === "share" || a === "sh") {
      var r = all().find(function (x) { return x.id === b.dataset.v; }); if (!r) return;
      if (a === "share") openSheet(r); else { closeSheet(); doShare(b.dataset.m, r); }
    }
  });

  render();
  if (/^#r=/.test(location.hash)) {
    var code = location.hash.slice(1); history.replaceState(null, "", location.pathname);
    Promise.resolve().then(function () { return dec(code.slice(2)); }).then(function (o) {
      var r0 = unpack(o); if (confirm("Добавить рецепт «" + r0.title + "» в Кузинар?")) importFrom(code);
    }).catch(function () {});
  }
})();
