/* Moteur de jeu — aucune dépendance au DOM. */
function norm(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('fr').trim().replace(/\s+/g,' ');
}
function pairKey(p){ return p.id || (norm(p.civil)+'|'+norm(p.undercover)); }

/* Entier uniforme dans [0,n) — aléa cryptographique du navigateur quand il existe. */
function randInt(n){
  const c=(typeof crypto!=='undefined'&&crypto.getRandomValues)?crypto:null;
  if(c&&n>0){
    const max=Math.floor(0x100000000/n)*n, buf=new Uint32Array(1);
    do{ c.getRandomValues(buf); }while(buf[0]>=max);
    return buf[0]%n;
  }
  return Math.floor(Math.random()*n);
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=randInt(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }

class UndercoverGame{
  constructor(){ this.state=null; }

  /* carry : {round, scores:{nom:points}, usedKeys:[...]} pour enchaîner les manches.
     options.lazyRoles : les rôles restent dans un paquet caché et sont tirés un à un (drawRole) à la validation de chaque joueur. */
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
    const pair=pool[randInt(pool.length)];

    const civils=names.length-undercoverCount-blankCount;
    const deck=shuffle([
      ...Array(civils).fill('civil'),
      ...Array(undercoverCount).fill('undercover'),
      ...Array(blankCount).fill('blank')
    ]);

    const scores=carry.scores||{};
    const players=names.map((name,i)=>({
      id:'p'+i, name, role:null, word:null, alive:true,
      score:scores[name]||0, roundPoints:0, accomplice:false
    }));

    this.state={
      players, deck, pair, round:carry.round||1, usedKeys:[...used,pairKey(pair)],
      composition:{civil:civils,undercover:undercoverCount,blank:blankCount},
      votes:{}, voteOrder:[], drawn:null, eliminated:null, guessDone:false,
      options, winner:null, outcome:null, starterId:null,
      needNames:!carry.round   // 1re manche : les joueurs saisissent leur prénom à la distribution
    };
    if(!options.lazyRoles){
      this.state.players.forEach(p=>this.drawRole(p.id));
      this.pickStarter();
    }
    return this.state;
  }

  /* Tire un rôle au hasard dans le paquet caché pour ce joueur (sans effet s'il en a déjà un). */
  drawRole(id){
    const s=this.state,p=s.players.find(x=>x.id===id);
    if(!p) throw Error('Joueur inconnu.');
    if(p.role) return p;
    const role=s.deck.splice(randInt(s.deck.length),1)[0];
    p.role=role;
    p.word=role==='civil'?s.pair.civil:role==='undercover'?s.pair.undercover:null;
    return p;
  }

  active(){ return this.state.players.filter(p=>p.alive); }

  /* Premier tour d'une manche : tirage au sort hors Monsieur Blanc. */
  pickStarter(){
    const a=this.active(), pool=a.filter(p=>p.role!=='blank');
    const from=pool.length?pool:a;
    this.state.starterId=from[randInt(from.length)].id;
    return this.state.starterId;
  }
  /* Tours suivants : le premier joueur encore en jeu qui suit l'éliminé, dans l'ordre de saisie. */
  starterAfter(id){
    const ps=this.state.players,i=ps.findIndex(p=>p.id===id),n=ps.length;
    for(let k=1;k<=n;k++){ const q=ps[(i+k)%n]; if(q.alive) return q.id; }
    return null;
  }

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

  /* Monsieur Blanc se dévoile à tout moment : bon mot → il gagne ; mauvais mot → il est éliminé.
     Un joueur qui n'est pas Monsieur Blanc (ou qui est déjà éliminé) : {status:'invalid'}, rien ne change. */
  revealBlank(playerId,guess){
    const p=this.state.players.find(x=>x.id===playerId);
    if(!p||!p.alive||p.role!=='blank') return {status:'invalid'};
    if(this.guessBlank(playerId,guess)) return {status:'win',player:p};
    this.eliminate(playerId);
    this.state.guessDone=true;   // il a déjà tenté sa chance
    this.state.votes={};          // un éventuel vote en cours est annulé
    return {status:'out',player:p};
  }

  /* points : {civil, undercover, blank, accomplice}
     accomplice : points des Monsieur Blanc encore en jeu quand les undercover gagnent. */
  award(winner,points){
    this.state.winner=winner;
    for(const p of this.state.players){
      let pts=0; p.accomplice=false;
      if(p.role===winner) pts=Number(points[winner]||0);
      else if(winner==='undercover'&&p.role==='blank'&&p.alive){ pts=Number(points.accomplice||0); p.accomplice=true; }
      p.roundPoints=pts; p.score+=pts;
    }
  }
  winners(){ const w=this.state.winner; return this.state.players.filter(p=>p.role===w||p.accomplice); }

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
