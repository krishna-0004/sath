export default {
  "*": "prettier --ignore-unknown --write",
  "apps/web/**/*.{ts,tsx}": () => "npm run lint -w apps/web",
  "apps/api/**/*.{ts,js}": () => "npm run lint -w apps/api",
  "apps/ai/**/*.py": [
    "uv run --directory apps/ai ruff check --fix",
    "uv run --directory apps/ai ruff format",
  ],
};
