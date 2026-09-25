import csv,json,pathlib,collections,hashlib
p=pathlib.Path('data-raw/kaggle/Banglore_traffic_Dataset.csv')
rows=list(csv.DictReader(p.open(encoding='utf-8-sig')));days=collections.defaultdict(dict)
for r in rows:
    speed=float(r['Average Speed']);congestion=float(r['Congestion Level']);volume=int(r['Traffic Volume'])
    if not 0<speed<160 or not 0<=congestion<=100 or volume<0:continue
    days[r['Date']][r['Road/Intersection Name']]={'speed':round(speed,2),'congestion':round(congestion,2),'volume':volume,'area':r['Area Name']}
frames=[{'date':date,'time':'DAILY','routes':{},'readings':readings} for date,readings in sorted(days.items())]
data={'source':"Kaggle · Bangalore's Traffic Pulse",'kind':'kaggle','url':'https://www.kaggle.com/datasets/preethamgouda/banglore-city-traffic-dataset','creator':'Preetham Gouda','license':'CC0: Public Domain','version':1,'rowCount':len(rows),'date':frames[-1]['date'],'dateRange':[frames[0]['date'],frames[-1]['date']],'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'collectionStatus':'Community-uploaded data; collection methodology is not verified. Dates only: no time-of-day or coordinates.','frames':frames}
pathlib.Path('public/data/kaggle-traffic.json').write_text(json.dumps(data,separators=(',',':')))
print(json.dumps({'rows':len(rows),'days':len(frames),'range':data['dateRange'],'roads':sorted({k for f in frames for k in f['readings']})}))
