#!/usr/bin/env bash
# PostToolUse hook: format & lint files touched by Write/Edit.
# Scoped to this repo only (lives in .claude/hooks, invoked via $CLAUDE_PROJECT_DIR).
set -u

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

INPUT="$(cat)"

FILE_PATH="$(node -e '
  let data = "";
  process.stdin.on("data", d => data += d);
  process.stdin.on("end", () => {
    try {
      const json = JSON.parse(data);
      const path = json.tool_input && json.tool_input.file_path;
      if (path) process.stdout.write(path);
    } catch (e) {}
  });
' <<< "$INPUT")"

# No path -> nothing to do.
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# File must exist.
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# File must live inside this project.
case "$FILE_PATH" in
  "$PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

EXT="${FILE_PATH##*.}"

CODE_EXTS="ts tsx js jsx mjs cjs"
FORMAT_EXTS="ts tsx js jsx mjs cjs json css md mdx"

is_in_list() {
  local ext="$1" list="$2"
  for e in $list; do
    [ "$ext" = "$e" ] && return 0
  done
  return 1
}

cd "$PROJECT_DIR" || exit 0

if is_in_list "$EXT" "$FORMAT_EXTS"; then
  npx --no-install prettier --write "$FILE_PATH" >/dev/null 2>&1
fi

if is_in_list "$EXT" "$CODE_EXTS"; then
  npx --no-install eslint --fix "$FILE_PATH" >&2
fi

exit 0
