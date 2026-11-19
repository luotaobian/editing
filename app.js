const works = {
  'mask-stick': {title:'棒状面膜 · 省事直涂',category:'美妆带货 / 素材剪辑练习',src:'assets/mask-stick.mp4',poster:'assets/mask-turn.jpg',portrait:true,note:'“一转”“一涂”分别落在旋出膏体和上脸的动作上。'},
  'ai-question': {title:'AI 选股 · 先换个问法',category:'知识口播 / 素材剪辑练习',src:'assets/ai-question.mp4',poster:'assets/ai-question-card.jpg',portrait:true,note:'讲者提到回测时，提问卡逐项补上条件和时间范围。'},
  'olay-short': {title:'OLAY · 母女护肤口播',category:'复刻练习 · 非品牌委托',src:'assets/olay-short.mp4',poster:'assets/olay-short-poster.jpg',portrait:true,note:'按参考片复刻人物窗口，用两层字幕区分对白与重点词。'},
  jacket: {title:'肌理翻领外套',category:'商品剪辑练习 · 非品牌委托',src:'assets/jacket-short.mp4',poster:'assets/jacket-short-poster.jpg',portrait:true,note:'从面料、翻领特写切到多色挂拍，最后给出选色选码提示。'},
  education: {title:'别让孩子一个人承担',category:'知识口播 / 素材剪辑练习',src:'assets/education-short.mp4',poster:'assets/education-short-poster.jpg',portrait:true,note:'用重点字幕带出“陪伴”的建议，片尾用文字收住话题。'},
  olay: {title:'OLAY · 母女抗老实测 · 自制包装版',category:'自制包装练习 · 非品牌委托',src:'assets/olay-web.mp4',poster:'assets/olay-poster.jpg',portrait:true,note:'同一组素材重新设计画面包装，声音沿用参考片混音。'},
  gap: {title:'罅隙 G A P · 剪辑分析节选',category:'团队短片 / 英文分析节选',src:'assets/gap-analysis.mp4',poster:'assets/gap-poster.jpg',portrait:false,note:'我负责编导、剪辑、调色与声音后期。节选拆解动作衔接与人物反应镜头。'}
};
const shortOrder = ['mask-stick','ai-question','olay-short','jacket','education'];
// Exact release sizes also detect truncated files or a host that returns an HTML page.
const smallMedia = {
  'mask-stick': {file:'assets/mask-stick-lite.mp4', bytes:458313},
  'ai-question': {file:'assets/ai-question-lite.mp4', bytes:692359},
  'olay-short': {file:'assets/olay-short-mobile.mp4', bytes:3438607},
  jacket: {file:'assets/jacket-short-mobile.mp4', bytes:721185},
  education: {file:'assets/education-short-mobile.mp4', bytes:2479888},
  olay: {file:'assets/olay-web-mobile.mp4', bytes:8718899},
  gap: {file:'assets/gap-analysis-mobile.mp4', bytes:6518739}
};
const dialog = document.querySelector('#video-dialog');
const video = document.querySelector('#portfolio-video');
const error = document.querySelector('#player-error');
const status = document.querySelector('#player-status');
const navigation = document.querySelector('#player-navigation');
const previous = document.querySelector('#previous-video');
const next = document.querySelector('#next-video');
const variant = document.querySelector('#player-variant');
const bufferButton = document.querySelector('#buffer-video');
const canBuffer = /^https?:$/.test(location.protocol) && typeof fetch === 'function' &&
  typeof AbortController === 'function' && typeof URL.createObjectURL === 'function';
let lastTrigger;
let currentKey;
let loadRevision = 0;
let download;
let blobUrl;
let playbackSource;
let resumeTime = 0;
let pendingSeek;

function showStatus(message) {
  status.textContent = message;
  status.hidden = !message;
}
function stopDownload() {
  download?.abort();
  download = null;
}
function releaseBuffer() {
  stopDownload();
  if (blobUrl) URL.revokeObjectURL(blobUrl);
  blobUrl = null;
  pendingSeek = null;
}
function playCurrent() {
  const revision = loadRevision;
  const source = video.getAttribute('src');
  video.play().catch(reason => {
    if (revision !== loadRevision || !dialog.open ||
        source !== video.getAttribute('src') || reason.name === 'AbortError') return;
    if (reason.name === 'NotAllowedError') {
      showStatus(blobUrl ? '缓冲完成，点击播放。' : '点击画面上的播放按钮开始观看。');
      if (blobUrl) {
        bufferButton.textContent = '播放已缓冲视频';
        bufferButton.hidden = false;
      }
    } else {
      error.hidden = false;
    }
  });
}
function restoreSource(source) {
  pendingSeek = resumeTime > 0 ? {source, time:resumeTime} : null;
  video.src = source;
}
video.addEventListener('loadedmetadata', () => {
  if (!pendingSeek || pendingSeek.source !== video.getAttribute('src')) return;
  video.currentTime = Math.min(pendingSeek.time, video.duration || pendingSeek.time);
  pendingSeek = null;
});

// Confirm that a requested slice belongs at the specified offset before joining it.
async function downloadSmallVideo(media, controller, onProgress) {
  const signal = controller.signal;
  const chunkSize = 192 * 1024;
  const parts = [];
  const received = [];
  let wholeFile;

  async function getPart(index) {
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, media.bytes) - 1;
    const response = await fetch(media.file, {
      headers:{Range:`bytes=${start}-${end}`}, signal, credentials:'same-origin'
    });
    const whole = response.status === 200;
    const expected = whole ? media.bytes : end - start + 1;
    if (!whole && (response.status !== 206 ||
        response.headers.get('Content-Range') !== `bytes ${start}-${end}/${media.bytes}`)) {
      throw new Error('Range mismatch');
    }
    const length = response.headers.get('Content-Length');
    if (length !== null && Number(length) !== expected) throw new Error('Length mismatch');
    let bytes;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      bytes = new Uint8Array(expected);
      let offset = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        bytes.set(value, offset);
        offset += value.length;
        received[index] = offset;
        onProgress(whole ? offset : received.reduce((sum, n) => sum + n, 0));
      }
      if (offset !== expected) throw new Error('Incomplete response');
    } else {
      bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length !== expected) throw new Error('Incomplete response');
      received[index] = expected;
      onProgress(whole ? expected : received.reduce((sum, n) => sum + n, 0));
    }
    if (start === 0 || whole) {
      if (String.fromCharCode(...bytes.subarray(4, 8)) !== 'ftyp') throw new Error('Invalid MP4');
    }
    if (whole) wholeFile = bytes;
    else parts[index] = bytes;
  }
  // Discover Range support before issuing parallel requests.
  await getPart(0);
  if (!wholeFile) {
    const count = Math.ceil(media.bytes / chunkSize);
    let nextPart = 1;
    async function worker() {
      while (!wholeFile && !signal.aborted && nextPart < count) {
        await getPart(nextPart++);
        // A server may stop honoring ranges. One verified full body is sufficient.
        if (wholeFile) controller.abort();
      }
    }
    try {
      await Promise.all(Array.from({length:Math.min(3, count - 1)}, worker));
    } catch (reason) {
      if (!wholeFile) throw reason;
    }
    if (!wholeFile && (signal.aborted || parts.length !== count)) throw new Error('Incomplete file');
  }
  return new Blob(wholeFile ? [wholeFile] : parts, {type:'video/mp4'});
}

bufferButton.addEventListener('click', async () => {
  if (blobUrl) { playCurrent(); return; }
  if (download) {
    stopDownload();
    restoreSource(playbackSource);
    bufferButton.textContent = '先缓冲再播放';
    showStatus('已取消缓冲，可点击画面播放。');
    return;
  }
  const media = smallMedia[currentKey];
  if (!media || !canBuffer || !dialog.open) return;
  const controller = new AbortController();
  const revision = loadRevision;
  download = controller;
  // Repeated attempts before metadata arrives must retain the original seek point.
  if (!pendingSeek && video.readyState >= 1) resumeTime = video.ended ? 0 : video.currentTime;
  video.pause();
  video.removeAttribute('src');
  video.load();
  pendingSeek = null;
  error.hidden = true;
  bufferButton.textContent = '取消缓冲';
  showStatus('正在缓冲 0%');
  const current = () => download === controller && loadRevision === revision && dialog.open;
  let progress = 0;
  let inactivityTimer;
  function resetTimeout() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => controller.abort(), 45000);
  }
  resetTimeout();
  try {
    const blob = await downloadSmallVideo(media, controller, received => {
      if (!current()) return;
      resetTimeout();
      const percent = Math.min(99, Math.floor(received * 100 / media.bytes));
      if (percent > progress) {
        progress = percent;
        showStatus(`正在缓冲 ${percent}%`);
      }
    });
    if (!current()) return;
    blobUrl = URL.createObjectURL(blob);
    download = null;
    bufferButton.hidden = true;
    restoreSource(blobUrl);
    showStatus('缓冲完成。');
    playCurrent();
  } catch {
    if (!current()) return;
    stopDownload();
    restoreSource(playbackSource);
    bufferButton.textContent = '重试缓冲';
    showStatus('缓冲中断，可重试或点击画面直接播放。');
  } finally {
    clearTimeout(inactivityTimer);
  }
});

function shortIndex(){return shortOrder.indexOf(currentKey === 'olay' ? 'olay-short' : currentKey);}
function showWork(key, trigger){
  const work = works[key];
  if(!work)return;
  if(!dialog.open)lastTrigger = trigger || document.activeElement;
  currentKey = key;
  ++loadRevision;
  video.pause();
  releaseBuffer();
  resumeTime = 0;
  document.querySelector('#player-title').textContent = work.title;
  document.querySelector('#player-category').textContent = work.category;
  document.querySelector('#player-note').textContent = work.note;
  // Small screens and touch devices use the lighter copy for inline playback.
  const lightPlayback = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches || navigator.connection?.saveData;
  const direct = document.querySelector('#video-direct');
  direct.href = work.src;
  direct.textContent = '单独打开高清版 ↗';
  playbackSource = lightPlayback ? smallMedia[key].file : work.src;
  video.src = playbackSource;
  bufferButton.hidden = !canBuffer;
  bufferButton.textContent = '先缓冲再播放';
  video.poster = work.poster;
  video.classList.toggle('portrait',work.portrait);
  video.setAttribute('aria-label',work.title);
  error.hidden = true;
  status.hidden = true;
  const index = shortIndex();
  navigation.hidden = index < 0;
  previous.disabled = index <= 0;
  next.disabled = index < 0 || index >= shortOrder.length - 1;
  document.querySelector('#player-position').textContent = index < 0 ? '' : `短视频 ${index + 1} / ${shortOrder.length}`;
  variant.hidden = key !== 'olay' && key !== 'olay-short';
  variant.textContent = key === 'olay' ? '切换到 0:54 复刻版 ↗' : '切换到 2:09 自制包装版 ↗';
  if(!dialog.open)dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('player-open');
  playCurrent();
}
for(const trigger of document.querySelectorAll('[data-play]')){
  trigger.addEventListener('click',()=>showWork(trigger.dataset.play,trigger));
}
previous.addEventListener('click',()=>{const index=shortIndex();if(index>0)showWork(shortOrder[index-1]);});
next.addEventListener('click',()=>{const index=shortIndex();if(index>=0 && index<shortOrder.length-1)showWork(shortOrder[index+1]);});
variant.addEventListener('click',()=>showWork(currentKey === 'olay' ? 'olay-short' : 'olay'));
function closePlayer(){dialog.close();}
document.querySelector('#close-player').addEventListener('click',closePlayer);
dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const bounds=dialog.getBoundingClientRect();
  if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom)closePlayer();
});
dialog.addEventListener('close',()=>{
  if(dialog.open)return;
  ++loadRevision;
  video.pause();
  video.removeAttribute('src');
  video.load();
  releaseBuffer();
  document.body.classList.remove('player-open');
  lastTrigger?.focus({preventScroll:true});
});
video.addEventListener('error',()=>{if(dialog.open && video.getAttribute('src') && video.error)error.hidden=false;});
video.addEventListener('ended',()=>{
  status.textContent = shortIndex()>=0 && !next.disabled ? '本条已播放完，可选择下一条作品。' : '本条已播放完。';
  status.hidden = false;
});
video.addEventListener('playing',()=>{
  if (download) return;
  status.hidden = true;
  error.hidden = true;
  if (blobUrl) bufferButton.hidden = true;
});
const copyButton = document.querySelector('#copy-email');
copyButton.addEventListener('click',async()=>{
  const email='luotaobian@gmail.com';
  const copyStatus=document.querySelector('#copy-status');
  try {
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(email);
    else {
      const field=document.createElement('textarea');
      field.value=email;field.style.position='fixed';field.style.opacity='0';
      document.body.append(field);field.select();
      const copied=document.execCommand('copy');field.remove();
      if(!copied)throw new Error('copy unavailable');
    }
    copyStatus.textContent='邮箱已复制：'+email;
    copyButton.innerHTML='已复制 <span aria-hidden="true">✓</span>';
  } catch {copyStatus.textContent='请长按或选择邮箱地址复制：'+email;}
});
