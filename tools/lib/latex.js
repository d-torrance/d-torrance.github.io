"use strict";

// LaTeX escaping for strings coming out of cv.yml.
//
// Values in cv.yml are written as plain text, except that math may be written
// inline between dollar signs (e.g. "Regularity of $(n-2)$-plane arrangements
// in $\mathbb{P}^n$").  Math spans are passed through untouched; everything
// else is escaped.

const SPECIALS = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "$": "\\$",
  "&": "\\&",
  "#": "\\#",
  "^": "\\textasciicircum{}",
  "_": "\\_",
  "~": "\\textasciitilde{}",
  "%": "\\%",
};

function escapeSegment(text) {
  return text.replace(/[\\{}$&#^_~%]/g, (c) => SPECIALS[c]);
}

// Split on balanced $...$ spans so math survives verbatim.
function tex(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .split(/(\$[^$]*\$)/g)
    .map((part) => (part.startsWith("$") && part.endsWith("$") && part.length > 1
      ? part
      : escapeSegment(part)))
    .join("");
}

// hyperref chokes on unescaped # and % inside the URL argument.  Everything
// else in a well-formed URL is safe for \href / \url.
function texUrl(value) {
  if (!value) return "";
  return String(value).replace(/([#%\\])/g, "\\$1");
}

// \href{url}{text}, falling back to plain text when there is no URL.
function link(url, text) {
  const label = tex(text);
  return url ? `\\href{${texUrl(url)}}{${label}}` : label;
}

module.exports = { tex, texUrl, link };
