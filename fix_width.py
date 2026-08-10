import re
from pathlib import Path
root = Path('.')
selectors = [r'\\.page', r'\\.wrap', r'\\.main-content', r'main']
pattern = re.compile(r'(' + '|'.join(selectors) + r')\\s*\\{.*?\\}', re.DOTALL)
changed = []
for path in root.rglob('*'):
    if path.suffix.lower() not in {'.html', '.css'}:
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    def repl(match):
        block = match.group(0)
        block = re.sub(r'max-width:\\s*\\d+px;', 'width:100%;max-width:none;', block)
        block = re.sub(r'margin:\\s*0 auto;', 'margin:0;', block)
        block = re.sub(r'margin:\\s*auto;', 'margin:0;', block)
        return block
    new = pattern.sub(repl, text)
    if new != text:
        path.write_text(new, encoding='utf-8')
        changed.append(str(path))
print('Changed files:', len(changed))
for p in changed:
    print(p)
