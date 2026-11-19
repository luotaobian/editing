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
const dialog = document.querySelector('#video-dialog');
const video = document.querySelector('#portfolio-video');
const error = document.querySelector('#player-error');
const status = document.querySelector('#player-status');
const navigation = document.querySelector('#player-navigation');
const previous = document.querySelector('#previous-video');
const next = document.querySelector('#next-video');
const variant = document.querySelector('#player-variant');
let lastTrigger;
let currentKey;
let loadRevision = 0;

function shortIndex(){return shortOrder.indexOf(currentKey === 'olay' ? 'olay-short' : currentKey);}
function showWork(key, trigger){
  const work = works[key];
  if(!work)return;
  if(!dialog.open)lastTrigger = trigger || document.activeElement;
  currentKey = key;
  const revision = ++loadRevision;
  video.pause();
  document.querySelector('#player-title').textContent = work.title;
  document.querySelector('#player-category').textContent = work.category;
  document.querySelector('#player-note').textContent = work.note;
  // Small screens and touch devices use the lighter copy for inline playback.
  const lightPlayback = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches || navigator.connection?.saveData;
  const direct = document.querySelector('#video-direct');
  direct.href = work.src;
  direct.textContent = lightPlayback ? '单独打开高清版 ↗' : '单独打开视频 ↗';
  video.src = lightPlayback ? work.src.replace(/\.mp4$/, '-mobile.mp4') : work.src;
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
  video.play().catch(reason=>{
    if(revision !== loadRevision || !dialog.open || reason.name === 'AbortError')return;
    if(reason.name === 'NotAllowedError'){
      status.textContent = '点击视频上的播放按钮开始观看。';
      status.hidden = false;
    } else error.hidden = false;
  });
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
  document.body.classList.remove('player-open');
  lastTrigger?.focus({preventScroll:true});
});
video.addEventListener('error',()=>{if(video.getAttribute('src'))error.hidden=false;});
video.addEventListener('ended',()=>{
  status.textContent = shortIndex()>=0 && !next.disabled ? '本条已播放完，可选择下一条作品。' : '本条已播放完。';
  status.hidden = false;
});
video.addEventListener('play',()=>{status.hidden=true;});
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
