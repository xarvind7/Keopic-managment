import { memo } from 'react';
import { motion } from 'motion/react';

interface AmbientBackgroundProps {
  accent?: string;
}

export const AmbientBackground = memo(function AmbientBackground({ accent = 'indigo' }: AmbientBackgroundProps) {
  // Map accent to rich glow color tones optimized for glassmorphic refraction
  const getColors = () => {
    switch (accent) {
      case 'emerald':
        return {
          primary: 'rgba(16, 185, 129, 0.20)',
          secondary: 'rgba(6, 182, 212, 0.16)',
          accent: 'rgba(52, 211, 153, 0.14)',
          highlight: 'rgba(99, 102, 241, 0.12)',
        };
      case 'purple':
        return {
          primary: 'rgba(168, 85, 247, 0.20)',
          secondary: 'rgba(236, 72, 153, 0.16)',
          accent: 'rgba(99, 102, 241, 0.14)',
          highlight: 'rgba(6, 182, 212, 0.12)',
        };
      case 'rose':
        return {
          primary: 'rgba(244, 63, 94, 0.20)',
          secondary: 'rgba(251, 146, 60, 0.16)',
          accent: 'rgba(236, 72, 153, 0.14)',
          highlight: 'rgba(168, 85, 247, 0.12)',
        };
      case 'amber':
        return {
          primary: 'rgba(245, 158, 11, 0.20)',
          secondary: 'rgba(234, 88, 12, 0.16)',
          accent: 'rgba(251, 191, 36, 0.14)',
          highlight: 'rgba(244, 63, 94, 0.10)',
        };
      case 'cyan':
        return {
          primary: 'rgba(6, 182, 212, 0.22)',
          secondary: 'rgba(59, 130, 246, 0.16)',
          accent: 'rgba(20, 184, 166, 0.14)',
          highlight: 'rgba(168, 85, 247, 0.12)',
        };
      default: // indigo
        return {
          primary: 'rgba(99, 102, 241, 0.20)',
          secondary: 'rgba(168, 85, 247, 0.16)',
          accent: 'rgba(6, 182, 212, 0.14)',
          highlight: 'rgba(236, 72, 153, 0.10)',
        };
    }
  };

  const colors = getColors();

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 no-print hardware-accelerated"
      aria-hidden="true"
    >
      {/* Primary Floating Aurora Orb */}
      <motion.div
        animate={{
          x: [0, 45, -30, 0],
          y: [0, -35, 25, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-96 h-96 sm:w-[34rem] sm:h-[34rem] rounded-full blur-[100px] opacity-80"
        style={{ background: colors.primary }}
      />

      {/* Secondary Floating Aurora Orb */}
      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -25, 0],
          scale: [1, 0.9, 1.12, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 -right-24 w-80 h-80 sm:w-[30rem] sm:h-[30rem] rounded-full blur-[110px] opacity-70"
        style={{ background: colors.secondary }}
      />

      {/* Lower Accent Drift Orb */}
      <motion.div
        animate={{
          x: [0, 35, -40, 0],
          y: [0, -25, 30, 0],
          scale: [0.95, 1.1, 1, 0.95],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-10 left-1/3 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full blur-[95px] opacity-65"
        style={{ background: colors.accent }}
      />

      {/* Center Prism Refraction Orb */}
      <motion.div
        animate={{
          x: [0, -25, 35, 0],
          y: [0, 30, -20, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute top-1/2 left-1/4 w-80 h-80 sm:w-[26rem] sm:h-[26rem] rounded-full blur-[105px] opacity-50"
        style={{ background: colors.highlight }}
      />

      {/* Subtle Dynamic Mesh Grid Layer */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />
    </div>
  );
});
