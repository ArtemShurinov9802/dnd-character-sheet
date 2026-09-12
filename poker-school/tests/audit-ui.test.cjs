const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),root=require('node:path').resolve(__dirname,'..');
function boot(saved,blocked=false){const d=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'http://localhost/',runScripts:'outside-only',pretendToBeVisual:true});d.window.scrollTo=()=>{};d.window.confirm=()=>true;if(saved!==undefined)d.window.localStorage.setItem('za-stolom.training.v2',typeof saved==='string'?saved:JSON.stringify(saved));if(blocked){d.window.Storage.prototype.getItem=()=>{throw new d.window.DOMException('blocked','SecurityError')};d.window.Storage.prototype.setItem=()=>{throw new d.window.DOMException('blocked','SecurityError')}}for(const f of ['app.js','course.js','engine.js','advanced.js','drills.js','trainer.js','beginner.js'])vm.runInContext(fs.readFileSync(root+'/'+f,'utf8'),d.getInternalVMContext());return d}
function route(d,r){d.window.location.hash='#/'+r;d.window.dispatchEvent(new d.window.HashChangeEvent('hashchange'))}
function click(d,s){const e=d.window.document.querySelector(s);assert(e,s);e.click()}
function choose(d,s,value){const el=d.window.document.querySelector(s);el.value=value;el.dispatchEvent(new d.window.Event('change',{bubbles:true}))}
test('retry errors keeps the selected error batch instead of switching to all 59 tasks',()=>{const d=boot();route(d,'scenarios');click(d,'[data-answer="1"]');choose(d,'#quiz-filter','Ошибки');click(d,'#retry-topic');assert.equal(d.window.document.querySelector('#quiz-filter').value,'Ошибки');assert.match(d.window.document.querySelector('#question .eyebrow').textContent,/1 \/ 1/);click(d,'[data-answer="0"]');assert.match(d.window.document.querySelector('.feedback').textContent,/Верно/);d.window.close()});
test('corrupted history and noncanonical answer keys cannot break valid progress',()=>{const d=boot({version:2,answers:{'01':0,'2':1},history:[{seed:1,net:0,players:[],log:[],decisions:[],reflection:{bad:true}}]});for(const r of ['course','history','progress','table']){route(d,r);assert(d.window.document.querySelector('main>h1')||d.window.document.querySelector('main h1'))}route(d,'progress');assert.match(d.window.document.querySelector('.progress-metrics').textContent,/1\/59/);assert.match(d.window.document.querySelector('footer').textContent,/повреждённые/);d.window.close()});
test('unavailable storage is reported consistently in basic and advanced routes',()=>{const d=boot(undefined,true);for(const r of ['course','positions','scenarios','table','progress']){route(d,r);assert.match(d.window.document.querySelector('footer').textContent,/недоступно/)}d.window.close()});
test('invalid JSON is recoverable and subsequent answers can be saved',()=>{const d=boot('{broken');route(d,'scenarios');click(d,'[data-answer="0"]');const saved=JSON.parse(d.window.localStorage.getItem('za-stolom.training.v2'));assert.equal(saved.answers[0],0);d.window.close()});
test('every guided line has valid cards, increasing boards, and renders through completion',()=>{const d=boot(),hands=d.window.GuidedHands;assert(hands.length>=16);assert.equal(new Set(hands.map(h=>h.id)).size,hands.length);assert.equal(new Set(hands.map(h=>h.position)).size,6);for(const h of hands){assert.equal(h.hand.length,2);assert.equal(h.steps[0].street,'Префлоп');route(d,'drills/'+h.id);for(let i=0;i<h.steps.length;i++){const doc=d.window.document;assert.equal(doc.querySelector('.review-cards').children.length,2);assert.equal(doc.querySelector('footer').parentElement.tagName,'MAIN');const s=h.steps[i];assert(s.pot>0&&Number.isFinite(s.pot));assert(s.right>=0&&s.right<s.options.length);assert.equal(s.board.length,{'Префлоп':0,'Флоп':3,'Тёрн':4,'Ривер':5}[s.street]);for(const c of [...h.hand,...s.board])assert.match(c,/^[2-9TJQKA][♣♦♥♠]$/);assert.equal(new Set([...h.hand,...s.board]).size,h.hand.length+s.board.length);if(i)assert.deepEqual(s.board.slice(0,h.steps[i-1].board.length),h.steps[i-1].board);click(d,'[data-drill-answer="'+s.right+'"]');assert.equal(doc.activeElement.classList.contains('feedback'),true);click(d,'#drill-next')}assert.match(d.window.document.querySelector('main').textContent,new RegExp(h.steps.length+' из '+h.steps.length))}d.window.close()});
test('calculator boundaries and known arithmetic produce valid results',()=>{const d=boot();route(d,'pot-odds');const doc=d.window.document;assert.equal(doc.querySelector('#odds-result').textContent,'25.0%');assert.match(doc.querySelector('#ev-result').textContent,/\+1.00/);doc.querySelector('#equity').value='101';doc.querySelector('#equity').dispatchEvent(new d.window.Event('input',{bubbles:true}));assert.match(doc.querySelector('#odds-result').textContent,/Проверь/);assert.equal(doc.querySelector('#ev-result').textContent,'');route(d,'sizing');doc.querySelector('#pot').value='';doc.querySelector('#pot').dispatchEvent(new d.window.Event('input',{bubbles:true}));assert.match(doc.querySelector('#bet-result').textContent,/Проверь/);d.window.close()});
test('raise input cannot silently round a bet with more than two decimal places',()=>{const d=boot();route(d,'table');choose(d,'#sim-position','UTG');click(d,'#sim-start');d.window.document.querySelector('#raise-to').value='3.141';click(d,'[data-act="raise"]');assert.match(d.window.document.querySelector('.input-error').textContent,/0,01 BB/);assert(d.window.document.querySelector('[data-act="call"]'));d.window.close()});
test('keyboard focus stays at the decision after starting a hand and at an invalid input',()=>{const d=boot();route(d,'table');choose(d,'#sim-position','UTG');click(d,'#sim-start');assert.equal(d.window.document.activeElement.dataset.act,'call');d.window.document.querySelector('#raise-to').value='-1';click(d,'[data-act="raise"]');assert.equal(d.window.document.activeElement.id,'raise-to');d.window.close()});
test('top navigation does not leave the previous page marked active',()=>{const d=boot();route(d,'course');assert.equal(d.window.document.querySelector('.topnav [aria-current]').hash,'#/course');route(d,'table');assert.equal(d.window.document.querySelector('.topnav [aria-current]'),null);route(d,'scenarios');assert.equal(d.window.document.querySelector('.topnav [aria-current]').hash,'#/practice');d.window.close()});

test('guided filters compose, empty states recover, and random choice stays in the selection',()=>{
 const d=boot(),doc=d.window.document;route(d,'drills');const ids=()=>[...doc.querySelectorAll('[data-drill-card]')].map(el=>el.dataset.drillCard);
 assert.equal(ids().length,d.window.GuidedHands.length);
 choose(d,'#drill-filter-level','start');choose(d,'#drill-filter-topic','blinds');choose(d,'#drill-filter-position','BB');
 assert.deepEqual(ids(),['free-big-blind']);assert.equal(doc.activeElement.id,'drill-filter-position');
 click(d,'#drill-random');assert.equal(d.window.location.hash,'#/drills/free-big-blind');
 route(d,'drills');choose(d,'#drill-filter-position','UTG');assert.equal(ids().length,0);assert(doc.querySelector('.drill-empty'));assert(doc.querySelector('#drill-random').disabled);
 click(d,'#drill-reset');assert.equal(ids().length,16);assert.equal(doc.querySelector('#drill-filter-level').value,'all');assert(!doc.querySelector('#drill-random').disabled);
 d.window.close();
});
test('guided progress survives reload, resumes, reviews previous answers, and retries only one hand',()=>{
 const key='za-stolom.training.v2',d=boot({drills:{'top-pair':[0,0,0,0],'kings-ace':[0]}});route(d,'drills');
 choose(d,'#drill-filter-status','errors');assert.equal(d.window.document.querySelector('[data-drill-card]').dataset.drillCard,'kings-ace');
 route(d,'drills/kings-ace');assert.match(d.window.document.querySelector('.panel>.eyebrow').textContent,/ШАГ 2/);
 click(d,'#drill-prev');assert.match(d.window.document.querySelector('.feedback').textContent,/Разберём/);assert(d.window.document.querySelector('[data-drill-answer]').disabled);click(d,'#drill-next');
 click(d,'[data-drill-answer="2"]');const data=d.window.localStorage.getItem(key);d.window.close();
 const e=boot(data);route(e,'drills/kings-ace');assert.match(e.window.document.querySelector('.panel>.eyebrow').textContent,/ШАГ 3/);
 for(const answer of [0,1]){click(e,'[data-drill-answer="'+answer+'"]');click(e,'#drill-next')}
 assert.match(e.window.document.querySelector('main').textContent,/3 из 4/);click(e,'#drill-retry');
 const saved=JSON.parse(e.window.localStorage.getItem(key));assert.deepEqual(saved.drills['kings-ace'],[]);assert.deepEqual(saved.drills['top-pair'],[0,0,0,0]);assert.equal(e.window.document.querySelector('.feedback'),null);
 route(e,'drills');choose(e,'#drill-filter-status','done');assert.equal(e.window.document.querySelectorAll('[data-drill-card]').length,1);
 e.window.close();
});
test('new guided showdown examples and draw prices agree with the card evaluator',()=>{
 const P=require('../engine.js'),d=boot(),byId=id=>d.window.GuidedHands.find(h=>h.id===id);
 const score=cs=>P.evaluate(Array.from(cs,P.parse)).n;
 for(const [id,villain] of [['set-value',['K♥','Q♦']],['small-blind',['Q♦','J♣']],['straight-draw',['A♦','9♥']],['short-stack',['K♥','Q♦']],['river-check',['J♣','J♦']]]){
  const h=byId(id),board=h.steps.at(-1).board,all=[...h.hand,...board,...villain];assert.equal(new Set(all).size,all.length);assert(score([...h.hand,...board])>score([...villain,...board]),id);
 }
 const tied=byId('shared-board'),board=tied.steps.at(-1).board;assert.equal(score([...tied.hand,...board]),score(['Q♦','J♦',...board]));
 const danger=byId('flush-danger'),last=danger.steps.at(-1).board;
 for(const v of [['K♠','K♦'],['8♠','8♥'],['2♠','2♥']])assert(score([...danger.hand,...last])<score([...v,...last]));
 const counterfeited=byId('free-big-blind');assert.equal(P.evaluate(Array.from([...counterfeited.hand,...counterfeited.steps.at(-1).board],P.parse)).score[0],2);
 const draw=byId('straight-draw'),turn=draw.steps[2];assert.equal(turn.pot,6.5);assert(8/46>1/(turn.pot+1));assert.equal((8/46*100).toFixed(1),'17.4');assert.equal((1/(turn.pot+1)*100).toFixed(1),'13.3');
 const short=byId('short-stack');assert.equal(short.steps[1].pot,8*2+.5);assert.equal(short.steps[2].pot,short.steps[1].pot+8*2);assert.equal(short.steps[3].pot,short.steps[2].pot+24*2);assert.equal(short.steps[3].pot,40*2+.5);
 d.window.close();
});
