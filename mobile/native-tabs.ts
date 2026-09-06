import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useLocation, useNavigate } from 'react-router-dom';

interface NativeTabsPlugin {
  configure(options: { visible: boolean; selected: string; unread: boolean; theme: string }): Promise<{ available: boolean }>;
  addListener(event: 'tabSelected', listener: (event: { id: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'insetChanged', listener: (event: { bottom: number }) => void): Promise<PluginListenerHandle>;
}
const NativeTabs = registerPlugin<NativeTabsPlugin>('NativeTabs');
const routes: Record<string, string> = { home: '/home', explore: '/dashboard', messages: '/messages' };

export function useNativeTabs(signedIn: boolean, unread: boolean, accountOpen: boolean, openAccount: () => void) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const callbacks = useRef({ navigate, openAccount });
  callbacks.current = { navigate, openAccount };

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios' || !Capacitor.isPluginAvailable('NativeTabs')) return;
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const listen = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) await handle.remove(); else handles.push(handle);
    };
    void (async () => {
      try {
        await listen(NativeTabs.addListener('tabSelected', ({ id }) => {
          if (id === 'account') callbacks.current.openAccount();
          else if (routes[id]) callbacks.current.navigate(routes[id]);
        }));
        await listen(NativeTabs.addListener('insetChanged', ({ bottom }) => {
          document.documentElement.style.setProperty('--native-tab-inset', `${Math.max(0, bottom)}px`);
        }));
        if (!disposed) setReady(true);
      } catch (error) {
        console.warn('Native navigation unavailable; using web tabs.', error);
        for (const handle of handles) void handle.remove();
      }
    })();
    return () => {
      disposed = true;
      for (const handle of handles) void handle.remove();
      void NativeTabs.configure({ visible: false, selected: 'home', unread: false, theme: 'system' }).catch(() => {});
      document.documentElement.style.removeProperty('--native-tab-inset');
    };
  }, []);

  // Web dialogs must cover navigation too: native views otherwise sit above
  // every web z-index, allowing tabs to be tapped through a modal overlay.
  useEffect(() => {
    if (!ready) return;
    const update = () => setModalOpen(!!document.querySelector('[role="dialog"]:not([data-state="closed"]), [role="alertdialog"]:not([data-state="closed"])'));
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'role'] });
    update();
    return () => observer.disconnect();
  }, [ready]);

  const selected = pathname.startsWith('/messages') ? 'messages'
    : pathname === '/dashboard' || pathname.startsWith('/services/') ? 'explore'
    : ['/profile', '/my-services', '/become-provider', '/admin'].some(path => pathname === path || pathname.startsWith(path + '/')) ? 'account'
    : 'home';

  useEffect(() => {
    if (!ready) return;
    void NativeTabs.configure({ visible: signedIn && !accountOpen && !modalOpen, selected, unread, theme: resolvedTheme ?? 'system' })
      .catch(error => {
        console.warn('Native navigation failed; using web tabs.', error);
        setReady(false);
        void NativeTabs.configure({ visible: false, selected, unread: false, theme: 'system' }).catch(() => {});
      });
  }, [ready, signedIn, accountOpen, modalOpen, selected, unread, resolvedTheme]);
  return ready;
}
