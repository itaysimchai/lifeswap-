import { useMemo } from 'react';
import { useLocation, useNavigate, useParams as useRouteParams, Navigate } from 'react-router-dom';
export function useRouter(){const navigate=useNavigate();return useMemo(()=>({push:(path:string)=>navigate(safePath(path)),replace:(path:string)=>navigate(safePath(path),{replace:true}),back:()=>navigate(-1),refresh:()=>window.location.reload(),prefetch:()=>Promise.resolve()}),[navigate]);}
export function safePath(path:string){return path.startsWith('/')&&!path.startsWith('//')&&!path.includes('\\')?path:'/home';}
export function usePathname(){return useLocation().pathname;}
export function useParams<T extends Record<string,string| string[]>>(){return useRouteParams() as T;}
export function useSearchParams(){return new URLSearchParams(useLocation().search);}
export function redirect(path:string){return <Navigate to={safePath(path)} replace/>;}
