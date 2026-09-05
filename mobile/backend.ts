import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { BACKEND_ORIGIN, allowedAPI } from './policy';
export async function appFetch(path:string, init:RequestInit = {}):Promise<Response>{
 if(!allowedAPI(path))throw new Error('This request is not supported.');
 if(Capacitor.isNativePlatform()){
  const headers=Object.fromEntries(new Headers(init.headers).entries());
  const result=await CapacitorHttp.request({url:BACKEND_ORIGIN+path,method:init.method??'POST',headers,data:typeof init.body==='string'?JSON.parse(init.body):undefined,connectTimeout:15000,readTimeout:25000,disableRedirects:true});
  return new Response(typeof result.data==='string'?result.data:JSON.stringify(result.data),{status:result.status,headers:{'Content-Type':'application/json'}});
 }
 return fetch(path,init);
}
