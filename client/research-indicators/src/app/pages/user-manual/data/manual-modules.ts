/**
 * Registry of the STAR User Manual modules rendered in the manual sidebar.
 *
 * One entry per big module of the platform, mirroring the real navigation:
 * the top navigation bar (Home, Projects, Results Center, Results Dashboard),
 * the Create Result action that lives in that same bar, and the left
 * Resources sidebar.
 *
 * `status: 'draft'` renders the module as a placeholder page so the full map
 * of the manual is visible before every module is written.
 */
export interface ManualModule {
  /** Route segment under `/user-manual`. */
  slug: string;
  /** Sidebar label — the exact wording a user sees in the product. */
  label: string;
  /** One line describing what the module covers. */
  summary: string;
  /** Material Symbols Rounded ligature. */
  icon: string;
  status: 'published' | 'draft';
}

export const MANUAL_MODULES: readonly ManualModule[] = [
  {
    slug: 'home',
    label: 'Home',
    summary: 'Your starting page: announcements, shortcuts, latest results and your activity summary.',
    icon: 'home',
    status: 'published'
  },
  {
    slug: 'navigation',
    label: 'Navigation & Sidebar',
    summary: 'The top bar, the Resources sidebar, search, What’s New and your account menu.',
    icon: 'menu',
    status: 'draft'
  },
  {
    slug: 'projects',
    label: 'Projects',
    summary: 'Find the projects you take part in and open their details and results.',
    icon: 'folder_open',
    status: 'draft'
  },
  {
    slug: 'results-center',
    label: 'Results Center',
    summary: 'Search, filter, review and export every result you can access.',
    icon: 'description',
    status: 'draft'
  },
  {
    slug: 'create-result',
    label: 'Create Result',
    summary: 'Register a new result and complete each required section.',
    icon: 'add_circle',
    status: 'draft'
  },
  {
    slug: 'results-dashboard',
    label: 'Results Dashboard',
    summary: 'Track reporting progress with charts and summary figures.',
    icon: 'insights',
    status: 'draft'
  }
] as const;

export function findManualModule(slug: string): ManualModule | undefined {
  return MANUAL_MODULES.find(m => m.slug === slug);
}
