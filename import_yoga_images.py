#!/usr/bin/env python3
"""Mind Flow: match verified Yoga API asanas and download their PNGs locally.
Run in the Mind-flow project root: python3 import_yoga_images.py
Only exact normalized Sanskrit-name matches are auto-linked; uncertain poses stay blank.
"""
import json
import re
import sys
import time
import unicodedata
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

API = 'https://yoga-api-nzy4.onrender.com/v1/poses'
ROOT = Path.cwd()
DATA = ROOT / 'src/data/yoga-poses.json'
OUTPUT = ROOT / 'public/yoga'
REPORT = ROOT / 'yoga-image-report.json'


def get_bytes(url, timeout=30):
    req = Request(url, headers={'User-Agent': 'MindFlowYogaImageImporter/1.0', 'Accept': 'application/json,image/png,image/svg+xml,*/*'})
    with urlopen(req, timeout=timeout) as response:
        return response.read()


def norm(value):
    value = unicodedata.normalize('NFKD', str(value or ''))
    value = ''.join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower().replace('ā','a').replace('ī','i').replace('ū','u')
    value = re.sub(r'[^a-z0-9]+', ' ', value)
    return ' '.join(value.split())


def records(obj):
    if isinstance(obj, list):
        return [x for x in obj if isinstance(x, dict)]
    if isinstance(obj, dict):
        for key in ('poses', 'data', 'results'):
            if isinstance(obj.get(key), list):
                return [x for x in obj[key] if isinstance(x, dict)]
    raise ValueError('Yoga API response is not a list of poses')


def unique_exact_index(api_poses):
    index = {}
    for pose in api_poses:
        for key in ('sanskrit_name_adapted', 'sanskrit_name'):
            name = norm(pose.get(key))
            if name:
                index.setdefault(name, {})[str(pose.get('id', id(pose)))] = pose
    return {name: next(iter(matches.values())) for name, matches in index.items() if len(matches) == 1}


def download_png(url, path):
    try:
        blob = get_bytes(url, timeout=18)
        if not blob.startswith(b'\x89PNG\r\n\x1a\n'):
            return False, 'not a PNG response'
        if len(blob) < 300:
            return False, 'too small to be a valid image'
        path.write_bytes(blob)
        return True, None
    except Exception as exc:
        return False, str(exc)[:130]


def main():
    if not DATA.exists():
        sys.exit(f'Cannot find {DATA}. Open terminal at the Mind-flow project root.')
    original = json.loads(DATA.read_text(encoding='utf-8'))
    if not isinstance(original.get('poses'), list):
        sys.exit('Invalid yoga-poses.json: poses list missing')
    print(f'Found {len(original["poses"])} poses in your database.')
    print('Fetching Yoga API; first request may take longer if free service is sleeping...')
    api_poses = None
    for attempt in range(2):
        try:
            api_poses = records(json.loads(get_bytes(API, timeout=50).decode('utf-8')))
            break
        except Exception as exc:
            print(f'API request {attempt + 1}/2 failed: {exc}')
            if attempt == 0:
                time.sleep(3)
    if api_poses is None:
        sys.exit('No changes made. Yoga API is unreachable; try again later.')
    print(f'Yoga API returned {len(api_poses)} pose records.')
    index = unique_exact_index(api_poses)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    matched, missing, errors = [], [], []
    changed = 0
    for entry in original['poses']:
        key = norm(entry.get('sanskrit'))
        api = index.get(key)
        if not api:
            missing.append({'sanskrit': entry.get('sanskrit'), 'nameKo': entry.get('nameKo'), 'id':entry.get('id')})
            continue
        url = api.get('url_png')
        if not url or not str(url).startswith('https://'):
            errors.append({'id':entry['id'], 'reason':'No HTTPS PNG URL'})
            continue
        name = re.sub('[^a-zA-Z0-9_-]', '-', entry['id']) + '.png'
        dest = OUTPUT / name
        if not dest.exists():
            ok, error = download_png(url, dest)
            if not ok:
                errors.append({'id':entry['id'], 'reason':error, 'remoteImage':url})
                continue
        # A matching pose does not by itself prove the illustration's license/style.
        # Review image and credit before distributing the app.
        entry['image'] = '/yoga/' + name
        entry['imageSource'] = 'Yoga API'
        entry['imageSourceUrl'] = url
        entry['imageCredit'] = 'Yoga API by Alexandre C. — review asset-specific credits'
        entry['imageLicense'] = 'review-required'
        entry['imageReviewStatus'] = 'needs-visual-and-license-review'
        matched.append({'id':entry['id'], 'sanskrit':entry['sanskrit'], 'image':entry['image']})
        changed += 1
    report = {'apiReturned': len(api_poses), 'matchedAndDownloaded':len(matched), 'unmatched':len(missing), 'failedDownloads':len(errors), 'matched':matched, 'missing':missing, 'errors':errors, 'note':'Only exact normalized Sanskrit matches are assigned. Visually review poses and image-specific licenses.'}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    if changed:
        backup = DATA.with_suffix('.json.before-images')
        if not backup.exists():
            backup.write_text(DATA.read_text(encoding='utf-8'), encoding='utf-8')
        DATA.write_text(json.dumps(original, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Done: {changed} images saved in public/yoga, {len(missing)} unmatched, {len(errors)} failed downloads.')
    print(f'Report: {REPORT}')
    print('Review the images and licensing before sharing the app publicly.')


if __name__ == '__main__':
    main()
