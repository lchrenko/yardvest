/* One website, with public market content read from YardVest Operations. */
(function () {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const query = new URLSearchParams(location.search);
  let selected = query.get('market') || localStorage.getItem('yardvest.market') || 'hrm';
  if (!['hrm','lower-mainland'].includes(selected)) selected='hrm';
  let data = null;
  const attributionKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  let attribution={};
  try { attribution=JSON.parse(sessionStorage.getItem('yardvest.attribution')||'{}'); } catch { /* fresh session */ }
  if(attributionKeys.some(k=>query.has(k))) {attribution=Object.fromEntries(attributionKeys.map(k=>[k,query.get(k)||'']));sessionStorage.setItem('yardvest.attribution',JSON.stringify(attribution));}
  const market = () => data?.markets.find(m=>m.code===selected);
  const offer = id => data?.availability.find(o=>o.market_id===market()?.id&&o.product_id===id);
  const formatRent = o => o?.rent_low!=null&&o?.rent_high!=null ? `${Number(o.rent_low).toLocaleString('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0})}–${Number(o.rent_high).toLocaleString('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0})} / month` : 'Rent estimate requires review';
  function selector() {
    document.querySelectorAll('[data-market-select]').forEach(s=>{s.value=selected;s.onchange=()=>{selected=s.value;localStorage.setItem('yardvest.market',selected);document.querySelectorAll('[data-market-select]').forEach(n=>n.value=selected);window.dispatchEvent(new Event('yardvest-market-changed'));};});
  }
  function page(kind) {
    const m=market(),name=m?.name||(selected==='hrm'?'HRM':'Vancouver / Lower Mainland');
    if(kind==='incentives') {
      const programs=data?.incentives.filter(i=>i.market_id===m?.id)||[];
      return `<section class="page-hero"><span class="eyebrow">${esc(name)}</span><h1>Incentives & financing</h1><p>We help you understand programs that may apply to your property.</p></section><section class="section">${programs.length?programs.map(i=>`<article class="market-information"><h2>${esc(i.name)}</h2><p>${esc(i.description)}</p><p>${esc(i.benefit)}</p><p>${esc(i.eligibility_note)}</p>${/^https:\/\//.test(i.official_url)?`<a class="text-link" href="${esc(i.official_url)}" target="_blank" rel="noopener">Official program details ↗</a>`:''}<p class="fine-print">Reviewed ${esc(i.reviewed_at)}${i.expires_on?` · Expires ${esc(i.expires_on)}`:''}. Eligibility and funding must be confirmed with the provider.</p></article>`).join(''):'<p>No verified active programs are listed for this market yet. Ask your advisor to review current options for your property.</p>'}<button class="button button-dark" data-advisor>Inquire for details</button></section>`;
    }
    return `<section class="page-hero"><span class="eyebrow">${esc(name)}</span><h1>Could a YardVest fit?</h1><p>${esc(m?.eligibility_notes||'Every property needs a local review. We confirm the applicable municipal requirements, site conditions, access and servicing before recommending a design.')}</p></section><section class="section"><h2>A property review comes first.</h2><p>Tell us the property address and municipality. Our team will confirm the market and review the requirements that apply to your site.</p><p>This is a preliminary assessment, not approval to build.</p><button class="button button-dark" data-property-check>Check My Property ↗</button></section>`;
  }
  function render(root,productId) {
    selector();
    const m=market(),name=m?.name||(selected==='hrm'?'HRM':'Vancouver / Lower Mainland');
    const section=document.createElement('section'); section.className='section market-information';
    const products=productId?data?.products.filter(p=>p.id===productId):data?.products;
    section.innerHTML=`<span class="eyebrow">${esc(name)}</span><h2>What could it earn?</h2><p>Rental potential depends on the home, location and property. These are planning assumptions, not guaranteed income.</p><div class="market-economics">${(products||[]).map(p=>{const o=offer(p.id);return `<article><h3>${esc(p.name)}</h3><p>${esc(o?.active?formatRent(o):'Availability requires review')}</p><p>${esc(o?.public_notes||'')}</p><p>Pricing: <button class="text-link" data-advisor>Inquire for details ↗</button></p></article>`;}).join('')||'<p>Rent estimate requires review. Inquire for details.</p>'}</div><p>${esc(m?.public_notes||'Our team will review your property and local delivery options.')}</p><a class="text-link" href="#/eligibility">View local requirements ↗</a>`;
    const hero=root.querySelector('.model-hero,.hero'); if(hero) hero.insertAdjacentElement('afterend',section);
    if(productId){const o=offer(productId);root.querySelectorAll('[data-style-select],[data-layout-select]').forEach(b=>{const id=b.dataset.styleSelect||b.dataset.layoutSelect;if(o?.disabled_options?.includes(id)){b.disabled=true;b.title='Unavailable in this market';b.querySelector('em').textContent='Unavailable in this market';}});if(data&&!o?.active){const notice=document.createElement('p');notice.className='market-notice';notice.textContent='This design is not currently available in the selected market. Ask an advisor about alternatives.';root.prepend(notice);}}
  }
  window.YardVestMarkets={page,render,offer,payload:()=>({selectedMarket:selected,utmSource:attribution.utm_source||'',utmMedium:attribution.utm_medium||'',utmCampaign:attribution.utm_campaign||'',utmContent:attribution.utm_content||'',utmTerm:attribution.utm_term||'',referrer:document.referrer?new URL(document.referrer).origin:''}),get catalogue(){return data?.products||null;}};
  selector();
  const config=window.YARDVEST_CONFIG;
  if(config?.businessIntakeUrl){const url=new URL(config.businessIntakeUrl);fetch(`${url.origin}/rest/v1/rpc/yardvest_public_catalogue`,{method:'POST',headers:{'content-type':'application/json',apikey:config.businessIntakePublishableKey},body:'{}'}).then(r=>{if(!r.ok)throw Error('Catalogue unavailable');return r.json();}).then(value=>{data=value;window.dispatchEvent(new Event('yardvest-catalogue-ready'));}).catch(()=>{window.dispatchEvent(new Event('yardvest-market-changed'));});}
})();
