export type Pair={id:number;title:string;heading:string;body:string;category:string;favorite:boolean;updatedAt:number};

// Validates pasted backup JSON. All-or-nothing: if any record lacks an id,
// title or updatedAt timestamp, the whole batch is rejected with an error.
export const parseBackup=(text:string):{records?:Pair[];error?:string}=>{
  let data:unknown;
  try{data=JSON.parse(text)}catch{return{error:'Backup is not valid JSON — nothing was imported.'}}
  if(!Array.isArray(data))return{error:'Backup must be a JSON array of pairings — nothing was imported.'};
  const records:Pair[]=[];
  for(let i=0;i<data.length;i++){
    const r=data[i] as Record<string,unknown>|null;
    const id=typeof r?.id==='number'&&Number.isFinite(r.id)?r.id:NaN;
    const title=typeof r?.title==='string'?r.title.trim():'';
    const u=r?.updatedAt;
    const updatedAt=typeof u==='number'&&Number.isFinite(u)?u:typeof u==='string'?Date.parse(u):NaN;
    if(!Number.isFinite(id))return{error:`Record ${i+1} is missing an id — nothing was imported.`};
    if(!title)return{error:`Record ${i+1} is missing a title — nothing was imported.`};
    if(!Number.isFinite(updatedAt))return{error:`Record ${i+1} is missing an updatedAt timestamp — nothing was imported.`};
    records.push({id,title,updatedAt,
      heading:typeof r?.heading==='string'?r.heading:'Untitled heading',
      body:typeof r?.body==='string'?r.body:'',
      category:typeof r?.category==='string'?r.category:'Imported',
      favorite:Boolean(r?.favorite)});
  }
  return{records};
};

// Merge rules:
// - same id: the record with the newer updatedAt wins; equal timestamps keep the existing value
// - same title but different id: existing title is untouched, the incoming one is appended with 副本
export const mergePairs=(existing:Pair[],incoming:Pair[])=>{
  const pairs=existing.map(p=>({...p}));
  let added=0,updated=0,skipped=0,renamed=0;
  const fitTitle=(title:string,selfId:number)=>{
    let t=title;
    while(pairs.some(p=>p.id!==selfId&&p.title===t)){t=`${t} 副本`;renamed++}
    return t;
  };
  for(const rec of incoming){
    const i=pairs.findIndex(p=>p.id===rec.id);
    if(i<0){pairs.push({...rec,title:fitTitle(rec.title,rec.id)});added++}
    else if(rec.updatedAt>pairs[i].updatedAt){pairs[i]={...rec,title:fitTitle(rec.title,rec.id)};updated++}
    else skipped++;
  }
  return{pairs,added,updated,skipped,renamed};
};
