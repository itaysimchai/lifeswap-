import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageSquare, ChevronLeft } from 'lucide-react';
import { Network } from '@capacitor/network';
import { useTheme } from 'next-themes';
import { Providers } from '@/providers/Providers';
import { useAuth } from '@/providers/AuthProvider';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import DashboardLayout from '@/app/(dashboard)/layout';
import AuthLayout from '@/app/(auth)/layout';
import AdminLayout from '@/app/(admin)/layout';
import { LoadingScreen } from '@/components/ui/loader';
import { installExternalLinks, installPressStates } from './runtime';
import { installPushRouting } from '@/lib/push';
import { useScreenTitleStore } from '@/lib/screen-title';
import { useNativeTabs } from './native-tabs';
import '@/app/globals.css';
import './mobile.css';
const Login=lazy(()=>import('@/app/(auth)/login/page'));
const Register=lazy(()=>import('@/app/(auth)/register/page'));
const Forgot=lazy(()=>import('@/app/(auth)/forgot-password/page'));
const Overview=lazy(()=>import('@/app/(dashboard)/home/page'));
const Browse=lazy(()=>import('@/app/(dashboard)/dashboard/page'));
const Messages=lazy(()=>import('@/app/(dashboard)/messages/page'));
const ChatThread=lazy(()=>import('@/app/(dashboard)/messages/[chatId]/page'));
const Profile=lazy(()=>import('@/app/(dashboard)/profile/page'));
const MyServices=lazy(()=>import('@/app/(dashboard)/my-services/page'));
const Provider=lazy(()=>import('@/app/(dashboard)/become-provider/page'));
const Service=lazy(()=>import('@/app/(dashboard)/services/[id]/page'));
const Privacy=lazy(()=>import('@/app/privacy/page'));
const Terms=lazy(()=>import('@/app/terms/page'));
const Admin=lazy(()=>import('@/app/(admin)/admin/page'));
const Applications=lazy(()=>import('@/app/(admin)/admin/applications/page'));
const Reports=lazy(()=>import('@/app/(admin)/admin/reports/page'));
const Users=lazy(()=>import('@/app/(admin)/admin/users/page'));
const Success=lazy(()=>import('@/app/booking/success/page'));
function Loading(){return <LoadingScreen label="Opening LifeSwap"/>;}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="mobile-loading"><h1>LifeSwap couldn’t open this page</h1><button onClick={()=>window.location.assign('/home')}>Try again</button></div>:this.props.children;}
}
const TABS=[
 {to:'/home',label:'Home',Icon:Home},
 {to:'/dashboard',label:'Explore',Icon:Search},
 {to:'/messages',label:'Messages',Icon:MessageSquare},
];
// Screens reachable from the account sheet. The avatar tab opens a menu rather
// than navigating, so it lights up for anything that menu leads to - otherwise
// the indicator would never appear.
const ACCOUNT_ROUTES=['/profile','/my-services','/become-provider','/admin'];
const TITLES:Record<string,string>={'/home':'Home','/dashboard':'Explore','/messages':'Messages','/profile':'Profile & Settings',
 '/my-services':'My services','/become-provider':'Become a provider','/admin':'Admin',
 '/admin/applications':'Applications','/admin/reports':'Reports','/admin/users':'Users',
 '/privacy':'Privacy','/terms':'Terms','/booking/success':'Booking'};
const SUBTITLES:Record<string,string>={
 '/dashboard':'Find a service, pick a time, and pay to confirm.',
 '/messages':'Chat with people once a request is accepted.',
 '/profile':'Manage your account, appearance, and notifications.',
 '/my-services':'Create and manage the services clients can book.',
 '/become-provider':'Share your expertise and offer your own services.',
 '/admin':'Platform health at a glance.',
 '/admin/applications':'Review and approve provider applications.',
 '/admin/users':'Manage accounts and block abusive users.',
 '/admin/reports':'Review user reports and block accounts when needed.'};
// In-app screens follow platform conventions; auth and legal keep the editorial
// brand voice, so the serif and the marketing spacing stay there.
const IN_APP=['/home','/dashboard','/messages','/profile','/my-services','/become-provider','/admin','/services/'];
function isInApp(pathname:string){return IN_APP.some(p=>pathname===p||pathname.startsWith(p==='/services/'?p:p+'/'));}
const DETAIL=['/messages/','/services/'];
function isDetail(pathname:string){return DETAIL.some(p=>pathname.startsWith(p)&&pathname.length>p.length);}
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';}
function titleFor(pathname:string){
 if(TITLES[pathname])return TITLES[pathname];
 if(pathname.startsWith('/messages/'))return 'Chat';
 if(pathname.startsWith('/services/'))return 'Service';
 return 'LifeSwap';
}
function initialsOf(name?:string|null,email?:string|null){
 const n=name?.trim();
 if(n){const p=n.split(/\s+/);return ((p[0]?.[0]??'')+(p[1]?.[0]??'')).toUpperCase()||'U';}
 return (email?.[0]??'U').toUpperCase();
}
/* photoURL is an arbitrary URL from Firestore, so show initials until the image
   has actually decoded and fall back permanently if it errors - a dead link must
   never leave a broken icon in the tab bar. */
function Avatar({size}:{size?:'lg'}){
 const {user,profile}=useAuth();
 const url=profile?.photoURL;
 const [ready,setReady]=useState(false);
 useEffect(()=>{setReady(false);},[url]);
 return <span className={size?`mobile-avatar-wrap ${size}`:'mobile-avatar-wrap'}>
  {(!url||!ready)&&<span className="mobile-avatar-fallback">{initialsOf(profile?.displayName,user?.email)}</span>}
  {url&&<img src={url} alt="" className={ready?'mobile-avatar-img ready':'mobile-avatar-img'}
    onLoad={()=>setReady(true)} onError={()=>setReady(false)}/>}
 </span>;
}
/* Native-style title bar: screen title plus a back affordance on nested screens.
   Account actions live in the tab-bar sheet, so nothing else belongs up here. */
function TitleBar({collapsed}:{collapsed:boolean}){
 const {pathname}=useLocation();
 const navigate=useNavigate();
 const isTabRoot=TABS.some(t=>t.to===pathname);
 // A pushed screen can name itself; otherwise the route table decides.
 const screenTitle=useScreenTitleStore(state=>state.title);
 return <header className={collapsed?'mobile-titlebar collapsed':'mobile-titlebar'}>
  <div className="mobile-titlebar-slot">
   {!isTabRoot&&<button type="button" aria-label="Back" onClick={()=>navigate(-1)}><ChevronLeft size={26}/></button>}
  </div>
  <h1 aria-hidden={!collapsed}>{screenTitle??titleFor(pathname)}</h1>
  <div className="mobile-titlebar-slot right"/>
 </header>;
}
/* The page's own header is hidden inside the shell (see [data-page-header] in
   mobile.css) so the title is stated once, here, where the chrome lives. */
function LargeTitle(){
 const {pathname}=useLocation();
 const {profile}=useAuth();
 const title=pathname==='/home'
  ?`${greeting()}${profile?.displayName?`, ${profile.displayName.trim().split(/\s+/)[0]}`:''}`
  :titleFor(pathname);
 const subtitle=SUBTITLES[pathname];
 return <div className="mobile-largetitle">
  <h1>{title}</h1>
  {subtitle&&<p>{subtitle}</p>}
 </div>;
}
function Shell(){
 const {user}=useAuth();const {pathname}=useLocation();const navigate=useNavigate();const [online,setOnline]=useState(true);
 const hasUnread=useUnreadMessages(user?.uid);
 const scroller=React.useRef<HTMLDivElement>(null);
 const [collapsed,setCollapsed]=useState(false);
 const nativeTabs=useNativeTabs(!!user,hasUnread);
 const accountActive=ACCOUNT_ROUTES.some(r=>pathname===r||pathname.startsWith(r+'/'));
 const {resolvedTheme}=useTheme();
 const inApp=isInApp(pathname);
 const detail=isDetail(pathname);
 const thread=pathname.startsWith('/messages/');
 /* Safari does not repaint a backdrop-filter layer when a custom property it
    depends on changes, so the translucent bars keep the previous theme's colour
    until something else forces a composite - which reads as the theme switch
    only half working. Drop the filter for one frame to invalidate them. */
 useEffect(()=>{
  const root=document.documentElement;
  root.classList.add('theme-repaint');
  const id=requestAnimationFrame(()=>root.classList.remove('theme-repaint'));
  return()=>{cancelAnimationFrame(id);root.classList.remove('theme-repaint');};
 },[resolvedTheme]);
 useEffect(()=>installExternalLinks(),[]);
 useEffect(()=>installPressStates(),[]);
 useEffect(()=>installPushRouting(to=>navigate(to)),[navigate]);
 /* Cross-fade the compact title in once the large one has scrolled under the
    bar. A fixed threshold keeps this off the layout path - measuring the title
    on every frame would force a reflow mid-scroll for a few pixels of accuracy. */
 useEffect(()=>{
  const el=scroller.current;
  if(!el||!inApp||detail){setCollapsed(false);return;}
  let frame=0;
  const read=()=>{frame=0;setCollapsed(el.scrollTop>32);};
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(read);};
  el.addEventListener('scroll',onScroll,{passive:true});
  read();
  return()=>{el.removeEventListener('scroll',onScroll);if(frame)cancelAnimationFrame(frame);};
 },[inApp,detail,pathname]);
 useEffect(()=>{let disposed=false;let remove:(()=>void)|undefined;void Network.getStatus().then(s=>!disposed&&setOnline(s.connected));void Network.addListener('networkStatusChange',s=>setOnline(s.connected)).then(h=>{if(disposed)void h.remove();else remove=()=>void h.remove();});return()=>{disposed=true;remove?.();};},[]);
 // The document never scrolls (html/body are overflow:hidden), so window.scrollTo
 // was a no-op and every navigation inherited the previous page's offset. Reset
 // the actual scroller instead.
 useEffect(()=>{scroller.current?.scrollTo(0,0);},[pathname]);
 const dashboard=(node:React.ReactNode)=><DashboardLayout>{node}</DashboardLayout>;
 const admin=(node:React.ReactNode)=><AdminLayout>{node}</AdminLayout>;
 return <div className={`mobile-app${user?' signed-in':''}${nativeTabs?' native-tabs':''}${inApp?' in-app':''}${thread?' thread':''}`}>
  {user&&<TitleBar collapsed={collapsed||!inApp||detail}/>}
  {!online&&<div className="offline-banner" role="status">You’re offline. Reconnect to load updates and send messages.</div>}
  <div className="mobile-scroll" ref={scroller}>{user&&inApp&&!detail&&<LargeTitle/>}<Suspense fallback={<Loading/>}><Routes>
   <Route path="/" element={<Navigate to="/home" replace/>}/>
   <Route path="/login" element={<AuthLayout><Login/></AuthLayout>}/>
   <Route path="/register" element={<AuthLayout><Register/></AuthLayout>}/>
   <Route path="/forgot-password" element={<AuthLayout><Forgot/></AuthLayout>}/>
   <Route path="/home" element={dashboard(<Overview/>)}/>
   <Route path="/dashboard" element={dashboard(<Browse/>)}/>
   <Route path="/messages" element={dashboard(<Messages/>)}/>
   <Route path="/messages/:chatId" element={dashboard(<ChatThread/>)}/>
   <Route path="/profile" element={dashboard(<Profile/>)}/>
   <Route path="/my-services" element={dashboard(<MyServices/>)}/>
   <Route path="/my-dashboard" element={<Navigate to="/my-services" replace/>}/>
   <Route path="/become-provider" element={dashboard(<Provider/>)}/>
   <Route path="/services/:id" element={dashboard(<Service/>)}/>
   <Route path="/privacy" element={<Privacy/>}/><Route path="/terms" element={<Terms/>}/>
   <Route path="/booking/success" element={<Success/>}/>
   <Route path="/admin" element={admin(<Admin/>)}/>
   <Route path="/admin/applications" element={admin(<Applications/>)}/>
   <Route path="/admin/reports" element={admin(<Reports/>)}/>
   <Route path="/admin/users" element={admin(<Users/>)}/>
   <Route path="*" element={<div className="mobile-loading"><h1>Page not found</h1><NavLink to="/home">Back to LifeSwap</NavLink></div>}/>
  </Routes></Suspense></div>
  {user&&!nativeTabs&&<nav className="mobile-tabbar" aria-label="Main navigation">
   {TABS.map(({to,label,Icon})=>
    <NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}>
     <span className="mobile-tabicon">
      <Icon size={24}/>
      {to==='/messages'&&hasUnread&&<span className="mobile-tabdot" aria-label="Unread messages"/>}
     </span>
     <span>{label}</span>
    </NavLink>)}
   <NavLink to="/profile" className={accountActive?'active':''}>
    <span className="mobile-tabicon"><Avatar/></span>
    <span>Account</span>
   </NavLink>
  </nav>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><BrowserRouter><Providers><Shell/></Providers></BrowserRouter></ErrorBoundary>);
