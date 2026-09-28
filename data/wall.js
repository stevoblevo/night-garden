'use strict';
const $=id=>document.getElementById(id);
let items=[],visible=[],index=0,filter='all',opener=null;
const dialog=$('viewer');
function render(){
 const query=$('search').value.trim().toLowerCase();
 visible=items.filter(i=>(filter==='all'||(filter==='illustration'&&i.type==='illustration')||(filter==='print'&&i.type==='print')||(filter==='notes'&&i.note))&&[i.title,...i.tags].join(' ').toLowerCase().includes(query));
 $('wall').replaceChildren();
 visible.forEach((item,n)=>{
  const button=document.createElement('button');button.className='tile';button.setAttribute('aria-label','View '+item.title);
  const img=document.createElement('img');img.src=item.url;img.alt=item.title;img.loading='lazy';
  const caption=document.createElement('span');caption.className='caption';caption.textContent=item.title;
  const small=document.createElement('small');small.textContent=item.type==='illustration'?'ILLUSTRATION · NIGHT GARDEN':'FIELD PRINT · '+(item.note?'STORY INSIDE':'NIGHT GARDEN');caption.append(small);
  button.append(img,caption);button.onclick=()=>{opener=button;open(n)};$('wall').append(button);
 });
 $('count').textContent=visible.length+' of '+items.length+' artworks';$('empty').hidden=visible.length!==0;
}
function open(n){
 index=(n+visible.length)%visible.length;const item=visible[index];if(!item)return;
 $('large').src=item.url;$('large').alt=item.title;$('title').textContent=item.title;$('kind').textContent=item.type==='illustration'?'GENERATED ILLUSTRATION':'ORIGINAL VECTOR PRINT';$('tags').textContent=item.tags.join(' · ');
 $('original').href=item.url;$('download').href=item.url;$('note').textContent=item.note;$('story').hidden=!item.note;$('story').open=false;$('position').textContent=(index+1)+' / '+visible.length;
 $('strip').replaceChildren();visible.forEach((i,k)=>{const b=document.createElement('button');b.setAttribute('aria-label','View '+i.title);b.setAttribute('aria-current',String(k===index));const im=document.createElement('img');im.src=i.url;im.alt='';im.loading='lazy';b.append(im);b.onclick=()=>open(k);$('strip').append(b)});
 if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';
 $('strip').children[index].scrollIntoView({block:'nearest',inline:'nearest'});
}
$('prev').onclick=()=>open(index-1);$('next').onclick=()=>open(index+1);$('close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{document.body.style.overflow='';opener?.focus()});
document.addEventListener('keydown',e=>{if(dialog.open){if(e.key==='ArrowRight'){e.preventDefault();open(index+1)}if(e.key==='ArrowLeft'){e.preventDefault();open(index-1)}}else if(e.key==='../index.html'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus()}});
$('search').oninput=render;
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()});
$('density').onchange=()=>$('wall').className=$('density').value;
$('reset').onclick=()=>{$('search').value='';document.querySelector('[data-filter="all"]').click()};
fetch('../data/art-wall.json').then(r=>{if(!r.ok)throw Error('collection unavailable');return r.json()}).then(data=>{items=data;$('total').textContent=items.length;render()}).catch(()=>{$('count').textContent='The collection could not load. Please reload the page.'});
