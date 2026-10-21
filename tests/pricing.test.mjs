import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
test('approved prices preserve layout ids and exclude all internal costs',()=>{
 const context=vm.createContext({});vm.runInContext(source.slice(0,source.indexOf('const models = ['))+';this.price=startingPrice;this.label=priceText;',context);
 for(const [id,layout,price] of [['yv-one',null,159000],['yv-two','flex',195000],['yv-two','second-bath',199000],['suite-plus',null,195000]]){assert.equal(context.price({id},layout),price);assert.equal(context.label({id},layout),`From CAD $${price.toLocaleString('en-CA')}`);}
});
test('no earnings widget; request uses existing form and checked boolean',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const markets=await readFile(new URL('../markets.js',import.meta.url),'utf8');
 assert.doesNotMatch(markets,/What could it earn|market-economics/);assert.match(html,/name="rentalEstimateRequested" value="true"/);assert.doesNotMatch(html,/name="rentalEstimateRequested"[^>]*checked/);
 assert.match(source,/rentalEstimateRequested: data.rentalEstimateRequested === "true"/);
});
