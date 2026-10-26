import React, { useEffect, useState } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { IntroScreen } from './components/IntroScreen';
import { PortalView } from './components/PortalView';
import { RealmHeader } from './components/RealmHeader';
import { AmbientBackground } from './components/AmbientBackground';
import { CustomCursor } from './components/CustomCursor';
import { PROJECTS } from './data/projects';
import { startBackgroundPreload, SECONDARY_PORTAL_ARTWORKS } from './utils/preloader';

// Code-split heavy views and secondary components for ultra-fast initial bundle load
const GameDevView = React.lazy(() =>
  import('./components/GameDevView').then((m) => ({ default: m.GameDevView }))
);
const DesignView = React.lazy(() =>
  import('./components/DesignView').then((m) => ({ default: m.DesignView }))
);
const ProjectModal = React.lazy(() =>
  import('./components/ProjectModal').then((m) => ({ default: m.ProjectModal }))
);
const DitherTuner = React.lazy(() =>
  import('./components/DitherTuner').then((m) => ({ default: m.DitherTuner }))
);

export const App: React.FC = () => {
  const { route, openProject, closeProject, setRealm } = useHashRoute();
  const [isTunerOpen, setIsTunerOpen] = useState(false);

  // Progressive background preloader: Cache project grid thumbnails in idle slots
  useEffect(() => {
    const covers = PROJECTS.map((p) => p.cover).filter(Boolean);
    startBackgroundPreload([...SECONDARY_PORTAL_ARTWORKS, ...covers]);

    // Prefetch heavy view chunks in idle moments so realm transitions are instantaneous
    const idleTimer = setTimeout(() => {
      import('./components/GameDevView');
      import('./components/DesignView');
      import('./components/ProjectModal');
    }, 1500);

    return () => clearTimeout(idleTimer);
  }, []);
  
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
        <IntroScreen
          onEnter={(targetRealm) => {
            setHasEnteredIntro(true);
            if (targetRealm) {
              setRealm(targetRealm);
            }
          }}
        />
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

      {/* Atmospheric Ambient Video & Glows (Paused when Modal is Open) */}
      <AmbientBackground currentRealm={route.currentRealm} isPaused={Boolean(activeProject)} />

      {/* Top Floating Liquid Glass Header */}
      <RealmHeader
        currentRealm={route.currentRealm}
        onSelectRealm={(r) => setRealm(r)}
        onOpenPortal={() => {
          setHasEnteredIntro(true); // Don't re-lock with intro on manual portal return
          setRealm(null);
        }}
        onScrollTo={handleScrollTo}
        onToggleSettings={() => setIsTunerOpen(prev => !prev)}
      />

      {/* Main Realm Body with Smooth Transition and Code-Splitting Suspense */}
      <main className="relative z-10">
        <div key={route.currentRealm} className="realm-view-transition">
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border border-amber-500/40 border-t-amber-400 animate-spin" />
              </div>
            }
          >
            {route.currentRealm === 'gamedev' ? (
              <GameDevView onOpenProject={(id) => openProject(id)} />
            ) : (
              <DesignView onOpenProject={(id) => openProject(id)} />
            )}
          </React.Suspense>
        </div>
      </main>

      {/* Deep-linkable Project Lightbox / Case Study Modal */}
      {route.activeProjectId && (
        <React.Suspense fallback={null}>
          <ProjectModal
            project={activeProject}
            onClose={closeProject}
          />
        </React.Suspense>
      )}

      {/* Real-time Interactive Dither Edge Tuner (GameDev realm) */}
      {isTunerOpen && (
        <React.Suspense fallback={null}>
          <DitherTuner
            currentRealm={route.currentRealm}
            isOpen={isTunerOpen}
            onClose={() => setIsTunerOpen(false)}
            onOpen={() => setIsTunerOpen(true)}
            onSwitchToGamedev={() => setRealm('gamedev')}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default App;
