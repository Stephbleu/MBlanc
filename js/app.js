const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const game=new UndercoverGame();

let pairs=[...window.DEFAULT_WORD_PAIRS], custom=[];
let settings={points:{civil:2,undercover:3,blank:4,accomplice:1},animations:true,hold:true,vibration:true};
let people={recent:[],groups:[]};
let dealHold,recallHold,dealSeen=false;
let randStats={seats:{},blank:{}};
const setup={players:4,undercover:1,blank:1,group:null,difficulty:'all',categories:new Set()};
const ui={screen:'home',dealIndex:0,voterIndex:0,revoteTargets:null};
let toastTimer=null, installPrompt=null, pendingSession=null, reloadWhenHome=false;
const GAME_SCREENS=new Set(['dealScreen','playScreen','voteScreen','resultScreen','revealScreen','victoryScreen','scoreScreen']);

/* ---------- utilitaires ---------- */
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show(id){
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $('#'+id).classList.add('active');
  if(GAME_SCREENS.has(id)){ui.screen=id;saveSession()}
  window.scrollTo({top:0,behavior:'auto'});
  if(id==='homeScreen'&&reloadWhenHome)location.reload();
}
function toast(msg){
  const t=$('#toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}
function saveSession(){
  if(!game.state)return;
  Store.put('session','current',{state:game.state,ui:{...ui}}).catch(()=>{});
}
function clearSession(){pendingSession=null;Store.del('session','current').catch(()=>{});updateHome()}
function allPairs(){return [...pairs,...custom]}
function activePairs(){
  return allPairs().filter(p=>(setup.categories.size===0||setup.categories.has(p.category))&&(setup.difficulty==='all'||p.difficulty===setup.difficulty));
}
const roleLabel=r=>r==='civil'?'CIVIL':r==='undercover'?'UNDERCOVER':'MONSIEUR BLANC';
const roleShort=r=>r==='civil'?'Civil':r==='undercover'?'Undercover':'M. Blanc';
const roleImage=r=>r==='civil'?'images/role-civil.webp':r==='undercover'?'images/role-undercover.webp':'images/role-blank.webp';

/* ---------- accueil ---------- */
function updateHome(){
  const has=!!pendingSession;
  $('#resumeBtn').classList.toggle('hidden',!has);
  $('#newGameBtn').classList.toggle('secondary',has);
  $('#newGameBtn').classList.toggle('primary',!has);
  $('#newGameBtn').firstChild.textContent=has?'NOUVELLE PARTIE ':'JOUER ';
}
function resumeGame(){
  const s=pendingSession;if(!s)return;
  game.state=s.state;Object.assign(ui,s.ui);
  switch(ui.screen){
    case 'dealScreen':showDeal();show('dealScreen');break;
    case 'voteScreen':renderVote();break;
    case 'resultScreen':showResults();break;
    case 'revealScreen':renderEliminated();show('revealScreen');break;
    case 'victoryScreen':renderVictory();show('victoryScreen');break;
    case 'scoreScreen':renderOutcome();show('scoreScreen');break;
    default:renderPlay();show('playScreen');
  }
}

/* ---------- préparation ---------- */
function renderCategories(){
  const cats=[...new Set(allPairs().map(p=>p.category))];
  $('#categoryChoices').innerHTML=cats.map(c=>{
    const on=setup.categories.has(c);
    return `<button class="chip ${on?'selected':''}" data-category="${esc(c)}" aria-pressed="${on}">${esc(c)}</button>`;
  }).join('');
}
function updateSetup(){
  const n=setup.players;
  $('#playerNum').textContent=n;
  $('#undercoverVal').textContent=setup.undercover;
  $('#blankVal').textContent=setup.blank;
  const civils=n-setup.undercover-setup.blank;
  const pill=$('#civilCount');
  pill.textContent=`${Math.max(0,civils)} civil${civils>1?'s':''}`;
  pill.classList.toggle('bad',civils<1);
  const k=activePairs().length;
  $('#pairCount').textContent=`${k} paire${k>1?'s':''} disponible${k>1?'s':''}`;
}
function changeCounter(key,delta){
  const other=key==='undercover'?setup.blank:setup.undercover;
  const limit=Math.min(8,setup.players-1-other);
  setup[key]=Math.max(0,Math.min(limit,setup[key]+delta));
  updateSetup();
}
function changePlayers(delta){
  setup.players=Math.max(3,Math.min(20,setup.players+delta));
  // garde au moins un civil
  while(setup.undercover+setup.blank>=setup.players){ if(setup.undercover>=setup.blank&&setup.undercover>0)setup.undercover--;else setup.blank--; }
  updateSetup();
}
function syncRuleToggles(){
  const guess=$('#blankGuess').checked;
  if(guess)$('#revealRole').checked=true;
  $('#revealRole').disabled=guess;
}
function startGame(){
  $('#setupError').textContent='';
  const names=Array.from({length:setup.players},(_,i)=>`Joueur ${i+1}`);
  try{
    game.start(names,setup.undercover,setup.blank,activePairs(),{
      reveal:$('#revealRole').checked,blankGuess:$('#blankGuess').checked,tieRevote:$('#tieRevote').checked,lazyRoles:true
    });
    game.state.groupId=setup.group;
    ui.dealIndex=0;ui.voterIndex=0;ui.revoteTargets=null;pendingSession=null;
    show('dealScreen');showDeal();
  }catch(e){$('#setupError').textContent=e.message}
}

/* ---------- distribution ---------- */
function showDeal(){
  const s=game.state,p=s.players[ui.dealIndex],n=s.players.length;
  const naming=s.needNames&&!p.role;      // pseudo à saisir (1re manche) tant que le rôle n'est pas tiré
  dealHold.hide();dealSeen=false;
  $('#dealWho').textContent=naming?`JOUEUR ${ui.dealIndex+1} SUR ${n}`:"C'EST AU TOUR DE";
  $('#dealPlayer').textContent=p.name;
  $('#dealPlayer').classList.toggle('hidden',naming);
  $('#nameInput').classList.toggle('hidden',!naming);
  $('#nameInput').value='';$('#nameError').textContent='';
  $('#dealIntro').innerHTML=naming?'Entrez votre prénom, puis maintenez le doigt sur la carte pour voir votre mot.<br>Personne d\'autre ne regarde.':'Passez le téléphone au joueur indiqué.<br>Personne d\'autre ne regarde.';
  $('#revealBtn').classList.toggle('hidden',!naming);
  $('#secretReveal').classList.toggle('hidden',naming);
  $('#hideSecretBtn').classList.add('hidden');
  $('#hideSecretBtn').textContent=ui.dealIndex===n-1?"J'ai mémorisé — commencer la discussion":"J'ai mémorisé — joueur suivant";
  renderSuggest();
  $('#dealProgress').style.setProperty('--progress',`${ui.dealIndex/n*100}%`);
}
/* Civils et undercover ne voient que leur mot : ils ignorent leur rôle. Seul Monsieur Blanc sait qu'il l'est (il n'a pas de mot). */
function fillSecret(p,ids){
  const blank=p.role==='blank',img=$(ids.img);
  img.classList.toggle('hidden',!blank);
  if(blank){img.src=roleImage('blank');img.alt='Illustration de Monsieur Blanc'}
  $(ids.role).textContent=blank?'MONSIEUR BLANC':'VOTRE MOT';
  $(ids.word).textContent=blank?'AUCUN MOT':p.word;
}
/* 1re manche : validation du pseudo → le rôle est tiré maintenant dans le paquet caché */
function validateName(){
  const s=game.state,p=s.players[ui.dealIndex];
  if(!s.needNames||p.role)return;
  const name=Players.clean($('#nameInput').value);
  const taken=s.players.slice(0,ui.dealIndex).some(q=>Players.key(q.name)===Players.key(name));
  if(!name){$('#nameError').textContent='Saisissez votre prénom.';return}
  if(taken){$('#nameError').textContent='Ce prénom est déjà pris.';return}
  p.name=name;people.recent=Players.addRecent(people.recent,name);persistPeople();
  game.drawRole(p.id);recordDraw(ui.dealIndex,p.role==='blank');
  $('#dealPlayer').textContent=name;$('#dealPlayer').classList.remove('hidden');
  $('#nameInput').classList.add('hidden');$('#nameError').textContent='';
  $('#nameSuggest').classList.add('hidden');$('#revealBtn').classList.add('hidden');
  $('#dealWho').textContent='BIENVENUE';
  $('#dealIntro').innerHTML='Maintenez le doigt sur la carte pour voir votre mot.<br>Personne d\'autre ne regarde.';
  $('#secretReveal').classList.remove('hidden');
  saveSession();
}
/* carte tenue pressée : le mot est visible */
function dealShow(){
  const s=game.state,p=s.players[ui.dealIndex];
  if(!p.role){game.drawRole(p.id);recordDraw(ui.dealIndex,p.role==='blank');saveSession()}   // manches suivantes
  fillSecret(p,{img:'#secretRoleImage',role:'#secretRole',word:'#secretWord'});
  $('#secretHint').textContent=p.role==='blank'
    ?'Improvisez : vous ne connaissez pas le mot des autres.'
    :'Mémorisez votre mot. Votre rôle vous sera révélé plus tard.';
  if(!dealSeen){dealSeen=true;$('#hideSecretBtn').classList.remove('hidden');vibrate(25)}
}
function hideSecret(){
  dealHold.hide();
  ui.dealIndex++;
  if(ui.dealIndex>=game.state.players.length){game.state.needNames=false;game.pickStarter();show('playScreen');renderPlay()}
  else{saveSession();showDeal()}
}

/* ---------- carte à maintenir (appui long) ---------- */
const holdHiders=[];
function bindHold(card,onShow){
  let on=false;
  const hide=()=>{if(!on)return;on=false;card.classList.remove('show');card.setAttribute('aria-pressed','false')};
  const show=()=>{if(on)return;on=true;onShow();card.classList.add('show');card.setAttribute('aria-pressed','true')};
  holdHiders.push(hide);
  card.addEventListener('pointerdown',e=>{if(!settings.hold)return;e.preventDefault();try{card.setPointerCapture(e.pointerId)}catch{}show()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>card.addEventListener(t,()=>{if(settings.hold)hide()}));
  card.addEventListener('click',()=>{if(!settings.hold){on?hide():show()}});            // mode « toucher »
  card.addEventListener('keydown',e=>{
    if(e.key!==' '&&e.key!=='Enter')return;e.preventDefault();if(e.repeat)return;
    if(settings.hold)show();else{on?hide():show()}
  });
  card.addEventListener('keyup',e=>{if((e.key===' '||e.key==='Enter')&&settings.hold)hide()});
  card.addEventListener('contextmenu',e=>e.preventDefault());
  return{show,hide};
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)holdHiders.forEach(h=>h())});
window.addEventListener('blur',()=>holdHiders.forEach(h=>h()));
function applyHoldMode(){
  $$('.holdLabel').forEach(e=>{e.textContent=settings.hold?'Maintenir pour voir mon mot':'Toucher pour voir mon mot';e.nextElementSibling.textContent=settings.hold?'Relâchez pour le masquer':'Touchez de nouveau pour le masquer'});
}

/* ---------- retours : vibrations, animations, confettis ---------- */
function vibrate(p){if(settings.vibration&&navigator.vibrate){try{navigator.vibrate(p)}catch{}}}
function animOK(){return settings.animations&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)}
function replay(el){el.classList.remove('pop');void el.offsetWidth;if(animOK())el.classList.add('pop')}
function launchConfetti(){
  if(!animOK())return;
  const cv=$('#confetti'),ctx=cv.getContext('2d'),dpr=window.devicePixelRatio||1;
  cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;
  const cols=['#e34d59','#24252a','#f1b7bd','#a3a5ac'];
  const ps=Array.from({length:90},()=>({x:Math.random()*cv.width,y:-Math.random()*cv.height*.4,w:(6+Math.random()*6)*dpr,h:(10+Math.random()*8)*dpr,vx:(Math.random()-.5)*2*dpr,vy:(2+Math.random()*3)*dpr,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[Math.floor(Math.random()*cols.length)]}));
  const t0=performance.now();
  (function frame(t){
    const k=t-t0;ctx.clearRect(0,0,cv.width,cv.height);
    ps.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.05*dpr;p.r+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.globalAlpha=Math.min(1,Math.max(0,1-(k-1400)/700));ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore()});
    if(k<2100)requestAnimationFrame(frame);else ctx.clearRect(0,0,cv.width,cv.height);
  })(t0);
}

/* ---------- pseudos récents et groupes ---------- */
function persistPeople(){Store.put('settings','people',people).catch(()=>{})}
function renderSuggest(){
  const s=game.state,box=$('#nameSuggest');
  const p=s&&s.players[ui.dealIndex];
  if(!s||!s.needNames||!p||p.role){box.classList.add('hidden');return}
  const g=s.groupId&&people.groups.find(x=>x.id===s.groupId);
  const list=Players.suggest({recent:people.recent,members:g?g.members:null,taken:s.players.slice(0,ui.dealIndex).map(q=>q.name),query:$('#nameInput').value,max:8});
  box.innerHTML=list.map(n=>`<button class="chip" data-name="${esc(n)}">${esc(n)}</button>`).join('');
  box.classList.toggle('hidden',!list.length);
}
function renderGroups(){
  const box=$('#groupChoices');
  box.classList.toggle('hidden',!people.groups.length);
  box.innerHTML=people.groups.map(g=>`<button class="chip group ${setup.group===g.id?'selected':''}" data-group="${esc(g.id)}" aria-pressed="${setup.group===g.id}">${esc(g.name)} · ${g.members.length}</button>`).join('');
}
function selectGroup(id){
  if(setup.group===id){setup.group=null}
  else{setup.group=id;const g=people.groups.find(x=>x.id===id);if(g){setup.players=Math.max(3,Math.min(20,g.members.length));changePlayers(0)}}
  renderGroups();updateSetup();
}
function renderPlayersManage(){
  const g=people.groups.map(x=>`<div class="manage-row"><span>${esc(x.name)} · ${x.members.length} joueurs</span><button data-del-group="${esc(x.id)}">Supprimer</button></div>`).join('');
  const r=people.recent.map(n=>`<button class="chip-del" data-del-name="${esc(n)}">${esc(n)}<span>×</span></button>`).join('');
  $('#playersManage').innerHTML=`<div class="manage-title">Groupes</div>${g||'<p class="muted">Aucun groupe enregistré. Vous pourrez en créer un depuis le classement final.</p>'}
    <div class="manage-title">Pseudos récents</div>${r?`<div class="chips">${r}</div>`:'<p class="muted">Aucun pseudo enregistré.</p>'}
    ${(g||r)?'<button class="text-btn full" id="clearPeopleBtn">Tout effacer</button>':''}`;
}
function saveGroup(){
  const name=$('#groupName').value;
  if(!Players.clean(name)){toast('Donnez un nom au groupe.');return}
  people.groups=Players.saveGroup(people.groups,name,game.state.players.map(p=>p.name));
  persistPeople();renderGroups();renderPlayersManage();
  $('#groupForm').classList.add('hidden');$('#groupName').value='';toast('Groupe enregistré.');
}

/* ---------- discussion ---------- */
function plural(n,one,many){return `${n} ${n>1?many:one}`}
function compositionText(){
  const s=game.state,src=s.options.reveal
    ?{undercover:game.active().filter(p=>p.role==='undercover').length,blank:game.active().filter(p=>p.role==='blank').length}
    :s.composition;
  const parts=[];
  if(src.undercover)parts.push(plural(src.undercover,'undercover','undercover'));
  if(src.blank)parts.push(plural(src.blank,'Monsieur Blanc','Messieurs Blanc'));
  return parts.length?`Parmi vous : ${parts.join(' et ')}.`:'Plus aucun infiltré.';
}
function updateBlankButtons(){
  const s=game.state,on=!!(s&&s.options.blankGuess&&game.active().some(p=>p.role==='blank'));
  ['#blankOpenBtn','#blankOpenVoteBtn'].forEach(id=>$(id).classList.toggle('hidden',!on));
}
function renderPlay(){
  const s=game.state;
  $('#roundNo').textContent=s.round;
  const starter=s.players.find(p=>p.id===s.starterId);
  $('#starterName').textContent=starter?starter.name:'—';
  $('#compositionLine').textContent=compositionText();
  $('#playersGrid').innerHTML=s.players.map(p=>`<div class="player-tile ${p.alive?'':'out'}"><i></i>${esc(p.name)}</div>`).join('');
  updateBlankButtons();
}

/* ---------- vote ---------- */
function beginVoting(targets=null){
  const s=game.state;
  ui.revoteTargets=targets;s.votes={};s.drawn=null;
  s.voteOrder=game.active().map(p=>p.id);
  ui.voterIndex=0;
  show('voteScreen');renderVote();
}
function renderVote(){
  const order=game.state.voteOrder;
  if(ui.voterIndex>=order.length){showResults();return}
  show('voteScreen');updateBlankButtons();
  const voter=game.state.players.find(p=>p.id===order[ui.voterIndex]);
  $('#voteStep').textContent=`${ui.revoteTargets?'REVOTE · ':''}VOTE ${ui.voterIndex+1} / ${order.length}`;
  $('#voterName').textContent=voter.name;
  const targets=game.active().filter(p=>p.id!==voter.id&&(!ui.revoteTargets||ui.revoteTargets.includes(p.id)));
  $('#voteTargets').innerHTML=targets.map(p=>`<button class="vote-target" data-target="${p.id}">${esc(p.name)}<span>→</span></button>`).join('');
  $('#voteProgress').style.setProperty('--progress',`${ui.voterIndex/order.length*100}%`);
}
function cast(target){
  const s=game.state,voter=s.voteOrder[ui.voterIndex];
  if(!voter)return;
  s.votes[voter]=target;ui.voterIndex++;saveSession();renderVote();
}
function showResults(){
  const s=game.state,{tally,max,leaders}=game.tally();
  const nameOf=id=>s.players.find(x=>x.id===id).name;
  $('#voteResults').innerHTML=Object.entries(tally).sort((a,b)=>b[1]-a[1]).map(([id,n])=>
    `<div class="result-row"><div class="result-line"><span>${esc(nameOf(id))}</span><b>${n} voix</b></div><div class="bar"><i style="width:${n/max*100}%"></i></div></div>`).join('');

  let target=leaders[0]?.id||'',note='',needRevote=false;
  if(leaders.length>1){
    const names=leaders.map(l=>l.name).join(', ');
    if(!ui.revoteTargets&&s.options.tieRevote){
      needRevote=true;note=`Égalité entre ${names}. Un nouveau vote les départage.`;
    }else{
      if(!s.drawn)s.drawn=leaders[Math.floor(Math.random()*leaders.length)].id;
      target=s.drawn;
      note=`${ui.revoteTargets?'Nouvelle égalité':'Égalité'} entre ${names} : le sort désigne ${nameOf(target)}.`;
    }
  }
  $('#resultNote').textContent=note;
  $('#tieActions').classList.toggle('hidden',!needRevote);
  $('#eliminationActions').classList.toggle('hidden',needRevote);
  $('#eliminateBtn').dataset.id=target;
  $('#revoteBtn').dataset.ids=leaders.map(l=>l.id).join(',');
  show('resultScreen');
}

/* ---------- élimination ---------- */
function eliminate(){
  const id=$('#eliminateBtn').dataset.id;if(!id)return;
  game.eliminate(id);renderEliminated();show('revealScreen');vibrate(200);
}
function renderEliminated(){
  const s=game.state,p=s.eliminated,o=s.options;
  $('#eliminatedName').textContent=p.name;
  $('#eliminatedRole').textContent=o.reveal?roleLabel(p.role):'RÔLE NON RÉVÉLÉ';
  $('#eliminatedRole').classList.toggle('muted-pill',!o.reveal);
  $('#eliminatedRoleImage').src=roleImage(p.role);
  $('#eliminatedRoleImage').classList.toggle('hidden',!o.reveal);
  const guess=p.role==='blank'&&o.blankGuess&&!s.guessDone;
  $('#guessPanel').classList.toggle('hidden',!guess);
  $('#continueBtn').classList.toggle('hidden',guess);
  $('#guessInput').value='';
  replay($('#eliminatedRoleImage'));replay($('#eliminatedRole'));
}
function submitGuess(){
  const s=game.state,p=s.eliminated;
  if(game.guessBlank(p.id,$('#guessInput').value)){
    finishRound('blank','Monsieur Blanc a trouvé le mot des civils !');
  }else{
    s.guessDone=true;saveSession();renderEliminated();toast('Mauvaise réponse. La partie continue.');
  }
}
function continueAfterElimination(){
  const w=game.checkWinner();
  if(w){
    finishRound(w,w==='civil'?'Tous les infiltrés ont été éliminés.':w==='undercover'?'Les undercover ont pris le dessus.':'Monsieur Blanc est resté dans la partie jusqu\'au bout.');
    return;
  }
  game.state.starterId=game.starterAfter(game.state.eliminated.id);   // celui qui suit l'éliminé
  renderPlay();show('playScreen');
}

/* ---------- fin de manche ---------- */
function finishRound(winner,detail){
  game.award(winner,settings.points);
  game.state.outcome={winner,detail};
  renderVictory();show('victoryScreen');
  vibrate([60,50,60,50,140]);launchConfetti();
}
function renderVictory(){
  const s=game.state,w=s.outcome?.winner||s.winner,detail=s.outcome?.detail||'';
  const winners=s.players.filter(p=>p.role===w||p.accomplice),others=s.players.filter(p=>!(p.role===w||p.accomplice));
  const many=winners.filter(p=>p.role===w).length>1;
  $('#victoryTitle').textContent=w==='civil'?(many?'Les civils gagnent':'Le civil gagne'):w==='undercover'?(many?'Les undercover gagnent':"L'undercover gagne"):(many?'Les Monsieur Blanc gagnent':'Monsieur Blanc gagne');
  $('#victoryDetail').textContent=detail;
  $('#victoryImage').src=roleImage(w);$('#victoryImage').alt='Illustration du rôle '+roleLabel(w);
  const chip=p=>p.accomplice
    ?`<span class="role-chip blank">M. BLANC · COMPLICE${p.roundPoints?' +'+p.roundPoints:''}</span>`
    :`<span class="role-chip ${p.role}">${roleLabel(p.role)}</span>`;
  $('#victoryWinners').innerHTML=winners.map(p=>`<div class="winner"><b>${esc(p.name)}</b>${chip(p)}</div>`).join('');
  $('#victoryOthers').innerHTML=others.length?`<div class="tiny muted">LES AUTRES</div>`+others.map(p=>`<div class="other"><span>${esc(p.name)}</span>${chip(p)}</div>`).join(''):'';
  const hasU=s.players.some(p=>p.role==='undercover');
  $('#victoryWords').innerHTML=`Civils : <b>${esc(s.pair.civil)}</b>${hasU?` · Undercover : <b>${esc(s.pair.undercover)}</b>`:''}`;
}
function renderOutcome(){
  const s=game.state,o=s.outcome||{winner:s.winner,detail:''};
  $('#roundOutcome').textContent=o.winner==='civil'?'Victoire des civils':o.winner==='undercover'?'Victoire des undercover':'Victoire de Monsieur Blanc';
  $('#outcomeDetail').textContent=o.detail;
  const hasU=s.players.some(p=>p.role==='undercover');
  $('#wordsLine').innerHTML=`Civils : <b>${esc(s.pair.civil)}</b>${hasU?` · Undercover : <b>${esc(s.pair.undercover)}</b>`:''}`;
  $('#scoreRows').innerHTML=s.players.slice().sort((a,b)=>b.score-a.score).map(p=>
    `<tr><td>${esc(p.name)}</td><td>${roleShort(p.role)}</td><td>${p.roundPoints>0?'+'+p.roundPoints:'0'}</td><td>${p.score}</td></tr>`).join('');
}
function nextRound(){
  try{
    game.nextRound(activePairs());
    ui.dealIndex=0;ui.voterIndex=0;ui.revoteTargets=null;
    show('dealScreen');showDeal();
  }catch(e){toast(e.message)}
}
function endGame(){
  const s=game.state;
  clearSession();   // la partie est terminée : plus de bouton « Reprendre »
  $('#groupForm').classList.add('hidden');
  $('#finalSummary').textContent=`${s.round} manche${s.round>1?'s':''} jouée${s.round>1?'s':''}.`;
  $('#finalRanking').innerHTML=s.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>
    `<div class="rank-item ${i===0?'first':''}"><div class="rank-num">${i===0?'♛':i+1}</div><b>${esc(p.name)}</b><div class="rank-score">${p.score}</div></div>`).join('');
  show('finalScreen');
}
function resetAndNew(){
  if(!confirm('Nouvelle partie : les scores de la partie actuelle seront remis à zéro. Continuer ?'))return;
  game.state=null;clearSession();
  setup.players=4;setup.undercover=1;setup.blank=1;setup.group=null;renderGroups();
  $('#setupError').textContent='';updateSetup();show('setupScreen');
}
function leaveGame(){saveSession();Store.get('session','current').then(s=>{pendingSession=s||null;updateHome()}).catch(()=>{});show('homeScreen')}

/* ---------- bibliothèque ---------- */
function stats(){
  const all=allPairs(),words=new Set(),seen=new Set();let dups=0;
  all.forEach(p=>{for(const w of [norm(p.civil),norm(p.undercover)]){words.add(w);if(seen.has(w))dups++;seen.add(w)}});
  $('#pairTotal').textContent=all.length;$('#wordTotal').textContent=words.size;$('#duplicateTotal').textContent=dups;
  $('#libraryStatus').textContent=`Intégrées : ${pairs.length} paires. Personnelles : ${custom.length}. Un « doublon » est un mot qui apparaît dans plusieurs paires.`;
  $('#customPairs').innerHTML=custom.map((p,i)=>`<div class="custom-pair"><span>${esc(p.civil)} / ${esc(p.undercover)}</span><button data-delete-pair="${i}">Supprimer</button></div>`).join('');
}
function saveCustom(){return Store.put('customPairs','all',custom).catch(()=>toast('Enregistrement impossible.'))}
function addPair(){
  const civil=$('#wordCivil').value.trim(),undercover=$('#wordUndercover').value.trim(),category=$('#wordCategory').value.trim()||'Personnalisé';
  if(!civil||!undercover||norm(civil)===norm(undercover)){toast('Saisissez deux mots différents.');return}
  custom.push({id:'custom-'+Date.now(),civil,undercover,category,difficulty:'intermediaire'});
  saveCustom();$('#wordCivil').value='';$('#wordUndercover').value='';
  stats();renderCategories();updateSetup();toast('Paire ajoutée.');
}
function exportWords(){
  if(!custom.length){toast('Aucune paire personnelle à exporter.');return}
  const blob=new Blob([JSON.stringify(custom,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='monsieur-blanc-mes-paires.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function parseCSV(txt){
  txt=txt.replace(/^﻿/,'');
  const first=txt.split(/\r?\n/)[0]||'',delim=first.includes(';')&&!first.includes(',')?';':',';
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<txt.length;i++){
    const c=txt[i];
    if(q){if(c==='"'){if(txt[i+1]==='"'){cell+='"';i++}else q=false}else cell+=c}
    else if(c==='"')q=true;
    else if(c===delim){row.push(cell);cell=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&txt[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell=''}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows.filter(r=>r.some(x=>x.trim()));
}
async function importWords(file){
  const txt=await file.text();let rows;
  if(file.name.toLowerCase().endsWith('.csv')){
    let lines=parseCSV(txt);
    if(lines.length&&/civil/i.test(lines[0][0]||''))lines=lines.slice(1);
    rows=lines.map(c=>({civil:c[0]?.trim(),undercover:c[1]?.trim(),category:c[2]?.trim(),difficulty:c[3]?.trim()}));
  }else{
    try{rows=JSON.parse(txt)}catch{throw Error('Fichier JSON illisible.')}
  }
  if(!Array.isArray(rows))throw Error('Format invalide : une liste de paires est attendue.');
  const known=new Set(allPairs().map(p=>[norm(p.civil),norm(p.undercover)].sort().join('|')));
  const levels=['facile','intermediaire','difficile'];let added=0,skipped=0;
  rows.forEach((p,i)=>{
    const civil=String(p?.civil??'').trim(),undercover=String(p?.undercover??'').trim();
    const key=[norm(civil),norm(undercover)].sort().join('|');
    if(!civil||!undercover||norm(civil)===norm(undercover)||known.has(key)){skipped++;return}
    known.add(key);
    const d=norm(p.difficulty);
    custom.push({id:'import-'+Date.now()+'-'+i,civil,undercover,category:String(p.category||'').trim()||'Importé',difficulty:levels.includes(d)?d:'intermediaire'});
    added++;
  });
  await saveCustom();stats();renderCategories();updateSetup();
  toast(`${added} paire(s) importée(s)${skipped?`, ${skipped} ignorée(s)`:''}.`);
}

/* ---------- réglages ---------- */
function applySettings(){document.body.classList.toggle('no-anim',!settings.animations)}
function fillSettings(){
  $('#pointsAccomplice').value=settings.points.accomplice;$('#pointsCivil').value=settings.points.civil;$('#pointsUndercover').value=settings.points.undercover;$('#pointsBlank').value=settings.points.blank;
  $('#animationsEnabled').checked=settings.animations;$('#holdEnabled').checked=settings.hold;$('#vibrationEnabled').checked=settings.vibration;
}
async function saveSettings(){
  const pts=v=>Math.max(0,Math.min(20,Math.round(Number(v)||0)));
  settings={points:{civil:pts($('#pointsCivil').value),undercover:pts($('#pointsUndercover').value),blank:pts($('#pointsBlank').value),accomplice:pts($('#pointsAccomplice').value)},animations:$('#animationsEnabled').checked,hold:$('#holdEnabled').checked,vibration:$('#vibrationEnabled').checked};
  fillSettings();applySettings();applyHoldMode();
  try{await Store.put('settings','main',settings);toast('Réglages enregistrés.')}catch{toast('Enregistrement impossible.')}
}

/* ---------- rappel du rôle ---------- */
function openRecall(){
  if(!game.state){toast('Aucune partie en cours.');return}
  $('#recallPlayer').innerHTML='<option value="">Choisir son prénom</option>'+game.active().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#recallChoose').classList.remove('hidden');$('#recallSecret').classList.add('hidden');$('#roleRecall').classList.remove('hidden');
}
function showRecallSecret(){
  const id=$('#recallPlayer').value;if(!id){toast('Choisissez votre prénom.');return}
  const p=game.state.players.find(x=>x.id===id);if(!p)return;
  $('#recallChoose').classList.add('hidden');$('#recallSecret').classList.remove('hidden');
}
function recallShow(){
  const p=game.state.players.find(x=>x.id===$('#recallPlayer').value);if(!p)return;
  fillSecret(p,{img:'#recallRoleImage',role:'#recallRole',word:'#recallWord'});
}
function closeRecall(){
  if(recallHold)recallHold.hide();
  $('#roleRecall').classList.add('hidden');
  $('#recallSecret').classList.add('hidden');$('#recallChoose').classList.remove('hidden');
}

/* ---------- Monsieur Blanc se dévoile ---------- */
function openBlankModal(){
  if(!game.state)return;
  $('#blankPlayer').innerHTML='<option value="">Choisir son prénom</option>'+game.active().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#blankWord').value='';$('#blankError').textContent='';$('#blankModal').classList.remove('hidden');
}
function closeBlankModal(){$('#blankModal').classList.add('hidden')}
function submitBlank(){
  const id=$('#blankPlayer').value,word=$('#blankWord').value;
  if(!id){$('#blankError').textContent='Choisissez votre prénom.';return}
  if(!word.trim()){$('#blankError').textContent='Tapez le mot des civils.';return}
  const r=game.revealBlank(id,word);
  if(r.status==='invalid'){$('#blankError').textContent='Action impossible pour ce joueur.';return}
  closeBlankModal();
  if(r.status==='win'){finishRound('blank',`${r.player.name} s'est dévoilé et a trouvé le mot des civils !`);return}
  ui.revoteTargets=null;renderEliminated();show('revealScreen');vibrate(200);
  toast('Mauvais mot : Monsieur Blanc est éliminé.');
}

/* ---------- contrôle du hasard (sur cet appareil) ---------- */
function recordDraw(seat,isBlank){
  if(!game.state||!game.state.composition.blank)return;   // ne compte que les parties où M. Blanc existe
  const k=String(seat+1);
  randStats.seats[k]=(randStats.seats[k]||0)+1;
  if(isBlank)randStats.blank[k]=(randStats.blank[k]||0)+1;
  Store.put('settings','randStats',randStats).catch(()=>{});
}
function renderRandStats(){
  const seats=Object.keys(randStats.seats).map(Number).sort((a,b)=>a-b);
  const rows=seats.map(k=>{const n=randStats.seats[k],b=randStats.blank[k]||0;
    return `<tr><td>${k===1?'1er':k+'e'} joueur</td><td>${n}</td><td>${b}</td><td>${Math.round(b/n*100)} %</td></tr>`}).join('');
  $('#randStats').innerHTML=`<thead><tr><th>Place</th><th>Tirages</th><th>M. Blanc</th><th>Part</th></tr></thead><tbody>${rows||'<tr><td colspan="4">Pas encore de données.</td></tr>'}</tbody>`;
}

/* ---------- installation PWA ---------- */
const isInstalled=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function updateInstallVisibility(){$('#installBtn').classList.toggle('hidden',isInstalled())}
async function installApp(){
  if(isInstalled()){updateInstallVisibility();return}
  if(installPrompt){
    installPrompt.prompt();const r=await installPrompt.userChoice;installPrompt=null;
    if(r.outcome==='accepted')toast('Installation lancée.');return;
  }
  toast('Sur Android : menu ⋮ de Chrome, puis « Installer l’application ».');
}

/* ---------- branchements ---------- */
$('#newGameBtn').onclick=()=>{updateSetup();show('setupScreen')};
$('#resumeBtn').onclick=resumeGame;
$('#installBtn').onclick=installApp;
$('#homeRules').onclick=()=>show('rulesScreen');
$('#homeLibrary').onclick=()=>{stats();show('libraryScreen')};
$('#homeSettings').onclick=()=>{fillSettings();renderRandStats();renderPlayersManage();show('settingsScreen')};
$('#openLibraryFromSettings').onclick=()=>{stats();show('libraryScreen')};
$('#rulesBtn').onclick=()=>show('rulesScreen');
$$('[data-home]').forEach(b=>b.onclick=()=>show('homeScreen'));
$$('[data-players]').forEach(b=>b.onclick=()=>changePlayers(Number(b.dataset.players)));
$('#nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')validateName()});
$('#nameInput').addEventListener('input',renderSuggest);
$('#nameSuggest').onclick=e=>{const b=e.target.closest('[data-name]');if(b){$('#nameInput').value=b.dataset.name;renderSuggest();$('#nameInput').focus()}};
$('#groupChoices').onclick=e=>{const b=e.target.closest('[data-group]');if(b)selectGroup(b.dataset.group)};
$('#saveGroupBtn').onclick=()=>{$('#groupForm').classList.toggle('hidden');$('#groupName').focus()};
$('#groupSaveOk').onclick=saveGroup;
$('#groupName').addEventListener('keydown',e=>{if(e.key==='Enter')saveGroup()});
$('#playersManage').onclick=e=>{
  const g=e.target.closest('[data-del-group]'),n=e.target.closest('[data-del-name]');
  if(g){people.groups=Players.removeGroup(people.groups,g.dataset.delGroup);if(setup.group===g.dataset.delGroup)setup.group=null}
  else if(n){people.recent=Players.removeName(people.recent,n.dataset.delName)}
  else if(e.target.id==='clearPeopleBtn'){if(!confirm('Effacer tous les pseudos et groupes enregistrés ?'))return;people={recent:[],groups:[]};setup.group=null}
  else return;
  persistPeople();renderPlayersManage();renderGroups();
};
dealHold=bindHold($('#dealCard'),dealShow);
recallHold=bindHold($('#recallCard'),recallShow);
$('#seeScoresBtn').onclick=()=>{renderOutcome();show('scoreScreen')};
$$('[data-counter]').forEach(b=>b.onclick=()=>changeCounter(b.dataset.counter,Number(b.dataset.delta)));
$$('[data-difficulty]').forEach(b=>b.onclick=()=>{$$('[data-difficulty]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');setup.difficulty=b.dataset.difficulty;updateSetup()});
$('#categoryChoices').onclick=e=>{
  const b=e.target.closest('[data-category]');if(!b)return;
  const c=b.dataset.category;
  if(setup.categories.has(c))setup.categories.delete(c);else setup.categories.add(c);
  renderCategories();updateSetup();
};
$('#blankGuess').onchange=syncRuleToggles;
$('#startGameBtn').onclick=startGame;
$('#revealBtn').onclick=validateName;
$('#hideSecretBtn').onclick=hideSecret;
$('#goVoteBtn').onclick=()=>beginVoting();
$('#leaveGameBtn').onclick=leaveGame;
$('#voteTargets').onclick=e=>{const b=e.target.closest('[data-target]');if(b)cast(b.dataset.target)};
$('#revoteBtn').onclick=()=>beginVoting($('#revoteBtn').dataset.ids.split(','));
$('#eliminateBtn').onclick=eliminate;
$('#submitGuess').onclick=submitGuess;
$('#guessInput').addEventListener('keydown',e=>{if(e.key==='Enter')submitGuess()});
$('#continueBtn').onclick=continueAfterElimination;
$('#nextRoundBtn').onclick=nextRound;
$('#endGameBtn').onclick=endGame;
$('#newFromFinalBtn').onclick=resetAndNew;
$('#addPairBtn').onclick=addPair;
$('#exportBtn').onclick=exportWords;
$('#importFile').onchange=async e=>{try{if(e.target.files[0])await importWords(e.target.files[0])}catch(err){toast(err.message)}e.target.value=''};
$('#customPairs').onclick=e=>{const b=e.target.closest('[data-delete-pair]');if(b){custom.splice(Number(b.dataset.deletePair),1);saveCustom();stats();renderCategories();updateSetup()}};
$('#saveSettingsBtn').onclick=saveSettings;
$('#recallOpenBtn').onclick=openRecall;
$('#recallOpenVoteBtn').onclick=openRecall;
$('#blankOpenBtn').onclick=openBlankModal;
$('#blankOpenVoteBtn').onclick=openBlankModal;
$('#blankSubmitBtn').onclick=submitBlank;
$('#blankCloseBtn').onclick=closeBlankModal;
$('#blankWord').addEventListener('keydown',e=>{if(e.key==='Enter')submitBlank()});
$('#blankModal').addEventListener('click',e=>{if(e.target.id==='blankModal')closeBlankModal()});
$('#resetStatsBtn').onclick=()=>{randStats={seats:{},blank:{}};Store.put('settings','randStats',randStats).catch(()=>{});renderRandStats()};
$('#recallRevealBtn').onclick=showRecallSecret;
$('#recallHideBtn').onclick=closeRecall;
$('#recallCloseBtn').onclick=closeRecall;
$('#roleRecall').addEventListener('click',e=>{if(e.target.id==='roleRecall')closeRecall()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeRecall();closeBlankModal()}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstallVisibility()});
window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallVisibility()});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',updateInstallVisibility);

/* ---------- démarrage ---------- */
async function load(){
  try{
    custom=(await Store.get('customPairs','all'))||[];
    const rs=await Store.get('settings','randStats');if(rs&&rs.seats)randStats=rs;
    const pp=await Store.get('settings','people');if(pp&&Array.isArray(pp.recent))people={recent:pp.recent,groups:Array.isArray(pp.groups)?pp.groups:[]};
    const saved=await Store.get('settings','main');
    if(saved)settings={...settings,...saved,points:{...settings.points,...(saved.points||{})}};
    const s=await Store.get('session','current');
    if(s&&s.state&&s.state.players&&s.ui)pendingSession=s;
  }catch(e){toast('Stockage local indisponible.')}
  fillSettings();applySettings();renderCategories();syncRuleToggles();updateSetup();stats();updateHome();renderRandStats();renderGroups();renderPlayersManage();applyHoldMode();
  $('#versionLine').textContent='Version '+APP_VERSION;
}
updateInstallVisibility();
load();
if('serviceWorker'in navigator){
  const hadController=!!navigator.serviceWorker.controller;let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!hadController||refreshing)return;          // 1re installation : rien à recharger
    refreshing=true;
    if(document.querySelector('.screen.active').id==='homeScreen'){toast('Mise à jour installée…');setTimeout(()=>location.reload(),700)}
    else{reloadWhenHome=true;toast('Nouvelle version prête : elle s\'appliquera au retour à l\'accueil.')}
  });
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').then(reg=>{
    reg.update().catch(()=>{});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{})});
  }).catch(()=>{}));
}
