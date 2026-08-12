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

      // No explicit title placeholder on this slide — fall back to the
      // first text found rather than losing the slide's topic entirely.
      if (!title && bullets.length > 0) title = bullets.shift();
      if (!title && bullets.length === 0) continue; // image-only/blank slide

      slides.push({ title, bullets });
    }

    if (slides.length === 0) throw new Error("Couldn't find any text in that presentation.");
    return slides;
  }

  global.DocImport = { parseDocx, parsePptx };
})(window);
