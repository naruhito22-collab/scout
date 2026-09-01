"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectPage(){
  const { id } = useParams<{id:string}>();
  const router=useRouter();
  const [data,setData]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  async function load(){ const r=await fetch(`/api/projects/${id}`,{cache:"no-store"}); if(r.ok)setData(await r.json()); }
  async function explore(){ setBusy(true); const r=await fetch(`/api/projects/${id}/explore`,{method:"POST"}); const j=await r.json(); if(!r.ok){alert(j.error||"Explore failed");setBusy(false);return;} setData(j);setBusy(false); }
  useEffect(()=>{load()},[id]);
  useEffect(()=>{ if(data && (!data.directions || data.directions.length===0) && !busy) explore(); },[data]);
  return <main className="shell">
    <div className="topbar"><div className="brand">SCOUT</div><button className="edit" onClick={()=>router.push("/")}>Edit input</button></div>
    {!data && <div className="status">Loading project…</div>}
    {busy && <div className="status">Building 8 visual directions…</div>}
    {data?.directions?.map((d:any)=><section className="direction" key={d.id}>
      <div className="directionHead"><span className="number">{String(d.order).padStart(2,"0")}</span><span className="title">{d.title}</span><span className="desc">{d.shortDescription}</span></div>
      <div className="grid">{d.images.map((img:any)=><div className="tile" key={img.id}><img src={img.thumbnailUrl} alt=""/></div>)}</div>
      {d.status==="failed" && <div className="status">This direction failed.</div>}
    </section>)}
  </main>
}
