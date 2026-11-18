// Classic blocking script at the top of <body>: apply the last-used theme before
// first paint, so dark mode doesn't flash light while storage.sync loads.
// index.js setTheme() keeps this copy in sync with the real setting.
try {
  const theme = localStorage.getItem('theme');
  if (theme) document.body.classList.add(`theme-${theme}`);
} catch {
  // storage unavailable: index.js applies the theme once settings load
}
