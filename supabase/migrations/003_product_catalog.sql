insert into public.product_families(slug,name,status,description,sort_order,visible,content) values
('yardvest-one','YardVest One','available','A one-bedroom home in a 24 by 24 foot footprint.',1,true,'{"footprint":"24 × 24","bedrooms":1,"bathrooms":1,"gross_footprint_sqft":576}'),
('yardvest-two','YardVest Two','available','A two-storey YardVest with Flex and Second Bath upper-level options.',2,true,'{"footprint":"24 × 24","storeys":2}'),
('suite-plus','Suite Plus','available','A one-bedroom upper suite above a private garage.',3,true,'{"footprint":"24 × 24","bedrooms":1,"bathrooms":1,"garage_spaces":1,"gross_upper_footprint_sqft":576}')
on conflict(slug) do update set name=excluded.name,status=excluded.status,description=excluded.description,sort_order=excluded.sort_order,visible=excluded.visible,content=excluded.content;

insert into public.product_styles(product_family_id,slug,name,roof_form)
select id,'modern','Modern','Low-slope / mono-pitch' from public.product_families
on conflict(product_family_id,slug) do update set name=excluded.name,roof_form=excluded.roof_form;
insert into public.product_styles(product_family_id,slug,name,roof_form)
select id,'coastal','Coastal','Gable' from public.product_families
on conflict(product_family_id,slug) do update set name=excluded.name,roof_form=excluded.roof_form;

insert into public.plan_variants(product_family_id,slug,name,bedrooms,bathrooms,footprint_width,footprint_depth,gross_area,review_required,content)
select id,'standard','Standard',1,1,24,24,576,false,'{}' from public.product_families where slug='yardvest-one'
on conflict(product_family_id,slug) do update set bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,gross_area=excluded.gross_area;
insert into public.plan_variants(product_family_id,slug,name,bedrooms,bathrooms,footprint_width,footprint_depth,review_required,content)
select id,'flex','Flex',null,1,24,24,true,'{"note":"Upper private-room classification requires final code review"}' from public.product_families where slug='yardvest-two'
on conflict(product_family_id,slug) do update set name=excluded.name,review_required=excluded.review_required,content=excluded.content;
insert into public.plan_variants(product_family_id,slug,name,bedrooms,bathrooms,footprint_width,footprint_depth,review_required,content)
select id,'second-bath','Second Bath',2,2,24,24,true,'{"note":"Working public label pending final approval"}' from public.product_families where slug='yardvest-two'
on conflict(product_family_id,slug) do update set name=excluded.name,review_required=excluded.review_required,content=excluded.content;
insert into public.plan_variants(product_family_id,slug,name,bedrooms,bathrooms,footprint_width,footprint_depth,gross_area,review_required,content)
select id,'standard','Standard',1,1,24,24,576,false,'{"garage_spaces":1,"area_note":"Gross upper footprint, not net living area"}' from public.product_families where slug='suite-plus'
on conflict(product_family_id,slug) do update set bedrooms=excluded.bedrooms,bathrooms=excluded.bathrooms,gross_area=excluded.gross_area,content=excluded.content;
