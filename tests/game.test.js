const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname+'/../js/game.js','utf8'),ctx);
const G=ctx.window.UndercoverGame;
const pairs=[{civil:'Chien',undercover:'Chat'}];
const mk=(n,u,b)=>{const g=new G();g.start(Array.from({length:n},(_,i)=>'J'+i),u,b,pairs);return g};
const setRoles=(g,roles)=>g.state.players.forEach((p,i)=>{p.role=roles[i]});

// attribution
let g=new G();g.start(['A','B','C','D'],1,1,pairs);
assert.equal(g.state.players.filter(p=>p.role==='civil').length,2);
assert.equal(g.state.players.find(p=>p.role==='blank').word,null);
assert.throws(()=>g.start(['A','A','B'],0,0,pairs));
assert.throws(()=>g.start(['A','B','C'],2,1,pairs));
assert.throws(()=>g.start(['A','B'],0,0,pairs));

// devinette + score
const blank=g.state.players.find(p=>p.role==='blank');
assert.equal(g.guessBlank(blank.id,'  CHIEN '),true);
assert.equal(g.guessBlank(blank.id,''),false);
assert.equal(g.guessBlank(blank.id,'chat'),false);
g.award('blank',{civil:2,undercover:3,blank:4});assert.equal(blank.score,4);

// victoire : civil + blanc seuls -> blanc (ancien bug : partie bloquée)
g=mk(3,0,1);setRoles(g,['civil','blank','civil']);g.state.players[2].alive=false;
assert.equal(g.checkWinner(),'blank');
// civils seuls -> civils ; undercover >= civils -> undercover ; sinon on continue
g=mk(4,1,1);setRoles(g,['civil','civil','undercover','blank']);
assert.equal(g.checkWinner(),null);
g.state.players[2].alive=false;assert.equal(g.checkWinner(),null);
g.state.players[3].alive=false;assert.equal(g.checkWinner(),'civil');
g=mk(3,1,0);setRoles(g,['civil','civil','undercover']);g.state.players[0].alive=false;
assert.equal(g.checkWinner(),'undercover');

// décompte vide ne plante pas
g=mk(3,0,0);assert.equal(g.tally().leaders.length,0);

// manches suivantes : scores conservés, manche +1, pas de répétition de paire
const many=[1,2,3].map(i=>({id:'x'+i,civil:'c'+i,undercover:'u'+i}));
g=new G();g.start(['A','B','C','D'],1,0,many);g.state.players[0].score=5;
const seen=[g.state.pair.id];
for(let r=0;r<2;r++){g.nextRound(many);seen.push(g.state.pair.id)}
assert.equal(new Set(seen).size,3);
assert.equal(g.state.round,3);assert.equal(g.state.players[0].score,5);

// M. Blanc ne commence jamais
for(let i=0;i<300;i++){const t=mk(4,1,1);const st=t.state.players.find(p=>p.id===t.state.starterId);assert.notEqual(st.role,'blank')}
// 1re manche : prénoms à saisir ; manches suivantes : non
g=mk(3,0,0);assert.equal(g.state.needNames,true);g.nextRound(pairs);assert.equal(g.state.needNames,false);
// gagnants
g=mk(4,1,1);setRoles(g,['civil','civil','undercover','blank']);g.award('civil',{civil:2,undercover:3,blank:4});
assert.deepEqual(g.winners().map(p=>p.role),['civil','civil']);
console.log('OK — attribution, victoire, égalités vides, devinette, scores, manches');
