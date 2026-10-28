#!/usr/bin/env python3
"""Import 9 human-photograph yoga images from a Wikimedia-derived GitHub collection.
Run from the Mind-flow project root: python3 import_yoga_real_photos.py
"""
import json
import shutil
import urllib.request
from pathlib import Path

ROOT = Path.cwd()
DB = ROOT / 'src' / 'data' / 'yoga-poses.json'
OUT = ROOT / 'public' / 'yoga-photos'
BASE = 'https://raw.githubusercontent.com/jreinjr/yoga-pose-photos/main/'
IMAGES = {
    'Tadasana': 'mountain.jpg',
    'Adho Mukha Svanasana': 'downward-dog.jpg',
    'Vrksasana': 'tree.jpg',
    'Virabhadrasana I': 'warrior-1.jpg',
    'Virabhadrasana II': 'warrior-2.jpg',
    'Utthita Trikonasana': 'triangle.jpg',
    'Bhujangasana': 'cobra.jpg',
    'Balasana': 'childs-pose.jpg',
    'Setu Bandha Sarvangasana': 'bridge.jpg',
}
CREDITS = {
    'mountain.jpg': ('Mr. Yoga', 'CC BY-SA 4.0'),
    'downward-dog.jpg': ('Iveto', 'CC BY 3.0'),
    'tree.jpg': ('Camilasuga', 'CC BY-SA 4.0'),
    'warrior-1.jpg': ('OrenBochman', 'CC BY-SA 3.0'),
    'warrior-2.jpg': ('lululemon athletica', 'CC BY 2.0'),
    'triangle.jpg': ('Thamizhpparithi Maari', 'CC BY-SA 3.0'),
    'cobra.jpg': ('Iveto', 'CC BY-SA 4.0'),
    'childs-pose.jpg': ('Iveto', 'CC BY-SA 4.0'),
    'bridge.jpg': ('Biswarup Ganguly', 'CC BY 3.0'),
}
if not DB.exists():
    raise SystemExit(f'Cannot find {DB}. Run from /workspaces/Mind-flow')
obj = json.loads(DB.read_text(encoding='utf-8'))
poses = obj['poses'] if isinstance(obj, dict) else obj
OUT.mkdir(parents=True, exist_ok=True)
saved = {}
for sanskrit, filename in IMAGES.items():
    target = OUT / filename
    try:
        request = urllib.request.Request(BASE + filename, headers={'User-Agent': 'MindFlowYogaPhotoImporter/1.0'})
        with urllib.request.urlopen(request, timeout=20) as response:
            data = response.read()
        if not data.startswith(b'\xff\xd8\xff'):
            raise ValueError('Downloaded file is not a JPEG')
        target.write_bytes(data)
        saved[sanskrit] = filename
        print(f'OK  {sanskrit} -> {target.relative_to(ROOT)}')
    except Exception as exc:
        print(f'SKIP {sanskrit}: {exc}')
if saved:
    backup = DB.with_suffix('.json.before-real-photos')
    if not backup.exists():
        shutil.copy2(DB, backup)
    matches = 0
    for p in poses:
        s = p.get('sanskrit')
        if s in saved:
            fn = saved[s]
            p['image'] = '/yoga-photos/' + fn
            p['imageCredit'], p['imageLicense'] = CREDITS[fn]
            p['imageSource'] = BASE + fn
            matches += 1
    DB.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Finished: {matches} real photos linked in {DB}')
    print(f'Backup: {backup}')
else:
    print('No photos downloaded; your JSON was not changed.')
print('Photo attribution details: https://github.com/jreinjr/yoga-pose-photos')
