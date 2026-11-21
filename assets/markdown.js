const Markdown = (function () {
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugify(text) {
    return String(text).toLowerCase().trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "section";
  }

  function safeUrl(url) {
    const value = String(url).trim();
    return /^(javascript|data|vbscript):/i.test(value) ? "#" : value;
  }

  function renderInline(text) {
    const codes = [];
    let out = String(text).replace(/(`+)([\s\S]*?)\1/g, function (match, ticks, code) {
      codes.push(code.replace(/^\s+|\s+$/g, ""));
      return "\u0001C" + (codes.length - 1) + "\u0001";
    });

    out = escapeHtml(out);

    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (match, alt, src, title) {
      return "<img src=\"" + safeUrl(src) + "\" alt=\"" + alt + "\"" +
        (title ? " title=\"" + title + "\"" : "") + " loading=\"lazy\">";
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
      const url = safeUrl(href);
      const external = /^https?:\/\//i.test(url);
      return "<a href=\"" + url + "\"" + (external ? " target=\"_blank\" rel=\"noopener noreferrer\"" : "") + ">" + label + "</a>";
    });

    out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");

    out = out.replace(/\u0001C(\d+)\u0001/g, function (match, index) {
      return "<code>" + escapeHtml(codes[Number(index)]) + "</code>";
    });

    return out;
  }

  function render(source) {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const headings = [];
    const used = {};
    const html = [];
    let paragraph = [];
    let i = 0;

    function flushParagraph() {
      if (paragraph.length) {
        html.push("<p>" + paragraph.map(renderInline).join("<br>") + "</p>");
        paragraph = [];
      }
    }

    function headingId(text) {
      const base = slugify(text);
      let id = base;
      let n = 2;
      while (used[id]) {
        id = base + "-" + n;
        n++;
      }
      used[id] = true;
      return id;
    }

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        i++;
        continue;
      }

      const fence = line.match(/^\s*(~{3,}|`{3,})\s*([\w+#-]*)\s*$/);
      if (fence) {
        flushParagraph();
        const marker = fence[1][0];
        const minLength = fence[1].length;
        const lang = fence[2];
        const codeLines = [];
        i++;
        while (i < lines.length) {
          const closing = new RegExp("^\\s*" + (marker === "~" ? "~" : "`") + "{" + minLength + ",}\\s*$");
          if (closing.test(lines[i])) {
            i++;
            break;
          }
          codeLines.push(lines[i]);
          i++;
        }
        html.push("<div class=\"code-block\"><div class=\"code-bar\"><span class=\"code-lang\">" +
          escapeHtml(lang || "text") + "</span><button type=\"button\" class=\"copy-code\"><svg class=\"pi\" aria-hidden=\"true\"><use href=\"#i-copy\"></use></svg> COPY</button></div><pre><code>" +
          escapeHtml(codeLines.join("\n")) + "</code></pre></div>");
        continue;
      }

      const heading = line.match(/^\s*(#{1,4})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        flushParagraph();
        const level = heading[1].length;
        const text = heading[2].replace(/[*`_]/g, "");
        const id = headingId(text);
        headings.push({ level: level, text: text, id: id });
        html.push("<h" + level + " id=\"" + id + "\" class=\"md-h md-h" + level + "\">" +
          renderInline(heading[2]) +
          "<button type=\"button\" class=\"heading-anchor\" data-target=\"" + id + "\" aria-label=\"Link to section\">#</button></h" + level + ">");
        i++;
        continue;
      }

      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
        flushParagraph();
        html.push("<hr>");
        i++;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        flushParagraph();
        const quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        const raw = quote.join(" ").trim();
        const callout = raw.match(/^(NOTE|WARN|TIP|FLAG)\s*:\s*([\s\S]*)$/i);
        if (callout) {
          const kind = callout[1].toLowerCase();
          html.push("<div class=\"callout callout-" + kind + "\"><span class=\"callout-tag\">" +
            kind + "</span><div>" + renderInline(callout[2]) + "</div></div>");
        } else {
          html.push("<blockquote>" + renderInline(raw) + "</blockquote>");
        }
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        flushParagraph();
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          const item = lines[i].replace(/^\s*[-*+]\s+/, "");
          const task = item.match(/^\[([ xX])\]\s*(.*)$/);
          if (task) {
            const done = task[1].toLowerCase() === "x";
            items.push("<li class=\"task-item\"><span class=\"task-box" + (done ? " checked" : "") +
              "\">" + (done ? "×" : "") + "</span>" + renderInline(task[2]) + "</li>");
          } else {
            items.push("<li>" + renderInline(item) + "</li>");
          }
          i++;
        }
        html.push("<ul>" + items.join("") + "</ul>");
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        flushParagraph();
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push("<li>" + renderInline(lines[i].replace(/^\s*\d+\.\s+/, "")) + "</li>");
          i++;
        }
        html.push("<ol>" + items.join("") + "</ol>");
        continue;
      }

      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        flushParagraph();
        const cells = function (row) {
          return row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(function (c) { return c.trim(); });
        };
        const headers = cells(lines[i]);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          rows.push(cells(lines[i]));
          i++;
        }
        html.push("<div class=\"table-wrap\"><table><thead><tr>" +
          headers.map(function (h) { return "<th>" + renderInline(h) + "</th>"; }).join("") +
          "</tr></thead><tbody>" +
          rows.map(function (r) {
            return "<tr>" + r.map(function (c) { return "<td>" + renderInline(c) + "</td>"; }).join("") + "</tr>";
          }).join("") + "</tbody></table></div>");
        continue;
      }

      paragraph.push(trimmed);
      i++;
    }

    flushParagraph();
    return { html: html.join("\n"), headings: headings };
  }

  return { render: render, escapeHtml: escapeHtml, slugify: slugify };
})();
