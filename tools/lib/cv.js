"use strict";

// Loads cv.yml -- the single hand-edited source for both the website and the
// PDF CV -- and derives the groupings that the two targets need.  Neither
// generator should reach into the raw YAML directly; both go through load().

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..", "..");
const CV_PATH = path.join(ROOT, "cv.yml");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

// Terms sort Spring < Summer < Fall within a year.
const TERM_ORDER = { Spring: 1, Summer: 2, Fall: 3 };

class CvError extends Error {}

function fail(message) {
  throw new CvError(message);
}

/* ---------------------------------------------------------------- dates -- */

// Accepts "2017-01-06", "2023-09" and "2010"; returns a value that knows how
// precise it is, so a talk recorded only by year never renders a fake day.
function parseDate(value, context) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(text);
  if (!m) fail(`${context}: expected a date like 2017-01-06, 2023-09 or 2010, got "${text}"`);
  const [, year, month, day] = m;
  const precision = day ? "day" : month ? "month" : "year";
  if (month && (+month < 1 || +month > 12)) fail(`${context}: month out of range in "${text}"`);
  if (day && (+day < 1 || +day > 31)) fail(`${context}: day out of range in "${text}"`);
  return {
    iso: text,
    year: +year,
    month: month ? +month : null,
    day: day ? +day : null,
    precision,
    // Sortable regardless of precision; missing parts sort to the start.
    key: +year * 10000 + (month ? +month : 0) * 100 + (day ? +day : 0),
  };
}

function formatDate(date) {
  if (!date) return "";
  if (date.precision === "year") return String(date.year);
  const monthName = MONTHS[date.month - 1];
  if (date.precision === "month") return `${monthName} ${date.year}`;
  return `${monthName} ${date.day}, ${date.year}`;
}

function formatMonthYear(date) {
  if (!date) return "";
  if (date.precision === "year") return String(date.year);
  return `${MONTHS[date.month - 1]} ${date.year}`;
}

// "February 22 - 26", "June 29 - July 3", "March 27".
function formatDateRange(start, end) {
  if (!start) return "";
  const startMonth = MONTHS[start.month - 1];
  if (!end || end.iso === start.iso) {
    return start.precision === "day" ? `${startMonth} ${start.day}` : formatMonthYear(start);
  }
  const endMonth = MONTHS[end.month - 1];
  if (start.month === end.month && start.year === end.year) {
    return `${startMonth} ${start.day} - ${end.day}`;
  }
  return `${startMonth} ${start.day} - ${endMonth} ${end.day}`;
}

/* ---------------------------------------------------------------- terms -- */

function parseTerm(term, context) {
  const m = /^(Spring|Summer|Fall|Winter)\s+(\d{4})$/.exec(String(term).trim());
  if (!m) fail(`${context}: expected a term like "Fall 2015", got "${term}"`);
  return { term: String(term).trim(), season: m[1], year: +m[2] };
}

function termKey(term) {
  const { season, year } = parseTerm(term, "term");
  return year * 10 + (TERM_ORDER[season] || 0);
}

function sortTerms(terms) {
  return [...terms].sort((a, b) => termKey(a) - termKey(b));
}

/* -------------------------------------------------------------- courses -- */

// "MATH 1300" -> { prefix: "MATH", number: 1300 }
function parseCode(code, context) {
  const m = /^([A-Z]+)\s+(\d+)$/.exec(String(code).trim());
  if (!m) fail(`${context}: expected a course code like "MATH 1300", got "${code}"`);
  return { prefix: m[1], number: +m[2], code: `${m[1]} ${m[2]}` };
}

// A course that was renumbered lists every number it has held.  The heading
// puts them in ascending numeric order, e.g. "MATH 1300/2100 (Elementary
// Statistics)", and the course sorts under the lowest of them.
function deriveCourse(course, context) {
  if (!course.title) fail(`${context}: course is missing a title`);
  const where = `${context}: ${course.title}`;

  const codeList = Array.isArray(course.codes) ? course.codes : [course.codes];
  if (codeList.length === 0 || !codeList[0]) {
    fail(`${where}: needs at least one course code under codes`);
  }
  const codes = codeList
    .map((code) => parseCode(code, where))
    .sort((a, b) => a.prefix.localeCompare(b.prefix) || a.number - b.number);

  const samePrefix = codes.every((c) => c.prefix === codes[0].prefix);
  const heading = samePrefix
    ? `${codes[0].prefix} ${codes.map((c) => c.number).join("/")}`
    : codes.map((c) => c.code).join("/");

  if (!Array.isArray(course.terms) || course.terms.length === 0) {
    fail(`${where}: needs at least one term`);
  }
  const terms = sortTerms(course.terms);
  terms.forEach((t) => parseTerm(t, where));

  return {
    title: course.title,
    note: course.note || null,
    heading,
    codes,
    terms,
    sortPrefix: codes[0].prefix,
    sortNumber: codes[0].number,
  };
}

/* ---------------------------------------------------------------- talks -- */

// cv.yml groups talks by slide deck, because one deck often covers several
// venues.  The website renders that grouping directly; the CV wants one line
// per presentation.
function deriveTalks(talks) {
  const decks = (talks || []).map((deck, i) => {
    const context = `talks[${i}]`;
    if (!deck.title) fail(`${context}: talk is missing a title`);
    if (!Array.isArray(deck.presentations) || deck.presentations.length === 0) {
      fail(`${context}: talk "${deck.title}" needs at least one presentation`);
    }
    const presentations = deck.presentations.map((p, j) => {
      const where = `${context}.presentations[${j}]`;
      if (!p.venue) fail(`${where}: presentation is missing a venue`);
      const date = parseDate(p.date, where);
      if (!date) fail(`${where}: presentation is missing a date`);
      return {
        ...p,
        date,
        title: p.title_as || deck.title,
        // True when this venue used a different title from the deck's.
        retitled: Boolean(p.title_as),
        slides: deck.slides || null,
        links: deck.links || [],
      };
    }).sort((a, b) => b.date.key - a.date.key);

    return {
      ...deck,
      presentations,
      slides: deck.slides || null,
      links: deck.links || [],
      hasArtifact: Boolean(deck.slides) || (deck.links || []).length > 0,
      latest: presentations[0].date,
    };
  }).sort((a, b) => b.latest.key - a.latest.key);

  const flat = decks
    .flatMap((deck) => deck.presentations)
    .sort((a, b) => b.date.key - a.date.key);

  return { decks, flat };
}

/* -------------------------------------------------------------- citation -- */

// Journal abbreviations frequently end in a period of their own ("Lect. Notes
// Comput. Sci."), so a citation should only gain a closing period when its
// last part does not already supply one.  Parts are given in render order.
function finalPeriod(...parts) {
  const tail = parts.filter(Boolean).map(String).pop() || "";
  return tail.trim().endsWith(".") ? "" : ".";
}

/* ------------------------------------------------------------------ load -- */

function load(cvPath = CV_PATH) {
  const raw = yaml.load(fs.readFileSync(cvPath, "utf8"), {
    // CORE_SCHEMA leaves unquoted dates as strings instead of coercing them to
    // JS Date objects in the local timezone.
    schema: yaml.CORE_SCHEMA,
    filename: cvPath,
  });

  if (!raw || typeof raw !== "object") fail(`${cvPath}: expected a YAML mapping at the top level`);
  for (const key of ["profile", "papers", "talks"]) {
    if (!raw[key]) fail(`${cvPath}: missing required top-level key "${key}"`);
  }

  const teaching = (raw.teaching || []).map((inst, i) => {
    const context = `teaching[${i}]`;
    if (!inst.name) fail(`${context}: institution is missing a name`);
    const courses = (inst.courses || [])
      .map((c) => deriveCourse(c, context))
      .sort((a, b) => a.sortPrefix.localeCompare(b.sortPrefix) || a.sortNumber - b.sortNumber);
    return { ...inst, courses };
  });

  const travel = (raw.travel || []).map((entry, i) => {
    const context = `travel[${i}]`;
    if (!entry.name) fail(`${context}: travel entry is missing a name`);
    const start = parseDate(entry.start, `${context}.start`);
    if (!start) fail(`${context}: travel entry "${entry.name}" is missing a start date`);
    const end = parseDate(entry.end, `${context}.end`);
    return {
      ...entry,
      start,
      end,
      // `dates` overrides the computed range for odd cases such as a virtual
      // meeting held on two non-consecutive days.
      dates: entry.dates || formatDateRange(start, end),
      monthYear: formatMonthYear(start),
      // "Georgia Tech, Atlanta, GA" -- venue is optional (some entries are
      // just a city, or Virtual).
      where: [entry.venue, entry.city, entry.region].filter(Boolean).join(", "),
    };
  }).sort((a, b) => b.start.key - a.start.key);

  const travelByYear = [];
  for (const entry of travel) {
    const year = entry.start.year;
    const last = travelByYear[travelByYear.length - 1];
    if (last && last.year === year) last.entries.push(entry);
    else travelByYear.push({ year, entries: [entry] });
  }

  const posters = (raw.posters || []).map((p, i) => ({
    ...p,
    date: parseDate(p.date, `posters[${i}].date`),
  })).sort((a, b) => b.date.key - a.date.key);

  return {
    ...raw,
    teaching,
    talks: deriveTalks(raw.talks),
    travel,
    travelByYear,
    posters,
  };
}

module.exports = {
  load,
  finalPeriod,
  CvError,
  CV_PATH,
  ROOT,
  formatDate,
  formatMonthYear,
  formatDateRange,
  termKey,
  sortTerms,
};
