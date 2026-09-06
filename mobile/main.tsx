import React, { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, UserCircle, Loader2 } from 'lucide-react';
import { Network } from '@capacitor/network';
import { Providers } from '@/providers/Providers';
import { useAuth } from '@/providers/AuthProvider';
import DashboardLayout from '@/app/(dashboard)/layout';
import AuthLayout from '@/app/(auth)/layout';
import { installExternalLinks } from './runtime';
import '@/app/globals.css';
import './mobile.css';
const AdminLayout=lazy(()=>import('@/app/(admin)/layout'));
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
function Shell(){
 const {user}=useAuth();const {pathname}=useLocation();const [online,setOnline]=useState(true);
 useEffect(()=>installExternalLinks(),[]);
 useEffect(()=>{let disposed=false;let remove:(()=>void)|undefined;void Network.getStatus().then(s=>!disposed&&setOnline(s.connected));void Network.addListener('networkStatusChange',s=>setOnline(s.connected)).then(h=>{if(disposed)void h.remove();else remove=()=>void h.remove();});return()=>{disposed=true;remove?.();};},[]);
 useEffect(()=>{window.scrollTo(0,0);},[pathname]);
 const dashboard=(node:React.ReactNode)=><DashboardLayout>{node}</DashboardLayout>;
 const admin=(node:React.ReactNode)=><AdminLayout>{node}</AdminLayout>;
 return <div className={user?'mobile-app signed-in':'mobile-app'}>
  {!online&&<div className="offline-banner" role="status">You’re offline. Reconnect to load updates and send messages.</div>}
  <Suspense fallback={<Loading/>}><Routes>
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
  </Routes></Suspense>
  {user&&<nav className="mobile-tabbar" aria-label="Main navigation">{[{to:'/home',label:'Home',Icon:Home},{to:'/dashboard',label:'Explore',Icon:Search},{to:'/messages',label:'Messages',Icon:MessageSquare},{to:'/profile',label:'Profile',Icon:UserCircle}].map(({to,label,Icon})=><NavLink key={to} to={to} className={({isActive})=>isActive?'active':''}><Icon size={22}/><span>{label}</span></NavLink>)}</nav>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><BrowserRouter><Providers><Shell/></Providers></BrowserRouter></ErrorBoundary>);
