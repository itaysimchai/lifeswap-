import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageSquare, Loader2, ChevronLeft } from 'lucide-react';
import { Network } from '@capacitor/network';
import { Providers } from '@/providers/Providers';
import { useAuth } from '@/providers/AuthProvider';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import DashboardLayout from '@/app/(dashboard)/layout';
import AuthLayout from '@/app/(auth)/layout';
import AdminLayout from '@/app/(admin)/layout';
import { installExternalLinks } from './runtime';
import { useNativeTabs } from './native-tabs';
import '@/app/globals.css';
import './mobile.css';
const Login=lazy(()=>import('@/app/(auth)/login/page'));
const Register=lazy(()=>import('@/app/(auth)/register/page'));
const Forgot=lazy(()=>import('@/app/(auth)/forgot-password/page'));
const Overview=lazy(()=>import('@/app/(dashboard)/home/page'));
const Browse=lazy(()=>import('@/app/(dashboard)/dashboard/page'));
const Messages=lazy(()=>import('@/app/(dashboard)/messages/page'));
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
function Loading(){return <div className="mobile-loading" role="status"><Loader2 className="animate-spin"/><span>Opening LifeSwap…</span></div>;}
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
const TITLES:Record<string,string>={'/home':'Home','/dashboard':'Explore','/messages':'Messages','/profile':'Profile',
 '/my-services':'My services','/become-provider':'Become a provider','/admin':'Admin',
 '/admin/applications':'Applications','/admin/reports':'Reports','/admin/users':'Users',
 '/privacy':'Privacy','/terms':'Terms','/booking/success':'Booking'};
function titleFor(pathname:string){
 if(TITLES[pathname])return TITLES[pathname];
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
function TabAvatar(){
 const {user,profile}=useAuth();
 const url=profile?.photoURL;
 const [ready,setReady]=useState(false);
 useEffect(()=>{setReady(false);},[url]);
 return <span className="mobile-avatar-wrap">
  {(!url||!ready)&&<span className="mobile-avatar-fallback">{initialsOf(profile?.displayName,user?.email)}</span>}
  {url&&<img src={url} alt="" className={ready?'mobile-avatar-img ready':'mobile-avatar-img'}
    onLoad={()=>setReady(true)} onError={()=>setReady(false)}/>}
 </span>;
}
/* Account sheet: rises from the bottom above the tab bar. Contents vary by role
   - Admin is included because, with the title-bar menu gone, this is an admin's
   only route to /admin. */
function AccountSheet({open,onClose}:{open:boolean;onClose:()=>void}){
 const {profile,signOut}=useAuth();
 const navigate=useNavigate();
 useEffect(()=>{
  if(!open)return;
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 },[open,onClose]);
 if(!open)return null;
 const go=(to:string)=>{onClose();navigate(to);};
 const items=[
  profile?.isProvider?{label:'My Services',to:'/my-services'}:{label:'Become a provider',to:'/become-provider'},
  ...(profile?.role==='admin'?[{label:'Admin',to:'/admin'}]:[]),
  {label:'Profile & Settings',to:'/profile'},
 ];
 return <div className="mobile-sheet-root">
  <div className="mobile-sheet-scrim" onClick={onClose}/>
  <div className="mobile-sheet" role="menu" aria-label="Account">
   {items.map(i=><button key={i.to} type="button" role="menuitem" onClick={()=>go(i.to)}>{i.label}</button>)}
   <button type="button" role="menuitem" className="danger" onClick={()=>{onClose();void signOut();}}>Sign Out</button>
  </div>
 </div>;
}
/* Native-style title bar: screen title plus a back affordance on nested screens.
   Account actions live in the tab-bar sheet, so nothing else belongs up here. */
function TitleBar(){
 const {pathname}=useLocation();
 const navigate=useNavigate();
 const isTabRoot=TABS.some(t=>t.to===pathname);
 return <header className="mobile-titlebar">
  <div className="mobile-titlebar-slot">
   {!isTabRoot&&<button type="button" aria-label="Back" onClick={()=>navigate(-1)}><ChevronLeft size={26}/></button>}
  </div>
  <h1>{titleFor(pathname)}</h1>
  <div className="mobile-titlebar-slot right"/>
 </header>;
}
function Shell(){
 const {user}=useAuth();const {pathname}=useLocation();const [online,setOnline]=useState(true);
 const hasUnread=useUnreadMessages(user?.uid);
 const [accountOpen,setAccountOpen]=useState(false);
 const nativeTabs=useNativeTabs(!!user,hasUnread,accountOpen,()=>setAccountOpen(true));
 const accountActive=ACCOUNT_ROUTES.some(r=>pathname===r||pathname.startsWith(r+'/'));
 useEffect(()=>installExternalLinks(),[]);
 useEffect(()=>{let disposed=false;let remove:(()=>void)|undefined;void Network.getStatus().then(s=>!disposed&&setOnline(s.connected));void Network.addListener('networkStatusChange',s=>setOnline(s.connected)).then(h=>{if(disposed)void h.remove();else remove=()=>void h.remove();});return()=>{disposed=true;remove?.();};},[]);
 useEffect(()=>{window.scrollTo(0,0);setAccountOpen(false);},[pathname]);
 const dashboard=(node:React.ReactNode)=><DashboardLayout>{node}</DashboardLayout>;
 const admin=(node:React.ReactNode)=><AdminLayout>{node}</AdminLayout>;
 return <div className={`mobile-app${user?' signed-in':''}${nativeTabs?' native-tabs':''}`}>
  {user&&<TitleBar/>}
  {!online&&<div className="offline-banner" role="status">You’re offline. Reconnect to load updates and send messages.</div>}
  <div className="mobile-scroll"><Suspense fallback={<Loading/>}><Routes>
   <Route path="/" element={<Navigate to="/home" replace/>}/>
   <Route path="/login" element={<AuthLayout><Login/></AuthLayout>}/>
   <Route path="/register" element={<AuthLayout><Register/></AuthLayout>}/>
   <Route path="/forgot-password" element={<AuthLayout><Forgot/></AuthLayout>}/>
   <Route path="/home" element={dashboard(<Overview/>)}/>
   <Route path="/dashboard" element={dashboard(<Browse/>)}/>
   <Route path="/messages" element={dashboard(<Messages/>)}/>
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
  {user&&<AccountSheet open={accountOpen} onClose={()=>setAccountOpen(false)}/>}
  {user&&!nativeTabs&&<nav className="mobile-tabbar" aria-label="Main navigation">
   {TABS.map(({to,label,Icon})=>
    <NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}>
     <span className="mobile-tabicon">
      <Icon size={24}/>
      {to==='/messages'&&hasUnread&&<span className="mobile-tabdot" aria-label="Unread messages"/>}
     </span>
     <span>{label}</span>
    </NavLink>)}
   <button type="button" className={accountActive?'active':''} aria-haspopup="menu" aria-expanded={accountOpen}
     onClick={()=>setAccountOpen(o=>!o)}>
    <span className="mobile-tabicon"><TabAvatar/></span>
    <span>Account</span>
   </button>
  </nav>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><BrowserRouter><Providers><Shell/></Providers></BrowserRouter></ErrorBoundary>);
