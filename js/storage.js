const Store=(()=>{
  const DB='monsieur-blanc-db',VERSION=1;let dbPromise=null;
  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB,VERSION);
      r.onupgradeneeded=()=>{const d=r.result;['settings','customPairs','session'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s)})};
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>{dbPromise=null;reject(r.error)};
    });
    return dbPromise;
  }
  async function run(store,mode,fn){
    const d=await open();
    return new Promise((res,rej)=>{const r=fn(d.transaction(store,mode).objectStore(store));r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
  }
  return{
    get:(s,k)=>run(s,'readonly',o=>o.get(k)),
    put:(s,k,v)=>run(s,'readwrite',o=>o.put(v,k)),
    del:(s,k)=>run(s,'readwrite',o=>o.delete(k))
  };
})();
