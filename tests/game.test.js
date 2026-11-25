const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{},crypto:require('crypto').webcrypto};vm.createContext(ctx);
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

// ---- v3.3 ----
// complice : les M. Blanc encore en jeu marquent quand les undercover gagnent
g=mk(5,1,2);setRoles(g,['civil','civil','undercover','blank','blank']);g.state.players[4].alive=false;g.state.players[0].alive=false;
g.award('undercover',{civil:2,undercover:3,blank:4,accomplice:1});
assert.equal(g.state.players[2].roundPoints,3);assert.equal(g.state.players[3].roundPoints,1);assert.equal(g.state.players[4].roundPoints,0);
assert.equal(g.winners().length,2);
g.award('civil',{civil:2,undercover:3,blank:4,accomplice:1});assert.equal(g.state.players[3].roundPoints,0);

// M. Blanc se dévoile : bon mot = victoire, mauvais mot = éliminé, autre joueur = rien
g=mk(4,1,1);setRoles(g,['civil','civil','undercover','blank']);
assert.equal(g.revealBlank('p0','chien').status,'invalid');assert.equal(g.state.players[0].alive,true);
assert.equal(g.revealBlank('p3','chat').status,'out');assert.equal(g.state.players[3].alive,false);assert.equal(g.state.eliminated.id,'p3');
g=mk(4,1,1);setRoles(g,['civil','civil','undercover','blank']);
assert.equal(g.revealBlank('p3',' Chien ').status,'win');assert.equal(g.state.players[3].alive,true);

// qui commence après une élimination : le suivant en vie dans l'ordre (circulaire)
g=mk(5,1,1);g.state.players[2].alive=false;assert.equal(g.starterAfter('p2'),'p3');
g.state.players[3].alive=false;g.state.players[4].alive=false;assert.equal(g.starterAfter('p2'),'p0');
g=mk(4,1,1);g.state.players[0].alive=false;assert.equal(g.starterAfter('p3'),'p1');

// rôles tirés à la validation : paquet caché, pas de rôle avant le tirage, composition respectée
g=new G();g.start(['A','B','C','D','E'],1,1,pairs,{lazyRoles:true});
assert.ok(g.state.players.every(p=>p.role===null));
g.state.players.forEach(p=>g.drawRole(p.id));g.drawRole('p0');
const cnt=r=>g.state.players.filter(p=>p.role===r).length;
assert.deepEqual([cnt('civil'),cnt('undercover'),cnt('blank')],[3,1,1]);assert.equal(g.state.deck.length,0);

// équité : M. Blanc tombe sur chaque place avec la même fréquence, y compris la 1re
const N=30000,seat=[0,0,0,0];
for(let i=0;i<N;i++){const t=new G();t.start(['A','B','C','D'],1,1,pairs,{lazyRoles:true});t.state.players.forEach(p=>t.drawRole(p.id));seat[t.state.players.findIndex(p=>p.role==='blank')]++}
seat.forEach(c=>assert.ok(Math.abs(c/N-0.25)<0.02,'place biaisée : '+seat));
// 1er tour : jamais M. Blanc
for(let i=0;i<2000;i++){const t=new G();t.start(['A','B','C','D'],1,1,pairs,{lazyRoles:true});t.state.players.forEach(p=>t.drawRole(p.id));t.pickStarter();assert.notEqual(t.state.players.find(p=>p.id===t.state.starterId).role,'blank')}
console.log('OK — attribution, victoire, égalités vides, devinette, scores, manches');
