export type ButtonVariant = 'ghost' | 'primary' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'icon';

const BASE =
  'relative inline-flex items-center justify-center rounded-md font-medium select-none transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 disabled:opacity-40 disabled:pointer-events-none';

const VARIANTS: Record<ButtonVariant, string> = {
  ghost: 'text-muted hover:text-primary hover:bg-surface active:bg-surface-2 border border-transparent',
  outline: 'text-muted border border-border hover:bg-surface hover:text-primary active:bg-surface-2',
  primary: 'bg-primary text-app hover:opacity-90 border border-transparent',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-11 lg:h-9 px-4 text-sm',
  icon: 'h-11 w-11 lg:h-8 lg:w-8',
};

export function buttonClassName(variant: ButtonVariant = 'ghost', size: ButtonSize = 'md', className = '') {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}
