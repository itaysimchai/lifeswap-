export const BACKEND_ORIGIN='https://lifeswapp.netlify.app';
const paths=new Set(['/api/bookings/free','/api/cancel-booking']);
export function allowedAPI(path:string){return paths.has(path);}
export function externalURL(raw:string){try{const u=new URL(raw);return ['https:','mailto:','tel:'].includes(u.protocol)?u.toString():null;}catch{return null;}}
export function checkoutURL(serviceId:string){return BACKEND_ORIGIN+'/services/'+encodeURIComponent(serviceId);}
