from pathlib import Path
root = Path('.').resolve()
for path in sorted(root.rglob('*.html')):
    text = path.read_text(encoding='utf-8')
    if 'theme-toggle' in text:
        continue
    if '<header class="site-header">' in text:
        new_text = text.replace('</header>', '    <button type="button" class="theme-toggle" aria-label="Toggle dark and light mode">🌙 Dark</button>\n</header>', 1)
    elif '<nav class="navbar">' in text:
        new_text = text.replace('</nav>', '    <button type="button" class="theme-toggle" aria-label="Toggle dark and light mode">🌙 Dark</button>\n</nav>', 1)
    else:
        continue
    if new_text != text:
        path.write_text(new_text, encoding='utf-8')
        print('inserted button in', path)
