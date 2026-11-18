// Pindah tampilan lewat dropdown. index.html#batch langsung membuka Batch TR69.
(function () {
  var sel = document.getElementById("view"),
    v1 = document.getElementById("v1"),
    v2 = document.getElementById("v2");
  function show(x) {
    sel.value = x;
    v1.hidden = x !== "gen";
    v2.hidden = x !== "batch";
    v1.style.display = x === "gen" ? "" : "none";
  }
  function fromHash() {
    show(location.hash === "#batch" ? "batch" : "gen");
  }
  sel.addEventListener("change", function () {
    show(sel.value);
    location.hash = sel.value === "batch" ? "batch" : "gen";
  });
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();
