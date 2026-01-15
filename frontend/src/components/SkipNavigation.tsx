import React from 'react';

interface SkipNavigationProps {
  mainContentId?: string;
}

/**
 * Skip Navigation Link - Accessibility Component
 *
 * Provides a hidden link that becomes visible on focus,
 * allowing keyboard users to skip directly to main content.
 */
export const SkipNavigation: React.FC<SkipNavigationProps> = ({
  mainContentId = 'main-content',
}) => {
  return (
    <a
      href={`#${mainContentId}`}
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[100]
        px-4 py-2
        bg-blue-600 text-white font-bold
        rounded-lg shadow-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all
      "
    >
      Skip to main content
    </a>
  );
};

export default SkipNavigation;
