import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { publicConfig } from './src/lib/public-config';
export default defineConfig({
 plugins:[react()],
 server:{proxy:{'/api':{target:'https://lifeswapp.netlify.app',changeOrigin:true}}},
 resolve:{alias:{'next/link':fileURLToPath(new URL('./mobile/link.tsx',import.meta.url)), 'next/navigation':fileURLToPath(new URL('./mobile/navigation.tsx',import.meta.url)), '@':fileURLToPath(new URL('./src',import.meta.url))}},
 define:Object.fromEntries(Object.entries(publicConfig).map(([k,v])=>['process.env.'+k,JSON.stringify(v)])),
 build:{target:'safari15',sourcemap:false},
});
