"""Offline preprocessing. Download only the two allowed training annotation files first."""
import csv,json,random,collections,pathlib,urllib.request,concurrent.futures,io
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'public'/'data';out.mkdir(exist_ok=True)
rows=list(csv.DictReader(open(root/'data-raw'/'traffic.csv',encoding='utf-8-sig')))
routes=list(csv.DictReader(open(root/'data-raw'/'routes.csv',encoding='utf-8-sig')))
groups=collections.defaultdict(dict)
for r in rows:
    try:
        duration=float(r['duration']);distance=float(r['distance'])
        if duration<=0 or distance<=0:continue
        groups[(r['date'],r['time'])][r['route_code']]={'duration':duration,'distance':distance,'speed':round(distance/duration*60,1)}
    except (ValueError,KeyError):continue
days=collections.Counter(d for (d,t),v in groups.items() if len(v)>=10)
# Choose an actual complete day, avoiding partial latest days.
date=sorted(days,key=lambda d:(days[d]>=40,d))[-1]
frames=[{'date':d,'time':t,'routes':v} for (d,t),v in sorted(groups.items()) if d==date and len(v)>=10]
json.dump({'source':'Traffic Monitor Lizard','url':'https://github.com/thecont1/traffic-monitor-lizard','date':date,'frames':frames,'routes':routes},open(out/'traffic.json','w'),separators=(',',':'))
rng=random.Random(42);samples=[]
for short,dataset,filename,prefix in [('bmd','BMD-45-Train','_annotations.coco.json',''),('uvh','UVH-26-Train','UVH-26-MV-Train.json','data/')]:
    d=json.load(open(root/'data-raw'/f'{short}.json'))
    listing=json.load(open(root/'data-raw'/('bmd-files.json' if short=='bmd' else 'uvh-000-files.json'),encoding='utf-8-sig'))
    available={pathlib.PurePosixPath(f['path']).name:f['path'] for f in listing if f['type']=='file'}
    images=sorted([i for i in d['images'] if pathlib.PurePosixPath(i['file_name']).name in available],key=lambda i:i['id'])
    assert len(images)>=50, (short,len(images))
    # Stratify into 50 portions of image-id order; sample once per portion for diversity.
    selected=[rng.choice(images[i*len(images)//50:(i+1)*len(images)//50]) for i in range(50)]
    ids={i['id'] for i in selected};cats={c['id']:c['name'] for c in d['categories']};counts=collections.defaultdict(collections.Counter)
    for a in d['annotations']:
        if a['image_id'] in ids: counts[a['image_id']][cats[a['category_id']]]+=1
    for i in selected:
        composition=dict(counts[i['id']]);total=sum(composition.values())
        remote=f"https://huggingface.co/datasets/kalyan1729/trafficmanagementdataset/resolve/main/{available[pathlib.PurePosixPath(i['file_name']).name]}"
        samples.append({'id':f"{short}-{i['id']}",'imageId':i['id'],'dataset':dataset,'fileName':i['file_name'],'total':total,'composition':composition,'density':'LOW' if total<=10 else 'MEDIUM' if total<=30 else 'HIGH','remote':remote,'image':f"/data/images/{short}-{i['id']}.jpg"})
(out/'images').mkdir(exist_ok=True)
def download(s):
    dest=out/'images'/f"{s['id']}.jpg"
    if dest.exists():return
    try:
        request=urllib.request.Request(s['remote'],headers={'User-Agent':'MargMitra-research-demo/1.0'})
        raw=urllib.request.urlopen(request,timeout=60).read()
        image=Image.open(io.BytesIO(raw)).convert('RGB');image.thumbnail((640,360));image.save(dest,quality=76)
    except Exception as e:
        s['image']=None;print('Image download failed',s['id'],str(e),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(download,samples))
json.dump({'seed':42,'selection':'50 stratified random images from each allowed training set; image-id order among matching annotations in first 1000 hosted image entries (BMD images_000, UVH data/000); Python random.Random(42)','samples':samples,'licenses':{'BMD':json.load(open(root/'data-raw'/'bmd.json')).get('licenses',[]),'UVH':json.load(open(root/'data-raw'/'uvh.json')).get('licenses',[])}},open(out/'density.json','w'),separators=(',',':'))
print(json.dumps({'date':date,'frames':len(frames),'samples':len(samples),'downloaded':sum(bool(s['image']) for s in samples),'processedBytes':sum(p.stat().st_size for p in out.rglob('*') if p.is_file())}),flush=True)
