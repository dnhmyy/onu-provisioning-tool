// Setting ACS dipakai generator dan batch. Disimpan di localStorage browser ini,
// tidak ditulis di source code.
(function () {
  var KEY = "onuacs";
  var $ = function (i) {
    return document.getElementById(i);
  };
  var fields = { url: $("acs_url"), user: $("acs_user"), pass: $("acs_pass") };

  function get() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { url: s.url || "", user: s.user || "", pass: s.pass || "" };
    } catch (e) {
      return { url: "", user: "", pass: "" };
    }
  }

  function label() {
    $("acsbtn").textContent = get().url ? "Setting ACS" : "Setting ACS (kosong)";
  }

  var saved = get();
  fields.url.value = saved.url;
  fields.user.value = saved.user;
  fields.pass.value = saved.pass;
  label();

  ["url", "user", "pass"].forEach(function (k) {
    fields[k].addEventListener("input", function () {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            url: fields.url.value.trim(),
            user: fields.user.value.trim(),
            pass: fields.pass.value,
          }),
        );
      } catch (e) {}
      label();
      document.dispatchEvent(new Event("acschange"));
    });
  });

  $("acsbtn").addEventListener("click", function () {
    $("acspanel").hidden = !$("acspanel").hidden;
  });

  window.AcsSettings = { get: get };
})();
