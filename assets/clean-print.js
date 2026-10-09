(function () {
  "use strict";
  function boot() {
    var content = document.querySelector("main.content");
    if (!content || content.classList.contains("canvas-page") || document.querySelector(".dg-print-dialog")) return;
    var config = window.DG_CLEAN_PRINT || {};
    var defaults = {
      paper: "A4", orientation: "portrait", margin: 18, textSize: 11,
      includeTitle: config.includeTitle !== false, pageNumbers: config.pageNumbers !== false,
      includeDate: false, includeImages: true, expandCallouts: true, linkUrls: false,
      themeColors: false, themeFont: false, themeBackground: false, headingRules: true
    };
    var presets = {
      Standard: { textSize: 11, margin: 18 },
      "Compact Study Sheet": { textSize: 10, margin: 12 },
      "Large Text": { textSize: 14, margin: 24 }
    };
    var defaultPreset = presets[config.defaultPreset] || presets.Standard;
    Object.assign(defaults, defaultPreset);
    var booleanKeys = ["includeTitle", "pageNumbers", "includeDate", "includeImages", "expandCallouts", "linkUrls", "themeColors", "themeFont", "themeBackground", "headingRules"];
    function normalize(raw) {
      var result = Object.assign({}, defaults);
      result.paper = raw.paper === "Letter" ? "Letter" : "A4";
      result.orientation = raw.orientation === "landscape" ? "landscape" : "portrait";
      result.margin = [12, 18, 24].includes(Number(raw.margin)) ? Number(raw.margin) : defaults.margin;
      var size = Number(raw.textSize);
      result.textSize = Number.isFinite(size) ? Math.max(8, Math.min(18, size)) : defaults.textSize;
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

    var themeSnapshots = [];
    var themeByElement = new WeakMap();
    function captureTheme() {
      if (window.matchMedia("print").matches) return;
      var background = getComputedStyle(document.body).backgroundColor;
      if (background === "rgba(0, 0, 0, 0)") background = getComputedStyle(document.body).getPropertyValue("--background-primary").trim() || "white";
      content.style.setProperty("--dg-print-theme-paper", background);
      themeSnapshots = [content].concat(Array.from(content.querySelectorAll("*"))).map(function (el) {
        var style = getComputedStyle(el);
        return { el: el, color: style.color, background: style.backgroundColor, image: style.backgroundImage, font: style.fontFamily };
      });
      themeSnapshots.forEach(function (item) {
        themeByElement.set(item.el, item);
        item.el.style.setProperty("--dg-print-theme-color", item.color);
        item.el.style.setProperty("--dg-print-theme-background", item.background);
        item.el.style.setProperty("--dg-print-theme-image", item.image);
        item.el.style.setProperty("--dg-print-theme-font", item.font);
      });
    }
    var colorProbe = document.createElement("canvas");
    colorProbe.width = colorProbe.height = 1;
    var colorContext = colorProbe.getContext("2d", { willReadFrequently: true });
    var luminanceCache = new Map();
    function luminance(color) {
      if (luminanceCache.has(color)) return luminanceCache.get(color);
      if (!colorContext) return 1;
      colorContext.clearRect(0, 0, 1, 1);
      colorContext.fillStyle = color;
      colorContext.fillRect(0, 0, 1, 1);
      var pixel = colorContext.getImageData(0, 0, 1, 1).data;
      var result = [0.2126, 0.7152, 0.0722].reduce(function (sum, weight, i) {
        var value = pixel[i] / 255;
        return sum + weight * (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
      }, 0);
      luminanceCache.set(color, result);
      return result;
    }

    function applyOptions() {
      document.body.classList.toggle("dg-print-no-title", !options.includeTitle);
      document.body.classList.toggle("dg-print-with-date", options.includeDate);
      document.body.classList.toggle("dg-print-no-images", !options.includeImages);
      document.body.classList.toggle("dg-print-expand", options.expandCallouts);
      document.body.classList.toggle("dg-print-link-urls", options.linkUrls);
      document.body.classList.toggle("dg-print-theme-colors", options.themeColors);
      document.body.classList.toggle("dg-print-theme-font", options.themeFont);
      document.body.classList.toggle("dg-print-theme-background", options.themeBackground);
      document.body.classList.toggle("dg-print-no-rules", !options.headingRules);
      document.body.classList.toggle("dg-print-compact", options.textSize === 10 && options.margin === 12);
      content.style.setProperty("--dg-print-text-size", options.textSize + "pt");
      content.style.setProperty("--dg-print-margin", options.margin + "mm");
      var paper = options.themeBackground ? content.style.getPropertyValue("--dg-print-theme-paper") || "white" : "white";
      content.style.setProperty("--dg-print-paper", paper);
      document.body.style.setProperty("--dg-print-paper", paper);
      content.style.setProperty("--dg-print-ink", luminance(paper) < 0.18 ? "#f5f5f5" : "#111");
      themeSnapshots.forEach(function (item) {
        var backdrop = paper;
        if (options.themeBackground) {
          var ancestor = item.el;
          while (ancestor && themeByElement.has(ancestor)) {
            var candidate = themeByElement.get(ancestor).background;
            if (candidate !== "rgba(0, 0, 0, 0)" && candidate !== "transparent") { backdrop = candidate; break; }
            ancestor = ancestor.parentElement;
          }
        }
        var light = luminance(item.color), ground = luminance(backdrop);
        var ink = ground < 0.18 ? "#f5f5f5" : "#111";
        if (item.el.style.getPropertyValue("--dg-print-element-ink") !== ink) item.el.style.setProperty("--dg-print-element-ink", ink);
        var contrast = (Math.max(light, ground) + 0.05) / (Math.min(light, ground) + 0.05);
        var color = contrast >= 4.5 ? item.color : ink;
        if (options.themeColors && item.el.style.getPropertyValue("--dg-print-theme-color") !== color) item.el.style.setProperty("--dg-print-theme-color", color);
      });
      date.textContent = new Date().toLocaleDateString();
      var counter = options.pageNumbers ? '"Page " counter(page) " of " counter(pages)' : "none";
      pageStyle.textContent = '@media print { @page { size: ' + options.paper + ' ' + options.orientation + '; margin: ' + options.margin + 'mm 0; @bottom-center { content: ' + counter + '; font-family: Arial, sans-serif; font-size: 9pt; color: #555; } } }';
    }
    captureTheme();
    applyOptions();

    var expanded = [];
    var imageLoading = new Map();
    var originalUrls = new Map();
    var ruleStyles = new Map();
    var ruleGeometry = { position: "static", width: "auto", "min-width": "0", "max-width": "100%", "margin-left": "0", "margin-right": "0", transform: "none", "box-sizing": "border-box" };
    function normalizeRule(el) {
      Object.keys(ruleGeometry).forEach(function (key) { el.style.setProperty(key, el.tagName === "HR" && key === "width" ? "100%" : ruleGeometry[key], "important"); });
    }
    function prepare() {
      if (document.documentElement.classList.contains("dg-note-locked")) return;
      applyOptions();
      if (window.matchMedia("print").matches) content.querySelectorAll("h1,h2,h3,h4,h5,h6,hr").forEach(function (el) {
        if (!ruleStyles.has(el)) ruleStyles.set(el, Object.keys(ruleGeometry).map(function (key) { return [key, el.style.getPropertyValue(key), el.style.getPropertyPriority(key)]; }));
        normalizeRule(el);
      });
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
            if (/^https?:$/.test(url.protocol) && url.origin !== location.origin) {
              if (!originalUrls.has(link)) originalUrls.set(link, link.getAttribute("data-dg-print-url"));
              link.setAttribute("data-dg-print-url", url.href);
            }
          } catch (_) {}
        });
      }
    }
    function restore() {
      expanded.forEach(function (details) { details.open = false; });
      expanded = [];
      imageLoading.forEach(function (loading, image) { image.setAttribute("loading", loading); });
      imageLoading.clear();
      originalUrls.forEach(function (value, link) { if (value === null) link.removeAttribute("data-dg-print-url"); else link.setAttribute("data-dg-print-url", value); });
      originalUrls.clear();
      ruleStyles.forEach(function (styles, el) { styles.forEach(function (item) { if (item[1]) el.style.setProperty(item[0], item[1], item[2]); else el.style.removeProperty(item[0]); }); });
      ruleStyles.clear();
    }
    window.addEventListener("beforeprint", prepare);
    window.addEventListener("afterprint", restore);

    var dialog = document.createElement("dialog");
    dialog.className = "dg-print-dialog";
    dialog.setAttribute("aria-labelledby", "dg-print-dialog-title");
    dialog.innerHTML = '<div class="dg-print-layout"><form method="dialog">' +
      '<h2 id="dg-print-dialog-title">Print note</h2><p class="dg-print-note-name"></p>' +
      '<label class="dg-print-preset">Preset<select name="preset"><option>Standard</option><option>Compact Study Sheet</option><option>Large Text</option><option>Custom</option></select></label>' +
      '<div class="dg-print-paper-fields">' +
      '<label>Paper<select name="paper"><option>A4</option><option>Letter</option></select></label>' +
      '<label>Layout<select name="orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>' +
      '<label>Margins<select name="margin"><option value="12">12 mm</option><option value="18">18 mm</option><option value="24">24 mm</option></select></label></div>' +
      '<label class="dg-print-size">Text size<span><input name="textSize" type="range" min="8" max="18" step="1"><output></output></span></label>' +
      '<div class="dg-print-checks">' +
      '<label><input name="includeTitle" type="checkbox">Note name</label>' +
      '<label><input name="pageNumbers" type="checkbox">Page numbers</label>' +
      '</div><details class="dg-print-advanced"><summary>Advanced</summary><div class="dg-print-checks">' +
      '<label><input name="includeDate" type="checkbox">Print date</label>' +
      '<label><input name="includeImages" type="checkbox">Images</label>' +
      '<label><input name="expandCallouts" type="checkbox">Expanded callouts</label>' +
      '<label><input name="linkUrls" type="checkbox">Link addresses</label>' +
      '<label><input name="themeColors" type="checkbox">Theme text colors</label>' +
      '<label><input name="themeFont" type="checkbox">Theme fonts</label>' +
      '<label><input name="themeBackground" type="checkbox">Theme backgrounds</label>' +
      '<label><input name="headingRules" type="checkbox">Heading dividers</label></div></details>' +
      '<div class="dg-print-actions"><button type="button" class="dg-print-cancel">Cancel</button><button type="submit" class="dg-print-submit"><i data-lucide="printer"></i>Print / PDF</button></div></form>' +
      '<aside class="dg-print-preview"><h3>Preview</h3><div class="dg-print-preview-viewport"><div class="dg-print-preview-scaled"><iframe title="Print layout preview" sandbox="allow-same-origin" tabindex="-1"></iframe></div></div></aside></div>';
    dialog.querySelector(".dg-print-note-name").textContent = title;
    document.body.appendChild(dialog);
    var form = dialog.querySelector("form");
    var dialogOriginal = null;
    var previewFrame = dialog.querySelector("iframe");
    var previewViewport = dialog.querySelector(".dg-print-preview-viewport");
    var previewScale = dialog.querySelector(".dg-print-preview-scaled");
    var previewPaperWidth = 794;
    function fitPreview() {
      if (!dialog.open || !previewFrame.contentDocument) return;
      var height = Math.max(Number(previewFrame.dataset.paperHeight) || 1123, previewFrame.contentDocument.body.scrollHeight);
      var scale = Math.min(1, Math.max(0.1, (previewViewport.clientWidth - 32) / previewPaperWidth));
      previewFrame.style.height = height + "px";
      previewFrame.style.transform = "scale(" + scale + ")";
      previewScale.style.width = previewPaperWidth * scale + "px";
      previewScale.style.height = height * scale + "px";
    }
    function renderPreview() {
      if (!dialog.open || document.documentElement.classList.contains("dg-note-locked")) return;
      applyOptions();
      var css = "";
      Array.from(document.styleSheets).forEach(function (sheet) {
        if (!sheet.href || !sheet.href.split("?")[0].endsWith("clean-print.css")) return;
        try { Array.from(sheet.cssRules).forEach(function (rule) {
          if (rule.type === CSSRule.MEDIA_RULE && rule.media.mediaText === "print") css += Array.from(rule.cssRules).map(function (child) { return child.cssText; }).join("\n");
        }); } catch (_) {}
      });
      var clone = content.cloneNode(true);
      clone.inert = false;
      clone.querySelectorAll("script, iframe, object, embed, .giscus").forEach(function (el) { el.remove(); });
      [clone].concat(Array.from(clone.querySelectorAll("*"))).forEach(function (el) {
        if (/^H[1-6]$/.test(el.tagName) || el.tagName === "HR") normalizeRule(el);
        Array.from(el.attributes).forEach(function (attr) { if (/^on/i.test(attr.name)) el.removeAttribute(attr.name); });
        if (options.expandCallouts && el.tagName === "DETAILS") el.open = true;
        if (el.hasAttribute("data-dg-fold-hidden")) el.removeAttribute("hidden");
        el.removeAttribute("data-dg-fold-hidden");
        el.removeAttribute("data-dg-fold-owner");
        if (el.tagName === "A" && options.linkUrls) {
          try { var link = new URL(el.href, location.href); if (link.origin !== location.origin && /^https?:$/.test(link.protocol)) el.setAttribute("data-dg-print-url", link.href); } catch (_) {}
        }
      });
      var dimensions = options.paper === "Letter" ? [215.9, 279.4] : [210, 297];
      if (options.orientation === "landscape") dimensions.reverse();
      previewPaperWidth = dimensions[0] * 96 / 25.4;
      previewFrame.style.width = previewPaperWidth + "px";
      previewFrame.dataset.paperHeight = String(dimensions[1] * 96 / 25.4);
      var doc = previewFrame.contentDocument;
      doc.open();
      doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
      doc.close();
      var base = doc.createElement("base"); base.href = location.href; doc.head.appendChild(base);
      var style = doc.createElement("style");
      style.textContent = css + '\nhtml body.dg-print-clean.dg-print-preview main.content:not(.canvas-page){padding-block:var(--dg-print-margin)!important;}html,body{margin:0;}body{min-height:' + previewFrame.dataset.paperHeight + 'px;}';
      doc.head.appendChild(style);
      doc.body.className = Array.from(document.body.classList).filter(function (name) { return name.indexOf("dg-print-") === 0; }).join(" ") + " dg-print-preview";
      doc.body.style.setProperty("--dg-print-paper", content.style.getPropertyValue("--dg-print-paper"));
      doc.body.appendChild(doc.importNode(clone, true));
      doc.querySelectorAll("img").forEach(function (image) { image.addEventListener("load", fitPreview, {once:true}); });
      fitPreview();
    }
    window.addEventListener("resize", fitPreview, {passive:true});
    function field(name) { return form.elements.namedItem(name); }
    function showValues() {
      ["paper", "orientation", "margin", "textSize"].forEach(function (key) { field(key).value = String(options[key]); });
      booleanKeys.forEach(function (key) { field(key).checked = options[key]; });
      form.querySelector("output").textContent = options.textSize + " pt";
      field("preset").value = Object.keys(presets).find(function (key) { return presets[key].textSize === options.textSize && presets[key].margin === options.margin; }) || "Custom";
    }
    function readValues() {
      var values = {};
      ["paper", "orientation", "margin", "textSize"].forEach(function (key) { values[key] = field(key).value; });
      booleanKeys.forEach(function (key) { values[key] = field(key).checked; });
      options = normalize(values);
      form.querySelector("output").textContent = options.textSize + " pt";
    }
    function openDialog() {
      if (dialog.open || document.documentElement.classList.contains("dg-note-locked")) return;
      captureTheme();
      dialogOriginal = Object.assign({}, options);
      showValues();
      if (!dialog.open) dialog.showModal();
      renderPreview();
    }
    function onOptionsChange(event) {
      if (event.target.name === "preset") {
        var preset = presets[field("preset").value];
        if (preset) { Object.assign(options, preset); showValues(); }
      } else {
        readValues();
        field("preset").value = Object.keys(presets).find(function (key) { return presets[key].textSize === options.textSize && presets[key].margin === options.margin; }) || "Custom";
      }
      renderPreview();
    }
    form.addEventListener("input", onOptionsChange);
    form.addEventListener("change", onOptionsChange);
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
      window.requestAnimationFrame(function () { window.requestAnimationFrame(function () {
        try { window.print(); } catch (_) { restore(); }
      }); });
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        openDialog();
      }
    });

    if (window.DGNavTools) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "dg-print-button";
      button.title = "Print note";
      button.setAttribute("aria-label", "Print note");
      button.innerHTML = '<i data-lucide="printer"></i><span aria-hidden="true">&#128438;</span>';
      button.addEventListener("click", openDialog);
      window.DGNavTools.mount("dg-clean-print-control", button);
    }
    if (window.lucide) window.lucide.createIcons();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
