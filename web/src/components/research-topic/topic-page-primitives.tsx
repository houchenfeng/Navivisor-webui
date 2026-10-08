/**
 * The shared empty/loading block used by every step screen (T44).
 *
 * Its own file because both the step screens and the page import it; keeping it
 * inside either would make the dependency direction circular.
 */
import { Search } from 'lucide-react';

export function State({ icon: Icon, title, description, action }: { icon: typeof Search; title: string; description: string; action?: React.ReactNode }) { return <div className="mt-7 rounded-2xl border border-dashed border-[#b9d0ef] bg-[#f7faff] p-10 text-center"><Icon className="mx-auto size-8 text-[#6594ce]" /><h3 className="mt-4 text-sm font-black text-[#315a98]">{title}</h3><p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-[#7189aa]">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }
