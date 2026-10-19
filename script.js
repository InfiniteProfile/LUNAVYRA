(() => {
  'use strict';
  const ROW_HEIGHT = 196;
  const WINDOW_HEIGHT = 12000;
  const RECENTER_HIGH = 9000;
  const RECENTER_LOW = 2000;
  const SHIFT_PIXELS = 6000;
  const SHIFT_ROWS = BigInt(Math.round(SHIFT_PIXELS / ROW_HEIGHT));
  const BUFFER_ROWS = 4;
  const MAX_RENDER_ROWS = 20;
  const $ = (id) => document.getElementById(id);
  const viewport = $('feedViewport'), feedWindow = $('feedWindow'), rowsRoot = $('virtualRows');
  const status = $('feedStatus'), searchForm = $('searchForm'), searchInput = $('profileSearch'), searchError = $('searchError');
  const profileDialog = $('profileDialog'), mediaDialog = $('mediaDialog'), mediaStage = $('mediaStage');
  let logicalBaseRow = 0n, columns = 2, renderScheduled = false, rendering = false;
  let lastFocused = null, activeMedia = null, zoom = 1, rotation = 0, currentDetailId = null;
  let configuredProfiles = new Map(), configuredPosts = new Map(), lastRenderedStart = -1, lastRenderedEnd = -1;
  const profileCache = new Map();
  const CACHE_LIMIT = 300;
  const FIRST_NAMES = ['Mira','Luna','Elara','Sienna','Nadia','Amara','Iris','Freya','Ayla','Zara','Nyla','Serena','Aria','Vera','Mila','Alina','Noelle','Rhea','Kiara','Esme','Talia','Anya','Liora','Selene','Mina','Cleo','Yara','Aurelia','Inaya','Livia','Dahlia','Evelyn','Sofia','Naomi','Aisha','Maya','Lyra','Isla','Camila','Romy','Thea','Arielle','Juno','Elodie','Amina','Cassia','Nerina','Violet','Amelie','Nori','Kira','Sasha','Leona','Maren','Lilia','Odette','Asha','Mirelle','Demi','Rina','Alessia','Lumi','Safiya','Eden'];
  const LAST_NAMES = ['Vale','Moreau','Voss','Arden','Rey','Solene','Hart','Noir','Marin','Sato','Laurent','Bellamy','Rivers','Ashford','Delacroix','Wren','Hale','Serrano','Kova','Monroe','Ellis','Roux','Winter','Avery','Mori','Bennett','Quinn','Dove','Lennox','Rowan','Aster','Cove','Hayes','Blair','Sloan','Mercer','Vega','Sinclair','Romano','West','Sorel','Marlow','Frost','Leroux','Raine','Mika','Solis','Keane','Orlov','Calder','Virelli','Lark','Everly','Moon','Sterling','Hollis','Rossi','Briar','Skye','Lovelace','Onyx','Mistral','Aurex','Dusk'];
  const BIOS = ['A quiet romantic who collects little moments and old books.','A confident creative with an eye for unusual details.','A night-owl photographer drawn to city lights.','A thoughtful dreamer who finds beauty in ordinary days.','A modern minimalist with a soft spot for vintage fashion.','An independent spirit who loves art, music, and long walks.','A curious designer who is always chasing a new idea.','A graceful soul with a mysterious, cinematic aesthetic.','A warm-hearted traveler who keeps a journal of places.','An elegant music lover with a taste for midnight jazz.','A playful stylist mixing classic silhouettes with bold details.','An introspective artist inspired by rain, gardens, and poetry.','A future-minded maker who loves clean lines and deep color.','A gentle bookworm with a collection of pressed flowers.','A fearless explorer who turns small adventures into stories.','A polished professional who lives for galleries and cafés.'];
  const AESTHETICS = ['soft feminine','modern romantic','quiet luxury','gothic elegance','artistic minimalism','dreamy vintage','urban chic','celestial noir','classic glamour','futuristic couture','casual elegance','dark academia','cinematic muse','romantic gothic','creative streetwear','ethereal modern'];
  const SKIN = ['#f3d2bc','#e8b99b','#cf9678','#a96e54','#80523f','#f1c7b0','#d8a58c','#b98167'];
  const HAIR = ['#241722','#4b2b25','#8a5637','#d9b67e','#17151f','#6e405e','#b65b4c','#d5c6b6','#343b56','#252b28'];
  const CLOTHES = ['#292136','#4d233a','#26384a','#57404b','#201d27','#5a3447','#353047','#292d36'];
  const HAIR_STYLES = ['long waves','sleek bob','soft curls','high ponytail','layered brunette hair','short textured cut','braided style','curtain fringe'];
  const EYES = ['#4e7b78','#70543f','#4b5f99','#82616f','#4b3d35','#6f8051'];
  const INTERESTS = ['photography','fashion','painting','music','architecture','travel','books','cinema','gardening','design','coffee','poetry','dance','technology','museums','cooking'];
  const OCCUPATIONS = ['designer','photographer','architect','illustrator','researcher','musician','writer','curator','filmmaker','botanist','stylist','engineer','chef','dancer','editor','artist'];
  function hashString(s) { let h = 2166136261; for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h,16777619); } return h >>> 0; }
  function rngFrom(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
  function pick(rng, list) { return list[Math.floor(rng()*list.length)]; }
  function canonicalId(value) {
    if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('Enter digits only: a positive decimal ID is required.');
    const id = value.replace(/^0+/, '');
    if (!id) throw new Error('ID must be greater than zero.');
    return id;
  }
  function incrementDecimal(id) { let chars=id.split(''); for(let i=chars.length-1;i>=0;i--){ if(chars[i]!=='9'){chars[i]=String.fromCharCode(chars[i].charCodeAt(0)+1);return chars.join('');} chars[i]='0'; } return '1'+chars.join(''); }
  function decrementDecimal(id) { id=canonicalId(id); if(id==='1') return '1'; let chars=id.split(''); for(let i=chars.length-1;i>=0;i--){if(chars[i]!=='0'){chars[i]=String.fromCharCode(chars[i].charCodeAt(0)-1);break;}chars[i]='9';} const out=chars.join('').replace(/^0+/, ''); return out||'1'; }
  function svgPortrait(id) {
    const r = rngFrom(hashString(id+'|portrait-v3'));
    const skin=pick(r,SKIN), hair=pick(r,HAIR), cloth=pick(r,CLOTHES), eyes=pick(r,EYES);
    const hairStyle=Math.floor(r()*8), fringe=hairStyle%2===0, longHair=hairStyle!==1&&hairStyle!==5;
    const bg1=pick(r,['#332342','#252c43','#482638','#24252f','#3c2b35','#26223b']);
    const earring=r()>.45, necklace=r()>.35, blush=r()>.3;
    const hairBack=longHair?`<path d="M35 91 Q22 36 49 20 Q80 -1 111 25 Q130 45 116 94 L107 125 L41 125Z" fill="${hair}"/>`:'';
    const fringePath=fringe?`<path d="M39 47 Q43 8 78 16 Q107 13 115 48 L103 42 Q91 53 75 43 Q59 52 42 48Z" fill="${hair}"/>`:'';
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 190"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${bg1}"/><stop offset="1" stop-color="#111019"/></linearGradient><radialGradient id="l"><stop stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="150" height="190" fill="url(#g)"/><circle cx="112" cy="37" r="65" fill="url(#l)"/><circle cx="21" cy="135" r="44" fill="#9b4e7e" opacity=".12"/><path d="M15 190 Q20 137 52 130 L99 130 Q133 141 139 190Z" fill="${cloth}"/><path d="M60 115 L90 115 L101 144 Q75 164 49 144Z" fill="${skin}"/><path d="M45 61 Q44 30 75 28 Q105 29 106 62 L102 99 Q93 120 75 121 Q56 117 48 98Z" fill="${skin}"/><path d="M47 64 Q40 36 58 21 Q83 6 105 26 Q118 39 107 67 L101 43 Q80 54 59 42Z" fill="${hair}"/><path d="M45 66 Q42 43 52 31 Q44 60 53 85 L49 106 Q38 93 45 66Z" fill="${hair}"/><path d="M104 61 Q113 75 104 103 L99 83Z" fill="${hair}"/><path d="M55 69 Q63 64 69 69" stroke="#4b2e2a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M82 69 Q89 64 96 69" stroke="#4b2e2a" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="63" cy="76" rx="5" ry="3.2" fill="#fff"/><ellipse cx="88" cy="76" rx="5" ry="3.2" fill="#fff"/><circle cx="64" cy="76" r="2.5" fill="${eyes}"/><circle cx="88" cy="76" r="2.5" fill="${eyes}"/><circle cx="65" cy="75" r=".9" fill="#17121b"/><circle cx="89" cy="75" r=".9" fill="#17121b"/><path d="M75 77 L72 89 L77 91" stroke="#b77e69" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M66 99 Q75 105 85 98" stroke="#8f4f57" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M52 85 Q61 92 69 86 M82 86 Q91 92 98 84" stroke="#e5a28e" stroke-width="4" opacity="${blush?.25:0}" fill="none" stroke-linecap="round"/>${fringePath}${earring?'<circle cx="48" cy="97" r="2.8" fill="#d9c2a4"/><circle cx="102" cy="97" r="2.8" fill="#d9c2a4"/>':''}${necklace?'<path d="M54 128 Q75 146 96 128" stroke="#d7c0a4" stroke-width="1.5" fill="none"/><circle cx="75" cy="140" r="2" fill="#d7c0a4"/>':''}<path d="M0 177 Q75 161 150 177 V190 H0Z" fill="#000" opacity=".12"/></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
  }
  function generatedProfile(id) {
    if (profileCache.has(id)) { const value=profileCache.get(id); profileCache.delete(id); profileCache.set(id,value); return value; }
    const r=rngFrom(hashString(id+'|identity-v5'));
    const first=pick(r,FIRST_NAMES), last=pick(r,LAST_NAMES), name=first+' '+last;
    const bio=pick(r,BIOS), aesthetic=pick(r,AESTHETICS), interests=[pick(r,INTERESTS),pick(r,INTERESTS),pick(r,INTERESTS)];
    const profile={id,name,bio,aesthetic,interests,occupation:pick(r,OCCUPATIONS),hair:pick(r,HAIR_STYLES),image:svgPortrait(id),mediaType:'image',url:'',source:'generated'};
    profileCache.set(id,profile); if(profileCache.size>CACHE_LIMIT) profileCache.delete(profileCache.keys().next().value); return profile;
  }
  function getProfile(id) { return configuredProfiles.get(id) || generatedProfile(id); }
  function validHttpUrl(value) { try { const u=new URL(value,document.baseURI); return (u.protocol==='https:'||u.protocol==='http:')?u.href:''; } catch { return ''; } }
  function mediaKind(url) { const clean=String(url||'').split(/[?#]/,1)[0].toLowerCase(); if(/\.(mp4|webm|ogv|mov)$/.test(clean))return 'video'; if(/\.(jpg|jpeg|png|webp|gif|avif|svg)$/.test(clean))return 'image'; return 'image'; }
  function parseProfiles(text) {
    const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/); const tokens=[]; let field=[];
    for(const raw of lines){const line=raw.trim(); if(line==='$'){if(field.length)tokens.push(field.join('\n').trim());field=[];continue;} if(line)field.push(line);}
    if(field.length)tokens.push(field.join('\n').trim());
    const result=new Map(); let n=1n;
    for(let i=0;i<tokens.length;i+=3){const name=(tokens[i]||'').slice(0,180); if(!name)continue; const image=validHttpUrl(tokens[i+1]||''); const url=validHttpUrl(tokens[i+2]||''); const id=String(n++); result.set(id,{...generatedProfile(id),id,name,image:image||svgPortrait(id),mediaType:image?mediaKind(image):'image',url,bio:'A profile from the LUNAVYRA local collection.',aesthetic:'curated identity',interests:['personal style','creative life'],occupation:'individual',source:'configured'});}
    return result;
  }
  async function loadData() {
    try { const response=await fetch('./Profiles.txt',{cache:'no-cache'}); if(!response.ok)throw new Error('Profiles.txt returned '+response.status); configuredProfiles=parseProfiles(await response.text()); }
    catch(error){ console.info('Profiles.txt unavailable; using generated profiles.',error); status.textContent='Generated identities'; }
    try { const response=await fetch('./Post.txt',{cache:'no-cache'}); if(response.ok)configuredPosts=parsePosts(await response.text()); }
    catch(error){ console.info('Optional Post.txt unavailable.',error); }
    scheduleRender();
  }
  function parsePosts(text) { const out=new Map(); const records=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&x!=='$'); for(let i=0;i+1<records.length;i+=2){const id=records[i],content=records[i+1];try{out.set(canonicalId(id),content);}catch{}}return out; }
  function getColumns() { const width=viewport.clientWidth; return width<620?2:width<920?3:width<1250?4:5; }
  function makeMedia(profile, className='avatar') {
    if(profile.mediaType==='video') { const v=document.createElement('video'); v.className=className; v.src=profile.image; v.muted=true; v.playsInline=true; v.preload='none'; v.loop=true; v.setAttribute('aria-label',profile.name+' portrait video'); v.addEventListener('error',()=>{const img=document.createElement('img');img.className=className;img.src=svgPortrait(profile.id);img.alt=profile.name;v.replaceWith(img);},{once:true}); return v; }
    const img=document.createElement('img'); img.className=className; img.alt=profile.name; img.loading='lazy'; img.decoding='async'; img.src=profile.image||svgPortrait(profile.id); img.addEventListener('error',()=>{img.src=svgPortrait(profile.id);},{once:true}); return img;
  }
  function makeCard(id) {
    const p=getProfile(id), button=document.createElement('button'); button.type='button'; button.className='profile-card'; button.dataset.profileId=id; button.setAttribute('aria-label',`Open ${p.name}, profile ${id}`);
    const media=makeMedia(p); button.append(media);
    const meta=document.createElement('span');meta.className='profile-meta';
    const name=document.createElement('span');name.className='profile-name';name.textContent=p.name;
    const pid=document.createElement('span');pid.className='profile-id';pid.textContent='#'+id;
    const teaser=document.createElement('span');teaser.className='profile-teaser';teaser.textContent=p.aesthetic+' · '+p.bio;
    meta.append(name,pid,teaser);button.append(meta);button.addEventListener('click',()=>openProfile(id));return button;
  }
  function scheduleRender() { if(renderScheduled)return; renderScheduled=true; requestAnimationFrame(()=>{renderScheduled=false;try{renderWindow();}catch(error){console.error('Feed render recovered from an error.',error);status.textContent='Refreshing profiles…';setTimeout(()=>scheduleRender(),80);}}); }
  function renderWindow() {
    if(rendering)return;rendering=true;
    try {
      const nextColumns=getColumns(); if(nextColumns!==columns){columns=nextColumns;lastRenderedStart=-1;lastRenderedEnd=-1;}
      const rowHeight=window.matchMedia('(max-width: 430px)').matches?166:ROW_HEIGHT;
      document.documentElement.style.setProperty('--row-height',rowHeight+'px');
      const physicalRow=Math.floor(viewport.scrollTop/rowHeight);
      const visibleCount=Math.ceil(viewport.clientHeight/rowHeight);
      const start=Math.max(0,physicalRow-BUFFER_ROWS), end=Math.min(Math.floor(WINDOW_HEIGHT/rowHeight)-1,physicalRow+visibleCount+BUFFER_ROWS);
      if(start===lastRenderedStart&&end===lastRenderedEnd)return;
      const fragment=document.createDocumentFragment();
      for(let row=start;row<=end;row++){
        const rowEl=document.createElement('div');rowEl.className='profile-row';rowEl.style.top=(row*rowHeight)+'px';rowEl.style.height=rowHeight+'px';rowEl.style.setProperty('--columns',columns);
        const logicalRow=logicalBaseRow+BigInt(row);
        for(let col=0;col<columns;col++){const id=String(logicalRow*BigInt(columns)+BigInt(col)+1n);rowEl.append(makeCard(id));}
        fragment.append(rowEl);
      }
      rowsRoot.replaceChildren(fragment);lastRenderedStart=start;lastRenderedEnd=end;status.textContent='';
    } finally {rendering=false;}
  }
  function rebaseIfNeeded() {
    const top=viewport.scrollTop; const rowHeight=window.matchMedia('(max-width: 430px)').matches?166:ROW_HEIGHT;
    if(top>RECENTER_HIGH){const shift=Math.min(SHIFT_PIXELS,Math.max(0,top-RECENTER_LOW));const rows=BigInt(Math.round(shift/rowHeight));const actual=Number(rows)*rowHeight;logicalBaseRow+=rows;viewport.scrollTop=Math.max(0,top-actual);lastRenderedStart=-1;lastRenderedEnd=-1;}
    else if(top<RECENTER_LOW && logicalBaseRow>0n){const maxRows=logicalBaseRow<SHIFT_ROWS?logicalBaseRow:SHIFT_ROWS;const shift=Number(maxRows)*rowHeight;logicalBaseRow-=maxRows;viewport.scrollTop=top+shift;lastRenderedStart=-1;lastRenderedEnd=-1;}
    scheduleRender();
  }
  viewport.addEventListener('scroll',rebaseIfNeeded,{passive:true});
  window.addEventListener('resize',()=>{lastRenderedStart=-1;lastRenderedEnd=-1;scheduleRender();});
  $('searchToggle').addEventListener('click',()=>{const opening=searchForm.hidden;searchForm.hidden=!opening;$('searchToggle').setAttribute('aria-expanded',String(opening));if(opening)searchInput.focus();});
  searchForm.addEventListener('submit',(event)=>{event.preventDefault();try{const id=canonicalId(searchInput.value);searchError.textContent='';openProfile(id);searchForm.hidden=true;$('searchToggle').setAttribute('aria-expanded','false');}catch(error){searchError.textContent=error.message;searchInput.focus();}});
  function openProfile(id) {
    id=canonicalId(id);const p=getProfile(id);currentDetailId=id;lastFocused=document.activeElement;
    $('detailId').textContent='#'+id;$('detailName').textContent=p.name;$('detailBio').textContent=p.bio;
    const portrait=$('detailPortrait');portrait.replaceChildren(makeMedia(p,'detail-media'));
    const media=portrait.firstElementChild;media.style.width='100%';media.style.aspectRatio='3 / 4';media.style.objectFit='cover';media.style.borderRadius='15px';
    const tags=$('detailTags');tags.replaceChildren();[p.aesthetic,p.occupation,...p.interests].slice(0,5).forEach(t=>{const span=document.createElement('span');span.className='tag';span.textContent=t;tags.append(span);});
    const post=configuredPosts.get(id);if(post){const para=document.createElement('p');para.textContent=post;$('detailBio').append(document.createTextNode(' '+post));}
    profileDialog.hidden=false;$('nextProfile').focus();
  }
  $('nextProfile').addEventListener('click',()=>openProfile(incrementDecimal(currentDetailId||'1')));
  function closeDialog(dialog) { if(dialog===mediaDialog){if(activeMedia&&activeMedia.tagName==='VIDEO')activeMedia.pause();mediaStage.replaceChildren();activeMedia=null;}dialog.hidden=true;if(lastFocused&&typeof lastFocused.focus==='function')lastFocused.focus(); }
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>closeDialog($(btn.dataset.close))));
  $('detailPortrait').addEventListener('click',()=>{if(currentDetailId)openMedia(getProfile(currentDetailId));});
  function openMedia(profile) { lastFocused=document.activeElement;mediaStage.replaceChildren();const m=makeMedia(profile,'viewer-media');m.className='viewer-media';m.style.maxWidth='100%';m.style.maxHeight='100%';m.style.objectFit='contain';m.style.transform='scale(1) rotate(0deg)';if(m.tagName==='VIDEO'){m.controls=true;m.preload='metadata';m.muted=false;}else{m.draggable=false;}activeMedia=m;zoom=1;rotation=0;mediaStage.append(m);mediaDialog.hidden=false;$('zoomReset').focus(); }
  $('zoomIn').addEventListener('click',()=>{zoom=Math.min(5,zoom+.25);applyTransform();});$('zoomOut').addEventListener('click',()=>{zoom=Math.max(.5,zoom-.25);applyTransform();});$('zoomReset').addEventListener('click',()=>{zoom=1;rotation=0;applyTransform();});$('rotateMedia').addEventListener('click',()=>{rotation=(rotation+90)%360;applyTransform();});
  function applyTransform(){if(activeMedia)activeMedia.style.transform=`scale(${zoom}) rotate(${rotation}deg)`;}
  $('fullscreenMedia').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await mediaDialog.requestFullscreen();else await document.exitFullscreen();}catch(error){console.info('Fullscreen is not available.',error);}});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){if(!mediaDialog.hidden)closeDialog(mediaDialog);else if(!profileDialog.hidden)closeDialog(profileDialog);else if(!searchForm.hidden){searchForm.hidden=true;$('searchToggle').setAttribute('aria-expanded','false');$('searchToggle').focus();}}});
  // Exported pure helpers make the actual generator and exact-ID rules testable without a browser.
  window.LUNAVYRA_TEST_API={canonicalId,incrementDecimal,decrementDecimal,generatedProfile,parseProfiles,hashString,constants:{ROW_HEIGHT,WINDOW_HEIGHT,RECENTER_HIGH,RECENTER_LOW,SHIFT_PIXELS}};
  loadData();scheduleRender();
})();
