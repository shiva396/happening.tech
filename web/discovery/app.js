import {createDiscovery, filterKeys, isPast} from './state.js';

const $ = selector=>document.querySelector(selector);
const $$ = selector=>[...document.querySelectorAll(selector)];
const reaction = (type,extra={})=>document.dispatchEvent(new CustomEvent('atlas:reaction',{detail:{type,...extra}}));
const base = target=>new URL(target,document.baseURI).href;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let motion;
try { motion=localStorage.getItem('flutter.spot.motion') !== 'off'; } catch { motion=true; }
function animate(){return motion && !reduced.matches;}
function node(tag,text,cls) {
  const el=document.createElement(tag);
  if(text)el.textContent=text;
  if(cls)el.className=cls;
  return el;
}

function initDirectory() {
  const query=$('#community-query'), country=$('#community-country');
  if(!query) return;
  const rows=$$('[data-directory-id]');
  function apply(){
    let visible=0;
    for(const row of rows){
      const data=row.dataset;
      row.hidden=Boolean(country.value && data.country!==country.value) ||
        ![data.name,data.place].join(' ').toLowerCase().includes(query.value.trim().toLowerCase());
      if(!row.hidden)visible++;
    }
    $('#community-empty').hidden=visible>0;
    const url=new URL(location.href);
    for(const [k,val] of [['country',country.value],['q',query.value]]) {
      if(val)url.searchParams.set(k,val); else url.searchParams.delete(k);
    }
    history.replaceState(null,'',url);
  }
  const params=new URLSearchParams(location.search);
  country.value=params.get('country')||'';query.value=params.get('q')||'';
  query.addEventListener('input',apply);country.addEventListener('change',apply);apply();
}

function initAtlas({events, communities}) {
  const stage=$('.atlas-earth'), archive=$('#program').dataset.archive==='true';
  const state=createDiscovery(events,communities,archive);
  const cards=new Map($$('[data-event]').map(el=>[el.dataset.event,el]));
  const eventIndex=new Map(events.map(e=>[e.id,e]));
  const groupIndex=new Map(communities.map(c=>[c.id,c]));
  const preview=$('#world-preview');
  let globe, places=[], cameraTarget=null, lastSelection='', previousEmpty;
  const filters=$$('[data-filter]'), tabs=$$('[data-period]');
  const search=$('#locate'), locator=$('.locator');
  const closeLocator=()=>{if(locator)locator.open=false;};

  function go(mode) {
    if(mode==='world' && !stage) {location.href=base('./'+location.search+'#world');return;}
    if(state.current.mode!==mode || location.hash!=='#'+mode)state.update({mode},true);
    document.getElementById(mode)?.scrollIntoView({behavior:animate()?'smooth':'instant'});
    reaction(mode);
  }
  function focus(place) {
    if(!stage){
      const params=new URLSearchParams({[place.kind]:place.id});
      location.href=base('./?'+params+'#world');return;
    }
    closeLocator();
    state.select(place);
    go('world');
  }
  function button(text,action,cls='pill'){
    const result=node('button',text,cls);result.type='button';result.addEventListener('click',action);return result;
  }
  function link(text,href,cls){
    const result=node('a',text,cls);result.href=href;return result;
  }
  function drawPreview(s, selected) {
    if(!preview)return;
    const key=[s.event,s.community,s.country,s.city].join('|');
    if(lastSelection===key)return;
    lastSelection=key;
    preview.replaceChildren();
    preview.hidden=!selected && !s.country && !s.city;
    if(preview.hidden)return;
    const close=button('×',()=>{state.clear();$('.locator summary')?.focus({preventScroll:true});},'preview-close');
    close.setAttribute('aria-label','Close place preview');
    const isEvent=selected?.kind==='event';
    const locality=[s.city,s.country].filter(Boolean).join(', ');
    const title=selected?.title || locality;
    const copy=node('div',null,'preview-copy');
    copy.append(node('small',isEvent?selected.category:selected?'Community':'Location','field-label'),node('h3',title));
    if(isEvent) {
      copy.append(node('p',selected.date+' · '+selected.location));
      const actions=node('div',null,'preview-actions');
      actions.append(link(selected.registration && !isPast(selected)?'Register':'Event details',selected.registration && !isPast(selected)?selected.registration:base('events/'+selected.id+'/'),'text-link'),
        link(selected.community,base('communities/'+selected.communityId+'/'),'text-link'));
      copy.append(actions);
    } else {
      if(selected)copy.append(node('p',[selected.city,selected.country].filter(Boolean).join(', ')));
      const actions=node('div',null,'preview-actions');
      actions.append(button('See events',()=>go('program'),'text-link'));
      if(selected)actions.append(link('Community profile',base('communities/'+selected.id+'/'),'text-link'));
      copy.append(actions);
    }
    if(selected?.artwork) {const image=node('img');image.src=base(selected.artwork);image.alt='';preview.append(image);}
    preview.append(copy,close);
  }

  function render(s) {
    const now=Date.now();
    const matches=state.filtered(now);
    const ids=new Set(matches.map(e=>e.id));
    for(const [id,el] of cards)el.hidden=!ids.has(id);
    const grid=$('.event-grid');
    const ordered=s.period==='past'?[...matches].reverse():matches;
    if(grid && ordered.some((e,i)=>grid.children[i]!==cards.get(e.id))) {
      for(const e of [...ordered].reverse())grid.prepend(cards.get(e.id));
    }
    for(const field of filters)if(field.value!==s[field.dataset.filter])field.value=s[field.dataset.filter];
    for(const tab of tabs){const active=tab.dataset.period===s.period;tab.classList.toggle('current',active);if(active)tab.setAttribute('aria-current','true');else tab.removeAttribute('aria-current');}
    $('#program-count').textContent=matches.length+' '+(matches.length===1?'event':'events');
    $('#event-empty').hidden=matches.length>0;
    $('#clear-active').hidden=!filterKeys.some(k=>s[k]) && !s.community;
    if(previousEmpty===false && !matches.length)reaction('empty');
    previousEmpty=!matches.length;
    const total=$('#upcoming-total');
    if(total) total.textContent=events.filter(e=>!isPast(e,now) && e.status!=='cancelled').length;
    places=state.places(matches,now);
    const selected=eventIndex.get(s.event) || groupIndex.get(s.community);
    if(selected?.latitude!=null && !places.some(p=>p.id===selected.id))places.push(selected);
    globe?.setPlaces(places);
    const target=selected || ((s.city || s.country) && places.find(p=>(!s.country||p.country===s.country) && (!s.city||p.city===s.city)));
    if(target && target.latitude != null && cameraTarget!==target.id) {
      if(globe) {globe.focus(target);cameraTarget=target.id;}
      reaction(selected?.kind || 'country');
    } else if(!target) cameraTarget=null;
    drawPreview(s,selected);
  }
  state.subscribe(render);
  for(const field of filters) {
    field.addEventListener(field.type==='search'?'input':'change',()=>{
      const patch={[field.dataset.filter]:field.value,event:'',community:''};
      if(field.dataset.filter==='country') {patch.city='';reaction('country');}
      state.update(patch);
    });
  }
  for(const el of $$('[data-clear]'))el.addEventListener('click',()=>state.clear());
  for(const el of tabs)el.addEventListener('click',e=>{e.preventDefault();state.update({period:el.dataset.period,event:''},true);});
  for(const el of $$('[data-on-map]'))el.addEventListener('click',e=>{e.preventDefault();focus(eventIndex.get(el.dataset.onMap));});
  for(const el of $$('[data-view]'))el.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();go(el.dataset.view);});

  if(search) {
    const list=$('#location-results');
    const options=[], seen=new Set();
    for(const place of [...communities,...events].filter(p=>p.latitude !=null)){
      for(const candidate of [
        {kind:'location',title:place.country,country:place.country,city:''},
        {kind:'location',title:place.city,city:place.city,country:place.country},place,
      ]) {
        const key=[candidate.kind,candidate.title,candidate.country].join('|');
        if(!candidate.title||seen.has(key))continue;
        seen.add(key);options.push(candidate);
      }
    }
    function suggestions(){
      const term=search.value.trim().toLowerCase();
      const result=options.filter(p=>[p.title,p.city,p.country].join(' ').toLowerCase().includes(term)).slice(0,8);
      list.replaceChildren(...result.map(place=>{
        const b=button(place.title,()=>focus(place),'locator-result');
        b.append(node('small',place.kind==='location'?(place.city?place.country:'Country'):place.kind));
        return b;
      }));
      if(!result.length)list.append(node('p','No matching places. Try a country or community name.'));
    }
    search.addEventListener('input',suggestions);
    locator.addEventListener('toggle',()=>{if(locator.open){suggestions();search.focus({preventScroll:true});}});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if(locator.open){closeLocator();locator.querySelector('summary').focus();}$$('.extra-filters[open]').forEach(x=>x.open=false);}
      if(e.key==='/' && !e.ctrlKey && !e.metaKey && !['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();locator.open=true;search.focus();}
    });
    document.addEventListener('pointerdown',e=>{for(const d of [locator,$('.extra-filters')])if(d?.open && !d.contains(e.target))d.open=false;});
  }
  function applyMotion() {
    document.documentElement.dataset.motion=animate()?'on':'off';
    globe?.setMotion(animate());reaction('motion',{enabled:animate()});
    const b=$('[data-camera="motion"]');
    if(b){const label=animate()?'Pause animations':'Enable animations';b.title=label;b.setAttribute('aria-label',label);
      b.setAttribute('aria-pressed',String(!animate()));b.querySelector('use').setAttribute('href',base('art/icons.svg')+(animate()?'#pause':'#play'));
      b.disabled=reduced.matches;}
  }
  applyMotion();reduced.addEventListener('change',applyMotion);
  if(stage) {
    const start=async()=>{
      try {
        const {mountWorld}=await import('../world/world.js');
        globe=await mountWorld(stage,{places,onSelect:focus,onCountry:country=>{if(country)state.select({kind:'location',country});},
          onRevolution:()=>reaction('orbit'),onCamera:({latitude,longitude})=>{
            const el=$('.coordinates');
            const label=Math.abs(latitude).toFixed(1)+'° '+(latitude>=0?'N':'S')+'  /  '+Math.abs(longitude).toFixed(1)+'° '+(longitude>=0?'E':'W');
            if(el.textContent!==label)el.textContent=label;
          }});
        render(state.current);applyMotion();
      } catch {stage.dataset.fallback='true';}
    };
    new IntersectionObserver((entries,obs)=>{if(entries.some(e=>e.isIntersecting)){obs.disconnect();void start();}},{rootMargin:'300px'}).observe(stage);
    for(const btn of $$('[data-camera]'))btn.addEventListener('click',()=>{
      switch(btn.dataset.camera){
        case 'in':globe?.zoomBy(1.35);break;
        case 'out':globe?.zoomBy(1/1.35);break;
        case 'reset':state.clear();globe?.reset();break;
        case 'motion':motion=!motion;try{localStorage.setItem('flutter.spot.motion',motion?'on':'off');}catch{}applyMotion();break;
      }
    });
    import('../dash/dash.js').then(applyMotion).catch(()=>{});
    window.addEventListener('pagehide',e=>{if(!e.persisted)globe?.destroy();});
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render(state.current);});
  // Long-lived tabs should move a finished event to the archive without a refresh.
  setInterval(()=>{if(!document.hidden)render(state.current);},60000);
}

initDirectory();
const data=$('#atlas-data');
if(data)initAtlas(JSON.parse(data.textContent));
document.documentElement.classList.add('interactive');
