/*
 * DocImport — extracts text from .docx and .pptx files entirely
 * client-side. Both formats are just zip archives of XML under the
 * hood, so this only needs JSZip (self-hosted, see lib/jszip.min.js)
 * plus the browser's built-in DOMParser — no server, no upload.
 */
(function (global) {
  // Walks a paragraph's descendants in document order, concatenating text
  // runs and turning explicit line breaks into spaces. Needed because a
  // paragraph's text can be split across multiple runs (for formatting)
  // and getElementsByTagName alone loses the run/break ordering.
  function extractParagraphText(pNode, textTag, breakTag) {
    let text = "";
    (function walk(node) {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeName === textTag) {
          text += child.textContent;
        } else if (child.nodeName === breakTag) {
          text += " ";
        } else if (child.hasChildNodes && child.hasChildNodes()) {
          walk(child);
        }
      }
    })(pNode);
    return text.trim().replace(/\s+/g, " ");
  }

  function parseXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
      throw new Error("This file's XML looks corrupted.");
    }
    return doc;
  }

  async function loadZip(arrayBuffer) {
    try {
      return await JSZip.loadAsync(arrayBuffer);
    } catch (e) {
      throw new Error("Couldn't open that file — it may be the older .doc/.ppt format, which isn't supported. Re-export as .docx/.pptx.");
    }
  }

  async function parseDocx(arrayBuffer) {
    const zip = await loadZip(arrayBuffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) throw new Error("That doesn't look like a Word (.docx) file.");
    const doc = parseXml(await docFile.async("string"));
    const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
    const lines = [];
    for (const p of paragraphs) {
      let line = extractParagraphText(p, "w:t", "w:br");
      if (!line) continue;
      if (!/[.!?]$/.test(line)) line += ".";
      lines.push(line);
    }
    return lines.join(" ");
  }

  const SKIP_PLACEHOLDER_TYPES = new Set(["sldNum", "ftr", "dt"]);

  async function parsePptx(arrayBuffer) {
    const zip = await loadZip(arrayBuffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const na = parseInt(a.match(/slide(\d+)\.xml$/)[1], 10);
        const nb = parseInt(b.match(/slide(\d+)\.xml$/)[1], 10);
        return na - nb;
      });
    if (slideFiles.length === 0) throw new Error("That doesn't look like a PowerPoint (.pptx) file.");

    const slides = [];
    for (const name of slideFiles) {
      const doc = parseXml(await zip.file(name).async("string"));
      const shapes = Array.from(doc.getElementsByTagName("p:sp"));
      let title = "";
      const bullets = [];

      for (const sp of shapes) {
        const phNodes = sp.getElementsByTagName("p:ph");
        const phType = phNodes.length ? phNodes[0].getAttribute("type") : null;
        if (SKIP_PLACEHOLDER_TYPES.has(phType)) continue;
        const isTitle = phType === "title" || phType === "ctrTitle";

        const shapeLines = [];
        for (const p of Array.from(sp.getElementsByTagName("a:p"))) {
          const line = extractParagraphText(p, "a:t", "a:br");
          if (line) shapeLines.push(line);
        }
        if (shapeLines.length === 0) continue;

        if (isTitle && !title) {
          title = shapeLines.join(" ");
        } else {
          bullets.push(...shapeLines);
        }
      }

      // No explicit title placeholder on this slide — leave title empty
      // and keep all text as body content (generateQuizFromSlides treats
      // a title-less slide as prose rather than losing it), instead of
      // fabricating a fake title from the first line.
      if (!title && bullets.length === 0) continue; // image-only/blank slide

      slides.push({ title, bullets });
    }

    if (slides.length === 0) throw new Error("Couldn't find any text in that presentation.");
    return slides;
  }

  // --- PDF support -----------------------------------------------------
  // PDFs carry no semantic markup like docx/pptx do — no "this run is the
  // title" flag. Instead we reconstruct structure from geometry: position
  // (transform matrix) and font size of each text item, clustered into
  // lines then into blocks (paragraphs/bullets), with the topmost
  // larger-font block on a page treated as that page's title.
  const PDF_MAX_PAGES = 150;
  const BULLET_START_RE = /^[•‣◦▪○●∙·–—-]\s|^\(?[a-zA-Z0-9]{1,2}[.)]\s/;
  // Bullet glyphs (•, ‣, ...) and "(a) "/"1. " list markers can stack on
  // one line (e.g. "•  1. Where is..."); strip them all so the marker
  // glyph itself never leaks into a question/term, and so downstream
  // list-marker stripping (which only recognizes "(a)"/"1." forms) still
  // has a clean string to work with.
  const LEADING_MARKER_RE = /^(?:[•‣◦▪○●∙·–—-]\s+|\(?[a-zA-Z0-9]{1,2}[.)]\s+)/;

  function stripLeadingMarkers(text) {
    let out = text;
    for (let i = 0; i < 3; i++) {
      const next = out.replace(LEADING_MARKER_RE, "");
      if (next === out) break;
      out = next;
    }
    return out;
  }

  function median(nums) {
    const sorted = nums.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  async function extractPageBlocks(page) {
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items
      .filter((it) => it.str && it.str.trim())
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        fontSize: Math.abs(it.transform[3]) || Math.abs(it.transform[0]) || 10,
        width: it.width || 0,
      }));
    if (items.length === 0) return { blocks: [], pageHeight: viewport.height, bodyFont: 10 };

    // Cluster into lines by y-position (items on the same visual line can
    // arrive in any order and are split across multiple runs).
    const lines = [];
    for (const it of items) {
      let line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, it.fontSize * 0.35));
      if (!line) {
        line = { y: it.y, items: [] };
        lines.push(line);
      }
      line.items.push(it);
    }
    lines.sort((a, b) => b.y - a.y); // top of page first

    const lineRecords = lines
      .map((l) => {
        l.items.sort((a, b) => a.x - b.x);
        let text = "";
        let prevEnd = null;
        let maxFont = 0;
        for (const it of l.items) {
          maxFont = Math.max(maxFont, it.fontSize);
          if (prevEnd !== null) {
            const gap = it.x - prevEnd;
            if (gap > it.fontSize * 0.25 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += " ";
          }
          text += it.str;
          prevEnd = it.x + it.width;
        }
        return { text: text.trim().replace(/\s+/g, " "), y: l.y, x: l.items[0].x, fontSize: maxFont };
      })
      .filter((l) => l.text);
    if (lineRecords.length === 0) return { blocks: [], pageHeight: viewport.height, bodyFont: 10 };

    const bodyFont = median(lineRecords.map((l) => l.fontSize));

    // Merge lines into blocks: a new block starts on a bullet marker, a
    // big vertical gap (new paragraph), or a font-size change (new
    // heading) — otherwise it's a wrapped continuation of the same line.
    const blocks = [];
    let current = null;
    for (const line of lineRecords) {
      const startsBullet = BULLET_START_RE.test(line.text);
      const bigGap = current && current.lastY - line.y > current.fontSize * 1.6;
      const fontChanged = current && Math.abs(line.fontSize - current.fontSize) > current.fontSize * 0.2;
      if (!current || startsBullet || bigGap || fontChanged) {
        current = { text: line.text, fontSize: line.fontSize, topY: line.y, lastY: line.y };
        blocks.push(current);
      } else {
        current.text += " " + line.text;
        current.lastY = line.y;
        current.fontSize = Math.max(current.fontSize, line.fontSize);
      }
    }

    return { blocks, pageHeight: viewport.height, bodyFont };
  }

  async function parsePdf(arrayBuffer) {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("PDF support failed to load — try refreshing the page.");
    }
    // A bundled single-file build may pre-set this to a data: URI before
    // this ever runs — don't clobber it with the normal relative path.
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "lib/pdf.worker.min.js";
    }

    let doc;
    try {
      doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    } catch (e) {
      throw new Error("Couldn't open that PDF — it may be corrupted or password-protected.");
    }

    const pageCount = Math.min(doc.numPages, PDF_MAX_PAGES);
    const slides = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const { blocks, pageHeight, bodyFont } = await extractPageBlocks(page);
      if (blocks.length === 0) continue;

      const first = blocks[0];
      const wordCount = first.text.split(/\s+/).length;
      const isTitleLike =
        blocks.length > 1 &&
        first.fontSize > bodyFont * 1.15 &&
        wordCount <= 14 &&
        first.topY > pageHeight * 0.5;

      const title = isTitleLike ? stripLeadingMarkers(first.text) : "";
      const bodyBlocks = isTitleLike ? blocks.slice(1) : blocks;
      const bullets = bodyBlocks.map((b) => stripLeadingMarkers(b.text)).filter(Boolean);

      if (!title && bullets.length === 0) continue;
      slides.push({ title, bullets });
    }

    if (slides.length === 0) {
      throw new Error("Couldn't find any readable text in that PDF — it may be a scanned or image-based document, which isn't supported.");
    }
    return slides;
  }

  global.DocImport = { parseDocx, parsePptx, parsePdf };
})(window);
