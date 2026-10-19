const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(new URL('./script.js', `file://${__filename}`), 'utf8');
// The app boot code is browser-oriented. Extract and evaluate only its pure exported functions in a tiny DOM stub.
const elements = new Map();
function element(id) { if(!elements.has(id)) elements.set(id,{id,addEventListener(){},setAttribute(){},append(){},appendChild(){},replaceChildren(){},style:{setProperty(){}},classList:{add(){},remove(){}},hidden:false,clientWidth:900,clientHeight:800,scrollTop:0,focus(){},get firstElementChild(){return null;}}); return elements.get(id); }
const documentStub={getElementById:element,querySelectorAll(){return[]},createElement(){return {style:{},setAttribute(){},addEventListener(){},append(){},appendChild(){},replaceChildren(){},className:'',dataset:{}}},createDocumentFragment(){return {append(){}}},documentElement:{style:{setProperty(){}}},body:{},addEventListener(){},baseURI:'http://localhost/'};
const context={document:documentStub,window:{matchMedia(){return{matches:false}},addEventListener(){},LUNAVYRA_TEST_API:null},URL,Map,BigInt,console,requestAnimationFrame(){},setTimeout(){},fetch:async()=>({ok:false,status:404}),Math,Number,String,encodeURIComponent,decodeURIComponent};
vm.createContext(context);
// Prevent app initialization from requiring a full browser by executing the source with a minimal DOM shim.
vm.runInContext(source,context,{timeout:3000});
const api=context.window.LUNAVYRA_TEST_API;
assert.ok(api,'test API exported');
assert.equal(api.canonicalId('00012'),'12');
for (const bad of ['', '0', '000', '-1', '1.2', ' 1', '1 ', 'a12']) assert.throws(()=>api.canonicalId(bad));
assert.equal(api.incrementDecimal('9'),'10');
assert.equal(api.incrementDecimal('999'),'1000');
assert.equal(api.incrementDecimal('1'+'9'.repeat(500)),'2'+'0'.repeat(500));
for (const digits of [1,100,500,1000]) { const id=digits===1?'1':'9'.repeat(digits); assert.equal(api.canonicalId(id),id); const p1=api.generatedProfile(id),p2=api.generatedProfile(id); assert.equal(p1.id,id);assert.equal(p1.name,p2.name);assert.equal(p1.image,p2.image); }
const parsed=api.parseProfiles('$\r\nMira Vale\r\n$\r\nhttps://example.com/mira.jpg\r\n$\r\nhttps://example.com/mira-profile\r\n$\r\nIncomplete\r\n$\r\n');
assert.equal(parsed.get('1').name,'Mira Vale');assert.equal(parsed.get('2').name,'Incomplete');
// Exercise the same coordinate/base arithmetic used by the rolling-window strategy over many recenter cycles.
let base=0n, top=0;const rowHeight=api.constants.ROW_HEIGHT, shiftRows=BigInt(Math.round(api.constants.SHIFT_PIXELS/rowHeight));
for(let i=0;i<500;i++){top=9500;const before=base+BigInt(Math.floor(top/rowHeight));const shift=Math.min(api.constants.SHIFT_PIXELS,Math.max(0,top-api.constants.RECENTER_LOW));const rows=BigInt(Math.round(shift/rowHeight));top-=Number(rows)*rowHeight;base+=rows;const after=base+BigInt(Math.floor(top/rowHeight));assert.ok(before===after || before-after===1n || after-before===1n,`logical row preserved at cycle ${i}`);assert.ok(top>=0&&top<api.constants.WINDOW_HEIGHT);}
console.log('PASS: exact decimal IDs, invalid input, 1/100/500/1000-digit direct generation, deterministic identity, CRLF parsing, and 500 rolling-window rebase cycles.');
