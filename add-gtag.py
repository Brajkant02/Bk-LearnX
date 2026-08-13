#!/usr/bin/env python3

import os
import re
from pathlib import Path

# Google Analytics script
GTAG_CODE = '''    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-FB7SX0P0D3"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-FB7SX0P0D3');
    </script>'''

# Find all HTML files in pages directory
pages_dir = Path(__file__).parent / "pages"
html_files = list(pages_dir.rglob("*.html"))

print(f"Found {len(html_files)} HTML files")

count = 0
for html_file in sorted(html_files):
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if gtag code already exists
        if 'G-FB7SX0P0D3' in content:
            print(f"  SKIP: {html_file.relative_to(pages_dir.parent)} (already has gtag)")
            continue
        
        # Find the <head> tag and add gtag code after it
        # Match <head> tag (with optional spaces/newline)
        pattern = r'(<head[^>]*>)(\s*)'
        replacement = r'\1\n    ' + GTAG_CODE.lstrip() + r'\2'
        
        new_content = re.sub(pattern, replacement, content, count=1, flags=re.IGNORECASE)
        
        if new_content != content:
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"  OK: {html_file.relative_to(pages_dir.parent)}")
            count += 1
        else:
            print(f"  FAIL: {html_file.relative_to(pages_dir.parent)} (no <head> tag found)")
    
    except Exception as e:
        print(f"  ERROR: {html_file.relative_to(pages_dir.parent)} - {str(e)}")

print(f"\n✓ Successfully updated {count} files")
