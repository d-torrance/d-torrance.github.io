# dtorrance-webpage

Source for <https://d-torrance.github.io> and the PDF CV it links to.

## Editing

**`cv.yml` at the repo root is the only file with content in it.** Employment,
education, grants, software, teaching, papers, talks, posters, travel and
service all live there, and both the website and the CV are generated from it.

Some sections go to only one target — they are marked `CV only` or `web only`
in `cv.yml` — but nothing is duplicated between the two.

## Building

```sh
npm install     # once (also run `bundle install` for Jekyll)
npm run build   # PDF + website
npm run serve   # build, then serve at http://localhost:4000
```

| script | output |
| --- | --- |
| `npm run build:data` | `_data/cv.yml`, the Jekyll data file |
| `npm run build:tex` | `build/cv.tex` |
| `npm run build:pdf` | `assets/cv.pdf` (runs `build:tex`, then `latexmk`) |
| `npm run build:web` | `_site/` (runs `build:data`, then `jekyll build`) |
| `npm run clean` | removes everything generated |

Requires Node, Ruby/Bundler, and a LaTeX installation with `latexmk`,
`libertinus`, `titlesec`, `enumitem` and `microtype`. On Debian or Ubuntu:

```sh
sudo apt install latexmk texlive-latex-recommended texlive-latex-extra \
                 texlive-fonts-extra
```

### Generated files — never edit or commit these

`_data/cv.yml`, `build/`, `assets/cv.pdf`. All are gitignored, and each carries
a header saying where it came from.

## How it fits together

```
cv.yml ──▶ tools/build-data.js ──▶ _data/cv.yml ──▶ Jekyll ──▶ _site/
   └─────▶ tools/build-tex.js  ──▶ build/cv.tex ──▶ latexmk ─▶ assets/cv.pdf
```

`tools/lib/cv.js` loads and validates `cv.yml` and derives the groupings both
targets need — teaching courses sorted and merged across renumberings, talks
grouped by slide deck, travel grouped by year. `tools/lib/latex.js` handles
LaTeX escaping. `tools/templates/cv.tex.njk` owns the CV's layout and styling.

A few conventions worth knowing:

- **Inline math** goes between dollar signs. LaTeX gets it verbatim; the
  website renders the handful of constructs actually used (`\mathbb`,
  superscripts, subscripts) as HTML, and warns at build time about anything it
  cannot convert.
- **Renumbered courses** list every number they have held under `codes`. The
  heading shows them in ascending order and the course sorts under the lowest.
- **Talks** are grouped by slide deck, since one deck often covered several
  venues. `title_as` records a venue that used a different title. The website
  shows only decks with an artifact; the CV lists every presentation.

## Deployment

`.github/workflows/pages.yml` builds both targets and deploys to GitHub Pages
on every push to `master`. This replaces the default Pages Jekyll build, which
cannot run LaTeX — so **Settings → Pages → Source must be set to
"GitHub Actions"**.
