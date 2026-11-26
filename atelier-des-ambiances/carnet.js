'use strict';

// State shared by the projected lesson and its standalone pupil edition.
const carnet = (() => {
  const key = 'balavoine-atelier-carnet-v1';
  const signature = '1MCVA-atelier-des-ambiances';
  const shops = ['nike','apple','zara','micro'];
  const labels = ['Direct','Indirect','Hors besoin'];
  const areas = ['À gauche de l’entrée','Face à l’entrée','À droite de l’entrée','Au fond à gauche','Au fond au centre','Au fond à droite'];
  const answers = {
    nike:{}, apple:{}, zara:{}, micro:{}, commun:{}
  };
  const areasAllowed = {
    commun:['observation','continuite','restitution','trace'],
    magasin:['classeA','classeB','classeC','raisonA','raisonB','raisonC','indice1','facteur1','effet1','indice2','facteur2','effet2','familles','variantes','comparaison','produit','zone','trajet','amenagement1','amenagement2']
  };
  let session = null;
  let shop = -1;
  let ready = false;
  let draftMode = 'groupe';
  let pending = null;
  let startingNew = false;
  const learner = () => session?.mode === 'groupe' || session?.mode === 'individuel';
  const node = id => document.getElementById(id);
  const display = () => session?.mode === 'groupe' ? session.groupe : session?.membres?.[0] || '';
  const modeLabel = () => session?.mode === 'groupe' ? 'En groupe' : 'Individuel';
  const isObject = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj);
  const int = (n,min,max) => Number.isInteger(n) && n>=min && n<=max;
  const formId = (scope,name) => 'rep-'+scope+'-'+name;
  const field = (scope,name,label,options=null) => {
    const val = answers[scope][name] || '';
    const id = formId(scope,name), attr=' id="'+id+'" data-scope="'+scope+'" data-reponse="'+name+'"';
    const entry = options ? '<select'+attr+'><option value="">Choisir…</option>'+options.map(a=>'<option'+(val===a?' selected':'')+'>'+safe(a)+'</option>').join('')+'</select>' :
      '<textarea rows="2" maxlength="3000"'+attr+'>'+safe(val)+'</textarea>';
    return '<label class="carnetField" for="'+id+'">'+label+entry+'</label>';
  };
  const groupFields = (title,body) => '<fieldset class="workFields"><legend>'+title+'</legend>'+body+'</fieldset>';
  function missionFields(s,number){
    if(!learner() || shop!==shops.indexOf(s.key))return '';
    const k=s.key;
    if(number===1)return groupFields('Mes réponses · Les offres', ['A','B','C'].map(letter=>
      '<div class="lineFields">'+field(k,'classe'+letter,'Offre '+letter,labels)+field(k,'raison'+letter,'Pourquoi ce classement ?')+'</div>').join(''));
    if(number===2)return groupFields('Mes réponses · L’ambiance',[1,2].map(i=>
      '<div class="sensFields">'+field(k,'indice'+i,'Indice '+i+' · ce que je vois ou entends')+field(k,'facteur'+i,'Facteur d’ambiance')+field(k,'effet'+i,'Effet possible sur le client')+'</div>').join(''));
    return groupFields('Mes réponses · L’assortiment',field(k,'familles','Nommez deux familles de produits.')+field(k,'variantes','Donnez deux variantes du même modèle.')+field(k,'comparaison','Comparez deux références par une caractéristique.'))+
      groupFields('Mon plan de l’espace de vente',field(k,'produit','Quel produit voulez-vous faire découvrir ?')+
      '<p>Imaginez le plan vu de dessus. L’entrée se trouve en bas. Cliquez sur une zone pour y placer votre produit.</p><div class="planGrid">'+[3,4,5,0,1,2].map(i=>'<button type="button" data-zone="'+i+'" data-shop="'+k+'" aria-pressed="'+(answers[k].zone===areas[i])+'">'+areas[i]+'</button>').join('')+'</div><div class="planEntrance">↑ Entrée du client</div>'+
      field(k,'trajet','Décrivez le trajet depuis l’entrée jusqu’au produit.')+field(k,'amenagement1','Choix d’ambiance 1 et effet attendu')+field(k,'amenagement2','Choix d’ambiance 2 et effet attendu'));
  }
  function stageEnd(i){
    if(i===1)return '<div class="tools">'+link('fiche-repere.pdf','Imprimer ma fiche repère (PDF)')+'</div>';
    if(!learner())return '';
    if(i===0)return groupFields('Mon observation',field('commun','observation','Quel détail attire votre regard et pourquoi ?')+field('commun','continuite','Comment le vendeur retrouve-t-il la sélection de Karen ?'));
    if(i===9)return groupFields('Ma restitution',field('commun','restitution','En trois phrases, expliquez le placement du produit et vos deux choix d’ambiance.'));
    if(i===11)return groupFields('Ma trace écrite',field('commun','trace','Je vois ou j’entends… Le facteur d’ambiance est… Cela pourrait donner envie de… parce que…'));
    if(i===12)return '<div class="tools"><button class="dark" data-carnet="export">Exporter ma progression</button></div>';
    return '';
  }
  function teamPage(){
    if(session?.mode==='individuel')return head('Prépare ton dossier','Tu reprends la séance individuellement. Choisis une enseigne à l’étape suivante et garde-la pour les trois missions.')+'<section class="panel"><h2>Travailler en autonomie</h2><ol class="recipe"><li>Observe le support et formule ta réponse.</li><li>Si tu hésites, ouvre un indice. Compare ensuite ton raisonnement à la réponse proposée.</li><li>Complète ton dossier sur papier ou utilise les champs de réponse à l’écran.</li></ol></section>';
    return head('Installez votre îlot','Gardez un passage libre et changez de porte-parole à chaque mission.')+
      '<section class="panel"><h2>'+safe(display()||'Votre groupe')+'</h2><p>'+((session?.membres||[]).map(safe).join(' · ')||'Répartissez les rôles.')+'</p><ol class="recipe"><li>Une personne lit la mission du tuteur.</li><li>Chacun propose un élément et complète son dossier personnel.</li><li>Le secrétaire saisit la réponse commune si vous travaillez à l’écran. Un nouveau porte-parole présente le choix du groupe.</li></ol></section>';
  }
  function shopPage(){
    return head('Votre enseigne de PFMP',session?.mode==='groupe'?'Sélectionnez l’enseigne attribuée à votre îlot par la roue projetée. Gardez-la pour les trois missions.':'Choisis le magasin dans lequel tu feras ta PFMP pour les trois missions.')+
      '<div class="shopChooser">'+stores.map((s,i)=>'<button data-selectshop="'+i+'" aria-pressed="'+(shop===i)+'"><img alt="" src="'+asset(s.key+'.jpg')+'"><span>'+s.name+'</span></button>').join('')+'</div>';
  }
  function missionNav(){
    return '<div class="carnetNav"><p><b>'+ (shop<0?'Choisissez votre enseigne.':safe(stores[shop].name)+' · Votre dossier')+'</b> Sur papier, chacun complète son exemplaire. Sur ordinateur, saisissez vos réponses sous la mission.</p>'+tabs(stores.map(s=>s.name),'store',shop)+'</div>';
  }
  function capture(){
    const decisions={};
    for(const id of ['0-0','0-1','1-0','1-1']){
      if(int(state.choices[id],0,3))decisions[id]=state.choices[id];
    }
    return {atelier:signature,version:1,session,enseigne:shop<0?null:shops[shop],reponses:answers,
      etape:state.i+1,parcours:{canal:state.channel,panier:state.basket,retrouve:state.found,stock:state.pickup,
        situations:state.sub.slice(),decisions,corrections:['0-0','0-1','1-0','1-1'].filter(id=>state.shown[id]),
        tirage:state.draw,question:state.f,entrainement:Array.from(state.final,a=>a??null),termine:state.done}};
  }
  function normalize(data,allowProjection=false){
    const bad=()=>{throw new Error('Ce fichier ne contient pas un carnet valide de L’Atelier des Ambiances.');};
    if(!isObject(data)||data.atelier!==signature||data.version!==1||!int(data.etape,1,13))bad();
    const s=data.session;
    if(!isObject(s)||!['groupe','individuel',...(allowProjection?['projection']:[])].includes(s.mode))bad();
    const str=(v,max=3000)=>typeof v==='string'&&v.length<=max;
    const members=s.membres;
    if(!Array.isArray(members)||members.length>32||!members.every(x=>str(x,120)&&x.trim()))bad();
    if(s.mode==='individuel'&&members.length!==1 || s.mode==='groupe'&&(!members.length||!str(s.groupe,120)||!s.groupe.trim()))bad();
    if(data.enseigne!==null&&!shops.includes(data.enseigne))bad();
    if(!isObject(data.reponses)||!isObject(data.parcours))bad();
    const clean={};
    for(const scope of [...shops,'commun']){
      const src=data.reponses[scope];
      if(!isObject(src))bad();
      clean[scope]={};
      for(const k of (scope==='commun'?areasAllowed.commun:areasAllowed.magasin)){
        if(!Object.hasOwn(src,k))continue;
        if(!str(src[k])||k.startsWith('classe')&&src[k]&&!labels.includes(src[k])||k==='zone'&&!areas.includes(src[k]))bad();
        clean[scope][k]=src[k];
      }
    }
    const p=data.parcours;
    if(!int(p.canal,0,2)||!int(p.question,0,4)||![p.panier,p.retrouve,p.stock,p.termine].every(v=>typeof v==='boolean'))bad();
    if(p.tirage!==null&&!(Array.isArray(p.tirage)&&p.tirage.length===4&&[0,1,2,3].every(n=>p.tirage.includes(n))))bad();
    if(!Array.isArray(p.situations)||p.situations.length!==2||!p.situations.every(n=>int(n,0,1)))bad();
    if(!Array.isArray(p.entrainement)||p.entrainement.length>5||!p.entrainement.every(n=>n===null||int(n,0,3)))bad();
    if(p.termine&&(p.entrainement.length!==5||p.entrainement.includes(null)))bad();
    if(!isObject(p.decisions)||!Object.entries(p.decisions).every(([k,v])=>/^[01]-[01]$/.test(k)&&int(v,0,3)))bad();
    if(!Array.isArray(p.corrections)||!p.corrections.every(id=>typeof id==='string'&&/^[01]-[01]$/.test(id)))bad();
    return {session:{mode:s.mode,groupe:s.mode==='groupe'?s.groupe.trim():'',membres:members.map(m=>m.trim())},
      etape:data.etape,shop:shops.indexOf(data.enseigne),clean,p};
  }
  function apply(data){
    session=data.session;shop=data.shop;
    for(const k of Object.keys(answers))answers[k]=data.clean[k];
    const p=data.p;
    Object.assign(state,{i:data.etape-1,store:shop,channel:p.canal,basket:p.panier,found:p.retrouve,pickup:p.stock,
      draw:p.tirage,sub:p.situations,choices:p.decisions,shown:Object.fromEntries(p.corrections.map(k=>[k,true])),f:p.question,
      final:p.entrainement.map(v=>v===null?undefined:v),done:p.termine,busy:false,edit:false});
  }
  function persist(){
    if(!ready||!session)return;
    try{sessionStorage.setItem(key,JSON.stringify(capture()));}catch{/* Export stays available when tab storage is disabled. */}
  }
  function paint(){
    const badge=node('sessionButton');
    badge.textContent=learner()?modeLabel()+' · '+display():session?'Projection · Session':'Ma session';
    document.querySelectorAll('button[data-carnet="export"]').forEach(b=>b.disabled=!learner());
    persist();
  }
  function alertUser(msg){
    const note=node('carnetNotice');note.textContent=msg;note.hidden=false;
    const inline=node('sessionNotice');if(inline)inline.textContent=msg;
    if(node('welcomeDialog').open)node('welcomeNotice').textContent=msg;
  }
  function openSession(newSession=false){
    const box=node('sessionDialog');startingNew=newSession;
    if(session&&!newSession){
      node('sessionContent').innerHTML='<div class="dialoghead"><h2 id="sessionHeading">Ma session</h2><button data-close>Fermer</button></div><p><b>'+safe(learner()?display():'Projection en classe')+'</b></p><p>'+ (learner()?safe(modeLabel()+' · '+session.membres.join(', ')):'Le parcours est projeté à toute la classe.')+'</p><div class="tools">'+(learner()?'<button data-carnet="export">Exporter ma progression</button>':'')+'<button data-carnet="new">Ouvrir une nouvelle session</button></div>';
    }else{
      draftMode=session?.mode==='individuel'?'individuel':'groupe';
      node('sessionContent').innerHTML='<div class="minor">Première MCVA · Vente · 26 novembre 2026</div><h2 id="sessionHeading">Ouvrir mon atelier</h2><p>Comment fais-tu cette séance ?</p><div class="modeButtons"><button data-mode="groupe"><b>En groupe</b><small>En classe, avec mon îlot</small></button><button data-mode="individuel"><b>Individuel</b><small>Je rattrape la séance</small></button></div><form id="identityForm"><div id="identityFields"></div>'+
        (newSession?'<p class="replaceWarning">Commencer une nouvelle session efface le carnet de cet onglet. Exporte-le avant de continuer.</p>':'')+
        '<div class="tools"><button class="dark" type="submit">Commencer le parcours</button></div></form><div class="tools"><button data-carnet="import">Importer ma progression</button>'+
        '<button data-carnet="project">Projeter la séance</button>'+(newSession?'<button data-close>Annuler</button>':'')+'</div><p id="sessionNotice" role="status"></p>';
      modeForm(draftMode);
    }
    if(!box.open)box.showModal();
  }
  function modeForm(mode){
    draftMode=mode;
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    node('identityFields').innerHTML=mode==='groupe'?'<label class="carnetField">Nom du groupe<input name="groupe" required maxlength="120" placeholder="Ex. Îlot 2" autocomplete="off"></label><label class="carnetField">Prénoms et noms des membres présents<textarea name="membres" rows="3" required maxlength="3800" placeholder="Une personne par ligne"></textarea></label>':'<label class="carnetField">Mon prénom et mon nom<input name="membres" required maxlength="120" autocomplete="name"></label>';
  }
  function begin(s){
    if(session||startingNew){
      for(const scope of Object.keys(answers))answers[scope]={};
      Object.assign(state,{channel:0,basket:false,found:false,pickup:false,store:-1,sub:[0,0],choices:{},shown:{},f:0,final:[],done:false});
      shop=-1;
    }
    if(s.mode!=='projection')state.draw=null;
    session=s;startingNew=false;
    node('sessionDialog').close();node('carnetNotice').hidden=true;go(0);
  }
  function download(){
    if(!learner())return;
    const blob=new Blob([JSON.stringify(capture(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    const who=display().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'-').slice(0,45).replace(/^-|-$/g,'')||'session';
    a.href=url;a.download='Atelier-ambiances_'+session.mode+'_'+who+'_etape-'+(state.i+1)+'.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    alertUser('Export lancé. Retrouve ton fichier JSON dans Téléchargements et envoie-le-toi en pièce jointe.');
  }
  function finishImport(){
    if(!pending)return;
    const imported=pending;pending=null;
    [node('confirmImport'),node('sessionDialog'),node('welcomeDialog')].forEach(d=>{if(d.open)d.close()});
    apply(imported);go(state.i);
    alertUser('Carnet repris · '+display()+' · Étape '+(state.i+1)+' sur 13.');
  }
  async function readFile(file){
    if(!file)return;
    try{
      if(file.size>2200000)throw new Error('Ce fichier est trop volumineux pour un carnet de séance.');
      let data;try{data=JSON.parse(await file.text())}catch{throw new Error('Choisis le fichier .json téléchargé avec « Exporter ma progression ».')}
      pending=normalize(data);
      if(learner()){
        node('replaceInfo').textContent='Tu vas ouvrir le carnet '+(pending.session.groupe||pending.session.membres[0])+', à l’étape '+pending.etape+' sur 13.';
        node('confirmImport').showModal();
      }else finishImport();
    }catch(e){pending=null;alertUser(e.message||'Impossible de lire le carnet.');}
    finally{node('importFile').value='';}
  }
  function onForm(e){
    if(e.target.id!=='identityForm')return;e.preventDefault();
    const form=e.target,input=form.elements.membres,group=form.elements.groupe;
    const raw=draftMode==='groupe'?input.value.split(/[\n,;]+/):[input.value];
    const members=raw.map(t=>t.trim()).filter(Boolean);
    if(!members.length||members.length>32||members.some(t=>t.length>120)){input.setCustomValidity('Indique les prénoms et noms, une personne par ligne (120 caractères maximum par personne).');input.reportValidity();return;}
    if(group&&!group.value.trim()){group.setCustomValidity('Indique le nom de ton groupe.');group.reportValidity();return;}
    begin({mode:draftMode,groupe:group?.value.trim()||'',membres:members});
  }
  function onClick(e){
    const b=e.target.closest('button');if(!b)return;
    const d=b.dataset;
    if(b.id==='welcomeOpen')return openWelcome();
    if(b.id==='welcomeContinue'){node('welcomeDialog').close();if(!session)openSession();return;}
    if(b.id==='sessionButton')return openSession();
    if(d.mode)return modeForm(d.mode);
    if(d.selectshop!==undefined){shop=Number(d.selectshop);state.store=shop;render();return;}
    if(d.zone!==undefined&&learner()&&shops.includes(d.shop)){
      answers[d.shop].zone=areas[Number(d.zone)];
      b.closest('.planGrid').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
      persist();return;
    }
    switch(d.carnet){
      case 'help':node('saveHelp').showModal();break;
      case 'import':node('importFile').click();break;
      case 'export':download();break;
      case 'confirmImport':finishImport();break;
      case 'new':openSession(true);break;
      case 'project':begin({mode:'projection',groupe:'',membres:[]});break;
    }
  }
  function openWelcome(){
    node('welcomeImage').src=asset('zara.jpg');
    node('welcomePdf').href=asset('fiche-accueil-eleve.pdf');
    node('welcomeContinue').textContent=session?'Reprendre la séance':'Commencer la séance';
    node('welcomeNotice').textContent='';
    if(!node('welcomeDialog').open)node('welcomeDialog').showModal();
  }
  function start(){
    try{
      const raw=sessionStorage.getItem(key);
      if(raw){apply(normalize(JSON.parse(raw),true));history.replaceState(null,'','#etape-'+(state.i+1));}
    }catch{/* A malformed or unavailable tab draft leaves the entry choice open. */}
    document.addEventListener('submit',onForm);
    document.addEventListener('click',onClick);
    document.addEventListener('input',e=>{
      const el=e.target;
      if(el.closest('#identityForm'))el.setCustomValidity?.('');
      if(el.dataset.reponse&&learner()){
        answers[el.dataset.scope][el.dataset.reponse]=el.value;persist();
      }
    });
    node('importFile').addEventListener('change',e=>readFile(e.target.files[0]));
    document.addEventListener('contextmenu',e=>{
      if(!e.target.closest('[data-carnet="export"],[data-carnet="import"]'))return;
      e.preventDefault();if(!node('saveHelp').open)node('saveHelp').showModal();
    });
    node('sessionDialog').addEventListener('cancel',e=>{if(!session)e.preventDefault()});
    node('welcomeDialog').addEventListener('cancel',e=>{if(!session)e.preventDefault()});
    ready=true;openWelcome();
  }
  return {start,paint,persist,stageEnd,missionFields,teamPage,shopPage,missionNav,
    isLearner:learner,activeStore:()=>learner()?shop:-1,setShop:n=>{shop=n}};
})();
