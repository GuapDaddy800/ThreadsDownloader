'use strict';
const allowedHost = host => /(^|\.)(threads\.(?:com|net)|instagram\.com|cdninstagram\.com|fbcdn\.net)$/.test(host);
const cleanSegment = value => String(value||'').replace(/[^a-zA-Z0-9_.-]/g,'_').replace(/^\.+/,'').slice(0,110);
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== 'THREADS_MEDIA_DOWNLOAD') return;
  (async () => {
    const origin = new URL(sender.url || sender.tab?.url || '');
    if (!/^threads\.(com|net)$/.test(origin.hostname) && !/^([a-z0-9-]+\.)+threads\.(com|net)$/.test(origin.hostname)) throw Error('Downloads must start on Threads.');
    const url = new URL(message.url);
    if (url.protocol !== 'https:' || !allowedHost(url.hostname)) throw Error('Unsupported media host.');
    const filename=cleanSegment(message.filename);
    if (!filename) throw Error('Invalid filename.');
    const opts=await chrome.storage.local.get({askWhere:true,folder:'ThreadsDownloader'});
    // Chrome's downloads API cannot silently pick an arbitrary folder outside Downloads.
    // saveAs lets the user choose the destination with the system picker.
    const path=(String(opts.folder||'ThreadsDownloader').split(/[\/]+/).map(cleanSegment).filter(x=>x&&x!=='.'&&x!=='..').join('/')||'ThreadsDownloader')+'/'+filename;
    const id=await chrome.downloads.download({url:url.href,filename:path,conflictAction:'uniquify',saveAs:opts.askWhere!==false});
    if (typeof id!=='number') throw Error('Browser did not start the download.');
    return {id};
  })().then(reply).catch(e=>reply({error:e.message||String(e)}));
  return true;
});
