"use strict";

// cv.yml -> build/cv.tex
//
// Assembles each CV entry into a LaTeX-ready string here, and leaves
// templates/cv.tex.njk responsible only for the document's structure and
// styling.  Every value that came from cv.yml goes through tex() so that
// special characters are escaped and inline math is passed through untouched.

const fs = require("fs");
const path = require("path");
const nunjucks = require("nunjucks");
const { load, ROOT, formatDate, formatMonthYear, finalPeriod, CvError } = require("./lib/cv");
const { tex, link } = require("./lib/latex");

const OUT_PATH = path.join(ROOT, "build", "cv.tex");

const it = (s) => `\\textit{${tex(s)}}`;
const join = (parts, sep = ", ") => parts.filter(Boolean).join(sep);
const range = (start, end) => (end && end !== start ? `${tex(start)}--${tex(end)}` : tex(start));

// "(with A and B)" / "(with A, B, and C)"
function withAuthors(coauthors) {
  const names = (coauthors || []).map((a) => tex(a.name));
  if (names.length === 0) return null;
  if (names.length === 1) return `(with ${names[0]})`;
  if (names.length === 2) return `(with ${names[0]} and ${names[1]})`;
  return `(with ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]})`;
}

/* ------------------------------------------------------------- sections -- */

function employment(cv) {
  return cv.employment.map((job) => ({
    text: `${join([tex(job.title), tex(job.org), tex(job.location)])} (${range(job.start, job.end)})`,
  }));
}

function education(cv) {
  return cv.education.map((deg) => {
    const sublines = [];
    if (deg.advisor) sublines.push({ text: `${it("Advisor:")} ${tex(deg.advisor)}` });
    if (deg.thesis) sublines.push({ text: `${it("Thesis:")} ${tex(deg.thesis)}` });
    return {
      text: `${join([tex(deg.degree), tex(deg.field), tex(deg.institution), tex(deg.location)])} (${tex(deg.year)})`,
      sublines,
    };
  });
}

function software(cv) {
  return cv.software.map((project) => ({
    text: `${link(project.url, project.name)} (${range(project.start, project.end)})`,
    sublines: [
      ...(project.summary ? [{ text: tex(project.summary) }] : []),
      ...(project.roles || []).map((role) => ({ text: tex(role) })),
    ],
  }));
}

function grants(cv) {
  return (cv.grants || []).map((grant) => {
    const sublines = [];
    const agency = join([tex(grant.agency), tex(grant.program), tex(grant.number)]);
    if (agency) sublines.push({ text: agency });
    const terms = join([grant.role && tex(grant.role), grant.amount && tex(grant.amount)]);
    if (terms) sublines.push({ text: terms });
    if (grant.note) sublines.push({ text: tex(grant.note) });
    return { text: `${it(grant.title)} (${range(grant.start, grant.end)})`, sublines };
  });
}

function teaching(cv) {
  return cv.teaching.map((inst) => {
    const courses = inst.courses.map((course) => {
      const title = `${tex(course.heading)} (${tex(course.title)}${course.note ? `, ${tex(course.note)}` : ""})`;
      return { text: `${title} -- ${tex(course.terms.join(", "))}` };
    });

    const roles = (inst.roles || []).map((r) => ({
      text: `${tex(r.name)} (${tex(r.years)})`,
    }));

    return {
      text: `${tex(inst.name)} (${range(inst.start, inst.end)})`,
      sublines: [...courses, ...roles],
    };
  });
}

function awards(cv) {
  return (cv.awards || []).map((award) => ({
    text: `${join([tex(award.name), award.org && (award.org_italic ? it(award.org) : tex(award.org))])} (${tex(award.years)})`,
  }));
}

function papers(cv) {
  return cv.papers.map((paper) => {
    const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : paper.url;
    const title = doiUrl ? `\\href{${doiUrl}}{${it(paper.title)}}` : it(paper.title);
    const arxiv = paper.arxiv
      ? link(`https://arxiv.org/abs/${paper.arxiv}`, `arXiv:${paper.arxiv}`)
      : null;
    const venue = paper.note
      ? tex(paper.note)
      : join([paper.status && tex(paper.status), paper.journal && it(paper.journal)], " ");
    const citation = join([venue, paper.citation && tex(paper.citation)], " ");
    const body = join([title, arxiv, withAuthors(paper.coauthors), citation]);
    return {
      text: paper.note
        ? body
        : body + finalPeriod(paper.status, paper.journal, paper.citation),
    };
  });
}

function talks(cv) {
  return cv.talks.flat.map((talk) => {
    const venue = talk.venue_url ? link(talk.venue_url, talk.venue) : tex(talk.venue);
    return {
      text: join([
        it(talk.title),
        talk.session && tex(talk.session),
        venue,
        talk.institution && tex(talk.institution),
        talk.location && tex(talk.location),
        formatDate(talk.date),
      ]),
    };
  });
}

function posters(cv) {
  return cv.posters.map((poster) => ({
    text: `${join([it(poster.title), tex(poster.venue), tex(poster.location)])} (${formatDate(poster.date)})`,
  }));
}

function conferences(cv) {
  return cv.travel.map((entry) => {
    const line = `${join([tex(entry.name), tex(entry.where)])} (${formatMonthYear(entry.start)})`;
    // Organizing a workshop is a contribution, not just attendance.
    return { text: entry.role ? `${line} ${it(`(${entry.role})`)}` : line };
  });
}

function service(cv) {
  return cv.service.map((entry) => ({
    text: `${join([tex(entry.role), entry.org && (entry.org_italic ? it(entry.org) : tex(entry.org))])} (${tex(entry.years)})`,
  }));
}

/* ---------------------------------------------------------------- build -- */

function main() {
  const cv = load();
  const profile = cv.profile;

  const contact = [
    link(`mailto:${profile.email}`, profile.email),
    profile.urls && profile.urls.homepage && `\\url{${profile.urls.homepage}}`,
    profile.urls && profile.urls.github && `\\url{${profile.urls.github}}`,
  ].filter(Boolean);

  const address = (profile.address || []).map(tex);
  // The header is a two-column block; pad the shorter side so the rows line up.
  const rows = Math.max(address.length, contact.length);
  const header = Array.from({ length: rows }, (_, i) => ({
    left: address[i] || "",
    right: contact[i] || "",
  }));

  // Section order.  Papers and Software Experience sit together as the primary
  // research output; Teaching follows the research record rather than leading
  // it, since it ended in 2026.  Reorder freely -- this list is the only place
  // section order is defined.
  const sections = [
    { title: "Employment", items: employment(cv) },
    { title: "Education", items: education(cv) },
    { title: "Research Interests", items: (cv.interests || []).map((i) => ({ text: tex(i) })) },
    { title: "Grants", items: grants(cv) },
    { title: "Papers", items: papers(cv) },
    { title: "Software Experience", items: software(cv) },
    { title: "Talks Given", items: talks(cv) },
    { title: "Posters Presented", items: posters(cv) },
    { title: "Awards", items: awards(cv) },
    { title: "Teaching", items: teaching(cv) },
    { title: "Conferences and Workshops", items: conferences(cv) },
    { title: "Professional Service", items: service(cv) },
  ].filter((s) => s.items.length > 0);

  const env = nunjucks.configure(path.join(__dirname, "templates"), {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });

  const output = env.render("cv.tex.njk", {
    name: tex(profile.name),
    pdfTitle: `${profile.name} -- Curriculum Vitae`,
    pdfAuthor: profile.name,
    pdfSubject: (cv.interests || []).join("; "),
    header,
    sections,
  });

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, output);

  const count = sections.reduce((n, s) => n + s.items.length, 0);
  console.log(`build-tex: wrote ${path.relative(ROOT, OUT_PATH)}`);
  console.log(`  ${sections.length} sections, ${count} entries`);
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
