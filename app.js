import {SleepAudio} from './audio-engine.js';
const $=id=>document.getElementById(id);
let engine, context, busy=false, selected='rain',seconds=0,ended=false;
const testMode=new URLSearchParams(location.search).has('test');
if(testMode){const b=document.createElement('button');b.dataset.seconds='120';b.textContent='Тест · 2 мин';b.setAttribute('aria-pressed','false');$('intervals').insertBefore(b,$('intervals').querySelector('p'));}
function render(){
 const playing=engine?.active && context.state==='running';
 $('play').setAttribute('aria-label',playing?'Пауза':engine?.started?'Продолжить':'Включить');
 $('play-icon').innerHTML=playing?'<path d="M6 4h4v16H6zm8 0h4v16h-4z"/>':'<path d="m8 4 13 8-13 8Z"/>';
 $('current').textContent=selected==='rain'?'Дождь':'Самолёт';
 document.querySelectorAll('[data-sound]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.sound===selected));b.disabled=busy;});
 document.querySelectorAll('[data-seconds]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.seconds)===seconds));b.disabled=busy;});
 $('play').disabled=busy;
 $('duration').textContent=seconds?`${seconds/60} мин`:'Выключен';
 const left=engine?engine.remaining:seconds,n=Math.ceil(left);
 $('remaining').textContent=seconds?`Осталось ${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`:'Без таймера';
 $('fade-note').hidden=!seconds;
 $('status').textContent=busy?'Загружаем звук…':ended?'Таймер завершён':playing?(seconds && left<=60?'Плавно затихает':'Воспроизведение'):engine?.active?'Звук прерван — нажми «Продолжить»':engine?.started?'На паузе':'Готов к воспроизведению';
}
async function initialize(){
 if(engine)return;
 if('audioSession' in navigator)navigator.audioSession.type='playback';
 context ||= new AudioContext();
 await context.resume();
 const buffers=Object.fromEntries(await Promise.all(['rain','plane'].map(async name=>{
  const response=await fetch(`${name}.wav`);if(!response.ok)throw new Error('Не удалось загрузить звук. Проверь подключение и попробуй снова.');
  return [name,await context.decodeAudioData(await response.arrayBuffer())];
 })));
 engine=new SleepAudio(context,buffers);engine.sound=selected;engine.duration=seconds;
 engine.setVolume(Number($('volume').value)/100);
 engine.onchange=reason=>{if(reason==='ended')ended=true;render();};
 context.onstatechange=render;
}
$('play').onclick=async()=>{
 if(busy)return;busy=true;ended=false;render();let error;
 try{await initialize();await engine.toggle();}catch(e){error=e.message||'Не удалось включить звук. Попробуй ещё раз.';}
 finally{busy=false;render();if(error)$('status').textContent=error;}
};
document.querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{if(busy)return;selected=b.dataset.sound;ended=false;engine?.setSound(selected);render();});
$('timer').onclick=()=>{$('intervals').hidden=!$('intervals').hidden;$('timer').setAttribute('aria-expanded',String(!$('intervals').hidden));};
document.querySelectorAll('[data-seconds]').forEach(b=>b.onclick=()=>{
 if(busy)return;seconds=Number(b.dataset.seconds);ended=false;engine?.setTimer(seconds);
 $('intervals').hidden=true;$('timer').setAttribute('aria-expanded','false');render();
});
$('volume').oninput=()=>{const v=Number($('volume').value);$('level').textContent=v+'%';engine?.setVolume(v/100);};
document.addEventListener('visibilitychange',render);setInterval(render,250);render();
