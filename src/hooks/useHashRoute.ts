import { useState, useEffect, useCallback } from 'react';
import { RealmType, PROJECTS } from '../data/projects';

export interface RouteState {
  currentRealm: RealmType | null; // null = portal
  activeProjectId: string | null;
  section: string | null;
}

export function useHashRoute() {
  const parseHash = (): RouteState => {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (!raw || raw === 'portal' || raw === 'intro' || raw === 'welcome') {
      return { currentRealm: null, activeProjectId: null, section: null };
    }

    if (raw.startsWith('project/')) {
      const id = raw.replace('project/', '').trim();
      const proj = PROJECTS.find(p => p.id === id || (id === 'nitted' && p.id === 'knitted') || (id === 'morphin-beta' && p.id === 'morphin'));
      return {
        currentRealm: proj ? proj.realm : 'gamedev',
        activeProjectId: proj ? proj.id : id,
        section: null
      };
    }

    if (raw === 'gamedev') {
      return { currentRealm: 'gamedev', activeProjectId: null, section: null };
    }

    if (raw === 'design') {
      return { currentRealm: 'design', activeProjectId: null, section: null };
    }

    if (raw === 'about' || raw === 'contacts') {
      return { currentRealm: 'gamedev', activeProjectId: null, section: raw };
    }

    return { currentRealm: null, activeProjectId: null, section: null };
  };

  const [route, setRoute] = useState<RouteState>(parseHash);

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = useCallback((hash: string) => {
    window.location.hash = hash.startsWith('#') ? hash : `#${hash}`;
  }, []);

  const openProject = useCallback((projectId: string) => {
    navigateTo(`project/${projectId}`);
  }, [navigateTo]);

  const closeProject = useCallback(() => {
    if (route.currentRealm) {
      navigateTo(route.currentRealm);
    } else {
      navigateTo('intro');
    }
  }, [route.currentRealm, navigateTo]);

  const setRealm = useCallback((realm: RealmType | null) => {
    if (!realm) {
      navigateTo('intro');
    } else {
      navigateTo(realm);
    }
  }, [navigateTo]);

  return {
    route,
    navigateTo,
    openProject,
    closeProject,
    setRealm
  };
}
