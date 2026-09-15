(() => {
  const q=id=>document.getElementById(id);
  const cfg=window.KC_CLOUD_CONFIG || null;
  const $msg=()=>q('cloudMessage');
  let session=null, syncing=false, timer=null;

  const allLocal=()=>{
    const out={version:13,updatedAt:new Date().toISOString(),data:{}};
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k && k.startsWith('kc-') && !['kc-cloud-session','kc-cloud-last-sync'].includes(k)){
        try{ out.data[k]=JSON.parse(localStorage.getItem(k)); }
        catch{ out.data[k]=localStorage.getItem(k); }
      }
    }
    return out;
  };
  const applyLocal=payload=>{
    if(!payload?.data) return;
    Object.entries(payload.data).forEach(([k,v])=>{ if(k.startsWith('kc-')) localStorage.setItem(k,JSON.stringify(v)); });
  };
  const setState=(text,badge='Offline')=>{ if(q('cloudStatusText'))q('cloudStatusText').textContent=text; if(q('cloudBadge'))q('cloudBadge').textContent=badge; };
  const saveSession=s=>{session=s;localStorage.setItem('kc-cloud-session',JSON.stringify(s||null));renderCloud();};
  const getSession=()=>{try{return JSON.parse(localStorage.getItem('kc-cloud-session'))||null}catch{return null}};

  async function req(path,{method='GET',body,auth=true}={}){
    if(!cfg?.url || !cfg?.anonKey) throw new Error('Cloud ist noch nicht eingerichtet.');
    const headers={'apikey':cfg.anonKey,'Content-Type':'application/json'}; if(path.startsWith('/rest/v1/') && method==='POST') headers.Prefer='resolution=merge-duplicates,return=minimal';
    if(auth && session?.access_token) headers.Authorization='Bearer '+session.access_token;
    let r=await fetch(cfg.url+path,{method,headers,body:body?JSON.stringify(body):undefined});
    if(r.status===401 && auth && session?.refresh_token){
      try{
        const rr=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':cfg.anonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
        if(rr.ok){const fresh=await rr.json();saveSession(fresh);headers.Authorization='Bearer '+fresh.access_token;r=await fetch(cfg.url+path,{method,headers,body:body?JSON.stringify(body):undefined});}
      }catch{}
    }
    const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch{j={message:t}};
    if(!r.ok) throw new Error(j.msg||j.message||j.error_description||j.error||'Cloud-Fehler');
    return j;
  }
  async function register(){
    const email=q('cloudEmail')?.value.trim(),password=q('cloudPassword')?.value||'';
    if(!email || password.length<8){$msg().textContent='Bitte E-Mail und mindestens 8 Zeichen Passwort eingeben.';return;}
    try{$msg().textContent='Konto wird erstellt…';const j=await req('/auth/v1/signup',{method:'POST',auth:false,body:{email,password}});if(j.access_token)saveSession(j);$msg().textContent=j.access_token?'Konto erstellt und angemeldet.':'Konto erstellt. Bitte bestätige ggf. die E-Mail und melde dich danach an.';}catch(e){$msg().textContent=e.message;}
  }
  async function login(){
    const email=q('cloudEmail')?.value.trim(),password=q('cloudPassword')?.value||'';
    if(!email||!password)return;
    try{$msg().textContent='Anmeldung…';const j=await req('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}});saveSession(j);$msg().textContent='Angemeldet.';await sync(true);}catch(e){$msg().textContent=e.message;}
  }
  async function logout(){saveSession(null);localStorage.removeItem('kc-cloud-session');$msg().textContent='Abgemeldet. Lokale Daten bleiben erhalten.';}
  async function sync(preferCloud=false){
    if(syncing||!session?.access_token||!cfg?.url)return;syncing=true;setState('Synchronisiere…','Sync');
    try{
      const uid=session.user?.id;if(!uid)throw new Error('Ungültige Sitzung');
      const rows=await req('/rest/v1/user_app_data?user_id=eq.'+encodeURIComponent(uid)+'&select=data,updated_at&limit=1');
      const cloud=Array.isArray(rows)?rows[0]:null;const local=allLocal();
      const cloudTime=cloud?.updated_at?Date.parse(cloud.updated_at):0,localTime=Date.parse(localStorage.getItem('kc-cloud-last-local-change')||0)||0;
      if(cloud && (preferCloud || cloudTime>localTime)){
        applyLocal(cloud.data);localStorage.setItem('kc-cloud-last-local-change',new Date(cloudTime).toISOString());
      }else{
        await req('/rest/v1/user_app_data?on_conflict=user_id',{method:'POST',body:{user_id:uid,data:local,updated_at:new Date().toISOString()}});
      }
      const now=new Date().toISOString();localStorage.setItem('kc-cloud-last-sync',now);setState('Gesichert','Online');if(q('cloudLastSync'))q('cloudLastSync').textContent=new Date(now).toLocaleString('de-DE');if($msg())$msg().textContent='Cloud-Sicherung aktuell.';
      if(typeof render==='function')render();
    }catch(e){setState('Fehler','Offline');if($msg())$msg().textContent=e.message;}
    finally{syncing=false;}
  }
  function scheduleSync(){localStorage.setItem('kc-cloud-last-local-change',new Date().toISOString());if(!session?.access_token)return;clearTimeout(timer);timer=setTimeout(()=>sync(false),1800);}
  function renderCloud(){
    session=getSession();const logged=!!session?.access_token;
    if(q('cloudLoggedOut'))q('cloudLoggedOut').hidden=logged;if(q('cloudLoggedIn'))q('cloudLoggedIn').hidden=!logged;
    if(q('cloudUserEmail'))q('cloudUserEmail').textContent=session?.user?.email||'–';
    const last=localStorage.getItem('kc-cloud-last-sync');if(q('cloudLastSync'))q('cloudLastSync').textContent=last?new Date(last).toLocaleString('de-DE'):'Noch nie';
    if(!cfg?.url){setState('Noch nicht verbunden','Einrichtung');if($msg())$msg().textContent='Cloud-Speicher muss noch mit der App verbunden werden.';return;}
    setState(logged?'Bereit':'Nicht angemeldet',logged?'Online':'Offline');
  }
  const orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){orig.call(this,k,v);if(k?.startsWith('kc-')&&!k.startsWith('kc-cloud-'))scheduleSync();};
  document.addEventListener('DOMContentLoaded',()=>{renderCloud();q('cloudRegister')?.addEventListener('click',register);q('cloudLogin')?.addEventListener('click',login);q('cloudLogout')?.addEventListener('click',logout);q('cloudSyncNow')?.addEventListener('click',()=>sync(false));if(session?.access_token&&cfg?.url)sync(true);});
})();
