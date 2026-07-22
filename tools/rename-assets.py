import os
import re
import pathlib

root = pathlib.Path(r'c:\Users\user\OneDrive\Documents\GitHub\Bk LearnX').resolve()
exclude_dirs = {'.git', '.venv', '.venv-1', 'node_modules', '.vscode'}
text_exts = {'.html', '.css', '.js', '.json', '.md', '.txt', '.xml'}


def normalize_name(name: str) -> str:
    base, ext = os.path.splitext(name)
    base = base.lower()
    base = re.sub(r'[^a-z0-9]+', '-', base).strip('-')
    if not base:
        base = 'item'
    if ext:
        return base + ext.lower()
    return base


def should_skip(path: pathlib.Path) -> bool:
    return any(part in exclude_dirs for part in path.parts)


def rename_path(path: pathlib.Path):
    if should_skip(path):
        return None
    new_name = normalize_name(path.name)
    if new_name == path.name:
        return None
    new_path = path.with_name(new_name)
    counter = 1
    while new_path.exists() and new_path != path:
        base, ext = os.path.splitext(new_name)
        new_path = path.with_name(f'{base}-{counter}{ext}')
        counter += 1
    if new_path != path:
        os.rename(path, new_path)
        return new_path
    return None

# Rename directories and files from deepest to shallowest.
for current_root, dirnames, filenames in os.walk(root, topdown=False):
    current_root = pathlib.Path(current_root)
    for filename in sorted(filenames):
        full = current_root / filename
        if should_skip(full):
            continue
        rename_path(full)
    for dirname in sorted(dirnames):
        full = current_root / dirname
        if should_skip(full):
            continue
        rename_path(full)

# Build mapping of old path segments to new normalized segments.
segment_map = {}
for path in root.rglob('*'):
    if should_skip(path):
        continue
    rel = path.relative_to(root)
    for part in rel.parts:
        if part in segment_map:
            continue
        norm = normalize_name(part)
        if norm != part:
            segment_map[part] = norm
            segment_map[part.lower()] = norm
            segment_map[normalize_name(part).lower()] = norm

# Update references in text files.
for path in root.rglob('*'):
    if not path.is_file() or should_skip(path):
        continue
    if path.suffix.lower() not in text_exts:
        continue
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        continue

    def replace_token(match):
        quote = match.group(1)
        value = match.group(2)
        if not value:
            return match.group(0)
        if value.startswith(('http://', 'https://', 'mailto:', 'data:', '#')):
            return match.group(0)
        if '?' in value:
            path_part, suffix = value.split('?', 1)
        elif '#' in value:
            path_part, suffix = value.split('#', 1)
        else:
            path_part, suffix = value, ''

        has_path = any(ch in path_part for ch in '/.\\') or path_part.startswith('..')
        if not has_path:
            return match.group(0)

        parts = path_part.replace('\\', '/').split('/')
        new_parts = []
        for part in parts:
            if not part or part in ('.', '..'):
                new_parts.append(part)
            else:
                new_parts.append(segment_map.get(part, segment_map.get(part.lower(), normalize_name(part))))
        new_value = '/'.join(new_parts)
        if suffix:
            new_value = new_value + '?' + suffix
        return f'{quote}{new_value}{quote}'

    updated = re.sub(r'(["\'])([^"\']*)(\1)', replace_token, text)
    if updated != text:
        path.write_text(updated, encoding='utf-8')

print('Renaming completed.')
