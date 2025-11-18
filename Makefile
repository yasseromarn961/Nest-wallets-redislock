# Makefile — Simplify running project tasks with make commands

NPM ?= npm
RUN = $(NPM) run

.PHONY: help install ci-install compile copy-assets build start dev debug prod lint format test test-watch test-cov test-debug test-e2e clean

.DEFAULT_GOAL := help

help:
	@echo ""
	@echo "Available make commands:"
	@echo "  make install        - Install dependencies"
	@echo "  make compile        - Compile the project to the dist folder"
	@echo "  make copy-assets    - Copy i18n assets to the dist folder"
	@echo "  make start          - Start in development mode"
	@echo "  make dev            - Start with watch mode"
	@echo "  make debug          - Start with debug"
	@echo "  make prod           - Start production mode (compiles first)"
	@echo "  make lint           - Lint code and fix simple issues"
	@echo "  make format         - Format code"
	@echo "  make test           - Run unit tests"
	@echo "  make test-watch     - Run tests with watch"
	@echo "  make test-cov       - Run test coverage"
	@echo "  make test-debug     - Run tests with debug"
	@echo "  make test-e2e       - Run E2E tests"
	@echo "  make clean          - Remove dist folder"
	@echo ""

install:
	$(NPM) install

ci-install:
	$(NPM) ci

compile:
	@node -e "try{require('fs').rmSync('dist',{recursive:true,force:true});console.log('Deleted dist folder successfully');}catch(e){console.error('Failed to delete dist folder:', e.message)}"
	node --max-old-space-size=4096 ./node_modules/typescript/bin/tsc -p ./tsconfig.build.json
	@$(MAKE) copy-assets

copy-assets:
	@node -e "const fs=require('fs');const path=require('path');const src=path.join('src','i18n');const dest=path.join('dist/src','i18n');function copyDir(s,d){if(!fs.existsSync(s)){console.log('Assets path not found:',s);return;}fs.mkdirSync(d,{recursive:true});for(const entry of fs.readdirSync(s,{withFileTypes:true})){const sp=path.join(s,entry.name);const dp=path.join(d,entry.name);if(entry.isDirectory()){copyDir(sp,dp);}else{fs.copyFileSync(sp,dp);}}}copyDir(src,dest);console.log('Copied i18n files to',dest);"
	@node -e "const fs=require('fs');const path=require('path');const src=path.join('src','i18n');const dest=path.join('dist/src','i18n');function copyDir(s,d){if(!fs.existsSync(s)){console.log('Assets path not found:',s);return;}fs.mkdirSync(d,{recursive:true});for(const entry of fs.readdirSync(s,{withFileTypes:true})){const sp=path.join(s,entry.name);const dp=path.join(d,entry.name);if(entry.isDirectory()){copyDir(sp,dp);}else{fs.copyFileSync(sp,dp);}}}copyDir(src,dest);console.log('Copied i18n files to',dest);"
build:
	$(RUN) build

start:
	$(RUN) start

dev:
	$(RUN) start:dev

debug:
	$(RUN) start:debug

prod: compile
	$(RUN) start:prod

lint:
	$(RUN) lint

format:
	$(RUN) format

test:
	$(RUN) test

test-watch:
	$(RUN) test:watch

test-cov:
	$(RUN) test:cov

test-debug:
	$(RUN) test:debug

test-e2e:
	$(RUN) test:e2e

clean:
	@node -e "try{require('fs').rmSync('dist',{recursive:true,force:true});console.log('Deleted dist folder successfully');}catch(e){console.error('Failed to delete dist folder:', e.message)}"