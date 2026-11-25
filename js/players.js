/* Pseudos récents et groupes — logique pure, sans DOM (testée dans tests/game.test.js). */
const Players=(()=>{
  const key=n=>String(n).toLocaleLowerCase('fr').trim().replace(/\s+/g,' ');
  const clean=n=>String(n||'').trim().replace(/\s+/g,' ');
  return{
    key,clean,
    /* pseudo le plus récent en tête, sans doublon (insensible à la casse), 30 maximum */
    addRecent(recent,name,max=30){
      const c=clean(name);if(!c)return recent;
      return [c,...recent.filter(x=>key(x)!==key(c))].slice(0,max);
    },
    /* suggestions pour la saisie : membres du groupe choisi (sinon récents), moins les pseudos déjà pris, filtrées par la saisie */
    suggest({recent=[],members=null,taken=[],query='',max=8}){
      const base=members&&members.length?members:recent,t=new Set(taken.map(key)),q=key(query);
      return base.filter(n=>!t.has(key(n))&&(!q||key(n).includes(q))).slice(0,max);
    },
    /* enregistre un groupe (même nom = remplacé), 10 maximum, au moins 3 membres */
    saveGroup(groups,name,members,max=10){
      const n=clean(name),m=[...new Map(members.map(x=>[key(x),clean(x)])).values()];
      if(!n||m.length<3)return groups;
      const id=key(n);
      return [{id,name:n,members:m},...groups.filter(g=>g.id!==id)].slice(0,max);
    },
    removeName(recent,name){return recent.filter(x=>key(x)!==key(name))},
    removeGroup(groups,id){return groups.filter(g=>g.id!==id)}
  };
})();
window.Players=Players;
