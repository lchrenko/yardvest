const fs = require('fs');
const path = require('path');

const OUT = path.resolve('output/plans');
fs.mkdirSync(OUT, { recursive: true });

// All geometry is stored in inches. Rendering uses 2 SVG units per inch.
const S = 2;
const EXT = 280;        // 23'-4"
const EW = 6;          // exterior wall
const IW = 4.5;        // interior partition
const INNER = EXT - 2 * EW; // 268"
const REAR_D = 126;    // 10'-6" clear
const FRONT_D = INNER - REAR_D - IW; // 137.5"
const BED_W = 118;     // 9'-10" clear
const LIVE_W = INNER - BED_W - IW; // 145.5"
const BATH_W = 60;
const BATH_D = 96;
const MECH_W = 36;
const MECH_D = 60;
const STAIR_W = 96;    // adjusted from requested 72" after geometric validation
const STAIR_D = 108;

function assertClose(label, actual, expected) {
  if (Math.abs(actual - expected) > 0.001) throw new Error(`${label}: ${actual} != ${expected}`);
}
assertClose('exterior width', EXT, 280);
assertClose('exterior depth', EXT, 280);
assertClose('interior width', BED_W + IW + LIVE_W, INNER);
assertClose('interior depth', REAR_D + IW + FRONT_D, INNER);
assertClose('bath width', BATH_W, 60);
assertClose('bath depth', BATH_D, 96);
assertClose('mechanical width', MECH_W, 36);
assertClose('mechanical depth', MECH_D, 60);
assertClose('stair envelope width', STAIR_W, 96);
assertClose('stair envelope depth', STAIR_D, 108);

const px = n => n * S;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rect = (x,y,w,h,cls='',extra='') => `<rect x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}" class="${cls}" ${extra}/>`;
const line = (x1,y1,x2,y2,cls='thin',extra='') => `<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" class="${cls}" ${extra}/>`;
const text = (x,y,s,cls='label',anchor='middle') => `<text x="${px(x)}" y="${px(y)}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
const door = (x,y,w,side='top') => {
  if (side === 'top') return `${line(x,y,x+w,y,'opening')}${line(x,y,x,y+w,'doorleaf')}<path d="M ${px(x+w)} ${px(y)} A ${px(w)} ${px(w)} 0 0 0 ${px(x)} ${px(y+w)}" class="swing"/>`;
  return `${line(x,y,x+w,y,'opening')}${line(x+w,y,x+w,y-w,'doorleaf')}<path d="M ${px(x)} ${px(y)} A ${px(w)} ${px(w)} 0 0 1 ${px(x+w)} ${px(y-w)}" class="swing"/>`;
};
const windowH = (x,y,w) => `${line(x,y,x+w,y,'opening')}${line(x,y-1.5,x+w,y-1.5,'window')}${line(x,y+1.5,x+w,y+1.5,'window')}`;
const dimH = (x1,x2,y,label) => `${line(x1,y,x2,y,'dim')}<path d="M${px(x1)},${px(y)} l${px(4)},${px(-2)} l0,${px(4)} z M${px(x2)},${px(y)} l${px(-4)},${px(-2)} l0,${px(4)} z" class="dimfill"/>${text((x1+x2)/2,y-3,label,'dimtext')}`;
const dimV = (y1,y2,x,label) => `${line(x,y1,x,y2,'dim')}<path d="M${px(x)},${px(y1)} l${px(-2)},${px(4)} l${px(4)},0 z M${px(x)},${px(y2)} l${px(-2)},${px(-4)} l${px(4)},0 z" class="dimfill"/>${text(x-4,(y1+y2)/2,label,'dimtext','middle')}`;

function baseStyles() { return `<style>
  .wall{fill:#fbfbfa;stroke:#e24a2f;stroke-width:1.5}.part{fill:#fbfbfa;stroke:#e24a2f;stroke-width:1.15}.zone{fill:#fbfbfa;stroke:#e24a2f;stroke-width:1}.future{fill:none;stroke:#3e9b45;stroke-width:1.1;stroke-dasharray:7 5}.stairzone{fill:none;stroke:#2d62c6;stroke-width:1.25;stroke-dasharray:7 5}.thin{stroke:#555;stroke-width:.7;fill:none}.opening{stroke:#fbfbfa;stroke-width:8;fill:none}.window{stroke:#263f9b;stroke-width:1.35}.doorleaf{stroke:#263f9b;stroke-width:1.2}.swing{stroke:#263f9b;stroke-width:.8;fill:none}.fixture{fill:none;stroke:#b11aa3;stroke-width:1.1}.furn{fill:none;stroke:#b11aa3;stroke-width:.9}.cab{fill:none;stroke:#b11aa3;stroke-width:.9}.wet{fill:none;stroke:#b11aa3;stroke-width:1}.label{font:700 7px Arial,sans-serif;fill:#263f9b}.small{font:5.5px Arial,sans-serif;fill:#263f9b}.tiny{font:4.5px Arial,sans-serif;fill:#555}.title{font:700 13px Arial,sans-serif;fill:#13823b}.subtitle{font:7px Arial,sans-serif;fill:#13823b}.dim{stroke:#13823b;stroke-width:.75;fill:none}.dimfill{fill:#13823b}.dimtext{font:6px Arial,sans-serif;fill:#13823b}.dash{stroke:#3e9b45;stroke-width:.8;stroke-dasharray:5 4;fill:none}.arrow{stroke:#263f9b;stroke-width:1.5;fill:none;marker-end:url(#arrow)}
</style>`; }

function defs() { return `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#2377ad"/></marker></defs>`; }

function plan(mode='one', ox=25, oy=45) {
  const x0=ox, y0=oy, xi=x0+EW, yi=y0+EW;
  const rearBottom=yi+REAR_D;
  const frontTop=rearBottom+IW;
  const bedroomRight=xi+BED_W;
  const livingLeft=bedroomRight+IW;
  const bathRight=xi+BATH_W;
  const mechLeft=bathRight+IW;
  const mechRight=mechLeft+MECH_W;
  const stairLeft=xi+100.5;
  const stairTop=yi+INNER-STAIR_D;
  const stairRight=stairLeft+STAIR_W;
  let g='';

  // Shell and main partitions.
  g += rect(x0,y0,EXT,EXT,'wall');
  g += rect(xi,yi,INNER,INNER,'zone');
  g += rect(bedroomRight,yi,IW,REAR_D,'part');
  g += rect(xi,rearBottom,INNER,IW,'part');

  // Openings and exterior windows.
  g += windowH(xi+25,y0+EW,48);
  g += windowH(livingLeft+36,y0+EW,72);
  g += windowH(xi+12,y0+EXT-EW,30);
  g += windowH(x0+EXT-EW,frontTop+46,0); // visual anchor only
  g += door(stairLeft+30,y0+EXT-EW,36,'bottom');

  // Bedroom furniture and closet.
  g += rect(xi+14,yi+18,60,80,'furn');
  g += rect(xi+7,yi+30,7,17,'furn') + rect(xi+74,yi+30,7,17,'furn');
  g += rect(xi+7,yi+104,65,18,'cab');
  g += text(xi+59,yi+62,'BEDROOM','label');
  g += text(xi+59,yi+70,"9'-10\" x 10'-6\"",'small');
  g += text(xi+39,yi+116,"5'-5\" CLOSET",'tiny');

  // Living furniture.
  g += rect(livingLeft+26,yi+16,88,34,'furn','rx="4"');
  g += rect(livingLeft+48,yi+61,42,22,'furn','rx="3"');
  g += rect(xi+INNER-12,yi+28,8,62,'cab');
  g += text(livingLeft+28,yi+101,'LIVING','label');
  g += text(livingLeft+28,yi+109,"12'-1½\" x 10'-6\"",'small');
  g += text(livingLeft+72,yi+9,"6'-0\" PATIO SLIDER",'tiny');

  // Bathroom, 5x8 clear.
  g += rect(xi,frontTop,BATH_W,BATH_D,'zone');
  g += rect(xi,frontTop,60,30,'wet','rx="7"');
  g += rect(xi+7,frontTop+39,22,28,'fixture');
  g += `<ellipse cx="${px(xi+18)}" cy="${px(frontTop+49)}" rx="${px(8)}" ry="${px(10)}" class="fixture"/>`;
  g += rect(xi+31,frontTop+61,25,22,'fixture');
  g += door(xi+24,frontTop+BATH_D,30,'bottom');
  g += text(xi+30,frontTop+52,'BATH','label');
  g += text(xi+30,frontTop+58,"5'-0\" x 8'-0\"",'small');

  // Laundry/mechanical.
  g += rect(mechLeft,frontTop,MECH_W,MECH_D,'zone');
  g += rect(mechLeft+3,frontTop+4,27,30,'fixture');
  g += `<circle cx="${px(mechLeft+16.5)}" cy="${px(frontTop+19)}" r="${px(8)}" class="fixture"/>`;
  g += rect(mechLeft+4,frontTop+38,13,16,'cab');
  g += `<circle cx="${px(mechLeft+25)}" cy="${px(frontTop+46)}" r="${px(7)}" class="cab"/>`;
  g += text(mechLeft+18,frontTop+18,'STACKED','tiny');
  g += text(mechLeft+18,frontTop+24,'W/D','tiny');
  g += text(mechLeft+18,frontTop+68,'LAUNDRY / MECH','label');
  g += text(mechLeft+18,frontTop+75,"3'-0\" x 5'-0\"",'small');

  // Open kitchen, right/front. Cabinets are standard 24" deep.
  const kx=stairRight+IW, ky=frontTop;
  g += rect(kx,ky,24,124,'cab');
  g += rect(kx,yi+INNER-24,xi+INNER-kx,24,'cab');
  g += rect(kx,ky+5,24,36,'fixture'); g += text(kx+12,ky+24,'REF','tiny');
  g += rect(kx,ky+47,24,30,'fixture'); g += text(kx+12,ky+64,'RANGE','tiny');
  g += rect(kx+7,yi+INNER-24,33,24,'wet'); g += text(kx+23.5,yi+INNER-10,'SINK','tiny');
  g += rect(kx+42,yi+INNER-24,24,24,'fixture'); g += text(kx+54,yi+INNER-10,'DW','tiny');
  g += text(kx+35,frontTop+92,'KITCHEN','label');
  g += text(kx+35,frontTop+99,"11'-5½\" WALL RUN",'small');

  // Dining sits at the transition from kitchen to living, entirely outside the stair envelope.
  const diningY=rearBottom-42;
  g += rect(livingLeft+54,diningY,48,36,'furn','rx="2"');
  for (const [cx,cy] of [[livingLeft+66,diningY-5],[livingLeft+90,diningY-5],[livingLeft+66,diningY+41],[livingLeft+90,diningY+41]]) g += `<circle cx="${px(cx)}" cy="${px(cy)}" r="${px(7)}" class="furn"/>`;
  g += text(livingLeft+78,diningY+20,'DINING','label');
  g += text(livingLeft+78,diningY+27,"36\" x 48\" / 4",'tiny');

  // Convertible 8x9 zone. The requested 6x9 is shown as insufficient in notes.
  if (mode === 'one') {
    g += rect(stairLeft,stairTop,STAIR_W,STAIR_D,'future');
    g += rect(stairLeft+3,stairTop+5,24,60,'cab');
    g += rect(stairLeft+3,stairTop+70,24,32,'cab');
    g += text(stairLeft+60,stairTop+35,'FUTURE STAIR /','label');
    g += text(stairLeft+60,stairTop+43,'PANTRY / STORAGE','label');
    g += text(stairLeft+60,stairTop+52,"8'-0\" x 9'-0\"",'small');
    g += text(stairLeft+15,stairTop+31,'24" PANTRY','tiny');
    g += text(stairLeft+15,stairTop+87,'COAT /','tiny');
    g += text(stairLeft+15,stairTop+93,'STORAGE','tiny');
  } else {
    g += rect(stairLeft,stairTop,STAIR_W,STAIR_D,'stairzone');
    // First flight: 36" wide, 60" run north from front; 36" landing; second flight 60" west.
    const ex=stairRight-36, bottom=stairTop+STAIR_D;
    g += rect(ex,stairTop+36,36,36,'zone');
    for(let i=0;i<=6;i++) g += line(ex,bottom-i*10,stairRight,bottom-i*10,'thin');
    for(let i=0;i<=6;i++) g += line(stairRight-36-i*10,stairTop,stairRight-36-i*10,stairTop+36,'thin');
    g += `<path d="M${px(ex+18)} ${px(bottom-5)} L${px(ex+18)} ${px(stairTop+54)} L${px(stairLeft+8)} ${px(stairTop+54)}" class="arrow"/>`;
    g += text(stairLeft+48,stairTop+70,'L-SHAPED STAIR','label');
    g += text(stairLeft+48,stairTop+78,'36" CLEAR / 36" LANDING','small');
    g += text(stairLeft+48,stairTop+86,"8'-0\" x 9'-0\" ENVELOPE",'small');
  }

  // Direct circulation and labels.
  g += text(stairLeft+48,yi+INNER+17,'ENTRY — 3\'-0" DOOR','small');
  g += text(xi+INNER/2,frontTop+108,'OPEN CIRCULATION — NO DEDICATED HALL','tiny');

  // Exterior and principal derived dimensions.
  g += dimH(x0,x0+EXT,y0-10,"23'-4\"");
  g += dimV(y0,y0+EXT,x0-10,"23'-4\"");
  g += dimH(xi,bedroomRight,y0-1,"9'-10\"");
  g += dimH(livingLeft,xi+INNER,y0-1,"12'-1½\"");
  g += dimV(yi,rearBottom,x0+EXT+10,"10'-6\"");
  g += dimV(frontTop,yi+INNER,x0+EXT+10,"11'-5½\"");

  return g;
}

function svgDoc(mode, title, subtitle) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="790" viewBox="0 0 660 690">${defs()}${baseStyles()}<rect width="100%" height="100%" fill="#f7f7f5"/>${text(330/S,12,title,'title')}${text(330/S,23,subtitle,'subtitle')}${plan(mode,25,45)}${text(25,337,'CONCEPT PROTOTYPE - NOT FOR PERMIT OR CONSTRUCTION','small','start')}</svg>`;
}

const one = svgDoc('one','YARDVEST ONE',"23'-4\" x 23'-4\"  |  APPROX. 544 SQ FT GROSS");
const two = svgDoc('two','YARDVEST TWO - MAIN FLOOR STAIR TEST','SAME SHELL AND ROOM LOCATIONS');
fs.writeFileSync(path.join(OUT,'yardvest-one-scaled.svg'), one);
fs.writeFileSync(path.join(OUT,'yardvest-two-stair-test.svg'), two);

const comparison = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1320" viewBox="0 0 1600 1320">${defs()}${baseStyles()}<rect width="100%" height="100%" fill="white"/>${text(400,24,'YARDVEST ONE / TWO GEOMETRY TEST','title')}
<g transform="translate(35,55) scale(1.05)">${plan('one',25,45)}</g><g transform="translate(810,55) scale(1.05)">${plan('two',25,45)}</g>
${text(195,48,'YARDVEST ONE','title')}${text(585,48,'YARDVEST TWO — STAIR TEST','title')}
<g transform="translate(50,800)"><rect x="0" y="0" width="1500" height="430" fill="#fff" stroke="#333"/>
${text(10,14,'ITEM','label','start')}${text(500,14,'YARDVEST ONE','label','start')}${text(980,14,'YARDVEST TWO','label','start')}
${[['Bedroom 1 clear size',"9'-10\" x 10'-6\"","same"],['Living clear size',"12'-1½\" x 10'-6\"","same"],['Bathroom clear size',"5'-0\" x 8'-0\"","same"],['Kitchen run length',"11'-5½\" + front return","same"],['Dining clearance','4-person table in open zone','same'],['Mechanical closet size',"3'-0\" x 5'-0\"","same"],['Pantry size','24\" deep x 5\' + coat storage','removed for stair'],['Future / stair zone size',"8'-0\" x 9'-0\"","8'-0\" x 9'-0\""],['Dedicated hallway area','0 sq ft','0 sq ft'],['Gross footprint','approx. 544 sq ft','approx. 544 sq ft']].map((row,i)=>{const y=29+i*19;return `${line(0,y-8,750,y-8,'thin')}${text(10,y,row[0],'small','start')}${text(250,y,row[1],'small','start')}${text(490,y,row[2],'small','start')}`}).join('')}
</g><text x="50" y="1270" class="small">VALIDATION: Requested 6' x 9' L-stair envelope is 24" too narrow for two ~60" flights plus a 36" landing. Prototype uses the smallest practical adjustment: 8' x 9'.</text></svg>`;
fs.writeFileSync(path.join(OUT,'yardvest-one-two-comparison.svg'), comparison);

console.log(JSON.stringify({
  exterior: `${EXT} x ${EXT} in`, interior: `${INNER} x ${INNER} in`, rearBand: `${REAR_D} in`, frontBand: `${FRONT_D} in`,
  bedroom: `${BED_W} x ${REAR_D} in`, living: `${LIVE_W} x ${REAR_D} in`, bathroom: `${BATH_W} x ${BATH_D} in`,
  mechanical: `${MECH_W} x ${MECH_D} in`, stairEnvelope: `${STAIR_W} x ${STAIR_D} in`,
  conflict: 'Requested 72 x 108 in stair envelope is 24 in too narrow; adjusted to 96 x 108 in.'
}, null, 2));
