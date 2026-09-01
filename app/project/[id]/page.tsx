"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProjectPage(){
  const { id } = useParams<{id:string}>();
  const router=useRouter();
  const [data,setData]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [favorites,setFavorites]=useState<string[]>([]);
  const [selectedDirection,setSelectedDirection]=useState<string>("");
  const [openQueries,setOpenQueries]=useState<string>("");
  const startedRef=useRef(false);

  async function load(){
    const r=await fetch(`/api/projects/${id}`,{cache:"no-store"});
    if(r.ok)setData(await r.json());
  }

  async function explore(){
    setBusy(true);
    setError("");
    try {
      const r=await fetch(`/api/projects/${id}/explore`,{method:"POST"});
      const j=await r.json();
      if(!r.ok){
        setError(j.error||"Explore failed");
        return;
      }
      setData(j);
    } catch(e:any){
      setError(e?.message||"Explore failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleFavorite(imageId:string){
    setFavorites(prev=>prev.includes(imageId)?prev.filter(id=>id!==imageId):[...prev,imageId]);
  }

  function useDirection(direction:any){
    const favoriteImages=direction.images.filter((img:any)=>favorites.includes(img.id));
    const payload={
      projectId:id,
      request:data?.originalRequest,
      direction:{
        id:direction.id,
        title:direction.title,
        description:direction.shortDescription,
        queries:JSON.parse(direction.querySetJson||"[]"),
        images:direction.images,
        favoriteImages
      }
    };
    sessionStorage.setItem("scout-generation-brief",JSON.stringify(payload));
    router.push("/generate");
  }

  useEffect(()=>{load()},[id]);
  useEffect(()=>{
    if(data && (!data.directions || data.directions.length===0) && !startedRef.current){
      startedRef.current=true;
      explore();
    }
  },[data]);

  return <main className="shell">
    <div className="topbar"><div className="brand">SCOUT</div><button className="edit" onClick={()=>router.push("/")}>Edit input</button></div>
    {!data && <div className="status">Loading project…</div>}
    {busy && <div className="status">Building 8 visual directions…</div>}
    {error && <div className="status">{error} <button className="edit" onClick={explore}>Retry</button></div>}
    {data?.directions?.map((d:any)=>{
      const queries=JSON.parse(d.querySetJson||"[]");
      const selected=selectedDirection===d.id;
      return <section className={`direction ${selected?"directionSelected":""}`} key={d.id}>
        <div className="directionHead">
          <button className={`directionPick ${selected?"active":""}`} onClick={()=>setSelectedDirection(d.id)} aria-label="Select direction">{selected?"●":"○"}</button>
          <span className="number">{String(d.order).padStart(2,"0")}</span><span className="title">{d.title}</span><span className="desc">{d.shortDescription}</span>
        </div>
        <div className="grid">{d.images.slice(0,4).map((img:any)=>{
          const fav=favorites.includes(img.id);
          return <div className="tile" key={img.id}>
            <img src={img.thumbnailUrl} alt=""/>
            <button className={`favorite ${fav?"active":""}`} onClick={()=>toggleFavorite(img.id)} aria-label="Favorite image">{fav?"♥":"♡"}</button>
          </div>;
        })}</div>
        <div className="directionActions">
          <button className="textButton" onClick={()=>setOpenQueries(openQueries===d.id?"":d.id)}>Show queries</button>
          <button className="button small" onClick={()=>{setSelectedDirection(d.id);useDirection(d)}}>Generate this direction</button>
        </div>
        {openQueries===d.id && <div className="queryBox">{queries.map((q:string,i:number)=><div key={i}>{q}</div>)}</div>}
        {d.status==="failed" && <div className="status">This direction failed.</div>}
      </section>;
    })}
  </main>
}
