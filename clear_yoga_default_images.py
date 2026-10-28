#!/usr/bin/env python3
"""Remove assistant-imported yoga images and their JSON references.
Does not touch the photos that you uploaded in your browser (IndexedDB).
Run from the Mind-flow project root: python3 clear_yoga_default_images.py
"""
from pathlib import Path
import json, shutil
root = Path(__file__).resolve().parent
pose_file = root / 'src' / 'data' / 'yoga-poses.json'
if not pose_file.is_file():
    raise SystemExit('Cannot find src/data/yoga-poses.json; place this script in Mind-flow root.')
with pose_file.open(encoding='utf-8') as f:
    data = json.load(f)
if not isinstance(data.get('poses'), list):
    raise SystemExit('Unexpected pose JSON structure; nothing changed.')
backup = pose_file.with_name('yoga-poses.json.before-clearing-default-images')
if not backup.exists():
    shutil.copy2(pose_file, backup)
changed = 0
for pose in data['poses']:
    if pose.get('image'):
        changed += 1
    pose['image'] = None
    pose['imageLicense'] = None
    pose['imageCredit'] = None
with pose_file.open('w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(f'Cleared images for {len(data["poses"])} poses ({changed} existing default image references).')
for name in ('yoga', 'yoga-photos'):
    path = root / 'public' / name
    if path.is_dir():
        shutil.rmtree(path)
        print(f'Deleted imported folder: public/{name}/')
print('Browser-uploaded personal photos are preserved.')
print('Backed up the original data at:', backup.relative_to(root))
