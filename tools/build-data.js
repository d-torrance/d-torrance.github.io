"use strict";

// cv.yml -> _data/cv.yml
//
// Jekyll only exposes data files under _data/, but cv.yml is meant to live at
// the repo root where it is easy to find and edit.  This script bridges the
// two, and pre-computes the groupings and formatted strings that Liquid is
// clumsy at building itself (dates, slide-deck grouping, travel by year).
//
// The output is generated -- it is gitignored and must never be edited.

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { load, ROOT, formatDate, finalPeriod, CvError } = require("./lib/cv");

const OUT_PATH = path.join(ROOT, "_data", "cv.yml");

// Titles in cv.yml carry inline math between dollar signs, which LaTeX takes
// verbatim.  The site has no math typesetting, so the handful of constructs
// actually used are rendered directly as HTML rather than pulling in MathJax.
const BLACKBOARD = { A: "𝔸", C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" };

function mathToHtml(text, context) {
  if (text === null || text === undefined) return text;
  return String(text).replace(/\$([^$]*)\$/g, (_, math) => {
    const html = math
      .replace(/\\mathbb\s*\{([A-Z])\}/g, (m, c) => BLACKBOARD[c] || c)
      .replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>")
      .replace(/\^(\w)/g, "<sup>$1</sup>")
      .replace(/_\{([^}]*)\}/g, "<sub>$1</sub>")
      .replace(/_(\w)/g, "<sub>$1</sub>")
      .replace(/\\[,;!]/g, "");
    if (/[\\{}]/.test(html)) {
      console.warn(`build-data: warning: unhandled math in ${context}: $${math}$`);
    }
    return html;
  });
}

// Site-root-relative for local files, untouched for external links, so pages
// resolve correctly no matter which permalink they are served under.
function webUrl(url) {
  if (!url) return null;
  return /^(https?:)?\/\//.test(url) || url.startsWith("/") || url.startsWith("mailto:")
    ? url
    : `/${url}`;
}

// "<em>Trans. Amer. Math. Soc.</em> 374 (2021), no. 7, 4815-4838."
function citationHtml(paper) {
  if (paper.note) return paper.note;
  const head = [paper.status, paper.journal && `<em>${paper.journal}</em>`]
    .filter(Boolean).join(" ");
  const full = [head, paper.citation].filter(Boolean).join(" ");
  return full ? full + finalPeriod(paper.status, paper.journal, paper.citation) : "";
}

function buildPapers(papers) {
  return (papers || []).map((paper) => ({
    ...paper,
    title: mathToHtml(paper.title, `paper "${paper.title}"`),
    // The website links the title to the published version when there is one.
    href: webUrl(paper.doi ? `https://doi.org/${paper.doi}` : paper.url),
    arxiv_url: paper.arxiv ? `https://arxiv.org/abs/${paper.arxiv}` : null,
    citation_html: citationHtml(paper),
    code: (paper.code || []).map((c) => ({ ...c, url: webUrl(c.url) })),
    coauthors: paper.coauthors || [],
  }));
}

function buildTalks(talks) {
  return talks.decks.map((deck) => ({
    title: mathToHtml(deck.title, `talk "${deck.title}"`),
    slides: webUrl(deck.slides),
    links: (deck.links || []).map((l) => ({ ...l, url: webUrl(l.url) })),
    has_artifact: deck.hasArtifact,
    presentations: deck.presentations.map((p) => ({
      title: mathToHtml(p.title, `talk "${deck.title}"`),
      retitled: p.retitled,
      session: p.session || null,
      venue: p.venue,
      venue_url: p.venue_url || null,
      institution: p.institution || null,
      location: p.location || null,
      date_text: formatDate(p.date),
      // "MAA Southeastern Section Meeting, High Point University,
      //  February 28, 2025" -- the venue is linked when it has its own page.
      line_html: [
        p.venue_url ? `<a href="${p.venue_url}">${p.venue}</a>` : p.venue,
        p.institution,
        p.location,
        formatDate(p.date),
      ].filter(Boolean).join(", "),
    })),
  }));
}

function buildTravel(travelByYear) {
  return travelByYear.map(({ year, entries }) => ({
    year,
    entries: entries.map((e) => ({
      name: e.name,
      url: e.url || null,
      dates: e.dates,
      where: e.where,
      role: e.role || null,
    })),
  }));
}

function main() {
  const cv = load();

  const data = {
    profile: cv.profile,
    interests: cv.interests || [],
    links: (cv.links || []).map((l) => ({ ...l, url: webUrl(l.url) })),
    software_summary: cv.software_summary || null,
    software: cv.software || [],
    current_courses: cv.current_courses || null,
    papers: buildPapers(cv.papers),
    talks: buildTalks(cv.talks),
    travel: buildTravel(cv.travelByYear),
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, [
    "# GENERATED FROM cv.yml BY tools/build-data.js -- DO NOT EDIT.",
    "# Run `npm run build:data` to regenerate.",
    yaml.dump(data, { lineWidth: -1, noRefs: true }),
  ].join("\n"));

  const shown = data.talks.filter((d) => d.has_artifact).length;
  console.log(`build-data: wrote ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  ${data.papers.length} papers, ${data.talks.length} talk decks `
    + `(${shown} with slides), ${cv.travel.length} travel entries`);
}

try {
  main();
} catch (err) {
  if (err instanceof CvError) {
    console.error(`cv.yml: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
