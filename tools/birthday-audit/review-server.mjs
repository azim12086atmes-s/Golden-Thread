import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createPartyServer } from '../../server/party.mjs';
const token=()=>randomBytes(32).toString('base64url');
const slots=[{id:'review-birthday',role:'birthday',name:'Birthday',avatar:'g-kurti-jeans',token:token()},
{id:'review-observer',role:'observer',name:'AbdulAzim',avatar:'b-kurta-jeans',token:token()},
...[1,2,3].map(i=>({id:`review-sibling-${i}`,role:'companion',name:`Private Sibling ${i}`,avatar:'g-kurti-jeans',token:token()}))];
fs.writeFileSync('.review-fixture.json',JSON.stringify({slots}),{mode:0o600});
const app=createPartyServer({config:{slots,maxConnections:32}});
app.listen(8013,'127.0.0.1');
