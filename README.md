# Shinsters

Source for the Shinsters web platform. Currently a static site.

## Layout

```
web/                      Static site, uploaded as-is to the web root
  index.html              Gateway: "Where to ?", links to each space (only its root, e.g. /rshin/)
  404.html                Error page
  .htaccess               Apache config: HTTPS redirect, 404 page, headers, caching
  assets/                 Gateway assets
    css/shinsters.css     Gateway styles (index.html, 404.html) only
    js/site.js            Footer year
    img/                  Logo and favicon
  <user>/                 One space per user, served at /<user>/, styled independently
    index.html            Entry of the space (rshin/: redirects to its profile)
    assets/               The space's own shared styles (rshin/assets/css/base.css)
    <module>/             Self-contained module: index.html + its own css/images/files
      (rshin/profile/     Profile: resume and projects)
templates/                Layouts that turn content/ into files in web/
  cv/cv.typ               One-page CV layout (Typst)
content/                  Personal content, git-ignored (back it up elsewhere)
  cv/cv.yaml              CV content -> web/rshin/profile/resume.pdf (also git-ignored)
api/                      Future backend modules
infra/                    Future infrastructure config
```

Adding a module:
1. Create `web/<module>/` (site-wide) or `web/<user>/<module>/` (per user) with an `index.html`.
2. In its `<head>`, load its space's styles (e.g. `/rshin/assets/css/base.css`), plus a module stylesheet if needed (see `rshin/profile/profile.css`). Don't use the gateway's `shinsters.css`.
3. Keep module-only files (styles, images, PDFs) inside the module folder; promote to the space's `assets/` only what several of its modules share.
4. For a new space, add a button to its root (`/<user>/`) in `web/index.html`. The gateway gives the direction; where the space goes from there is up to the space.

## Usage

```sh
make serve      # preview at http://localhost:8080
make cv         # CV PDF -> web/rshin/profile/resume.pdf
make cv-watch   # rebuild the CV PDF on every save
make cv-final   # like `make cv`, but fails while a TODO is left
```

## CV

`content/cv/cv.yaml` holds the content, `templates/cv/cv.typ` the one-page layout ([Typst](https://typst.app)).
Edit the YAML for content; values containing `TODO` print highlighted in yellow.
`content/` and the generated PDF are git-ignored because they hold personal data,
so this repo can stay public; keep your own backup of `content/`.
Requires `typst` on your PATH (or `make cv TYPST=/path/to/typst`).

## Deploy

Upload with an SFTP/FTP client (FileZilla, Cyberduck). Credentials live in the client, never in this repo.

1. Connect to the host: SFTP if available, otherwise FTP with explicit TLS.
2. Upload the **contents** of `web/` into `www/` on the server, overwriting existing files.
3. Make sure hidden files are shown so `.htaccess` is uploaded too (FileZilla: Server > Force showing hidden files).
