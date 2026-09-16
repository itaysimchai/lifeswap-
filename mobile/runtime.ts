import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { externalURL } from './policy';
export async function openExternal(raw:string){
 const url=externalURL(raw);if(!url)throw new Error('This link cannot be opened.');
 if(Capacitor.isNativePlatform()&&url.startsWith('https:'))await Browser.open({url,presentationStyle:'fullscreen'});
 else window.open(url,'_blank','noopener,noreferrer');
}
/* Safari only evaluates :active on elements the document has claimed as touch
   targets; without a touchstart listener every press state is dead on iOS. */
export function installPressStates(){
 const noop=()=>{};
 document.addEventListener('touchstart',noop,{passive:true});
 return ()=>document.removeEventListener('touchstart',noop);
}
export function installExternalLinks(){
 const click=(event:MouseEvent)=>{const anchor=(event.target as HTMLElement)?.closest?.('a');if(!anchor)return;const href=anchor.getAttribute('href');if(!href||!externalURL(href))return;event.preventDefault();void openExternal(href).catch(()=>window.alert('Could not open this link. Please try again.'));};
 document.addEventListener('click',click);return ()=>document.removeEventListener('click',click);
}
