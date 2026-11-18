// Batch TR69: baca show running-config dan show gpon onu state yang ditempel,
// lalu buat config TR69 untuk ONU yang slotnya masih kosong.
(function () {
  var $ = function (i) {
    return document.getElementById(i);
  };
  function v(i) {
    return $(i).value.trim();
  }

  function parseCfg(txt) {
    var onus = {},
      cur = null,
      states = {};
    $("st")
      .value.split("\n")
      .forEach(function (raw) {
        var s2 = /^\s*([0-9]+\/[0-9]+\/[0-9]+:[0-9]+)\s+\S+\s+\S+\s+(\S+)/.exec(raw);
        if (s2) states[s2[1]] = s2[2];
      });
    txt.split("\n").forEach(function (raw) {
      var l = raw.replace(/\r/g, ""),
        x;
      var sm = /^\s*([0-9]+\/[0-9]+\/[0-9]+:[0-9]+)\s+\S+\s+\S+\s+(\S+)/.exec(l);
      if (sm) {
        states[sm[1]] = sm[2];
        cur = null;
        return;
      }
      var m = /^\s*interface\s+gpon-onu_([0-9]+\/[0-9]+\/[0-9]+:[0-9]+)/.exec(l);
      var mm = /^\s*pon-onu-mng\s+gpon-onu_([0-9]+\/[0-9]+\/[0-9]+:[0-9]+)/.exec(l);
      if (m || mm) {
        var key = (m || mm)[1];
        if (!onus[key])
          onus[key] = {
            key: key,
            name: "",
            tc: {},
            gem: {},
            sp: {},
            svc: {},
            tr: false,
            hasIf: false,
          };
        if (m) onus[key].hasIf = true;
        cur = { o: onus[key], t: m ? "if" : "mng" };
        return;
      }
      if (!cur) return;
      if (/^\S/.test(l)) {
        cur = null;
        return;
      }
      var o = cur.o;
      if (cur.t === "if") {
        if ((x = /^\s*name\s+(\S.*)$/.exec(l))) o.name = x[1].trim();
        else if ((x = /^\s*tcont\s+([0-9]+)\s+name\s+(\S+)\s+profile\s+(\S+)/.exec(l)))
          o.tc[x[1]] = x[2] + " / " + x[3];
        else if ((x = /^\s*tcont\s+([0-9]+)\s/.exec(l))) o.tc[x[1]] = o.tc[x[1]] || "ada";
        else if ((x = /^\s*gemport\s+([0-9]+)\s+name\s+(\S+)/.exec(l))) o.gem[x[1]] = x[2];
        else if ((x = /^\s*gemport\s+([0-9]+)\s/.exec(l))) o.gem[x[1]] = o.gem[x[1]] || "ada";
        else if (
          (x = /^\s*service-port\s+([0-9]+)\s+vport\s+([0-9]+)\s+user-vlan\s+([0-9]+)/.exec(l))
        )
          o.sp[x[1]] = x[3];
        else if ((x = /^\s*service-port\s+([0-9]+)\s/.exec(l))) o.sp[x[1]] = o.sp[x[1]] || "?";
      } else {
        if (/^\s*tr069-mgmt/.test(l)) o.tr = true;
        if ((x = /^\s*service\s+([0-9]+)\s+gemport/.exec(l))) o.svc[x[1]] = 1;
      }
    });
    var list = Object.keys(onus).map(function (k) {
      return onus[k];
    });
    window.hasStates = Object.keys(states).length > 0;
    window.stateMap = states;
    window.cfgKeys = {};
    Object.keys(onus).forEach(function (k) {
      if (onus[k].hasIf) window.cfgKeys[k] = 1;
    });
    if (v("mode") === "w")
      list = list.filter(function (o) {
        return /working/i.test(states[o.key] || "");
      });
    var fp = v("fp")
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (fp.length)
      list = list.filter(function (o) {
        return fp.indexOf(o.key.split(":")[0]) >= 0;
      });
    list.forEach(function (o) {
      var p = o.key.split(/[\/:]/).map(Number);
      o.p = p;
    });
    list.sort(function (a, b) {
      for (var i = 0; i < 4; i++) {
        if (a.p[i] !== b.p[i]) return a.p[i] - b.p[i];
      }
      return 0;
    });
    return list;
  }

  // Kelompok: noif, other, done, conflict, clean
  function classify(o) {
    if (!o.hasIf) return "noif";
    var f = v("t1").toLowerCase();
    if (
      f &&
      ((o.tc["1"] || "").split(" / ")[0].toLowerCase() !== f ||
        (o.gem["1"] || "").toLowerCase() !== f)
    )
      return "other";
    var hit = false;
    [o.tc, o.gem].forEach(function (m) {
      for (var k in m) {
        if (/tr69/i.test(m[k])) hit = true;
      }
    });
    if (o.tr || hit) return "done";
    if (o.tc["2"] || o.gem["2"] || o.sp["2"] || o.svc["2"]) return "conflict";
    return "clean";
  }
  // Cari slot 3 sampai 8 yang masih kosong
  function freeSlot(o) {
    for (var n = 3; n <= 8; n++) {
      if (!o.tc[n] && !o.gem[n] && !o.sp[n] && !o.svc[n]) return n;
    }
    return 0;
  }
  function conflictLine(o) {
    var a = [
      "tcont2=" + (o.tc["2"] || "-"),
      "gemport2=" + (o.gem["2"] || "-"),
      "service-port2 vlan=" + (o.sp["2"] || "-"),
    ];
    var n = freeSlot(o);
    return (
      o.key +
      "  " +
      (o.name || "(tanpa name)") +
      "  |  " +
      a.join(", ") +
      "  =>  " +
      (n ? "pakai slot " + n : "TIDAK ADA slot kosong, dilewati")
    );
  }

  function block(o, n) {
    var t = v("tn"),
      vl = v("tv"),
      acs = window.AcsSettings.get();
    return [
      "interface gpon-onu_" + o.key,
      "  tcont " + n + " name " + t + " profile " + v("tu"),
      "  gemport " + n + " name " + t + " tcont " + n,
      "  gemport " + n + " traffic-limit downstream " + v("td"),
      "  service-port " + n + " vport " + n + " user-vlan " + vl + " vlan " + vl,
      "exit",
      "pon-onu-mng gpon-onu_" + o.key,
      "  service " + n + " gemport " + n + " vlan " + vl,
      "  tr069-mgmt 1 acs " +
        acs.url +
        " validate basic username " +
        acs.user +
        " password " +
        acs.pass,
      "  tr069-mgmt 1 tag pri 1 vlan " + vl,
      "exit",
    ].join("\n");
  }

  function copyText(t, btn) {
    var l = btn.textContent;
    var ok = function () {
      btn.textContent = "Tercopy!";
      setTimeout(function () {
        btn.textContent = l;
      }, 1300);
    };
    var fb = function () {
      var ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        ok();
      } catch (e) {}
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok, fb);
    } else fb();
  }
  function stat(box, label, num, warn) {
    var d = document.createElement("div");
    if (warn) d.className = "wn";
    var b = document.createElement("b");
    b.textContent = num;
    d.appendChild(b);
    d.appendChild(document.createTextNode(label));
    box.appendChild(d);
  }

  var allText = "";
  function render() {
    var st = $("stat"),
      cf = $("conf"),
      box = $("parts");
    st.textContent = "";
    cf.textContent = "";
    box.textContent = "";
    allText = "";
    var txt = $("in").value;
    if (!txt.trim()) {
      $("sum").textContent = "Belum ada data";
      return;
    }
    if (!window.AcsSettings.get().url) {
      $("sum").textContent = "Isi Setting ACS dulu (tombol di pojok kanan atas)";
      return;
    }
    var list = parseCfg(txt);
    if (v("mode") === "w" && !window.hasStates) {
      $("sum").textContent = "Mode working butuh hasil show gpon onu state di kolom kiri";
      return;
    }
    if (!list.length) {
      $("sum").textContent = "Nggak ada blok gpon-onu kebaca, cek hasil paste-nya";
      return;
    }
    var cl = { clean: [], done: [], conflict: [], noif: [], other: [] };
    list.forEach(function (o) {
      cl[classify(o)].push(o);
    });
    var gen = cl.clean.map(function (o) {
        return { o: o, n: 2 };
      }),
      skipped = [];
    cl.conflict.forEach(function (o) {
      var n = freeSlot(o);
      if (n) gen.push({ o: o, n: n });
      else skipped.push(o);
    });
    stat(st, " ONU terbaca", list.length, false);
    stat(st, " aman (slot 2 kosong)", cl.clean.length, false);
    stat(st, " sudah ada TR69, dilewati", cl.done.length, false);
    stat(st, " slot 2 terpakai (pakai slot lain)", cl.conflict.length, true);
    if (cl.noif.length) stat(st, " tanpa blok interface, dilewati", cl.noif.length, true);
    if (cl.other.length)
      stat(st, " bukan tcont 1 dan gemport 1 " + v("t1") + ", dilewati", cl.other.length, false);
    if (window.hasStates) {
      var w = 0,
        miss = 0;
      Object.keys(window.stateMap).forEach(function (k) {
        if (/working/i.test(window.stateMap[k])) {
          w++;
          if (!window.cfgKeys[k]) miss++;
        }
      });
      stat(st, " working di state", w, false);
      if (miss) stat(st, " working tapi nggak ada blok config", miss, true);
    }

    if (cl.conflict.length) {
      var lines = cl.conflict.map(conflictLine).join("\n");
      var row = document.createElement("div");
      row.className = "row";
      var lab = document.createElement("div");
      lab.className = "m";
      lab.style.margin = "0";
      lab.textContent =
        "ONU dengan slot 2 terpakai (diproses pakai slot kosong berikutnya, daftar ini cuma info):";
      var b = document.createElement("button");
      b.textContent = "Copy daftar";
      b.onclick = function () {
        copyText(lines, b);
      };
      row.appendChild(lab);
      row.appendChild(b);
      var pre = document.createElement("pre");
      pre.textContent = lines;
      cf.appendChild(row);
      cf.appendChild(pre);
    }

    if (!gen.length) {
      $("sum").textContent = "Nggak ada ONU yang aman diproses";
      return;
    }
    var perPort = {},
      order = [];
    gen.forEach(function (g) {
      var k = g.o.p[0] + "/" + g.o.p[1] + "/" + g.o.p[2];
      if (!perPort[k]) {
        perPort[k] = 0;
        order.push(k);
      }
      perPort[k]++;
    });
    $("sum").textContent =
      gen.length +
      " ONU akan dikonfig (" +
      gen.filter(function (g) {
        return g.n !== 2;
      }).length +
      " pakai slot selain 2) di " +
      order.length +
      " port: " +
      order
        .map(function (k) {
          return k + " (" + perPort[k] + ")";
        })
        .join(", ");
    var n = parseInt(v("chunk"), 10);
    if (!(n > 0)) n = 20;
    var parts = [];
    for (var i = 0; i < gen.length; i += n) parts.push(gen.slice(i, i + n));
    var texts = [];
    parts.forEach(function (ch, idx) {
      var t = ch
        .map(function (g) {
          return block(g.o, g.n);
        })
        .join("\n");
      texts.push(t);
      var wrap = document.createElement("div");
      wrap.style.marginTop = "12px";
      var row = document.createElement("div");
      row.className = "row";
      var lab = document.createElement("div");
      lab.className = "m";
      lab.style.margin = "0";
      lab.textContent =
        "Bagian " +
        (idx + 1) +
        " dari " +
        parts.length +
        " (" +
        ch.length +
        " ONU: " +
        ch[0].o.key +
        " sampai " +
        ch[ch.length - 1].o.key +
        ")";
      var b = document.createElement("button");
      b.textContent = "Copy bagian " + (idx + 1);
      b.onclick = function () {
        copyText(t, b);
      };
      row.appendChild(lab);
      row.appendChild(b);
      var pre = document.createElement("pre");
      pre.textContent = t;
      wrap.appendChild(row);
      wrap.appendChild(pre);
      box.appendChild(wrap);
    });
    allText = texts.join("\n");
  }
  ["in", "st", "fp", "chunk", "t1", "tn", "tu", "td", "tv"].forEach(function (i) {
    $(i).addEventListener("input", render);
  });
  $("mode").addEventListener("change", render);
  $("all").onclick = function () {
    if (allText) copyText(allText, this);
  };
  document.addEventListener("acschange", render);
  render();
})();
