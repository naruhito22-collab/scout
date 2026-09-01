"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type RefState = { file?: File; preview?: string; comment: string };
const emptyRef = ():RefState => ({ comment:"" });

export default function HomePage() {
  const [request, setRequest] = useState("");
  const [refs, setRefs] = useState<RefState[]>([emptyRef(), emptyRef()]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  function setFile(i:number, file?:File){
    setRefs(prev=>prev.map((r,idx)=> idx===i ? {...r,file,preview:file?URL.createObjectURL(file):undefined}:r));
  }
  function fileToDataUrl(file:File){ return new Promise<string>((resolve,reject)=>{ const rd=new FileReader(); rd.onload=()=>resolve(String(rd.result)); rd.onerror=reject; rd.readAsDataURL(file); }); }
  async function start() {
    if (!request.trim()) return;
    setBusy(true);
    try {
      const references=[] as any[];
      for(const r of refs){ if(r.file) references.push({dataUrl:await fileToDataUrl(r.file), comment:r.comment}); }
      const res = await fetch("/api/projects", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({request,references}) });
      const project = await res.json();
      if(!res.ok) throw new Error(project.error||"Could not create project");
      router.push(`/project/${project.id}`);
    } catch(e:any){ alert(e.message); setBusy(false); }
  }
  return <main className="shell">
    <div className="brand">SCOUT</div>
    <section className="inputWrap">
      <h1>What are you looking for?</h1>
      <p className="lead">探したい背景のイメージを自由に入力してください。</p>
      <textarea className="prompt" value={request} onChange={(e)=>setRequest(e.target.value)} placeholder="例：仕事を終えた経営者が、一人で静かに飲む夜。高級すぎず、静かで余白のある空間。" />
      <div className="refTitle">参考画像 <span className="status">optional / 0–2</span></div>
      <div className="refs">
        {refs.map((r,i)=><div key={i}>
          <label className="refBox">
            {r.preview ? <img src={r.preview} alt="reference"/> : <span>＋ Add reference image</span>}
            <input type="file" accept="image/*" onChange={e=>setFile(i,e.target.files?.[0])}/>
          </label>
          {r.file && <input className="refComment" value={r.comment} onChange={e=>setRefs(p=>p.map((x,idx)=>idx===i?{...x,comment:e.target.value}:x))} placeholder="この画像について自由に入力"/>}
        </div>)}
      </div>
      <div className="toolbar"><button className="button" disabled={busy} onClick={start}>{busy?"STARTING...":"EXPLORE"}</button></div>
    </section>
  </main>
}
