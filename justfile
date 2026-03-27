set shell := ["zsh", "-eu", "-c"]

alias serve := run
alias serve-uvx := run-uvx

[default]
help:
  @just --list

run host="127.0.0.1" port="4173":
  @echo "Serving http://{{host}}:{{port}} with python3"
  @python3 -m http.server {{port}} --bind {{host}}

run-uvx host="127.0.0.1" port="4173":
  @echo "Serving http://{{host}}:{{port}} with uvx"
  @uvx python -m http.server {{port}} --bind {{host}}

check:
  @echo "Checking browser scripts with Node"
  @rg --files -g '*.js' src | while IFS= read -r file; do \
    node --check "$file"; \
  done

doctor:
  @just --version
  @uvx --version
  @python3 --version
  @node --version
