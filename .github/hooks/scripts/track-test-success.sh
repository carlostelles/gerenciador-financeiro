#!/usr/bin/env bash
# PostToolUse hook — registra um marcador quando a suíte de testes é executada com sucesso,
# usado pelo hook guard-git-commands.sh para liberar commit/push.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE_DIR="$REPO_ROOT/.github/hooks/.state"
TESTS_MARKER="$STATE_DIR/tests-passed.json"

INPUT_JSON="$(cat)"

python3 - "$INPUT_JSON" <<'PY' > /tmp/dev-lifecycle-post-tool.json 2>/dev/null || true
import json, sys
try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)

def find(obj, keys):
    if isinstance(obj, dict):
        for key in keys:
            if key in obj:
                return obj[key]
        for v in obj.values():
            result = find(v, keys)
            if result is not None:
                return result
    return None

command = find(data, ("command", "cmd")) or ""
success = find(data, ("success", "exitCode", "exit_code"))
print(json.dumps({"command": command, "success": success}))
PY

RESULT_JSON="$(cat /tmp/dev-lifecycle-post-tool.json 2>/dev/null || echo '{}')"
rm -f /tmp/dev-lifecycle-post-tool.json

COMMAND="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(d.get('command') or '')" "$RESULT_JSON" 2>/dev/null || true)"
EXIT_CODE="$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); v=d.get('success'); print(v if v is not None else '')" "$RESULT_JSON" 2>/dev/null || true)"

# Só considera sucesso se não houver indicação explícita de falha (exit code != 0 ou success == false).
if [ -n "$COMMAND" ] && echo "$COMMAND" | grep -Eq 'npm[[:space:]]+(run[[:space:]]+)?test(:e2e)?\b|jest\b|ng[[:space:]]+test\b'; then
  if [ "$EXIT_CODE" = "false" ] || { [ -n "$EXIT_CODE" ] && [ "$EXIT_CODE" != "0" ] && [ "$EXIT_CODE" != "true" ]; }; then
    exit 0
  fi
  mkdir -p "$STATE_DIR"
  printf '{"command": %s, "timestamp": "%s"}' "$(python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$COMMAND")" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$TESTS_MARKER"
fi

exit 0
