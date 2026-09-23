document.querySelector('.nav-toggle')?.addEventListener('click', event => {
  const links = document.querySelector('.nav-links'); const open = links.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('[data-language-button]').forEach(button => button.addEventListener('click', () => {
  const language = button.dataset.languageButton;
  document.querySelectorAll('[data-language-button]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
  document.querySelectorAll('[data-language]').forEach(section => { section.hidden = section.dataset.language !== language; });
}));
