/* Moteur de jeu — aucune dépendance au DOM. */
function norm(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('fr').trim().replace(/\s+/g,' ');
}
function pairKey(p){ return p.id || (norm(p.civil)+'|'+norm(p.undercover)); }

class UndercoverGame{
  constructor(){ this.state=null; }

  /* carry : {round, scores:{nom:points}, usedKeys:[...]} pour enchaîner les manches */
  start(names,undercoverCount,blankCount,pairs,options={},carry={}){
    if(names.length<3) throw Error('Il faut au moins 3 joueurs.');
    if(names.length>20) throw Error('20 joueurs maximum.');
    if(new Set(names.map(n=>n.toLocaleLowerCase('fr'))).size!==names.length) throw Error('Les prénoms doivent être uniques.');
    if(undercoverCount<0||blankCount<0||undercoverCount+blankCount>=names.length) throw Error('Répartition des rôles impossible : il faut au moins un civil.');
    if(!pairs.length) throw Error('Aucune paire de mots disponible avec ces filtres.');

    // évite de rejouer une paire déjà vue, tant qu'il en reste
    let used=carry.usedKeys||[];
    let pool=pairs.filter(p=>!used.includes(pairKey(p)));
    if(!pool.length){ pool=pairs; used=[]; }
    const pair=pool[Math.floor(Math.random()*pool.length)];

    const roles=[
      ...Array(names.length-undercoverCount-blankCount).fill('civil'),
      ...Array(undercoverCount).fill('undercover'),
      ...Array(blankCount).fill('blank')
    ];
    for(let i=roles.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [roles[i],roles[j]]=[roles[j],roles[i]]; }

    const scores=carry.scores||{};
    const players=names.map((name,i)=>({
      id:'p'+i, name, role:roles[i],
      word: roles[i]==='civil'?pair.civil : roles[i]==='undercover'?pair.undercover : null,
      alive:true, score:scores[name]||0, roundPoints:0
    }));

    this.state={
      players, pair, round:carry.round||1, usedKeys:[...used,pairKey(pair)],
      votes:{}, voteOrder:[], drawn:null, eliminated:null, guessDone:false,
      options, winner:null, outcome:null, starterId:null,
      needNames:!carry.round   // 1re manche : les joueurs saisissent leur prénom à la distribution
    };
    this.pickStarter();
    return this.state;
  }

  active(){ return this.state.players.filter(p=>p.alive); }
  // Monsieur Blanc ne commence jamais (sauf s'il n'y a aucun autre joueur en vie)
  pickStarter(){
    const a=this.active(), pool=a.filter(p=>p.role!=='blank');
    const from=pool.length?pool:a;
    this.state.starterId=from[Math.floor(Math.random()*from.length)].id;
  }
  winners(){ const w=this.state.winner; return this.state.players.filter(p=>p.role===w); }

  tally(){
    const tally={};
    Object.values(this.state.votes).forEach(id=>{ tally[id]=(tally[id]||0)+1; });
    const counts=Object.values(tally);
    const max=counts.length?Math.max(...counts):0;
    const leaders=Object.keys(tally).filter(id=>tally[id]===max).map(id=>this.state.players.find(p=>p.id===id));
    return {tally,max,leaders};
  }

  eliminate(id){
    const p=this.state.players.find(x=>x.id===id);
    if(!p||!p.alive) throw Error('Joueur déjà éliminé.');
    p.alive=false; this.state.eliminated=p; this.state.guessDone=false;
    return p;
  }

  checkWinner(){
    const alive=this.active();
    const c=alive.filter(p=>p.role==='civil').length;
    const u=alive.filter(p=>p.role==='undercover').length;
    const b=alive.filter(p=>p.role==='blank').length;
    if(u===0&&b===0) return 'civil';
    if(u>0&&u>=c) return 'undercover';
    if(u===0&&b>0&&c<=1) return 'blank';   // Monsieur Blanc seul face à (au plus) un civil
    return null;
  }

  guessBlank(playerId,guess){
    const p=this.state.players.find(x=>x.id===playerId);
    if(!p||p.role!=='blank') return false;
    return norm(guess)!==''&&norm(guess)===norm(this.state.pair.civil);
  }

  award(winner,points){
    this.state.winner=winner;
    for(const p of this.state.players){
      p.roundPoints=(p.role===winner)?Number(points[winner]||0):0;
      p.score+=p.roundPoints;
    }
  }

  nextRound(pairs){
    const s=this.state;
    const names=s.players.map(p=>p.name);
    const u=s.players.filter(p=>p.role==='undercover').length;
    const b=s.players.filter(p=>p.role==='blank').length;
    const scores={}; s.players.forEach(p=>{ scores[p.name]=p.score; });
    return this.start(names,u,b,pairs,s.options,{round:s.round+1,scores,usedKeys:s.usedKeys});
  }
}
window.UndercoverGame=UndercoverGame;
window.norm=norm;
