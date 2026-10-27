export class SleepAudio {
  constructor(context, buffers) {
    this.context=context; this.buffers=buffers; this.sound='rain'; this.duration=0;
    this.elapsed=0; this.offset=0; this.active=false; this.started=false;
    this.source=null; this.startedAt=0; this.onchange=()=>{};
    this.volume=context.createGain(); this.volume.gain.value=.35; this.volume.connect(context.destination);
  }
  get time(){return this.elapsed+(this.active?this.context.currentTime-this.startedAt:0);}
  get remaining(){return Math.max(0,this.duration-this.time);}
  setVolume(value){this.volume.gain.setTargetAtTime(value,this.context.currentTime,.03);}
  detach(){
    if(!this.source)return;
    this.elapsed=this.time;
    this.offset=(this.offset+this.context.currentTime-this.startedAt)%this.buffers[this.sound].duration;
    const source=this.source, fade=this.fade, end=this.end;
    source.onended=()=>{source.disconnect();fade.disconnect();end.disconnect();};
    fade.gain.cancelScheduledValues(this.context.currentTime);
    fade.gain.setValueAtTime(fade.gain.value,this.context.currentTime);
    fade.gain.linearRampToValueAtTime(0,this.context.currentTime+.04);
    source.stop(this.context.currentTime+.04);
    this.source=null; this.active=false;
  }
  start(){
    if(this.duration && this.remaining<=0){this.complete();return;}
    const ctx=this.context,now=ctx.currentTime,left=this.remaining;
    const source=ctx.createBufferSource(),fade=ctx.createGain(),end=ctx.createGain();
    source.buffer=this.buffers[this.sound];source.loop=true;
    source.connect(fade);fade.connect(end);end.connect(this.volume);
    fade.gain.setValueAtTime(0,now);fade.gain.linearRampToValueAtTime(1,now+.04);
    end.gain.setValueAtTime(this.duration?Math.min(1,left/60):1,now);
    if(this.duration){
      end.gain.setValueAtTime(Math.min(1,left/60),now+Math.max(0,left-60));
      end.gain.linearRampToValueAtTime(0,now+left);
    }
    this.source=source;this.fade=fade;this.end=end;
    source.onended=()=>{source.disconnect();fade.disconnect();end.disconnect();if(this.source===source)this.complete();};
    source.start(now,this.offset);if(this.duration)source.stop(now+left);
    this.startedAt=now;this.active=this.started=true;this.onchange();
  }
  complete(){this.source=null;this.active=this.started=false;this.elapsed=this.duration;this.offset=0;this.onchange('ended');}
  async toggle(){
    if(this.active && this.context.state==='running'){this.detach();this.onchange();return;}
    await this.context.resume();
    if(this.context.state!=='running')throw new Error('Не удалось включить звук. Нажми «Включить» ещё раз.');
    if(this.active){this.onchange();return;}
    if(!this.started){this.elapsed=0;this.offset=0;}
    this.start();
  }
  setTimer(seconds){const playing=this.active;this.detach();this.duration=seconds;this.elapsed=0;if(playing)this.start();else this.onchange();}
  setSound(sound){
    if(sound===this.sound)return;
    const playing=this.active;this.detach();this.sound=sound;this.offset=0;
    if(playing)this.start();else this.onchange();
  }
}
