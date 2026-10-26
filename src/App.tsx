import React, { useEffect, useState } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { IntroScreen } from './components/IntroScreen';
import { PortalView } from './components/PortalView';
import { RealmHeader } from './components/RealmHeader';
import { GameDevView } from './components/GameDevView';
import { DesignView } from './components/DesignView';
import { ProjectModal } from './components/ProjectModal';
import { AmbientBackground } from './components/AmbientBackground';
import { CustomCursor } from './components/CustomCursor';
import { PROJECTS } from './data/projects';

export const App: React.FC = () => {
  const { route, openProject, closeProject, setRealm } = useHashRoute();
  
  // Track intro screen state (shows on first visit to root/portal unless direct link was used)
  const [hasEnteredIntro, setHasEnteredIntro] = useState(() => {
    // If user opened with direct hash (e.g. #gamedev or #design), skip intro
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    return hash === 'gamedev' || hash === 'design' || hash.startsWith('project/');
  });

  const activeProject = PROJECTS.find(p => p.id === route.activeProjectId) || null;

  // Handle section scrolling (#about or #contacts)
  useEffect(() => {
    if (route.section) {
      const el = document.getElementById(route.section);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [route.section]);

  const handleScrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 1. If user hasn't pressed key/clicked on root entrance, show IntroScreen
  if (!hasEnteredIntro && route.currentRealm === null) {
    return (
      <div className="relative min-h-screen bg-[#050508] text-white">
        <CustomCursor />
        <IntroScreen onEnter={() => setHasEnteredIntro(true)} />
      </div>
    );
  }

  // 2. If on Portal view (after intro dismissed)
  if (route.currentRealm === null) {
    return (
      <div className="relative min-h-screen bg-[#050508] text-white">
        <CustomCursor />
        <PortalView onSelectRealm={(realm) => setRealm(realm)} />
      </div>
    );
  }

  // 3. Main Realm Views (Gamedev / CG or Design / Identity)
  return (
    <div className="relative min-h-screen bg-[#050508] text-white select-none">
      {/* Interactive Dither Cursor Spotlight */}
      <CustomCursor currentRealm={route.currentRealm} />

      {/* Atmospheric Ambient Video & Glows */}
      <AmbientBackground currentRealm={route.currentRealm} />

      {/* Top Floating Liquid Glass Header */}
      <RealmHeader
        currentRealm={route.currentRealm}
        onSelectRealm={(r) => setRealm(r)}
        onOpenPortal={() => {
          setHasEnteredIntro(true); // Don't re-lock with intro on manual portal return
          setRealm(null);
        }}
        onScrollTo={handleScrollTo}
      />

      {/* Main Realm Body */}
      <main className="relative z-10">
        {route.currentRealm === 'gamedev' ? (
          <GameDevView onOpenProject={(id) => openProject(id)} />
        ) : (
          <DesignView onOpenProject={(id) => openProject(id)} />
        )}
      </main>

      {/* Deep-linkable Project Lightbox / Case Study Modal */}
      <ProjectModal
        project={activeProject}
        onClose={closeProject}
      />
    </div>
  );
};

export default App;
