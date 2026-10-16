PORT ?= 8080
TYPST ?= typst
CV_PDF := web/rshin/profile/resume.pdf
CV_ARGS := --root . --input data=/content/cv/cv.yaml templates/cv/cv.typ $(CV_PDF)

.PHONY: serve cv cv-watch cv-final

serve:
	python3 -m http.server $(PORT) -d web

cv:
	$(TYPST) compile $(CV_ARGS)

cv-watch:
	$(TYPST) watch $(CV_ARGS)

cv-final:
	$(TYPST) compile --input strict=true $(CV_ARGS)
