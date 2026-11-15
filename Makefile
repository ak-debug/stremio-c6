DEVICE ?= lgtv
APP_ID = io.github.akdebug.stremio
VERSION = $(shell python3 -c "import json; print(json.load(open('app/appinfo.json'))['version'])")
IPK = $(APP_ID)_$(VERSION)_all.ipk
export NODE_OPTIONS := $(NODE_OPTIONS) --require $(CURDIR)/tools/node-compat.cjs
.PHONY: build check package deploy launch restart clean
build:
	python3 scripts/build.py
check:
	node --test tests/*.test.cjs
package: build
	$(MAKE) check
	ares-package --no-minify app service -o .
	python3 scripts/check-ipk.py $(IPK)
deploy: package
	ares-install --device $(DEVICE) $(IPK)
	ares-launch --device $(DEVICE) $(APP_ID)
launch:
	ares-launch --device $(DEVICE) $(APP_ID)
restart:
	-ares-launch --device $(DEVICE) --close $(APP_ID)
	ares-launch --device $(DEVICE) $(APP_ID)
clean:
	rm -rf service/www service/server.js service/bin *.ipk
