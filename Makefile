.PHONY: docs

JS_SRCS = $(wildcard *.js)

docs: README.md

# Needs: `npm i -g jsdoc-to-markdown`
README.md: $(JS_SRCS) readme.hbs
	jsdoc2md $(JS_SRCS) --template readme.hbs > README.md
