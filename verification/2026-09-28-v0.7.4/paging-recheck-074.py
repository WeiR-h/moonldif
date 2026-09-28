import json, subprocess, statistics
from pathlib import Path
specs=[('review',1000,'search_ms'),('compare',100,'tail_ms'),('compare',5000,'analysis_ms'),('compare',10000,'tail_ms')]
paths={'baseline':'.tools/performance-baseline-0.7.3/dist/core.mjs','candidate':'dist/core.mjs'}
result={'method':'Three alternating paired rounds, one warm-up and seven measured runs per fresh worker. Only first-observation stages above ten percent are rechecked; retain all initial and repeat evidence.','cases':[]}
for mode,n,stage in specs:
    rounds=[]
    for r in range(3):
        pair={}
        for kind in (['candidate','baseline'] if r%2 else ['baseline','candidate']):
            process=subprocess.run(['node','scripts/pagination-benchmark.mjs','--worker',mode,str(n),'--core',paths[kind]],capture_output=True,text=True,check=True,timeout=120)
            pair[kind]=json.loads(process.stdout)
        pair['ratio']=pair['candidate']['medians'][stage]/pair['baseline']['medians'][stage]
        rounds.append(pair)
    ratio=statistics.median(r['ratio'] for r in rounds)
    result['cases'].append({'mode':mode,'records':n,'stage':stage,'ratio':ratio,'rounds':rounds})
    print(mode,n,stage,round((ratio-1)*100,1),flush=True)
result['status']='passed' if all(c['ratio']<=1.1 for c in result['cases']) else 'needs-investigation'
Path('verification/local/pagination-v0.7.4-recheck.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf8')
print(result['status'])
