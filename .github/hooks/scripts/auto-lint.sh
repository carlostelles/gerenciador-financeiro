#!/usr/bin/env bash
# PostToolUse hook — roda lint automaticamente após edições em arquivos TypeScript
# de api/src/** ou web/src/**, mantendo o código formatado sem depender de lembrete manual.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INPUT_JSON="$(cat)"

FILE_PATH="$(python3 - "$INPUT_JSON" <<'PY' 2>/dev/null || true
import json, sys
try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)

def find_path(obj):
    if isinstance(obj, dict):
        for key in ("file_path", "filePath", "path"):
            if key in obj and isinstance(obj[key], str):
                return obj[key]
        for key in ("tool_input", "toolInput", "input", "parameters"):
            if key in obj:
                result = find_path(obj[key])
                if result:
                    return result
    return None

path = find_path(data)
if path:
    print(path)
PY
)"

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  */api/src/*.ts)
    PROJECT_DIR="$REPO_ROOT/api"
    ;;
  */web/src/*.ts)
    PROJECT_DIR="$REPO_ROOT/web"
    ;;
  *)
    exit 0
    ;;
esac

if [ ! -f "$PROJECT_DIR/package.json" ]; then
  exit 0
fi

# Roda o lint com --fix apenas no arquivo alterado, de forma best-effort (não bloqueia o agente).
(cd "$PROJECT_DIR" && npx --no-install eslint --fix "$FILE_PATH" >/tmp/dev-lifecycle-lint.log 2>&1) || true

exit 0
