module.exports = {
  "*.{js,cjs,mjs,json,md,yml,yaml}": ["prettier --write"],
  "*.ts": ["eslint --fix", "prettier --write"],
};
