const TOKENS=[{s:'ZAIDA',p:.000027,c:6.4,b:1234567},{s:'SOL',p:158.24,c:1.2,b:8.14},{s:'USDC',p:1,c:0,b:4900},{s:'BONK',p:.000032,c:-2.1,b:900000},{s:'JTO',p:2.94,c:4.8,b:850}];
const R={'SOL-ZAIDA':5860740,'USDC-ZAIDA':37037,'ZAIDA-SOL':.00000017,'ZAIDA-USDC':.000027,'SOL-USDC':158,'USDC-SOL':.00632,'BONK-ZAIDA':1.18,'ZAIDA-BONK':.847,'JTO-ZAIDA':108888,'ZAIDA-JTO':.00000917};
const S={connected:false,slippage:.5,fee:'Medium',maxPos:5000,routes:[],activity:[],theme:'dark'};

const $=id=>document.getElementById(id);
const fmt=n=>n>=1?n.toLocaleString(undefined,{maximumFractionDigits:2}):n.toFixed(8);

function boot(){
  $('fromToken').innerHTML=TOKENS.map(t=>`<option>${t.s}</option>`).join('');
  $('toToken').innerHTML=TOKENS.map(t=>`<option>${t.s}</option>`).join('');
  $('fromToken').value='SOL';$('toToken').value='ZAIDA';
  bind();renderAll();
}
function bind(){
  $('walletButton').onclick=()=>{S.connected=!S.connected;$('walletButton').textContent=S.connected?'5Dy...NEXUS...9Xp':'Connect Wallet';$('status').textContent=S.connected?'Wallet linked. Ready.':'Awaiting wallet handshake.'};
  $('quoteButton').onclick=quote;$('swapButton').onclick=swap;
  $('flipButton').onclick=()=>{[$('fromToken').value,$('toToken').value]=[$('toToken').value,$('fromToken').value];quote()};
  $('settingsButton').onclick=()=>$('settingsDialog').showModal();
  $('saveSettings').onclick=()=>{S.slippage=Number($('slippageInput').value)||.5;S.fee=$('feeTier').value;S.maxPos=Number($('maxPosInput').value)||5000;$('status').textContent=`Risk saved: ${S.slippage}% slip, $${S.maxPos} max`};
  $('themeButton').onclick=()=>{S.theme=S.theme==='dark'?'alt':'dark';document.body.style.filter=S.theme==='alt'?'hue-rotate(25deg) saturate(1.08)':'none'};
}
function quote(){
  if(!S.connected)return $('status').textContent='Connect wallet first.';
  const amt=Number($('fromAmount').value);if(!amt||amt<=0)return $('status').textContent='Enter valid amount.';
  const fp=$('fromToken').value,tp=$('toToken').value,base=R[`${fp}-${tp}`];
  if(!base)return $('status').textContent='Unsupported pair in demo engine.';
  const usd=amt*(TOKENS.find(t=>t.s===fp)?.p||0);if(usd>S.maxPos)return $('status').textContent=`Blocked: exceeds max position $${S.maxPos}.`;
  const out=amt*base;
  S.routes=[{n:'Nexus Alpha Route',i:.11,f:.0008,o:out*.9991,l:12},{n:'Quantum Split Route',i:.19,f:.0014,o:out*.9983,l:18},{n:'Stability Vault Route',i:.24,f:.0018,o:out*.9976,l:26}];
  $('toAmount').value=fmt(S.routes[0].o*(1-S.slippage/100));
  $('status').textContent=`3 routes computed • fee tier ${S.fee}`;
  renderAll();
}
function swap(){
  if(!S.routes.length)return $('status').textContent='Request quote before execution.';
  const e={t:new Date().toLocaleTimeString(),m:`${$('fromAmount').value} ${$('fromToken').value} → ${fmt(S.routes[0].o)} ${$('toToken').value}`};
  S.activity.unshift(e);$('status').textContent=`Execution simulated at ${e.t}`;renderAll();
}
function renderAll(){
  $('metrics').innerHTML=[`Best route: ${S.routes[0]?.n||'—'}`,`Impact: ${S.routes[0]?S.routes[0].i.toFixed(2)+'%':'—'}`,`Fee: ${S.routes[0]?S.routes[0].f.toFixed(4)+' SOL':'—'}`,`Latency: ${S.routes[0]?S.routes[0].l+' ms':'—'}`,`Slippage: ${S.slippage.toFixed(2)}%`,`Max Position: $${S.maxPos}`].map(x=>`<div class='item'><span>${x.split(': ')[0]}</span><strong>${x.split(': ')[1]}</strong></div>`).join('');
  $('routes').innerHTML=S.routes.length?S.routes.map((r,i)=>`<div class='item'><span>${i+1}. ${r.n}</span><strong>${fmt(r.o)} ${$('toToken').value}</strong></div>`).join(''):`<p class='muted'>No routes yet.</p>`;
  $('portfolio').innerHTML=TOKENS.map(t=>`<div class='item'><span>${t.s}</span><strong>${fmt(t.b)} <small>($${fmt(t.b*t.p)})</small></strong></div>`).join('');
  $('watch').innerHTML=TOKENS.map(t=>`<div class='item'><span>${t.s}</span><strong>$${fmt(t.p)} ${t.c>=0?'▲':'▼'} ${Math.abs(t.c)}%</strong></div>`).join('');
  $('activity').innerHTML=S.activity.length?S.activity.slice(0,8).map(a=>`<div class='item'><span>${a.t}</span><strong>${a.m}</strong></div>`).join(''):`<p class='muted'>No executions logged.</p>`;
  $('utility').innerHTML=['DCA Scheduler (preview)','TWAP Engine (preview)','Alert Bus (preview)','Copy-trade Hooks (preview)','Tax lot export (preview)','Cross-chain bridge guard (preview)'].map(u=>`<div class='item'><span>${u}</span><strong>Ready</strong></div>`).join('');
}
boot();
