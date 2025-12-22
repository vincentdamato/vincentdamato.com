import { LucideIcon } from "lucide-react";

interface SocialLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

const SocialLink = ({ href, icon: Icon, label }: SocialLinkProps) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 text-muted-foreground transition-all duration-300 hover:text-foreground"
      aria-label={label}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card transition-all duration-300 group-hover:border-accent group-hover:shadow-glow">
        <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
      </span>
      <span className="font-sans text-sm tracking-wide">{label}</span>
    </a>
  );
};

export default SocialLink;
