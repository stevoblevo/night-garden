'use strict';
const folds=[
 ['🍑','The peach loop','A familiar game became the default over and over. A shelf lets old favourites keep their place without deciding every new visit.','The new Play Room offers a deliberate choice.'],
 ['✦','The brass gate','An approval boundary caught a prompt carrying more internal context than the task needed. A smaller product brief could pass without carrying those details.','The revised Hermes design brief completed; gameplay implementation is still pending.'],
 ['▱','The folded screen','A saved device description can outlive the hardware it describes. Touch needs the present screen, current input mapping and a real human hand.','Browser touch checks are evidence about software. They do not prove a physical finger test.'],
 ['♧','The small companions','Each companion holds one bounded portion of the thread. Clear ownership, a compact handoff and a way to return keep a group coherent.','A plan, a launched worker and an accepted result are different states.'],
 ['☾','The lantern','A lantern illuminates what was actually observed. A reachable page, a rendered game and a working touch control each need their own check.','Keep the evidence beside the claim. Leave what is untested visible.'],
 ['☀','The dawn and the knot','Daybreak is a possible next review, not a finished run. The golden path keeps one knot tied until an admitted worker and actual evidence can resolve it.','Proposed: 20 minutes, 12k observed tokens, zero additional spend. Worker identity remains unresolved.']
];
const box=document.getElementById('symbols');
function choose(i){const f=folds[i];document.getElementById('mark').textContent=f[0]+' A FOLD IN THE STORY';document.getElementById('title').textContent=f[1];document.getElementById('story').textContent=f[2];document.getElementById('state').textContent=f[3];[...box.children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
folds.forEach((f,i)=>{const b=document.createElement('button');b.textContent=f[0]+' '+f[1];b.onclick=()=>choose(i);box.append(b)});choose(0);
document.getElementById('copy').onclick=async()=>{const t=document.getElementById('handoff');try{await navigator.clipboard.writeText(t.value);document.getElementById('copy-status').textContent='Handoff copied.'}catch{t.focus();t.select();document.getElementById('copy-status').textContent='Text selected. Use your browser’s Copy command.'}};
