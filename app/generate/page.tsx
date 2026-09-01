"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function GeneratePage(){
  const router=useRouter();
  const [brief,setBrief]=useState<any>(null);

  useEffect(()=>{
    const raw=sessionStorage.getItem("scout-generation-brief");
    if(raw){
      try{setBrief(JSON.parse(raw));}catch{}
    }
  },[]);

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
      <div className="briefBox">
        <div><strong>Original request</strong><br/>{brief.request}</div>
        <div><strong>Search cues</strong><br/>{brief.direction.queries.join(" / ")}</div>
      </div>
      <div className="generatePlaceholder">
        <strong>AI image generation</strong>
        <p>次の段階で、ここから背景画像を生成し、会話で修正していきます。</p>
      </div>
    </section>
  </main>;
}
