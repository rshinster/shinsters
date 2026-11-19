PORT ?= 8080
TYPST ?= typst
CV_PDF := web/rshin/profile/resume.pdf
CV_ARGS := --root . --input data=/content/cv/cv.yaml templates/cv/cv.typ $(CV_PDF)

.PHONY: serve cv cv-watch cv-final api-install api-test api-check api-index api-search

serve:
	python3 -m http.server $(PORT) -d web

cv:
	$(TYPST) compile $(CV_ARGS)

cv-watch:
	$(TYPST) watch $(CV_ARGS)

cv-final:
	$(TYPST) compile --input strict=true $(CV_ARGS)

api-install:
	cd api && npm ci

api-test:
	cd api && npm test

api-check:
	cd api && npm run check

api-index:
	cd api && npm run index

api-search:
	cd api && npm run -s search -- "$$q"
