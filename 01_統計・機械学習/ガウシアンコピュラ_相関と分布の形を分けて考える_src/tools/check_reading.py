"""check_reading.py — Mac の say が誤読しやすい語を、耳で聞かずに見つける。

語の声と、正しい読み・誤った読みの声を作り、対数スペクトルの DTW 距離でどちらに近いかを判定する。
距離が 0.00 なら同じ読みと分かる（例: 「サイン波」と「サインナミ」）。
実行: python tools/check_reading.py <語のリスト> <作業フォルダ>
語のリストの形式: 語|正しい読み|誤った読み（1行に1語）。出力は、誤読の疑いが強い順。★ は誤った読みのほうが近い語。
"""
import pathlib
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np

LIST=pathlib.Path(sys.argv[1]).read_text().strip().split('\n'); OUT=pathlib.Path(sys.argv[2])
RATE=24000; FRAME=240; HOP=240
def synth(text,name):
    a=OUT/f'{name}.aiff'
    subprocess.run(['say','-v','Kyoko','-r','220','-o',str(a),f'これは、{text}、です。'],timeout=60,check=True)
    raw=subprocess.run(['ffmpeg','-v','error','-i',str(a),'-f','f32le','-ac','1','-ar',str(RATE),'-'],capture_output=True,check=True).stdout
    a.unlink(); return np.frombuffer(raw,dtype=np.float32)
def spec(x):
    n=(len(x)-FRAME)//HOP; w=np.hanning(FRAME)
    s=np.abs(np.fft.rfft(np.stack([x[i*HOP:i*HOP+FRAME]*w for i in range(n)]),axis=1))[:,:100]
    s=np.log(s+1e-3); return s-s.mean()
def dtw(a,b):
    d=np.sqrt(((a[:,None,:]-b[None,:,:])**2).mean(axis=2)); n,m=d.shape
    c=np.full((n+1,m+1),np.inf); c[0,0]=0
    for i in range(n):
        for j in range(m): c[i+1,j+1]=d[i,j]+min(c[i,j],c[i,j+1],c[i+1,j])
    return c[n,m]/(n+m)
def work(a):
    i,line=a; w,right,wrong=line.split('|')
    x=spec(synth(w,f'w{i}')); r=spec(synth(right,f'r{i}')); e=spec(synth(wrong,f'e{i}'))
    return dtw(x,r)-dtw(x,e), dtw(x,r), dtw(x,e), w, right, wrong
with ThreadPoolExecutor(4) as pool: rows=list(pool.map(work,enumerate(LIST)))
rows.sort(reverse=True)
for gap,r,e,w,right,wrong in rows:
    mark='★誤読の疑い' if r>=e else ''
    print(f'{r:.2f} {e:.2f}  {w} / 正 {right} / 誤 {wrong} {mark}')
