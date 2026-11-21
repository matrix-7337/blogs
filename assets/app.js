(function () {
  "use strict";

  const app = document.getElementById("app");
  const esc = Markdown.escapeHtml;
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  let revealObserver = null;
  let tocObserver = null;

  function icon(name, size) {
    return "<svg class=\"pi" + (size ? " pi-" + size : "") + "\" aria-hidden=\"true\"><use href=\"#i-" + name + "\"></use></svg>";
  }

  function getPosts() {
    return BLOG_POSTS.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function findPost(slug) {
    return BLOG_POSTS.find(function (p) { return p.slug === slug; });
  }

  function uniqueTaxonomy(items) {
    const seen = new Set();
    return items.filter(function (item) {
      if (!item.slug || seen.has(item.slug)) return false;
      seen.add(item.slug);
      return true;
    });
  }

  function allCategories() {
    return uniqueTaxonomy(BLOG_CATEGORIES);
  }

  function allTags() {
    return uniqueTaxonomy(BLOG_TAGS);
  }

  function findCategory(slug) {
    return allCategories().find(function (c) { return c.slug === slug; });
  }

  function findTag(slug) {
    return allTags().find(function (t) { return t.slug === slug; });
  }

  function categoryOf(post) {
    return findCategory(post.category) || { slug: "", name: post.category || "", description: "", icon: "folder" };
  }

  function tagOf(slug) {
    return findTag(slug) || { slug: "", name: "", description: "" };
  }

  function parseDate(iso) {
    const parts = String(iso).split("-").map(Number);
    return { year: parts[0], month: parts[1], day: parts[2], index: parts[1] - 1 };
  }

  function shortDate(iso) {
    const d = parseDate(iso);
    return String(d.day).padStart(2, "0") + " " + MONTHS[d.index] + " " + d.year;
  }

  function readTime(post) {
    return Math.max(1, Math.round(String(post.body || "").trim().split(/\s+/).length / 200));
  }

  function countBy(key) {
    const counts = {};
    const allowed = {};
    (key === "tags" ? allTags() : allCategories()).forEach(function (item) { allowed[item.slug] = true; });
    getPosts().forEach(function (post) {
      const values = key === "tags" ? post.tags || [] : [post.category];
      values.forEach(function (value) {
        if (!allowed[value]) return;
        counts[value] = (counts[value] || 0) + 1;
      });
    });
    return counts;
  }

  function postUrl(post) {
    return "#/post/" + encodeURIComponent(post.slug);
  }

  function tagUrl(slug) {
    return "#/tag/" + encodeURIComponent(slug);
  }

  function chipTag(slug) {
    const tag = findTag(slug);
    if (!tag) return "<span class=\"chip chip-tag\">#" + esc(slug) + "</span>";
    return "<a class=\"chip chip-tag\" href=\"" + tagUrl(slug) + "\">#" + esc(tag.name) + "</a>";
  }

  function chipCategory(post) {
    const category = findCategory(post.category);
    if (!category) return "<span class=\"chip chip-cat\">" + esc(post.category || "") + "</span>";
    return "<a class=\"chip chip-cat\" href=\"#/category/" + encodeURIComponent(category.slug) + "\">" +
      icon(category.icon || "folder") + esc(category.name) + "</a>";
  }

  function backLink(label, href) {
    return "<a class=\"back-link\" href=\"" + href + "\">" + icon("arrow") + " " + esc(label) + "</a>";
  }

  function pageHead(eyebrow, title, subtitle, iconName) {
    return "<div class=\"page-head\" data-reveal>" +
      "<div class=\"eyebrow\">// " + esc(eyebrow) + "</div>" +
      "<h1 class=\"page-title\">" + (iconName ? icon(iconName) : "") + title + "</h1>" +
      (subtitle ? "<p class=\"page-sub\">" + subtitle + "</p>" : "") +
      "</div>";
  }

  function postRow(post) {
    const category = categoryOf(post);
    const categoryLabel = category.slug
      ? "<a href=\"#/category/" + encodeURIComponent(category.slug) + "\">" + esc(category.name) + "</a>"
      : "<span>" + esc(category.name) + "</span>";
    return "<article class=\"post-row\" data-reveal>" +
      "<div class=\"row-icon\">" + icon(category.icon || "book") + "</div>" +
      "<div class=\"row-body\">" +
        "<div class=\"row-meta\">" +
          categoryLabel +
          "<span class=\"row-sep\">/</span><time datetime=\"" + esc(post.date) + "\">" + shortDate(post.date) + "</time>" +
          "<span class=\"row-sep\">/</span><span>" + readTime(post) + " MIN</span>" +
        "</div>" +
        "<h2><a href=\"" + postUrl(post) + "\">" + esc(post.title) + "</a></h2>" +
        "<p>" + esc(post.excerpt) + "</p>" +
        "<div class=\"row-tags\">" + (post.tags || []).map(chipTag).join("") + "</div>" +
      "</div>" +
      "<a class=\"row-arrow\" href=\"" + postUrl(post) + "\" aria-label=\"Read " + esc(post.title) + "\">" + icon("arrow") + "</a>" +
    "</article>";
  }

  function boxGrid(items) {
    return "<div class=\"box-grid\">" + items.map(function (item) {
      return "<a class=\"box\" href=\"" + item.href + "\" data-reveal>" +
        "<span class=\"box-icon\">" + icon(item.icon) + "</span>" +
        "<span class=\"box-title\">" + esc(item.title) + "</span>" +
        "<span class=\"box-count\">" + String(item.count).padStart(2, "0") + " POST" + (item.count === 1 ? "" : "S") + "</span>" +
      "</a>";
    }).join("") + "</div>";
  }

  function emptyState(message) {
    return "<div class=\"empty-state\"><span>NOTHING HERE. YET.</span><p>" + esc(message) + "</p></div>";
  }

  function renderHome() {
    const posts = getPosts().slice(0, 5);
    return {
      tab: "home",
      title: "HOME",
      html: pageHead("HOME", "RECENT <span>ENTRIES.</span>", "The five newest things I wrote.", "book") +
        "<div class=\"post-list\">" + posts.map(postRow).join("") + "</div>" +
        "<a class=\"more-link\" href=\"#/archive\">" + icon("calendar") + " BROWSE THE FULL ARCHIVE " + icon("arrow") + "</a>"
    };
  }

  function renderCategories() {
    const counts = countBy("category");
    const items = allCategories().map(function (category) {
      return {
        href: "#/category/" + encodeURIComponent(category.slug),
        title: category.name,
        count: counts[category.slug] || 0,
        icon: category.icon || "folder"
      };
    });
    return {
      tab: "category",
      title: "CATEGORIES",
      html: pageHead("CATEGORY", "ALL <span>CATEGORIES.</span>", "Pick a section to see every post filed under it.", "folder") +
        boxGrid(items)
    };
  }

  function renderCategory(slug) {
    const category = findCategory(slug);
    if (!category) return renderNotFound("Unknown category: " + slug);
    const posts = getPosts().filter(function (p) { return p.category === slug; });
    return {
      tab: "category",
      title: category.name.toUpperCase(),
      html: backLink("ALL CATEGORIES", "#/category") +
        pageHead("CATEGORY / " + category.name.toUpperCase(), esc(category.name), esc(category.description), category.icon || "folder") +
        (posts.length ? "<div class=\"post-list\">" + posts.map(postRow).join("") + "</div>" : emptyState("No posts in this category yet."))
    };
  }

  function renderTags() {
    const counts = countBy("tags");
    const items = allTags().map(function (tag) {
      return { href: tagUrl(tag.slug), title: "#" + tag.name, count: counts[tag.slug] || 0, icon: "tag" };
    });
    return {
      tab: "tags",
      title: "TAGS",
      html: pageHead("TAGS", "ALL <span>TAGS.</span>", "Pick a tag to see every post that uses it.", "tag") + boxGrid(items)
    };
  }

  function renderTag(slug) {
    const tag = findTag(slug);
    if (!tag) return renderNotFound("Unknown tag: " + slug);
    const posts = getPosts().filter(function (p) { return (p.tags || []).indexOf(slug) !== -1; });
    return {
      tab: "tags",
      title: "#" + tag.name,
      html: backLink("ALL TAGS", "#/tags") +
        pageHead("TAG / FILTER", "<span class=\"accent\">#</span>" + esc(tag.name), esc(tag.description || "Everything tagged with this one."), "tag") +
        (posts.length ? "<div class=\"post-list\">" + posts.map(postRow).join("") + "</div>" : emptyState("Nothing has been tagged with this yet."))
    };
  }

  function renderArchive() {
    const groups = [];
    getPosts().forEach(function (post) {
      const d = parseDate(post.date);
      let year = groups.find(function (g) { return g.year === d.year; });
      if (!year) { year = { year: d.year, months: [] }; groups.push(year); }
      let month = year.months.find(function (m) { return m.index === d.index; });
      if (!month) { month = { index: d.index, posts: [] }; year.months.push(month); }
      month.posts.push(post);
    });

    return {
      tab: "archive",
      title: "ARCHIVE",
      html: pageHead("ARCHIVE", "THE <span>ARCHIVE.</span>", "Every post, newest first, grouped by year and month.", "calendar") +
        "<div class=\"archive-timeline\">" + groups.map(function (group) {
          const total = group.months.reduce(function (sum, m) { return sum + m.posts.length; }, 0);
          return "<section class=\"archive-year\" data-reveal>" +
            "<div class=\"archive-year-bar\"><h2>" + icon("calendar") + group.year + "</h2><span>" + total + " POSTS</span></div>" +
            group.months.map(function (month) {
              return "<div class=\"archive-month\">" +
                "<div class=\"archive-month-label\"><b>" + MONTHS[month.index] + "</b><span>" + String(month.posts.length).padStart(2, "0") + "</span></div>" +
                "<div class=\"archive-entries\">" + month.posts.map(function (post) {
                  return "<a class=\"archive-entry\" href=\"" + postUrl(post) + "\">" +
                    "<span class=\"archive-day\">" + String(parseDate(post.date).day).padStart(2, "0") + "</span>" +
                    "<span class=\"archive-title\">" + esc(post.title) + "</span>" +
                    "<span class=\"archive-arrow\">" + icon("arrow") + "</span>" +
                  "</a>";
                }).join("") + "</div>" +
              "</div>";
            }).join("") +
          "</section>";
        }).join("") + "</div>"
    };
  }

  function renderAbout() {
    const site = BLOG_SITE;
    const about = site.about;
    const sections = about.sections.map(function (section, index) {
      const rendered = Markdown.render(section.body);
      return "<section class=\"about-section\" data-reveal>" +
        "<h2>" + icon("book") + "<span>/" + String(index + 1).padStart(2, "0") + "</span> " + esc(section.title) + "</h2>" +
        "<div class=\"markdown\">" + rendered.html + "</div>" +
      "</section>";
    }).join("");

    return {
      tab: "about",
      title: "ABOUT",
      html: pageHead("ABOUT", "ABOUT <span>ME.</span>", "The person behind the writeups.", "user") +
        "<section class=\"profile-card\" data-reveal>" +
          "<img class=\"profile-photo\" src=\"" + esc(site.author.photo) + "\" alt=\"Portrait of " + esc(site.author.name) + "\">" +
          "<div class=\"profile-info\">" +
            "<h2>" + esc(site.author.name) + "</h2>" +
            "<p class=\"profile-role\">" + esc(site.author.role) + " · " + esc(site.author.location) + "</p>" +
            "<p class=\"profile-bio\">" + esc(site.author.bio) + "</p>" +
            "<div class=\"profile-socials\">" +
              "<a href=\"" + esc(site.social.github) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + icon("github") + " GITHUB</a>" +
              "<a href=\"" + esc(site.social.twitter) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + icon("twitter") + " TWITTER / X</a>" +
              "<a href=\"" + esc(site.social.website) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + icon("globe") + " WEBSITE</a>" +
            "</div>" +
          "</div>" +
        "</section>" +
        "<div class=\"about-grid\">" +
          "<div class=\"about-main\">" +
            "<section class=\"about-intro\" data-reveal><p>" + esc(about.intro) + "</p></section>" +
            sections +
          "</div>" +
          "<aside class=\"about-aside\">" +
            "<section class=\"about-box\" data-reveal><h3>" + icon("star") + " QUICK FACTS</h3><div class=\"fact-grid\">" +
              about.facts.map(function (fact) {
                return "<div><span>" + esc(fact.label) + "</span><b>" + esc(fact.value) + "</b></div>";
              }).join("") +
            "</div></section>" +
            "<section class=\"about-box\" data-reveal><h3>" + icon("arrow") + " ELSEWHERE</h3><ul class=\"link-list\">" +
              site.links.map(function (link) {
                return "<li><a href=\"" + esc(link.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + esc(link.label) + icon("arrow") + "</a></li>";
              }).join("") +
            "</ul></section>" +
            "<section class=\"about-box\" data-reveal><h3>" + icon("tools") + " TOOLBOX</h3><div class=\"stack\">" +
              about.stack.map(function (tool) { return "<span>" + esc(tool) + "</span>"; }).join("") +
            "</div></section>" +
          "</aside>" +
        "</div>"
    };
  }

  function renderPost(slug) {
    const post = findPost(slug);
    if (!post) return renderNotFound("Unknown post: " + slug);
    const rendered = Markdown.render(post.body);
    const category = categoryOf(post);
    const posts = getPosts();
    const index = posts.findIndex(function (p) { return p.slug === slug; });
    const previous = posts[index + 1];
    const next = posts[index - 1];

    const toc = rendered.headings.filter(function (h) { return h.level >= 2 && h.level <= 3; });
    const tocHtml = toc.length ? "<nav class=\"toc\"><span class=\"toc-label\">" + icon("book") + " ON THIS PAGE</span>" +
      toc.map(function (h) {
        return "<button type=\"button\" class=\"toc-link level-" + h.level + "\" data-target=\"" + h.id + "\">" + esc(h.text) + "</button>";
      }).join("") + "</nav>" : "";

    const flagHtml = post.flag ? "<section class=\"about-box flag-box\" data-reveal>" +
      "<h3>" + icon("flag") + " THE FLAG</h3>" +
      "<button type=\"button\" class=\"flag-reveal\" data-flag=\"" + esc(post.flag) + "\">[ CLICK TO REVEAL ]</button>" +
      "</section>" : "";

    const navHtml = "<nav class=\"post-nav\">" +
      (previous ? "<a class=\"post-nav-item prev\" href=\"" + postUrl(previous) + "\"><span>" + icon("arrow") + " OLDER</span><b>" + esc(previous.title) + "</b></a>" : "<div></div>") +
      (next ? "<a class=\"post-nav-item next\" href=\"" + postUrl(next) + "\"><span>NEWER " + icon("arrow") + "</span><b>" + esc(next.title) + "</b></a>" : "<div></div>") +
      "</nav>";

    return {
      tab: "",
      title: post.title.toUpperCase(),
      article: true,
      html: backLink(category.name.toUpperCase(), "#/category/" + encodeURIComponent(category.slug)) +
        "<article class=\"post\" data-post-slug=\"" + esc(post.slug) + "\">" +
          "<header class=\"post-header\" data-reveal>" +
            "<div class=\"post-kicker\">" + chipCategory(post) +
              (post.difficulty ? "<span class=\"chip chip-diff\">" + esc(post.difficulty) + "</span>" : "") +
            "</div>" +
            "<h1>" + esc(post.title) + "</h1>" +
            "<p class=\"post-lead\">" + esc(post.excerpt) + "</p>" +
            "<div class=\"post-meta\">" +
              "<span>" + icon("calendar") + "<b>PUBLISHED</b>" + shortDate(post.date) + "</span>" +
              (post.updated ? "<span>" + icon("calendar") + "<b>UPDATED</b>" + shortDate(post.updated) + "</span>" : "") +
              "<span>" + icon("clock") + "<b>READ</b>" + readTime(post) + " MIN</span>" +
            "</div>" +
            "<div class=\"post-tags\">" + (post.tags || []).map(chipTag).join("") + "</div>" +
          "</header>" +
          "<div class=\"post-layout\">" +
            "<div class=\"post-content markdown\">" + rendered.html + "</div>" +
            "<aside class=\"post-aside\">" + tocHtml + flagHtml +
              "<section class=\"about-box\" data-reveal><h3>" + icon("copy") + " SHARE</h3><button type=\"button\" class=\"share-btn\" data-copy-link>" + icon("copy") + " COPY LINK</button></section>" +
            "</aside>" +
          "</div>" +
          navHtml +
        "</article>"
    };
  }

  function renderNotFound(message) {
    return {
      tab: "",
      title: "404",
      html: pageHead("ERROR / 404", "NOT <span>FOUND.</span>", esc(message || "That page does not exist."), "search") +
        emptyState("The page you asked for was not found.")
    };
  }

  function renderSearchResults(query) {
    const container = document.getElementById("search-results");
    const term = query.trim().toLowerCase();
    const posts = getPosts();
    const results = term ? posts.filter(function (post) {
      const haystack = [post.title, post.excerpt, post.category, (post.tags || []).join(" "), post.body].join(" ").toLowerCase();
      return haystack.indexOf(term) !== -1;
    }) : posts.slice(0, 5);

    if (!results.length) {
      container.innerHTML = "<div class=\"search-empty\">NO MATCHES FOR \"" + esc(query) + "\"</div>";
      return;
    }

    container.innerHTML = "<div class=\"search-count\">" + (term ? results.length : "RECENT") + " RESULT" + (results.length === 1 ? "" : "S") + "</div>" +
      results.slice(0, 12).map(function (post) {
        return "<a class=\"search-result\" href=\"" + postUrl(post) + "\">" +
          "<span class=\"search-result-cat\">" + icon(categoryOf(post).icon || "folder") + esc(categoryOf(post).name) + "</span>" +
          "<span class=\"search-result-title\">" + esc(post.title) + "</span>" +
          "<span class=\"search-result-date\">" + shortDate(post.date) + "</span>" +
        "</a>";
      }).join("");
  }

  function updateProgress() {
    const bar = document.getElementById("progress-bar");
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.width = (ratio * 100).toFixed(2) + "%";
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    area.remove();
    return ok;
  }

  function buildRss() {
    const site = BLOG_SITE;
    const base = location.href.split("#")[0];
    const xmlEscape = function (value) {
      return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    };
    const items = getPosts().map(function (post) {
      const d = parseDate(post.date);
      const date = new Date(Date.UTC(d.year, d.index, d.day)).toUTCString();
      return "<item><title>" + xmlEscape(post.title) + "</title>" +
        "<link>" + xmlEscape(base + "#/post/" + encodeURIComponent(post.slug)) + "</link>" +
        "<guid isPermaLink=\"false\">" + xmlEscape(post.slug) + "</guid>" +
        "<pubDate>" + date + "</pubDate>" +
        "<description>" + xmlEscape(post.excerpt) + "</description>" +
        (post.tags || []).map(tagOf).filter(function (tag) { return tag.slug; }).map(function (tag) { return "<category>" + xmlEscape(tag.name) + "</category>"; }).join("") +
        "</item>";
    }).join("");

    const xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
      "<rss version=\"2.0\"><channel>" +
      "<title>" + xmlEscape(site.name + " // LOG") + "</title>" +
      "<link>" + xmlEscape(base) + "</link>" +
      "<description>" + xmlEscape(site.description) + "</description>" +
      items + "</channel></rss>";

    document.getElementById("rss-link").href = URL.createObjectURL(new Blob([xml], { type: "application/rss+xml" }));
  }

  function openSearch() {
    const overlay = document.getElementById("search-overlay");
    overlay.hidden = false;
    document.body.classList.add("search-open");
    const input = document.getElementById("search-input");
    input.value = "";
    renderSearchResults("");
    setTimeout(function () { input.focus(); }, 0);
  }

  function closeSearch() {
    const overlay = document.getElementById("search-overlay");
    if (!overlay.hidden) {
      overlay.hidden = true;
      document.body.classList.remove("search-open");
    }
  }

  function setActiveNav(tab) {
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      const active = link.getAttribute("data-nav") === tab;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  const THEMES = ["light", "dark", "darkblue"];
  const THEME_ICONS = { light: "#i-sun", dark: "#i-moon", darkblue: "#i-snow" };
  const THEME_LABELS = {
    light: "Switch to light theme",
    dark: "Switch to dark theme",
    darkblue: "Switch to winter theme"
  };

  function applyTheme(theme) {
    const current = THEMES.indexOf(theme) === -1 ? "light" : theme;
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    document.documentElement.dataset.theme = current;
    const iconUse = document.getElementById("theme-icon");
    const button = document.getElementById("theme-toggle");
    if (iconUse) iconUse.setAttribute("href", THEME_ICONS[next]);
    if (button) button.setAttribute("aria-label", THEME_LABELS[next]);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.content = current === "light" ? "light" : "dark";
  }

  function storedTheme() {
    try {
      const saved = localStorage.getItem("nullbyte-theme");
      if (THEMES.indexOf(saved) !== -1) return saved;
    } catch (error) {}
    const initial = document.documentElement.dataset.theme;
    return THEMES.indexOf(initial) !== -1 ? initial : "light";
  }

  function buildSnow() {
    const layer = document.getElementById("snow");
    if (!layer) return;
    let flakes = "";
    for (let i = 0; i < 52; i++) {
      const size = 2 + (i % 4);
      const left = (i * 37 + (i % 5) * 7) % 100;
      const duration = 8 + (i % 9);
      const delay = -(i % 14);
      const drift = ((i % 7) - 3) * 14;
      flakes += "<i style=\"left:" + left + "%;width:" + size + "px;height:" + size + "px;animation-duration:" + duration + "s;animation-delay:" + delay + "s;--drift:" + drift + "px;\"></i>";
    }
    layer.innerHTML = flakes;
  }

  function wireInteractions() {
    document.querySelectorAll(".copy-code").forEach(function (button) {
      button.addEventListener("click", function () {
        const block = button.closest(".code-block");
        const code = block ? block.querySelector("code") : null;
        if (!code) return;
        copyText(code.textContent).then(function (ok) {
          button.innerHTML = icon("copy") + (ok ? " COPIED!" : " FAILED");
          setTimeout(function () { button.innerHTML = icon("copy") + " COPY"; }, 1400);
        });
      });
    });

    document.querySelectorAll("[data-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        const target = document.getElementById(button.getAttribute("data-target"));
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll(".flag-reveal").forEach(function (button) {
      button.addEventListener("click", function () {
        button.textContent = button.getAttribute("data-flag");
        button.classList.add("revealed");
      });
    });

    const copyLink = document.querySelector("[data-copy-link]");
    if (copyLink) {
      copyLink.addEventListener("click", function () {
        copyText(location.href).then(function (ok) {
          copyLink.innerHTML = icon("copy") + (ok ? " LINK COPIED" : " COPY FAILED");
          setTimeout(function () { copyLink.innerHTML = icon("copy") + " COPY LINK"; }, 1400);
        });
      });
    }

    if (revealObserver) revealObserver.disconnect();
    const revealTargets = document.querySelectorAll("[data-reveal]");
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: "0px 0px -20px 0px" });
      revealTargets.forEach(function (target) { revealObserver.observe(target); });
    } else {
      revealTargets.forEach(function (target) { target.classList.add("in-view"); });
    }

    if (tocObserver) tocObserver.disconnect();
    const tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc-link"));
    const headings = document.querySelectorAll(".post-content h2[id], .post-content h3[id]");
    if (tocLinks.length && "IntersectionObserver" in window) {
      tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            tocLinks.forEach(function (link) {
              link.classList.toggle("active", link.getAttribute("data-target") === entry.target.id);
            });
          }
        });
      }, { rootMargin: "-15% 0px -75% 0px" });
      headings.forEach(function (heading) { tocObserver.observe(heading); });
    }
  }

  function currentRoute() {
    const raw = location.hash.replace(/^#\/?/, "");
    const q = raw.indexOf("?");
    const path = q === -1 ? raw : raw.slice(0, q);
    let parts = path.split("/").filter(Boolean);
    parts = parts.map(function (part) {
      try { return decodeURIComponent(part); } catch (error) { return part; }
    });
    return parts;
  }

  function render() {
    closeSearch();
    const parts = currentRoute();
    const key = parts[0] || "home";
    let view;

    if (key === "home") view = renderHome();
    else if (key === "category") view = parts[1] ? renderCategory(parts[1]) : renderCategories();
    else if (key === "archive") view = renderArchive();
    else if (key === "about") view = renderAbout();
    else if (key === "tags" || key === "tag") view = parts[1] ? renderTag(parts[1]) : renderTags();
    else if (key === "post") view = parts[1] ? renderPost(parts[1]) : renderNotFound("No post specified.");
    else view = renderNotFound("Route not found: " + key);

    app.innerHTML = view.html;
    document.title = view.title + " // " + BLOG_SITE.name;
    setActiveNav(view.tab);
    wireInteractions();
    window.scrollTo(0, 0);
    updateProgress();
  }

  function loadPosts() {
    const files = typeof BLOG_POST_FILES === "undefined" ? [] : BLOG_POST_FILES;
    return Promise.all(files.map(function (file) {
      return new Promise(function (resolve) {
        const script = document.createElement("script");
        script.src = file;
        script.onload = resolve;
        script.onerror = resolve;
        document.head.appendChild(script);
      });
    }));
  }

  function startRemotePolling() {
    if (location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    let snapshot = null;
    function check() {
      const stamp = Date.now();
      const files = typeof BLOG_POST_FILES === "undefined" ? [] : BLOG_POST_FILES;
      const urls = ["content/taxonomy.js", "content/site.js", "content/posts-manifest.js"].concat(files).map(function (url) {
        return url + "?v=" + stamp;
      });
      Promise.all(urls.map(function (url) {
        return fetch(url, { cache: "no-store" }).then(function (response) { return response.text(); });
      })).then(function (texts) {
        if (snapshot && texts.some(function (text, index) { return text !== snapshot[index]; })) {
          location.reload();
          return;
        }
        snapshot = texts;
      }).catch(function () {});
    }
    setTimeout(check, 1000);
    setInterval(check, 5000);
  }

  function init() {
    applyTheme(storedTheme());
    buildSnow();
    document.getElementById("theme-toggle").addEventListener("click", function () {
      const current = document.documentElement.dataset.theme;
      const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
      applyTheme(next);
      try { localStorage.setItem("nullbyte-theme", next); } catch (error) {}
    });
    document.getElementById("pfp").src = BLOG_SITE.author.photo;
    document.getElementById("side-name").textContent = BLOG_SITE.author.name;
    document.getElementById("side-tagline").textContent = BLOG_SITE.shortTagline;
    document.getElementById("social-github").href = BLOG_SITE.social.github;
    document.getElementById("social-twitter").href = BLOG_SITE.social.twitter;
    document.getElementById("social-website").href = BLOG_SITE.social.website;
    document.getElementById("footer-name").textContent = BLOG_SITE.name;
    document.getElementById("year").textContent = new Date().getFullYear();
    buildRss();

    window.addEventListener("hashchange", render);
    window.addEventListener("scroll", function () {
      updateProgress();
      document.getElementById("to-top").classList.toggle("visible", window.scrollY > 400);
    }, { passive: true });
    window.addEventListener("resize", updateProgress);

    document.getElementById("search-trigger").addEventListener("click", openSearch);
    document.getElementById("search-close").addEventListener("click", closeSearch);
    document.getElementById("search-input").addEventListener("input", function (event) {
      renderSearchResults(event.target.value);
    });
    document.getElementById("search-results").addEventListener("click", function (event) {
      if (event.target.closest(".search-result")) closeSearch();
    });
    document.getElementById("search-overlay").addEventListener("click", function (event) {
      if (event.target.id === "search-overlay") closeSearch();
    });
    document.getElementById("to-top").addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    document.addEventListener("keydown", function (event) {
      const tag = event.target.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable;
      if ((event.key === "/" && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) {
        event.preventDefault();
        openSearch();
      } else if (event.key === "Escape") {
        closeSearch();
      }
    });

    render();
    startRemotePolling();
  }

  loadPosts().then(init);
})();
