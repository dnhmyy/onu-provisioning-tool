// Generator config satu ONU. Template ada di build().
// Baris berawalan ~ hanya untuk TR69, berawalan ^ hanya untuk ONU baru.
(function () {
  var $ = function (i) {
    return document.getElementById(i);
  };
  var ids = [
    "rack",
    "slot",
    "port",
    "onu",
    "sn",
    "type",
    "name",
    "desc",
    "up",
    "down",
    "vlan",
    "pu",
    "pp",
    "trslot",
  ];
  var queue = [],
    descTouched = false,
    downTouched = false;

  // Nilai tetap
  var TCONT_NAME = "amc-inet";
  var TR_NAME = "TR69",
    TR_UP = "UP-2M",
    TR_DOWN = "DOWN-2M",
    TR_VLAN = "100";

  try {
    var s = JSON.parse(localStorage.getItem("onugen2") || "{}");
    ["rack", "slot", "port", "up", "down", "vlan"].forEach(function (k) {
      if (s[k]) $(k).value = s[k];
    });
    if (s.down) downTouched = true;
    if (s.tr === "0") $("tr").checked = false;
  } catch (e) {}

  function val(i) {
    return $(i).value.trim();
  }
  function trBlock(f, o, n, acs) {
    return [
      "interface gpon-onu_" + f + ":" + o,
      "  tcont " + n + " name " + TR_NAME + " profile " + TR_UP,
      "  gemport " + n + " name " + TR_NAME + " tcont " + n,
      "  gemport " + n + " traffic-limit downstream " + TR_DOWN,
      "  service-port " + n + " vport " + n + " user-vlan " + TR_VLAN + " vlan " + TR_VLAN,
      "exit",
      "pon-onu-mng gpon-onu_" + f + ":" + o,
      "  service " + n + " gemport " + n + " vlan " + TR_VLAN,
      "  tr069-mgmt 1 acs " +
        acs.url +
        " validate basic username " +
        acs.user +
        " password " +
        acs.pass,
      "  tr069-mgmt 1 tag pri 1 vlan " + TR_VLAN,
      "exit",
    ].join("\n");
  }
  function build() {
    var mode = $("gmode").value,
      isNew = mode === "new";
    if (mode === "tr") {
      if (!val("port") || !val("onu")) return "";
      var n = parseInt(val("trslot"), 10);
      if (!(n >= 2 && n <= 8)) n = 2;
      var f2 = val("rack") + "/" + val("slot") + "/" + val("port");
      return trBlock(f2, val("onu"), n, window.AcsSettings.get());
    }
    var req = ["port", "onu", "name", "up", "vlan", "pu", "pp"];
    if (isNew) req.push("sn");
    for (var i = 0; i < req.length; i++) if (!val(req[i])) return "";
    var f = val("rack") + "/" + val("slot") + "/" + val("port"),
      o = val("onu");
    var up = "UP-" + val("up") + "M",
      dn = "DOWN-" + (val("down") || val("up")) + "M",
      v = val("vlan");
    var d = val("desc") || (val("sn") ? "AMC " + val("sn").toUpperCase() : "");
    var tr = $("tr").checked,
      acs = window.AcsSettings.get();
    return [
      "^interface gpon-olt_" + f,
      "^  onu " + o + " type " + val("type") + " sn " + val("sn").toUpperCase(),
      "^exit",
      "interface gpon-onu_" + f + ":" + o,
      "  name " + val("name"),
      d ? "  description " + d : "",
      "  tcont 1 name " + TCONT_NAME + " profile " + up,
      "~  tcont 2 name " + TR_NAME + " profile " + TR_UP,
      "  gemport 1 name " + TCONT_NAME + " tcont 1",
      "  gemport 1 traffic-limit downstream " + dn,
      "~  gemport 2 name " + TR_NAME + " tcont 2",
      "~  gemport 2 traffic-limit downstream " + TR_DOWN,
      "  service-port 1 vport 1 user-vlan " + v + " vlan " + v,
      "~  service-port 2 vport 2 user-vlan " + TR_VLAN + " vlan " + TR_VLAN,
      "exit",
      "pon-onu-mng gpon-onu_" + f + ":" + o,
      "  service 1 gemport 1 vlan " + v,
      "~  service 2 gemport 2 vlan " + TR_VLAN,
      "  wan-ip 1 mode pppoe username " +
        val("pu") +
        " password " +
        val("pp") +
        " vlan-profile " +
        v +
        " host 1",
      "~  tr069-mgmt 1 acs " +
        acs.url +
        " validate basic username " +
        acs.user +
        " password " +
        acs.pass,
      "~  tr069-mgmt 1 tag pri 1 vlan " + TR_VLAN,
      "  security-mgmt 1 state enable mode forward protocol web",
      "exit",
    ]
      .filter(function (l) {
        var c = l.charAt(0);
        if (!l) return false;
        if (c === "~") return tr;
        if (c === "^") return isNew;
        return true;
      })
      .map(function (l) {
        var c = l.charAt(0);
        return c === "~" || c === "^" ? l.slice(1) : l;
      })
      .join("\n");
  }
  function render() {
    if (($("tr").checked || $("gmode").value === "tr") && !window.AcsSettings.get().url) {
      $("out").textContent =
        "Isi Setting ACS dulu (tombol di pojok kanan atas), atau matikan checkbox TR69.";
      return "";
    }
    var cur = build(),
      all = queue.slice();
    if (cur) all.push(cur);
    $("out").textContent = all.length ? all.join("\n") : "Isi form dulu...";

    return all.join("\n");
  }
  ids.forEach(function (i) {
    $(i).addEventListener("input", function () {
      if (i === "desc") descTouched = true;
      if (i === "down") downTouched = true;
      if (i === "sn" && !descTouched)
        $("desc").value = val("sn") ? "AMC " + val("sn").toUpperCase() : "";
      if (i === "up" && !downTouched) $("down").value = val("up");
      render();
    });
  });

  function save() {
    try {
      var s = {};
      ["rack", "slot", "port", "type", "up", "down", "vlan"].forEach(function (k) {
        s[k] = val(k);
      });
      s.tr = $("tr").checked ? "1" : "0";
      localStorage.setItem("onugen2", JSON.stringify(s));
    } catch (e) {}
  }

  $("copy").onclick = function () {
    var t = render();
    if (!t) return;
    var ok = function () {
      $("copy").textContent = "Tercopy!";
      setTimeout(function () {
        $("copy").textContent = "Copy semua";
      }, 1500);
    };
    var fb = function () {
      var r = document.createRange();
      r.selectNodeContents($("out"));
      var sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      try {
        document.execCommand("copy");
        ok();
      } catch (e) {}
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok, fb);
    } else fb();
  };

  $("tr").addEventListener("change", function () {
    render();
    save();
  });
  $("gmode").addEventListener("change", function () {
    var trOnly = $("gmode").value === "tr";
    $("trslotwrap").hidden = !trOnly;
    $("pelanggan").hidden = trOnly;
    render();
  });
  window.addEventListener("beforeunload", save);
  document.addEventListener("acschange", render);
  render();
})();
