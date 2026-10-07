(function () {
  "use strict";
  function boot() {
    var content = document.querySelector("main.content, .content");
    if (!content || content.classList.contains("canvas-page") || document.querySelector(".dg-print-dialog")) return;
    var config = window.DG_CLEAN_PRINT || {};
    var defaults = {
      paper: "A4", orientation: "portrait", margin: 18, textSize: 11,
      includeTitle: config.includeTitle !== false, pageNumbers: config.pageNumbers !== false,
      includeDate: false, includeImages: true, expandCallouts: true, linkUrls: false
    };
    var booleanKeys = ["includeTitle", "pageNumbers", "includeDate", "includeImages", "expandCallouts", "linkUrls"];
    function normalize(raw) {
      var result = Object.assign({}, defaults);
      result.paper = raw.paper === "Letter" ? "Letter" : "A4";
      result.orientation = raw.orientation === "landscape" ? "landscape" : "portrait";
      result.margin = [12, 18, 24].includes(Number(raw.margin)) ? Number(raw.margin) : 18;
      var size = Number(raw.textSize);
      result.textSize = Number.isFinite(size) ? Math.max(8, Math.min(18, size)) : 11;
      booleanKeys.forEach(function (key) { if (typeof raw[key] === "boolean") result[key] = raw[key]; });
      return result;
    }
    var stored = {};
    if (config.rememberOptions !== false) {
      try { stored = JSON.parse(localStorage.getItem("dgCleanPrint.options") || "{}"); } catch (_) {}
    }
    var options = normalize(stored && typeof stored === "object" ? stored : {});
    var titleSource = content.querySelector(":scope > header h1") || document.querySelector(".toc-title");
    var title = titleSource ? titleSource.textContent.trim() : document.title;
    var heading = document.createElement("div");
    heading.className = "dg-print-heading";
    var noteName = document.createElement("h1");
    noteName.textContent = title;
    var date = document.createElement("p");
    date.className = "dg-print-date";
    heading.appendChild(noteName);
    heading.appendChild(date);
    content.insertBefore(heading, content.firstChild);
    document.body.classList.add("dg-print-clean");
    var pageStyle = document.createElement("style");
    pageStyle.id = "dg-print-page-style";
    document.head.appendChild(pageStyle);

    function applyOptions() {
      document.body.classList.toggle("dg-print-no-title", !options.includeTitle);
      document.body.classList.toggle("dg-print-with-date", options.includeDate);
      document.body.classList.toggle("dg-print-no-images", !options.includeImages);
      document.body.classList.toggle("dg-print-expand", options.expandCallouts);
      document.body.classList.toggle("dg-print-link-urls", options.linkUrls);
      content.style.setProperty("--dg-print-text-size", options.textSize + "pt");
      date.textContent = new Date().toLocaleDateString();
      var counter = options.pageNumbers ? '"Page " counter(page) " of " counter(pages)' : "none";
      pageStyle.textContent = '@media print { @page { size: ' + options.paper + ' ' + options.orientation + '; margin: ' + options.margin + 'mm; @bottom-center { content: ' + counter + '; font-family: Arial, sans-serif; font-size: 9pt; color: #555; } } }';
    }
    applyOptions();

    var expanded = [];
    var imageLoading = new Map();
    function prepare() {
      applyOptions();
      if (options.includeImages) content.querySelectorAll('img[loading="lazy"]').forEach(function (image) {
        if (!imageLoading.has(image)) imageLoading.set(image, image.getAttribute("loading"));
        image.loading = "eager";
      });
      if (options.expandCallouts) {
        content.querySelectorAll("details:not([open])").forEach(function (details) {
          expanded.push(details);
          details.open = true;
        });
      }
      if (options.linkUrls) {
        content.querySelectorAll("a[href]").forEach(function (link) {
          try {
            var url = new URL(link.href, location.href);
            if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) link.setAttribute("data-dg-print-url", url.href);
          } catch (_) {}
        });
      }
    }
    function restore() {
      expanded.forEach(function (details) { details.open = false; });
      expanded = [];
      imageLoading.forEach(function (loading, image) { image.setAttribute("loading", loading); });
      imageLoading.clear();
    }
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);

    var dialog = document.createElement("dialog");
    dialog.className = "dg-print-dialog";
    dialog.setAttribute("aria-labelledby", "dg-print-dialog-title");
    dialog.innerHTML = '<form method="dialog">' +
      '<h2 id="dg-print-dialog-title">Print note</h2><p class="dg-print-note-name"></p>' +
      '<div class="dg-print-paper-fields">' +
      '<label>Paper<select name="paper"><option>A4</option><option>Letter</option></select></label>' +
      '<label>Layout<select name="orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>' +
      '<label>Margins<select name="margin"><option value="12">Narrow</option><option value="18">Standard</option><option value="24">Wide</option></select></label></div>' +
      '<label class="dg-print-size">Text size<span><input name="textSize" type="range" min="8" max="18" step="1"><output></output></span></label>' +
      '<div class="dg-print-checks">' +
      '<label><input name="includeTitle" type="checkbox">Note name</label>' +
      '<label><input name="pageNumbers" type="checkbox">Page numbers</label>' +
      '<label><input name="includeDate" type="checkbox">Print date</label>' +
      '<label><input name="includeImages" type="checkbox">Images</label>' +
      '<label><input name="expandCallouts" type="checkbox">Expanded callouts</label>' +
      '<label><input name="linkUrls" type="checkbox">Link addresses</label></div>' +
      '<div class="dg-print-actions"><button type="button" class="dg-print-cancel">Cancel</button><button type="submit" class="dg-print-submit"><i data-lucide="printer"></i>Print / PDF</button></div></form>';
    dialog.querySelector(".dg-print-note-name").textContent = title;
    document.body.appendChild(dialog);
    var form = dialog.querySelector("form");
    var dialogOriginal = null;
    function field(name) { return form.elements.namedItem(name); }
    function showValues() {
      ["paper", "orientation", "margin", "textSize"].forEach(function (key) { field(key).value = String(options[key]); });
      booleanKeys.forEach(function (key) { field(key).checked = options[key]; });
      form.querySelector("output").textContent = options.textSize + " pt";
    }
    function readValues() {
      var values = {};
      ["paper", "orientation", "margin", "textSize"].forEach(function (key) { values[key] = field(key).value; });
      booleanKeys.forEach(function (key) { values[key] = field(key).checked; });
      options = normalize(values);
      form.querySelector("output").textContent = options.textSize + " pt";
    }
    function openDialog() {
      if (dialog.open) return;
      dialogOriginal = Object.assign({}, options);
      showValues();
      if (!dialog.open) dialog.showModal();
    }
    form.addEventListener("input", readValues);
    form.addEventListener("change", readValues);
    dialog.querySelector(".dg-print-cancel").addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("close", function () {
      if (dialogOriginal) options = dialogOriginal;
      dialogOriginal = null;
      applyOptions();
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      readValues();
      dialogOriginal = null;
      applyOptions();
      if (config.rememberOptions !== false) {
        try { localStorage.setItem("dgCleanPrint.options", JSON.stringify(options)); } catch (_) {}
      }
      dialog.close();
      prepare();
      var resources = [];
      if (document.fonts) resources.push(document.fonts.ready);
      if (options.includeImages) content.querySelectorAll("img").forEach(function (image) {
        if (image.decode) resources.push(image.decode());
      });
      await Promise.race([Promise.allSettled(resources), new Promise(function (resolve) { setTimeout(resolve, 3000); })]);
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { window.print(); }); });
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        openDialog();
      }
    });

    var nav = document.querySelector(".filetree-sidebar");
    if (nav) {
      var scroll = nav.querySelector(":scope > .dg-theme-nav-content");
      if (!scroll) {
        scroll = document.createElement("div");
        scroll.className = "dg-theme-nav-content";
        while (nav.firstChild) scroll.appendChild(nav.firstChild);
        nav.appendChild(scroll);
      }
      var footer = nav.querySelector(":scope > .dg-theme-nav-footer");
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "dg-theme-nav-footer";
        nav.appendChild(footer);
      }
      nav.classList.add("dg-theme-nav");
      var button = document.createElement("button");
      button.type = "button";
      button.className = "dg-print-button";
      button.title = "Print note";
      button.setAttribute("aria-label", "Print note");
      button.innerHTML = '<i data-lucide="printer"></i><span aria-hidden="true">&#128438;</span>';
      button.addEventListener("click", openDialog);
      footer.appendChild(button);
    }
    if (window.lucide) window.lucide.createIcons();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
