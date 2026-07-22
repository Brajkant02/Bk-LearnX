from pathlib import Path
import re

root = Path(__file__).parent
html_paths = sorted(root.rglob('*.html'))
updated = []
for path in html_paths:
    text = path.read_text(encoding='utf-8')
    orig = text
    if 'theme.css' not in text:
        if '<link rel="stylesheet"' in text:
            parts = re.split(r'(<link[^>]+rel=[\"\"][^>]*stylesheet[^>]*>)', text)
            last = -1
            for i, part in enumerate(parts):
                if part.startswith('<link') and 'rel="stylesheet"' in part:
                    last = i
            if last != -1:
                parts.insert(last + 1, '\n    <link rel="stylesheet" href="../theme.css">')
                text = ''.join(parts)
            else:
                text = text.replace('</head>', '    <link rel="stylesheet" href="../theme.css">\n</head>', 1)
        else:
            text = text.replace('</head>', '    <link rel="stylesheet" href="../theme.css">\n</head>', 1)
    if 'theme.js' not in text and '</body>' in text:
        text = text.replace('</body>', '    <script src="../theme.js" defer></script>\n</body>', 1)
    if text != orig:
        path.write_text(text, encoding='utf-8')
        updated.append(str(path))
print('updated', len(updated), 'files')
for item in updated:
    print(item)
