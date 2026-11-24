const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const game=new UndercoverGame();

let pairs=[...window.DEFAULT_WORD_PAIRS], custom=[];
let settings={points:{civil:2,undercover:3,blank:4},animations:true};
const setup={undercover:1,blank:1,difficulty:'all',categories:new Set()};
const ui={screen:'home',dealIndex:0,voterIndex:0,revoteTargets:null};
const TIMER_START=120;
let timerSeconds=TIMER_START, timer=null, toastTimer=null, installPrompt=null, pendingSession=null;
const GAME_SCREENS=new Set(['dealScreen','playScreen','voteScreen','resultScreen','revealScreen','scoreScreen','finalScreen']);

/* ---------- utilitaires ---------- */
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show(id){
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $('#'+id).classList.add('active');
  if(GAME_SCREENS.has(id)){ui.screen=id;saveSession()}
  window.scrollTo({top:0,behavior:'auto'});
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
function getNames(){return $('#playerNames').value.split('\n').map(x=>x.trim()).filter(Boolean)}
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
    case 'scoreScreen':renderOutcome();show('scoreScreen');break;
    case 'finalScreen':endGame();break;
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
  const n=getNames().length;
  $('#playerCount').textContent=`${n} joueur${n>1?'s':''}`;
  $('#undercoverVal').textContent=setup.undercover;
  $('#blankVal').textContent=setup.blank;
  const civils=n-setup.undercover-setup.blank;
  const pill=$('#civilCount');
  pill.textContent=`${Math.max(0,civils)} civil${civils>1?'s':''}`;
  pill.classList.toggle('bad',n>0&&civils<1);
  const k=activePairs().length;
  $('#pairCount').textContent=`${k} paire${k>1?'s':''} disponible${k>1?'s':''}`;
}
function changeCounter(key,delta){
  const other=key==='undercover'?setup.blank:setup.undercover;
  const limit=Math.min(8,Math.max(getNames().length,3)-1-other);
  setup[key]=Math.max(0,Math.min(limit,setup[key]+delta));
  updateSetup();
}
function syncRuleToggles(){
  const guess=$('#blankGuess').checked;
  if(guess)$('#revealRole').checked=true;
  $('#revealRole').disabled=guess;
}
function startGame(){
  $('#setupError').textContent='';
  const names=getNames();
  try{
    game.start(names,setup.undercover,setup.blank,activePairs(),{
      reveal:$('#revealRole').checked,blankGuess:$('#blankGuess').checked,tieRevote:$('#tieRevote').checked
    });
    ui.dealIndex=0;ui.voterIndex=0;ui.revoteTargets=null;pendingSession=null;
    show('dealScreen');showDeal();
  }catch(e){$('#setupError').textContent=e.message}
}

/* ---------- distribution ---------- */
function showDeal(){
  const p=game.state.players[ui.dealIndex];
  $('#dealPlayer').textContent=p.name;
  $('#secretReveal').classList.add('hidden');
  $('#revealBtn').classList.remove('hidden');
  $('#dealProgress').style.setProperty('--progress',`${ui.dealIndex/game.state.players.length*100}%`);
}
function reveal(){
  const p=game.state.players[ui.dealIndex];
  $('#revealBtn').classList.add('hidden');$('#secretReveal').classList.remove('hidden');
  $('#secretRoleImage').src=roleImage(p.role);
  $('#secretRoleImage').alt='Illustration du rôle '+roleLabel(p.role);
  $('#secretRole').textContent=roleLabel(p.role);
  $('#secretWord').textContent=p.word||'AUCUN MOT';
  $('#secretHint').textContent=p.role==='blank'?'Improvisez : vous ne connaissez pas le mot des autres.':'Mémorisez votre mot et ne le montrez à personne.';
}
function hideSecret(){
  ui.dealIndex++;
  if(ui.dealIndex>=game.state.players.length){show('playScreen');renderPlay()}
  else{saveSession();showDeal()}
}

/* ---------- discussion ---------- */
function clearTimer(){if(timer){clearInterval(timer);timer=null}}
function timerLabel(){return timer?'Pause':timerSeconds===0?'Relancer':timerSeconds<TIMER_START?'Reprendre':'Démarrer'}
function renderTimer(){
  const m=String(Math.floor(timerSeconds/60)).padStart(2,'0'),s=String(timerSeconds%60).padStart(2,'0');
  $('#timerText').textContent=`${m}:${s}`;$('#timerBtn').textContent=timerLabel();
}
function renderPlay(){
  const s=game.state;
  $('#roundNo').textContent=s.round;
  const starter=s.players.find(p=>p.id===s.starterId);
  $('#starterLine').innerHTML=starter?`<b>${esc(starter.name)}</b> commence.`:'';
  $('#playersGrid').innerHTML=s.players.map(p=>`<div class="player-tile ${p.alive?'':'out'}"><i></i>${esc(p.name)}</div>`).join('');
  clearTimer();timerSeconds=TIMER_START;renderTimer();
}
function toggleTimer(){
  if(timer){clearTimer()}
  else{
    if(timerSeconds===0)timerSeconds=TIMER_START;
    timer=setInterval(()=>{
      if(timerSeconds>0){timerSeconds--}
      if(timerSeconds===0){clearTimer();toast('Temps écoulé !');navigator.vibrate?.(300)}
      renderTimer();
    },1000);
  }
  renderTimer();
}

/* ---------- vote ---------- */
function beginVoting(targets=null){
  clearTimer();
  const s=game.state;
  ui.revoteTargets=targets;s.votes={};s.drawn=null;
  s.voteOrder=game.active().map(p=>p.id);
  ui.voterIndex=0;
  show('voteScreen');renderVote();
}
function renderVote(){
  const order=game.state.voteOrder;
  if(ui.voterIndex>=order.length){showResults();return}
  show('voteScreen');
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
  game.eliminate(id);renderEliminated();show('revealScreen');
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
  game.pickStarter();renderPlay();show('playScreen');
}

/* ---------- fin de manche ---------- */
function finishRound(winner,detail){
  game.award(winner,settings.points);
  game.state.outcome={winner,detail};
  renderOutcome();show('scoreScreen');
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
  $('#finalSummary').textContent=`${s.round} manche${s.round>1?'s':''} jouée${s.round>1?'s':''}.`;
  $('#finalRanking').innerHTML=s.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=>
    `<div class="rank-item ${i===0?'first':''}"><div class="rank-num">${i===0?'♛':i+1}</div><b>${esc(p.name)}</b><div class="rank-score">${p.score}</div></div>`).join('');
  show('finalScreen');
}
function resetAndNew(){
  if(!confirm('Nouvelle partie : les scores de la partie actuelle seront remis à zéro. Continuer ?'))return;
  game.state=null;clearSession();
  $('#playerNames').value='';setup.undercover=1;setup.blank=1;
  $('#setupError').textContent='';updateSetup();show('setupScreen');
}
function leaveGame(){clearTimer();saveSession();Store.get('session','current').then(s=>{pendingSession=s||null;updateHome()}).catch(()=>{});show('homeScreen')}

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
  $('#pointsCivil').value=settings.points.civil;$('#pointsUndercover').value=settings.points.undercover;$('#pointsBlank').value=settings.points.blank;
  $('#animationsEnabled').checked=settings.animations;
}
async function saveSettings(){
  const pts=v=>Math.max(0,Math.min(20,Math.round(Number(v)||0)));
  settings={points:{civil:pts($('#pointsCivil').value),undercover:pts($('#pointsUndercover').value),blank:pts($('#pointsBlank').value)},animations:$('#animationsEnabled').checked};
  fillSettings();applySettings();
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
  $('#recallRoleImage').src=roleImage(p.role);$('#recallRoleImage').alt='Illustration du rôle '+roleLabel(p.role);
  $('#recallRole').textContent=roleLabel(p.role);$('#recallWord').textContent=p.word||'AUCUN MOT';
  $('#recallChoose').classList.add('hidden');$('#recallSecret').classList.remove('hidden');
}
function closeRecall(){
  $('#roleRecall').classList.add('hidden');
  $('#recallSecret').classList.add('hidden');$('#recallChoose').classList.remove('hidden');
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
$('#homeSettings').onclick=()=>{fillSettings();show('settingsScreen')};
$('#openLibraryFromSettings').onclick=()=>{stats();show('libraryScreen')};
$('#rulesBtn').onclick=()=>show('rulesScreen');
$$('[data-home]').forEach(b=>b.onclick=()=>show('homeScreen'));
$('#playerNames').oninput=updateSetup;
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
$('#revealBtn').onclick=reveal;
$('#hideSecretBtn').onclick=hideSecret;
$('#timerBtn').onclick=toggleTimer;
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
$('#recallRevealBtn').onclick=showRecallSecret;
$('#recallHideBtn').onclick=closeRecall;
$('#recallCloseBtn').onclick=closeRecall;
$('#roleRecall').addEventListener('click',e=>{if(e.target.id==='roleRecall')closeRecall()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeRecall()});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstallVisibility()});
window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallVisibility()});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',updateInstallVisibility);

/* ---------- démarrage ---------- */
async function load(){
  try{
    custom=(await Store.get('customPairs','all'))||[];
    const saved=await Store.get('settings','main');
    if(saved)settings={...settings,...saved,points:{...settings.points,...(saved.points||{})}};
    const s=await Store.get('session','current');
    if(s&&s.state&&s.state.players&&s.ui)pendingSession=s;
  }catch(e){toast('Stockage local indisponible.')}
  fillSettings();applySettings();renderCategories();syncRuleToggles();updateSetup();stats();updateHome();
}
updateInstallVisibility();
load();
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))}
