(function (root) {
  'use strict';
  const W = 960, H = 540, GRAVITY = 1800, SPEED = 280, JUMP = 675;
  const terrain = (segments) => segments.map(([x,w]) => ({x,y:448,w,h:100,ground:true}));
  const levels = [
    {name:'はじまりの草原',width:2640,goal:2540,theme:'meadow',
      platforms:[...terrain([[0,620],[710,620],[1430,590],[2110,530]]),{x:280,y:358,w:145,h:22},{x:890,y:360,w:160,h:22},{x:1560,y:352,w:170,h:22},{x:2200,y:358,w:140,h:22}],
      enemies:[{x:465,min:410,max:555},{x:1130,min:1050,max:1260},{x:1800,min:1740,max:1950},{x:2370,min:2290,max:2490}],checkpoint:1470,
      coinGroups:[[170,386,5],[310,307,3],[600,322,5],[900,310,4],[1310,316,5],[1610,302,3],[2010,322,4],[2280,311,3]]},
    {name:'星空の渡り道',width:3000,goal:2890,theme:'night',
      platforms:[...terrain([[0,480],[580,530],[1230,680],[2020,400],[2530,470]]),{x:320,y:360,w:130,h:22},{x:720,y:353,w:160,h:22},{x:1050,y:356,w:200,h:22},{x:1430,y:366,w:160,h:22},{x:1740,y:356,w:130,h:22},{x:2160,y:358,w:160,h:22},{x:2400,y:356,w:155,h:22}],
      enemies:[{x:375,min:260,max:435},{x:920,min:835,max:1030},{x:1370,min:1300,max:1400},{x:1640,min:1570,max:1720},{x:2290,min:2180,max:2350},{x:2710,min:2650,max:2830}],checkpoint:1290,
      coinGroups:[[130,387,4],[320,310,3],[470,318,5],[755,303,3],[1055,305,5],[1460,316,3],[1800,306,4],[1960,316,4],[2180,308,3],[2430,306,4],[2740,382,4]]},
    {name:'ピーチ姫の城',width:1600,goal:null,theme:'castle',
      platforms:[...terrain([[0,1600]]),{x:800,y:354,w:135,h:22},{x:1240,y:354,w:135,h:22}],enemies:[],checkpoint:680,coinGroups:[[220,385,6],[820,300,3],[1270,300,3]]}
  ];
  const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  class Game {
    constructor(){this.unlocked=0;this.score=0;this.time=0;this.events=[];this.mode='title';this.load(0);this.mode='title';}
    emit(type,data={}){this.events.push({type,...data});}
    load(index,checkpoint=false){
      this.stage=clamp(index,0,2);this.level=levels[this.stage];this.mode='playing';this.stageTime=0;this.camera=0;this.shake=0;this.finalTime=0;
      this.player={x:checkpoint?this.level.checkpoint:70,y:406,w:28,h:42,vx:0,vy:0,hp:3,facing:1,grounded:false,coyote:0,jumpBuffer:0,invincible:0,cooldown:0,anim:0};
      this.platforms=this.level.platforms;this.enemies=this.level.enemies.map(e=>({...e,y:416,w:34,h:32,vx:55+(this.stage*18),alive:true}));
      this.coins=[];this.level.coinGroups.forEach(([x,y,n])=>{for(let i=0;i<n;i++)this.coins.push({x:x+i*30,y:y-Math.sin(i/(n-1||1)*Math.PI)*20,w:15,h:19,taken:false});});
      this.shots=[];this.orbs=[];this.hazards=[];this.particles=[];this.checkpoint=checkpoint;this.lastJump=false;this.clearDelay=0;
      this.boss=this.stage===2?{x:1410,y:364,w:60,h:84,hp:12,maxHp:12,active:false,intro:1.4,invincible:0,attackTime:1.8,pattern:0,anim:0,final:false}:null;
      this.emit('stage',{stage:this.stage});
    }
    start(){this.score=0;this.load(0);}
    retry(){this.load(this.stage,this.checkpoint);}
    next(){if(this.stage<2){this.unlocked=Math.max(this.unlocked,this.stage+1);this.load(this.stage+1);}}
    die(reason='hurt'){
      if(this.mode==='dead')return;
      this.player.hp=0;this.mode='dead';this.shake=18;this.emit('dead',{reason,stage:this.stage,bossHp:this.boss?.hp});
      this.burst(this.player.x+14,this.player.y+20,'#f4a57e',18);
    }
    damage(source){
      const p=this.player;if(p.invincible>0||this.mode!=='playing')return;
      p.hp--;p.invincible=1.4;p.vy=-330;p.vx=p.x<(source?.x??p.x+1)?-250:250;this.shake=9;this.emit('hurt');
      if(p.hp<=0)this.die();
    }
    burst(x,y,color,n=9){for(let i=0;i<n;i++)this.particles.push({x,y,vx:Math.cos(i/n*6.28)*100,vy:Math.sin(i/n*6.28)*100-50,life:.6,color,size:3});}
    hitBoss(damage=1){
      const b=this.boss;if(!b||!b.active||b.intro>0||b.final||b.invincible>0||this.mode!=='playing')return false;
      b.hp=Math.max(1,b.hp-Math.max(0,damage));b.invincible=.55;this.shake=5;this.burst(b.x+30,b.y+32,'#ffe396',14);this.emit('boss-hit',{hp:b.hp});
      if(b.hp===1){b.final=true;this.mode='boss-final';this.finalTime=0;this.orbs=[];this.hazards=[];this.emit('final');}
      return true;
    }
    physics(dt,input){
      const p=this.player,oldY=p.y;
      const movement=(input.right?1:0)-(input.left?1:0);p.vx+=(movement*SPEED-p.vx)*Math.min(1,dt*17);
      if(movement)p.facing=movement;
      p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
      if(input.jump&&!this.lastJump)p.jumpBuffer=.13;
      this.lastJump=!!input.jump;
      if(p.jumpBuffer>0&&p.coyote>0){p.vy=-JUMP;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump');}
      if(!input.jump&&p.vy<-250)p.vy+=GRAVITY*dt*.55;
      p.vy=Math.min(900,p.vy+GRAVITY*dt);p.x+=p.vx*dt;p.x=clamp(p.x,this.boss?.active?665:0,this.level.width-p.w-5);p.y+=p.vy*dt;p.grounded=false;
      for(const r of this.platforms){if(p.x+p.w>r.x&&p.x<r.x+r.w&&oldY+p.h<=r.y+2&&p.y+p.h>=r.y&&p.vy>=0){p.y=r.y-p.h;p.vy=0;p.grounded=true;}}
      p.invincible=Math.max(0,p.invincible-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.anim+=Math.abs(p.vx)*dt;
      if(input.attack&&p.cooldown<=0&&this.mode==='playing'){
        p.cooldown=.33;this.shots.push({x:p.x+(p.facing>0?p.w:-15),y:p.y+15,w:15,h:15,vx:p.facing*530,life:1.1});this.emit('shoot');
      }
      if(p.y>H+60)this.die('fall');
      const target=clamp(p.x-310,0,this.level.width-W);this.camera+=(target-this.camera)*Math.min(1,dt*8);
    }
    update(dt,input={}){
      dt=Math.min(dt,.05);this.time+=dt;this.shake=Math.max(0,this.shake-dt*35);
      for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
      if(this.mode==='title'||this.mode==='paused'||this.mode==='dead'||this.mode==='clear')return;
      this.stageTime+=dt;if(this.mode==='playing')this.physics(dt,input);
      if(this.mode==='dead')return;
      if(this.mode==='boss-final'){
        this.finalTime+=dt;this.boss.anim+=dt;this.boss.hp=1;
        const p=this.player;p.vx=0;p.vy=0;p.grounded=true;p.facing=1;
        p.x+=(this.boss.x-112-p.x)*Math.min(1,dt*4);p.y+=(406-p.y)*Math.min(1,dt*6);
        this.camera+=(clamp(p.x-470,0,this.level.width-W)-this.camera)*Math.min(1,dt*7);
        p.hp=this.finalTime>2.8?1:this.finalTime>1.8?2:3;
        if(this.finalTime>3.6)this.die('nosebleed');
        return;
      }
      const p=this.player;
      for(const c of this.coins){if(!c.taken&&overlaps(p,c)){c.taken=true;this.score++;this.burst(c.x+8,c.y+9,'#f8d665',6);this.emit('coin');}}
      if(!this.checkpoint&&p.x>this.level.checkpoint){this.checkpoint=true;p.hp=Math.min(3,p.hp+1);this.emit('checkpoint');}
      for(const e of this.enemies){
        if(!e.alive)continue;e.x+=e.vx*dt;if(e.x<e.min){e.x=e.min;e.vx=Math.abs(e.vx);}if(e.x>e.max){e.x=e.max;e.vx=-Math.abs(e.vx);}
        if(overlaps(p,e)){
          if(p.vy>70&&p.y+p.h-e.y<19){e.alive=false;p.vy=-470;this.score+=2;this.burst(e.x+16,e.y+15,'#7ee3da',14);this.emit('stomp');}
          else this.damage(e);
        }
      }
      for(const s of this.shots){
        s.x+=s.vx*dt;s.life-=dt;
        for(const e of this.enemies){if(e.alive&&s.life>0&&overlaps(s,e)){e.alive=false;s.life=0;this.score+=2;this.burst(e.x+16,e.y+15,'#7ee3da',14);this.emit('stomp');}}
        if(this.boss&&s.life>0&&overlaps(s,this.boss)){if(this.hitBoss())s.life=0;}
      }
      this.shots=this.shots.filter(s=>s.life>0);
      if(this.mode==='boss-final')return;
      if(this.level.goal&&p.x>=this.level.goal&&this.mode==='playing'){
        this.mode='clear';this.unlocked=Math.max(this.unlocked,this.stage+1);this.emit('clear',{stage:this.stage});return;
      }
      this.updateBoss(dt);
    }
    updateBoss(dt){
      const b=this.boss;if(!b)return;
      if(!b.active&&this.player.x>665){b.active=true;this.checkpoint=true;this.emit('boss-start');}
      if(!b.active)return;b.anim+=dt;b.invincible=Math.max(0,b.invincible-dt);
      if(b.intro>0){b.intro-=dt;return;}
      b.x=1380+Math.sin(b.anim*1.15)*70;b.attackTime-=dt;
      if(b.attackTime<=0){
        const hard=b.hp<=6;
        if(b.pattern%3===2){
          const x=clamp(this.player.x-20,730,1470);this.hazards.push({x,y:368,w:62,h:80,t:0,warn:.85,duration:1.5});this.emit('warning');
        }else{
          const fromY=b.y+28,toY=this.player.y+20,dx=this.player.x-b.x,dy=toY-fromY,length=Math.hypot(dx,dy);
          this.orbs.push({x:b.x,y:fromY,w:18,h:18,vx:dx/length*(hard?210:175),vy:dy/length*(hard?210:175),life:7});
          if(hard)this.orbs.push({x:b.x,y:fromY+37,w:18,h:18,vx:-195,vy:0,life:7});
          this.emit('boss-shoot');
        }
        b.pattern++;b.attackTime=hard?1.15:1.6;
      }
      if(overlaps(this.player,b)){
        if(this.player.vy>100&&this.player.y+this.player.h-b.y<21){this.hitBoss();this.player.vy=-520;}
        else this.damage(b);
      }
      for(const o of this.orbs){o.x+=o.vx*dt;o.y+=o.vy*dt;o.life-=dt;if(overlaps(this.player,o)){this.damage(o);o.life=0;}}
      this.orbs=this.orbs.filter(o=>o.life>0&&o.x>640&&o.x<1640&&o.y>-60&&o.y<600);
      for(const h of this.hazards){h.t+=dt;if(h.t>=h.warn&&overlaps(this.player,h))this.damage(h);}
      this.hazards=this.hazards.filter(h=>h.t<h.duration);
    }
    getProgress(){return this.stage===2?(this.boss?.active?Math.round((12-this.boss.hp)/11*100):Math.min(20,Math.round(this.player.x/665*20))):Math.round(clamp(this.player.x/this.level.goal,0,1)*100);}
    drainEvents(){const e=this.events;this.events=[];return e;}
  }
  const api={Game,levels,W,H,GRAVITY,SPEED,JUMP,overlaps,clamp};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.CrownEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
