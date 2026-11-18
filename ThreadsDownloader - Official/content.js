(() => {
  'use strict';
  if (window.__threadsDownloader151) return;
  window.__threadsDownloader151=true;
  const selector='article, [data-pressable-container="true"], [data-testid="post-container"]';
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';
  const valid = value => {try {const u=new URL(value,location.href); return u.protocol==='https:' && /(^|\.)(threads\.(?:com|net)|instagram\.com|cdninstagram\.com|fbcdn\.net)$/.test(u.hostname)?u.href:null;}catch{return null;}};
  const extensionOf = (url,type) => {const m=new URL(url).pathname.match(/\.(mp4|webm|mov|jpe?g|png|webp|gif)$/i);return m?m[1].toLowerCase().replace('jpeg','jpg'):(type==='video'?'mp4':'jpg');};
  let enabled=true,scanTimer;
  chrome.storage.local.get({enabled:true},v=>{enabled=v.enabled!==false;scan();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.enabled){enabled=changes.enabled.newValue!==false;document.querySelectorAll('.threads-dl-action').forEach(b=>b.hidden=!enabled);scan();}});
  const toast = message => {document.querySelector('.threads-dl-toast')?.remove();const el=document.createElement('div');el.className='threads-dl-toast';el.textContent=message;document.documentElement.append(el);setTimeout(()=>el.remove(),4500);};
  function codeFromUrl(href) {try {const u=new URL(href,location.href);if(!/^threads\.(com|net)$/.test(u.hostname)&&!u.hostname.endsWith('.threads.com')&&!u.hostname.endsWith('.threads.net'))return null;return u.pathname.match(/\/(?:@[^/]+\/)?post\/([\w-]+)/i)?.[1] || u.pathname.match(/\/t\/([\w-]+)/i)?.[1] || null;}catch{return null;}}
  function postRef(root) {
    const links=[...root.querySelectorAll('a[href]')].filter(a=>!a.closest('.threads-dl-action'));
    // Prefer a timestamp/permalink, rather than a quoted/nested post.
    for (const a of links) if(a.querySelector('time')||a.closest('time')||a.getAttribute('aria-label')?.match(/ago|hour|minute|day/i)){const code=codeFromUrl(a.href);if(code)return {code,url:a.href};}
    const own=links.map(a=>({code:codeFromUrl(a.href),url:a.href})).find(x=>x.code);
    if(own)return own;
    const current=codeFromUrl(location.href);return current?{code:current,url:location.href}:null;
  }
  const isObject=v=>v!==null&&typeof v==='object';
  function normalizedMedia(node) {
    const media=[],keys=new Set();
    function add(url,type,width=0,height=0) {const src=valid(url);if(!src)return;const key=type+':'+src;if(keys.has(key))return;keys.add(key);media.push({url:src,type,width:Number(width)||0,height:Number(height)||0});}
    // Skip quoted, reposted or unrelated posts. Only inspect the matched post's media slots.
    const image = value => {if(typeof value==='string'){add(value,'image');return;}if(!isObject(value))return;const candidates=[value.url,value.src,value.display_url,value.image_url,value.candidates?.[0]?.url];for(const u of candidates)if(typeof u==='string')add(u,'image',value.width,value.height);};
    function video(value) {if(!isObject(value))return;const variants=[...(Array.isArray(value.video_versions)?value.video_versions:[]),...(Array.isArray(value.video_resources)?value.video_resources:[])];for(const v of variants)if(isObject(v))add(v.url||v.src,'video',v.width,v.height);if(typeof value.video_url==='string')add(value.video_url,'video',value.video_width,value.video_height);if(typeof value.video_src==='string')add(value.video_src,'video');}
    function one(value) {
      if(!isObject(value))return;
      video(value);
      if(value.image_versions2?.candidates)for(const candidate of value.image_versions2.candidates)image(candidate);
      if(value.image_versions?.candidates)for(const candidate of value.image_versions.candidates)image(candidate);
      if(value.image_url)image(value.image_url);
      if(value.display_url)image(value.display_url);
      if(value.carousel_media && Array.isArray(value.carousel_media))for(const slide of value.carousel_media)one(slide);
      if(value.carousel_media_items && Array.isArray(value.carousel_media_items))for(const slide of value.carousel_media_items)one(slide);
      const inline=value.text_post_app_info?.linked_inline_media;
      if(Array.isArray(inline)){for(const item of inline)one(item);}else if(isObject(inline)){one(inline);}
    }
    one(node.post || node);
    if (node.media && node.media !== node.post) one(node.media);
    // Deduplicate variants: choose the largest explicitly dimensioned video, not the first.
    const videos=media.filter(x=>x.type==='video').sort((a,b)=>(b.width*b.height)-(a.width*a.height));
    const images=media.filter(x=>x.type==='image').sort((a,b)=>(b.width*b.height)-(a.width*a.height));
    // For single video, the image is generally only its poster/thumbnail.
    if(videos.length && !node.carousel_media?.length && !node.carousel_media_items?.length)return [videos[0]];
    if(videos.length)return [...videos.slice(0,1),...images.slice(0,1)];
    return images.slice(0,1);
  }
  function matchesCode(node,code) {return isObject(node)&&[node.code,node.shortcode,node.short_code,node.post_code].some(v=>v===code);}
  function findExactPosts(parsed,code){
    const matches=[],seen=new WeakSet(),stack=[parsed];let explored=0;
    while(stack.length&&explored++<160000){
      const v=stack.pop();if(!isObject(v)||seen.has(v))continue;seen.add(v);
      if(matchesCode(v,code))matches.push(v);
      if(Array.isArray(v)){for(const x of v)if(isObject(x))stack.push(x);}
      else for(const [k,x] of Object.entries(v)){
        if(k==='logging_info'||k==='tracking'||k==='extensions'||k==='quoted_post'||k==='quoted_posts')continue;
        if(isObject(x))stack.push(x);
      }
    }
    return matches;
  }
  function scriptsToMedia(doc,code){
    const candidates=[];
    for(const script of doc.querySelectorAll('script[type="application/json"]')){
      const source=script.textContent?.trim();
      if(!source||source.length>20000000||!['{','['].includes(source[0]))continue;
      try{
        const data=JSON.parse(source);
        for(const node of findExactPosts(data,code)){
          const media=normalizedMedia(node);
          if(media.length)candidates.push(media);
        }
      }catch(e){console.debug('Threads Downloader: skipped non-JSON script',e);}
    }
    // Duplicate hydrated records are common. Prefer a candidate that supplies a
    // real video URL, then one with more carousel media. Never cross post IDs.
    candidates.sort((a,b)=>
      (b.filter(x=>x.type==='video').length-a.filter(x=>x.type==='video').length) ||
      (b.length-a.length));
    return candidates[0]||[];
  }
  async function fromPostData(ref){
    if(!ref)return [];
    // Inspect the page already being viewed first: it has the correct signed-in
    // hydrated data even when a separate request yields a lightweight response.
    const onPage=scriptsToMedia(document,ref.code);
    if(onPage.some(x=>x.type==='video'))return onPage;
    let response;
    try{
      response=await fetch(ref.url,{
        credentials:'include',redirect:'follow',cache:'no-store',
        headers:{Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}
      });
      if(!response.ok)throw Error('HTTP '+response.status);
      const doc=new DOMParser().parseFromString(await response.text(),'text/html');
      const fetched=scriptsToMedia(doc,ref.code);
      return fetched.some(x=>x.type==='video')?fetched:(onPage.length?onPage:fetched);
    }catch(e){
      console.warn('Threads Downloader: fetching post data failed',e);
      return onPage;
    }
  }
  function domMedia(root){
    const videos=[...root.querySelectorAll('video')];const found=[];
    for(const v of videos){const urls=[v.currentSrc,v.src,...[...v.querySelectorAll('source')].map(s=>s.src)].map(valid).filter(Boolean);if(urls.length)found.push({url:urls[0],type:'video'});}
    if(videos.length){ // Never save the video's cover image as a fake video.
      return found;
    }
    const images=[...root.querySelectorAll('img')].filter(img=>{const r=img.getBoundingClientRect();return r.width>=110&&r.height>=100&&!img.closest('[data-testid*="video" i], [data-video]');}).map(img=>({url:valid(img.currentSrc||img.src),type:'image'})).filter(x=>x.url);
    return [...new Map(images.map(x=>[x.url,x])).values()];
  }
  const hasMedia=root=>!!root.querySelector('video, img[src*="cdninstagram"], img[src*="fbcdn"], img[src*="instagram"]');
  function findActionRow(root){
    const nodes=[...root.querySelectorAll('button,[role="button"]')].filter(n=>!n.closest('.threads-dl-action'));
    const actions=nodes.filter(n=>/like|reply|comment|repost|share|send/i.test([n.getAttribute('aria-label'),n.getAttribute('title'),n.getAttribute('data-testid')].join(' ')));
    const last=actions.at(-1);if(last?.parentElement&&root.contains(last.parentElement))return {parent:last.parentElement,after:last};
    const candidates=[...root.querySelectorAll('div')].filter(n=>{const r=n.getBoundingClientRect(),p=root.getBoundingClientRect();return r.width>100&&r.height>=25&&r.height<=75&&r.top>p.top+p.height*.55&&[...n.children].filter(c=>c.matches('button,[role="button"]')||c.querySelector('svg')).length>=3;});
    const row=candidates.at(-1);return row?{parent:row,after:row.lastElementChild}:{parent:root,after:null};
  }
  async function download(root,button){
    button.disabled=true;
    try {
      let media=[];
      const ref=postRef(root);
      if(ref)try{media=await fromPostData(ref);}catch(e){console.warn('Threads Downloader post data:',e);}
      if(!media.length)media=domMedia(root);
      // If videos exist but the post data cannot resolve them, don't download their poster images.
      if(root.querySelector('video')&&!media.some(x=>x.type==='video')){toast('No direct video URL found in this post. Try opening the post itself, then click Download.');return;}
      if(!media.length){toast('No downloadable media found for this post.');return;}
      const stamp=Date.now();let started=0,failed=0;
      for(const [i,item] of media.entries()){
        const filename=`threads_${ref?.code||'post'}_${stamp}_${String(i+1).padStart(2,'0')}.${extensionOf(item.url,item.type)}`;
        try {const result=await chrome.runtime.sendMessage({type:'THREADS_MEDIA_DOWNLOAD',url:item.url,filename});if(result?.error)throw Error(result.error);started++;}catch(e){failed++;console.warn('Threads Downloader:',e);}
      }
      toast(`${started} media download${started===1?'':'s'} started${failed?`, ${failed} failed`:''}.`);
    }finally{button.disabled=false;}
  }
  function add(root){if(root.querySelector('.threads-dl-action')||!hasMedia(root))return;const {parent,after}=findActionRow(root);const button=document.createElement('button');button.type='button';button.className='threads-dl-action';button.setAttribute('aria-label','Download media from this Threads post');button.title='Download post media';button.innerHTML=icon;button.hidden=!enabled;button.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();download(root,button).catch(err=>{button.disabled=false;toast(err.message||'Download error');});},true);if(after?.parentElement===parent)after.after(button);else parent.append(button);}
  function scan(){if(!enabled)return;const roots=[...document.querySelectorAll(selector)];roots.filter(r=>hasMedia(r)&&!roots.some(o=>o!==r&&r.contains(o)&&hasMedia(o))).forEach(add);}
  const observer=new MutationObserver(()=>{clearTimeout(scanTimer);scanTimer=setTimeout(scan,200);});observer.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('scroll',()=>{clearTimeout(scanTimer);scanTimer=setTimeout(scan,200);},{passive:true});scan();
})();
