from PIL import Image
import numpy as np
def hue_shift(im, target_h, sat_mul=1.0, val_mul=1.0, src_h=0.12):
    a=np.asarray(im.convert('RGBA')).astype(float)/255; rgb=a[...,:3]; al=a[...,3:]
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    mx=rgb.max(2); mn=rgb.min(2); v=mx; d=mx-mn; s=np.where(mx>0,d/np.maximum(mx,1e-6),0)
    dd=np.maximum(d,1e-6)
    h=np.where(mx==r,((g-b)/dd)%6,np.where(mx==g,(b-r)/dd+2,(r-g)/dd+4))/6; h=np.where(d>1e-6,h,0)
    h=(h+(target_h-src_h))%1; s=np.clip(s*sat_mul,0,1); v=np.clip(v*val_mul,0,1)
    i=(h*6).astype(int)%6; f=h*6-np.floor(h*6); p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    out=np.zeros_like(rgb)
    for k,(cr,cg,cb) in enumerate([(v,t,p),(q,v,p),(p,v,t),(p,q,v),(t,p,v),(v,p,q)]):
        m=i==k; out[m]=np.stack([cr,cg,cb],-1)[m]
    return Image.fromarray((np.concatenate([out,al],-1)*255).astype(np.uint8),'RGBA')
T=[(0.12,1,1),(0.42,1,.95),(0.95,1,1),(0.56,1,1),(0.72,.9,1),(0.06,1,1)]
if __name__=='__main__':
    cube=Image.open('cube.png'); tray=Image.open('tray.png')
    W=cube.width; th=int(tray.height*W/tray.width); canvas=Image.new('RGBA',(W*6,cube.height+th),(255,255,255,255))
    for i,(h,s,v) in enumerate(T):
        c=hue_shift(cube,h,s,v); t=hue_shift(tray,h,s,v).resize((W,th))
        canvas.paste(c,(i*W,0),c); canvas.paste(t,(i*W,cube.height),t)
    canvas.resize((canvas.width//4,canvas.height//4)).save('palette.png')
