(() => {
  'use strict';
  const {Game,clamp,W,H}=CrownEngine;
  const game=new Game(),canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id),overlay=$('overlay'),panel=$('panel');
  const keys={left:false,right:false,jump:false,attack:false};
  let soundOn=false,audio=null,toastTimer=0,last=0,pausedMode='playing',frame=0,flashTimer=0;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pal=GAME_SPRITES.palette;
  const spriteCache=new Map();
  function sprite(rows,x,y,scale=2,flip=false,tint=false){
    if(!rows)return;
    const key=rows.join('');let c=spriteCache.get(key);
    if(!c){c=document.createElement('canvas');c.width=rows[0].length;c.height=rows.length;const s=c.getContext('2d');rows.forEach((r,j)=>{[...r].forEach((p,i)=>{if(pal[p]){s.fillStyle=pal[p];s.fillRect(i,j,1,1);}})});spriteCache.set(key,c);}
    ctx.save();ctx.translate(Math.round(x+(flip?c.width*scale:0)),Math.round(y));if(flip)ctx.scale(-1,1);if(tint)ctx.globalAlpha=.5;ctx.drawImage(c,0,0,c.width*scale,c.height*scale);ctx.restore();
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));}
  function pixelText(text,x,y,size=18,color='#fff',align='left'){ctx.fillStyle=color;ctx.font=`${size}px 'DotGothic16', monospace`;ctx.textAlign=align;ctx.fillText(text,x,y);}
  function star(x,y,size,color,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){const r=i%2?size*.45:size,a=i*Math.PI/5-Math.PI/2;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.restore();}
  function cloud(x,y,s=1){const c=game.stage===0?'#ffffffdf':'#4b5d9680';rect(x,y+12*s,80*s,15*s,c);rect(x+12*s,y,28*s,30*s,c);rect(x+35*s,y-7*s,23*s,34*s,c);rect(x+55*s,y+5*s,16*s,24*s,c);}
  function hills(offset,base,color,height){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-60,H);for(let x=-60;x<W+100;x+=24){const y=base-Math.max(0,Math.sin((x+offset)/210))*height-Math.max(0,Math.sin((x+offset)/97))*height*.2;ctx.lineTo(x,Math.floor(y/8)*8);}ctx.lineTo(W+100,H);ctx.fill();}
  function castle(x,y,scale=1,theme='meadow'){
    const wall=theme==='castle'?'#665674':'#d0a9af',light=theme==='castle'?'#786887':'#e7cbd0',roof=theme==='castle'?'#d27d9c':'#da789c';
    rect(x,y+35*scale,116*scale,94*scale,wall);rect(x+9*scale,y+41*scale,100*scale,82*scale,light);
    for(const dx of [0,88]){rect(x+dx*scale,y,28*scale,130*scale,light);for(let k=0;k<3;k++)rect(x+(dx+k*10)*scale,y-8*scale,8*scale,16*scale,light);rect(x+(dx+9)*scale,y+38*scale,10*scale,20*scale,'#694c74');}
    ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x+27*scale,y+35*scale);ctx.lineTo(x+58*scale,y+1*scale);ctx.lineTo(x+89*scale,y+35*scale);ctx.fill();rect(x+48*scale,y+82*scale,22*scale,47*scale,'#665078');rect(x+54*scale,y+88*scale,10*scale,41*scale,'#8d6a88');
  }
  function background(){
    const theme=game.level.theme,c=game.camera,t=game.time;
    const gradient=ctx.createLinearGradient(0,0,0,H);
    if(theme==='meadow'){gradient.addColorStop(0,'#9cdaea');gradient.addColorStop(1,'#dbf3e6');}
    else if(theme==='night'){gradient.addColorStop(0,'#24385f');gradient.addColorStop(1,'#7778a1');}
    else{gradient.addColorStop(0,'#30233f');gradient.addColorStop(1,'#826078');}
    ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    if(theme==='meadow'){
      rect(764-c*.03,62,37,37,'#ffefb4');rect(757-c*.03,69,51,23,'#ffefb4');
      for(let i=-1;i<8;i++)cloud(i*240-(c*.13%240)+45,65+(i%3)*37,1+(i%2)*.35);
      hills(c*.16,410,'#9bcfc2',135);hills(c*.35,443,'#71bfa5',93);
      castle(2210-c*.75,260,1.25);
      for(let i=-1;i<11;i++){const x=i*135-(c*.5%135);rect(x,391,12,57,'#759e79');rect(x-22,362,57,40,'#86b692');rect(x-12,347,37,66,'#86b692');}
    }else if(theme==='night'){
      for(let i=0;i<42;i++){const x=((i*127+17-c*.06)%W+W)%W,y=25+(i*73)%245;rect(x,y,i%5===0?3:2,2,`rgba(240,237,217,${.4+Math.sin(t*1.2+i)*.25})`);}
      rect(782,64,39,39,'#ffedbd');rect(774,73,55,20,'#ffedbd');rect(798,57,29,29,'#283c65');
      hills(c*.2,435,'#344b75',170);hills(c*.45,447,'#3d576f',83);
      for(let i=-1;i<9;i++){const x=i*180-(c*.32%180);rect(x+30,315,22,133,'#324e62');for(let j=0;j<5;j++){const width=95-j*14;rect(x+42-width/2,365-j*25,width,30,'#355768');}}
      castle(2600-c*.8,240,1.55,'castle');
    }else{
      for(let i=-1;i<9;i++){const x=i*185-(c*.25%185);rect(x,65,39,383,'#352841');rect(x+5,65,7,383,'#48344e');rect(x+16,118,104,170,'#4d3955');rect(x+26,128,84,150,'#e6a0b310');rect(x+61,125,8,160,'#352841');rect(x+24,194,90,8,'#352841');rect(x+59,300,25,12,'#443045');rect(x+66,285,10,15,'#fff0a8');star(x+71,280+Math.sin(t*4+i)*2,10,'#ffcc79');}
      const throneX=1440-c*.65;rect(throneX-65,284,135,164,'#74495f');rect(throneX-55,294,115,154,'#af6580');rect(throneX-48,308,101,134,'#7b435e');rect(throneX-84,385,32,63,'#b78278');rect(throneX+58,385,32,63,'#b78278');star(throneX+5,275,18,'#f4cf79');
      rect(0,425,W,23,'#e599ab17');
    }
  }
  function drawGround(){
    const theme=game.level.theme,c=game.camera;
    for(const r of game.platforms){
      const x=r.x-c;if(x+r.w<0||x>W)continue;
      if(r.ground){
        rect(x,r.y,r.w,r.h,theme==='meadow'?'#b58665':theme==='night'?'#536678':'#69536c');
        for(let ty=r.y+14;ty<H;ty+=30)for(let tx=r.x;tx<r.x+r.w;tx+=40){const px=tx-c;if(px<-50||px>W)continue;rect(px+1+(ty%60===0?20:0),ty,36,26,theme==='meadow'?'#bd916d':theme==='night'?'#617486':'#79617a');rect(px+8,ty+5,5,3,theme==='meadow'?'#d3a27c':theme==='night'?'#718797':'#886e86');}
        rect(x,r.y,r.w,11,theme==='meadow'?'#67ad80':theme==='night'?'#7aa9a5':'#d3999b');rect(x,r.y+10,r.w,5,theme==='meadow'?'#45866b':theme==='night'?'#457b81':'#956c81');
        for(let tx=r.x;tx<r.x+r.w;tx+=19)rect(tx-c,r.y+8,9,7,theme==='meadow'?'#67ad80':theme==='night'?'#7aa9a5':'#d3999b');
      }else{
        rect(x,r.y,r.w,r.h,theme==='castle'?'#ac7c8a':'#bd9c77');rect(x,r.y,r.w,6,theme==='meadow'?'#82b985':theme==='night'?'#a2bdbe':'#e4b8ad');for(let tx=x+3;tx<x+r.w;tx+=27)rect(tx,r.y+9,22,8,theme==='castle'?'#916075':'#a88666');
      }
    }
    if(game.stage<2){
      for(let i=0;i<game.platforms.length;i++){const r=game.platforms[i];if(!r.ground)continue;for(let j=0;j<r.w/135;j++){const x=r.x+50+j*135-c;if(x<0||x>W)continue;rect(x,435,3,13,'#498e73');rect(x-4,435,11,4,game.stage===0?'#ffdbc0':'#a7d3dc');rect(x,431,3,12,game.stage===0?'#ffdbc0':'#a7d3dc');}}
    }
  }
  function drawGoal(){
    if(!game.level.goal)return;const x=game.level.goal-game.camera;
    rect(x,274,5,174,'#6c8892');rect(x-4,268,13,8,'#ffe18c');rect(x+5,282,65,32,'#ed8ca6');rect(x+9,287,54,22,'#f6b2c4');star(x+36,297,9,'#fff6dc');rect(x-13,437,33,11,'#cbb595');
    if(game.checkpoint){const x=game.level.checkpoint-game.camera;if(x>-60&&x<W){rect(x,405,4,43,'#628a8a');rect(x+4,405,22,14,'#76caba');}}
  }
  function drawActors(){
    const p=game.player,c=game.camera,t=game.time;
    for(const coin of game.coins){if(coin.taken)continue;const x=coin.x-c;if(x<0||x>W)continue;const wobble=Math.sin(t*3+coin.x)*3;rect(x+4,coin.y+wobble,8,20,'#dba54b');rect(x+1,coin.y+3+wobble,14,14,'#f5cd62');rect(x+5,coin.y+4+wobble,4,12,'#fff4a4');}
    for(const e of game.enemies){if(!e.alive)continue;const x=e.x-c;if(x<-40||x>W+40)continue;const bounce=Math.sin(t*8+e.x)*2;sprite(GAME_SPRITES.enemy.idle,x+1,e.y+bounce+8,2,e.vx<0);}
    for(const shot of game.shots)star(shot.x-c+8,shot.y+8,10,'#ffedab',t*7);
    for(const o of game.orbs){star(o.x-c+9,o.y+9,12,'#f990c4',t*-4);star(o.x-c+9,o.y+9,5,'#ffe3eb',t*4);}
    for(const h of game.hazards){const x=h.x-c;if(h.t<h.warn){rect(x,441,h.w,7,'#f6a0c3');if(Math.sin(t*30)>0)pixelText('!',x+h.w/2,428,20,'#ffbad0','center');}else{rect(x,370,h.w,78,'#ef8daf88');for(let i=0;i<4;i++)star(x+10+i*14,382+Math.sin(t*10+i)*14,13,'#ffd0e3',t*3);}}
    if(game.boss){const b=game.boss;const float=Math.sin(b.anim*3)*3;const rows=b.final?GAME_SPRITES.peach.idle2:(Math.floor(t*2)%2?GAME_SPRITES.peach.idle2:GAME_SPRITES.peach.idle);if(!(b.invincible>0&&Math.floor(t*14)%2))sprite(rows,b.x-c-3,b.y+float,3,false);if(b.final){
      const flutter=Math.sin(t*15)*5;rect(b.x-c-7+flutter,b.y+72+float,12,8,'#ee81b2');rect(b.x-c+58+flutter,b.y+70+float,12,8,'#ee81b2');
      for(let i=0;i<4;i++){const x=b.x-c-75+i*22-(t*65%90);rect(x,b.y+68+Math.sin(t*5+i)*10,18,2,'#f7dce899');}
    }}
    if(game.mode!=='dead'&&!(p.invincible>0&&Math.floor(t*12)%2)){
      const pose=!p.grounded?'jump':Math.abs(p.vx)>40?(Math.floor(p.anim/26)%2?'run1':'run2'):'idle';
      if(game.mode==='boss-final'&&game.finalTime>2.85){ctx.save();ctx.translate(p.x-c+14,p.y+40);ctx.rotate(Math.min(Math.PI/2,(game.finalTime-2.85)*3));sprite(GAME_SPRITES.hero.idle,-16,-40,2);ctx.restore();}
      else sprite(GAME_SPRITES.hero[pose],p.x-c-2,p.y+2,2,p.facing<0);
      if(game.mode==='boss-final'&&game.finalTime>.85&&game.finalTime<2.9){
        rect(p.x-c+19,p.y+20,7,4,'#fba4a0');rect(p.x-c+28,p.y+21,4,8,'#e9546f');
        for(let i=0;i<4;i++){const fall=((game.finalTime*85+i*15)%49);rect(p.x-c+29+Math.sin(i*2)*2,p.y+28+fall,3,5,'#e9546f');}
        for(let i=0;i<3;i++){const a=t*4+i*2.09;star(p.x-c+14+Math.cos(a)*29,p.y-9+Math.sin(a)*7,5,'#fff0a0',t);}
      }
    }
    for(const part of game.particles){ctx.globalAlpha=part.life/.6;rect(part.x-c,part.y,part.size,part.size,part.color);}ctx.globalAlpha=1;
    if(game.mode==='boss-final'){
      const progress=game.finalTime/3.6;ctx.fillStyle=`rgba(246,153,183,${progress*.16})`;ctx.fillRect(0,0,W,H);
      if(game.finalTime>.6)pixelText(game.finalTime>2.6?'くらくら…もうだめ…':game.finalTime>1.5?'鼻血が…止まらない！':'あっ、見ちゃった…！',W/2,202,25,'#ffe8ec','center');
    }
  }
  function render(){ctx.imageSmoothingEnabled=false;ctx.save();if(game.shake>0&&!reducedMotion)ctx.translate(Math.sin(game.time*80)*game.shake*.3,Math.cos(game.time*75)*game.shake*.2);background();drawGround();drawGoal();drawActors();ctx.restore();}
  function initAudio(){if(!audio)try{audio=new(window.AudioContext||window.webkitAudioContext)();}catch{}if(audio?.state==='suspended')audio.resume().catch(()=>{});}
  function tone(freq,duration=.1,type='square',volume=.03,slide=null){if(!soundOn||!audio)return;const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(slide,audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
  function toast(text,duration=2){$('toast').textContent=text;$('toast').classList.add('visible');toastTimer=duration;}
  function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
  function play(){clearKeys();overlay.hidden=true;initAudio();canvas.focus({preventScroll:true});$('pause').disabled=false;}
  function start(){game.start();play();toast('WORLD 01  はじまりの草原');}
  function showPanel(kicker,title,description,button,action,secondary=null){
    overlay.hidden=false;panel.innerHTML='';
    const label=document.createElement('span');label.className='panel-kicker';label.textContent=kicker;panel.append(label);
    const heading=document.createElement('h2');heading.className='result-title';heading.textContent=title;panel.append(heading);
    const p=document.createElement('p');p.textContent=description;panel.append(p);
    const b=document.createElement('button');b.className='primary';b.textContent=button;b.addEventListener('click',action);panel.append(b);
    if(secondary){const s=document.createElement('button');s.className='secondary';s.textContent=secondary.label;s.addEventListener('click',secondary.action);panel.append(s);}
    clearKeys();
    setTimeout(()=>b.focus({preventScroll:true}),50);
  }
  function retry(){game.retry();play();toast(game.stage===2?'もう一度、ピーチ姫に挑もう。':'チェックポイントから再開');}
  function pause(){
    if(game.mode==='title'||game.mode==='dead'||game.mode==='clear')return;
    if(game.mode==='paused'){game.mode=pausedMode;play();return;}
    pausedMode=game.mode;game.mode='paused';showPanel('TAKE A LITTLE BREAK','ひとやすみ','準備ができたら、冒険の続きを。','ゲームに戻る',pause);
  }
  function syncHud(){
    $('stage-label').textContent=`WORLD 0${game.stage+1}`;$('stage-name').textContent=game.level.name;
    $('health').textContent=Array.from({length:3},(_,i)=>i<game.player.hp?'♥':'♡').join(' ');$('health').setAttribute('aria-label',`残り体力${game.player.hp}`);
    $('coins').textContent=String(game.score).padStart(2,'0');const progress=game.getProgress();$('progress').style.width=progress+'%';$('progress-percent').textContent=progress+'%';$('progress-text').textContent=`STAGE ${game.stage+1} / 3`;
    $('boss-hud').hidden=!(game.boss?.active);if(game.boss){$('boss-health').style.width=(game.boss.hp/12*100)+'%';$('boss-label').textContent=game.boss.final?'あと一撃…':`${game.boss.hp} / 12`;}
    document.querySelectorAll('[data-stage]').forEach(b=>{const n=Number(b.dataset.stage);b.disabled=n>game.unlocked;b.classList.toggle('active',n===game.stage);b.querySelector('.stage-status').textContent=n>game.unlocked?'LOCKED':n===game.stage?'PLAY':'OPEN';});
  }
  function handleEvents(){
    for(const e of game.drainEvents()){
      switch(e.type){
        case 'jump':tone(220,.15,'square',.025,620);break;
        case 'shoot':tone(780,.08,'triangle',.035,330);break;
        case 'coin':tone(1050,.12,'sine',.055,1450);break;
        case 'stomp':tone(250,.12,'square',.025,90);break;
        case 'hurt':tone(170,.25,'sawtooth',.04,55);break;
        case 'checkpoint':toast('チェックポイント！ 体力を回復');tone(660,.2,'sine',.04,900);break;
        case 'boss-start':toast('ピーチ姫が あらわれた！',2);tone(160,.45,'triangle',.06,320);break;
        case 'boss-hit':tone(430,.14,'square',.035,180);break;
        case 'warning':tone(580,.25,'sine',.04);break;
        case 'final':clearKeys();toast('あと一撃！ そのとき、ふわっと…',1.2);tone(640,.8,'triangle',.035,160);break;
        case 'clear':
          tone(523,.2,'square',.025);setTimeout(()=>tone(784,.3,'square',.025),180);
          showPanel('STAGE CLEAR',`WORLD 0${e.stage+1} クリア！`,e.stage===0?'草原を抜けた！ 次は星空の渡り道へ。':'いよいよ、ピーチ姫の待つ城へ。','次のステージへ',()=>{game.next();play();toast(`WORLD 0${game.stage+1}  ${game.level.name}`);});break;
        case 'dead':
          $('end-flash').classList.remove('final');tone(260,.5,'triangle',.04,70);
          if(e.reason==='nosebleed'){
            flashTimer=.35;
            showPanel('GAME OVER · 貧血','あと一撃だったのに！','スカートの中をうっかり見ちゃった！ 鼻血が止まらず、貧血でダウン。ピーチ姫の残り体力は1。','ピーチ姫に再挑戦',retry,{label:'最初からもう一度',action:start});
          }else showPanel('ONE MORE TRY','まだ、冒険は終わらない。',e.reason==='fall'?'足元に気をつけて。ジャンプは長押しで高く跳べる。':'星で攻撃するか、敵を上から踏んで進もう。','もう一度挑戦',retry,{label:'最初から遊ぶ',action:start});
          break;
      }
    }
  }
  const bindings={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyZ:'jump',KeyX:'attack',KeyJ:'attack'};
  document.addEventListener('keydown',e=>{
    if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat)pause();return;}
    if(game.mode==='title'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();start();return;}
    if(bindings[e.code]&&(['playing','boss-final'].includes(game.mode))){e.preventDefault();keys[bindings[e.code]]=true;}
  });
  document.addEventListener('keyup',e=>{if(bindings[e.code]){keys[bindings[e.code]]=false;if(['playing','boss-final'].includes(game.mode))e.preventDefault();}});
  document.querySelectorAll('[data-control]').forEach(b=>{
    const release=()=>{keys[b.dataset.control]=false;b.classList.remove('pressed');};
    b.addEventListener('pointerdown',e=>{e.preventDefault();if(game.mode==='title')return;b.setPointerCapture(e.pointerId);keys[b.dataset.control]=true;b.classList.add('pressed');initAudio();});
    b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
  });
  window.addEventListener('blur',()=>{clearKeys();if(game.mode==='playing'||game.mode==='boss-final')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(game.mode==='playing'||game.mode==='boss-final')pause();}});
  $('start').addEventListener('click',start);$('pause').addEventListener('click',pause);
  $('restart').addEventListener('click',()=>{if(game.mode==='title')return;pausedMode=game.mode;game.mode='paused';showPanel('NEW ADVENTURE','最初から冒険する？','今のステージから1面のスタート地点に戻ります。','最初から遊ぶ',start,{label:'冒険を続ける',action:pause});});
  $('sound').addEventListener('click',()=>{soundOn=!soundOn;initAudio();$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'音をオフにする':'音をオンにする');$('sound').querySelector('span').textContent=soundOn?'音 ON':'音 OFF';if(soundOn)tone(880,.12,'sine',.04);});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.querySelector('.arcade').requestFullscreen)await document.querySelector('.arcade').requestFullscreen();else toast('端末を横向きにすると大きく遊べます');}catch{toast('端末を横向きにすると大きく遊べます');}});
  document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{const n=Number(b.dataset.stage);if(n>game.unlocked)return;game.load(n);play();toast(`WORLD 0${n+1}  ${game.level.name}`);}));
  function tick(ts){const dt=Math.min((ts-(last||ts))/1000,.05);last=ts;game.update(dt,keys);handleEvents();render();if(frame++%4===0)syncHud();if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}if(flashTimer>0){flashTimer-=dt;$('end-flash').style.opacity=Math.max(0,flashTimer);}else $('end-flash').style.opacity='';requestAnimationFrame(tick);}
  game.drainEvents();syncHud();render();requestAnimationFrame(tick);
})();
