'use client';

import { useRouter } from 'next/navigation';
import { visibleRoutes } from '@/lib/navigation';
import { CommandBar } from '@/components/landing/CommandBar';
import {
  LandingNav, LandingMarquee, LandingHero, LandingHow,
  LandingTerminal, LandingDossier, ThreatBoard, LandingCTA,
  TacticalFooter,
} from '@/components/landing/LandingSections';
import { OpsWall, CapabilitiesGrid, MissionCTA } from '@/components/landing/PentagonSections';

export default function LandingPage() {
  const router = useRouter();
  const enter = () => router.push(visibleRoutes.autenticacio);

  return (
    <div className="grain" style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <CommandBar />
      <LandingNav onEnter={enter} />
      <LandingMarquee />
      <LandingHero onEnter={enter} />
      <OpsWall />
      <LandingHow />
      <CapabilitiesGrid />
      <LandingTerminal />
      <ThreatBoard />
      <LandingDossier />
      <MissionCTA onEnter={enter} />
      <LandingCTA onEnter={enter} />
      <TacticalFooter />
    </div>
  );
}
