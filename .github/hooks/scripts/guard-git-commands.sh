#!/usr/bin/env bash
# PreToolUse hook — bloqueia comandos git destrutivos e exige testes antes de commit/push.
# Recebe um JSON via stdin com informações sobre a ferramenta que o agente está prestes a executar.
# Documentação: https://code.visualstudio.com/docs/copilot/customization/hooks

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
STATE_DIR="$REPO_ROOT/.github/hooks/.state"
TESTS_MARKER="$STATE_DIR/tests-passed.json"

INPUT_JSON="$(cat)"

# Extrai o comando de shell do payload do hook, tolerando nomes de campo diferentes
# (tool_input.command, toolInput.command, input.command, command).
COMMAND="$(python3 - "$INPUT_JSON" <<'PY' 2>/dev/null || true
import json, sys
try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)

def find_command(obj):
    if isinstance(obj, dict):
        for key in ("command", "cmd"):
            if key in obj and isinstance(obj[key], str):
                return obj[key]
        for key in ("tool_input", "toolInput", "input", "parameters", "args"):
            if key in obj:
                result = find_command(obj[key])
                if result:
                    return result
    return None

cmd = find_command(data)
if cmd:
    print(cmd)
PY
)"

# Se não conseguimos identificar um comando (payload inesperado ou não é uma chamada de shell),
# não bloqueamos — deixamos o comportamento padrão do agente prosseguir.
if [ -z "$COMMAND" ]; then
  exit 0
fi

deny() {
  local reason="$1"
  cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "$reason"
  }
}
JSON
  exit 0
}

ask() {
  local reason="$1"
  cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "ask",
    "permissionDecisionReason": "$reason"
  }
}
JSON
  exit 0
}

# 1) Bloqueia comandos git destrutivos/irreversíveis sem confirmação explícita do usuário.
if echo "$COMMAND" | grep -Eq 'git[[:space:]]+push[[:space:]]+.*(--force|-f\b)|git[[:space:]]+reset[[:space:]]+--hard|git[[:space:]]+clean[[:space:]]+-[a-z]*f|filter-branch|push[[:space:]]+.*--force-with-lease'; then
  deny "Comando git potencialmente destrutivo/irreversível detectado ('$COMMAND'). Peça confirmação explícita ao usuário antes de executar manualmente."
fi

# 2) Exige que os testes tenham passado recentemente antes de permitir commit/push (não-force).
if echo "$COMMAND" | grep -Eq '^\s*git[[:space:]]+(commit|push)\b'; then
  if [ ! -f "$TESTS_MARKER" ]; then
    ask "Nenhum registro de testes bem-sucedidos foi encontrado ($TESTS_MARKER ausente). Rode a suíte de testes de api/ e/ou web/ antes de commitar/enviar."
  fi

  MARKER_AGE_SECONDS=$(( $(date +%s) - $(stat -f %m "$TESTS_MARKER" 2>/dev/null || stat -c %Y "$TESTS_MARKER") ))
  MAX_AGE_SECONDS=$((60 * 60 * 4)) # 4 horas
  if [ "$MARKER_AGE_SECONDS" -gt "$MAX_AGE_SECONDS" ]; then
    ask "O último registro de testes bem-sucedidos tem mais de 4 horas. Rode a suíte de testes novamente antes de commitar/enviar."
  fi
fi

exit 0
