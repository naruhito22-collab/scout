"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneratePage(){
  const router=useRouter();
  const [brief,setBrief]=useState<any>(null);
  const [imageUrl,setImageUrl]=useState("");
  const [instruction,setInstruction]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [meta,setMeta]=useState<any>(null);

  useEffect(()=>{
    const raw=sessionStorage.getItem("scout-generation-brief");
    if(raw){
      try{setBrief(JSON.parse(raw));}catch{}
    }
  },[]);

  async function generate(mode:"initial"|"revise"){
    if(!brief)return;
    if(mode==="revise"&&!instruction.trim())return;
    setBusy(true);
    setError("");
    try{
      const r=await fetch("/api/generate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          mode,
          brief,
          currentImage:imageUrl,
          instruction
        })
      });
      const j=await r.json();
      if(!r.ok){setError(j.error||"Image generation failed");return;}
      setImageUrl(j.imageUrl);
      setMeta(j);
      setInstruction("");
    }catch(e:any){
      setError(e?.message||"Image generation failed");
    }finally{
      setBusy(false);
    }
  }

  if(!brief) return <main className="shell"><div className="brand">SCOUT</div><div className="generateWrap"><p>No generation brief found.</p><button className="edit" onClick={()=>router.back()}>Back</button></div></main>;

  const images=brief.direction.favoriteImages?.length?brief.direction.favoriteImages:brief.direction.images;

  return <main className="shell">
    <div className="topbar"><div className="brand">SCOUT / GENERATE</div><button className="edit" onClick={()=>router.back()}>Back to directions</button></div>
    <section className="generateWrap">
      <div className="status">Selected direction</div>
      <h1>{brief.direction.title}</h1>
      <p className="generateDesc">{brief.direction.description}</p>

      <div className="generateRefs">
        {images.slice(0,4).map((img:any)=><div className="tile" key={img.id}><img src={img.thumbnailUrl} alt=""/></div>)}
      </div>

      {!imageUrl && <div className="generateStart">
        <button className="button generateButton" disabled={busy} onClick={()=>generate("initial")}>{busy?"GENERATING...":"GENERATE FIRST IMAGE"}</button>
        <div className="status">1536 × 1024 / low quality / 1 image</div>
      </div>}

      {error && <div className="generationError">{error}</div>}

      {imageUrl && <>
        <div className="generatedImage"><img src={imageUrl} alt="Generated background"/></div>
        {meta && <div className="status generationMeta">{meta.model} / {meta.size} / {meta.quality}</div>}
        <div className="revisionBox">
          <label htmlFor="revision">修正したい内容</label>
          <textarea id="revision" value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="例：夕暮れをもう少し遅い時間に。フェアウェイを広くして、右から柔らかい光が入るように。" />
          <div className="revisionActions">
            <a className="textButton" href={imageUrl} download>Download</a>
            <button className="button" disabled={busy||!instruction.trim()} onClick={()=>generate("revise")}>{busy?"REVISING...":"APPLY REVISION"}</button>
          </div>
        </div>
      </>}

      <details className="briefDetails">
        <summary>Generation brief</summary>
        <div className="briefBox">
          <div><strong>Original request</strong><br/>{brief.request}</div>
          <div><strong>Search cues</strong><br/>{brief.direction.queries.join(" / ")}</div>
        </div>
      </details>
    </section>
  </main>;
}
