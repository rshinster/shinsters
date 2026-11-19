# Shinsters

A modular web platform, built to grow. Live at [shinsters.fr](https://shinsters.fr).

## Layout

```
web/            Static site: the gateway, plus one space per user (/<user>/)
api/            API back-end in TypeScript (in progress, not deployed)
```

Each user space has its own styles and self-contained modules (`web/<user>/<module>/`).

## Usage

```sh
make serve      # preview at http://localhost:8080
```

## API

Requires Node 26 (`api/.nvmrc`). TypeScript runs natively, with no build step.

```sh
make api-install  # install dependencies
make api-test     # run the tests
make api-check    # type-check
make api-index    # index the pages of web/ into api/data/pages.json
```
