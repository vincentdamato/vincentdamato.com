import { Mail, Github, Linkedin, Twitter } from "lucide-react";
import SocialLink from "./SocialLink";

const ContactSection = () => {
  const socialLinks = [
    { href: "mailto:hello@vincentdamato.com", icon: Mail, label: "Email" },
    { href: "https://github.com/vincentdamato", icon: Github, label: "GitHub" },
    { href: "https://linkedin.com/in/vincentdamato", icon: Linkedin, label: "LinkedIn" },
    { href: "https://twitter.com/vincentdamato", icon: Twitter, label: "Twitter" },
  ];

  return (
    <section id="contact" className="px-6 py-24 md:px-12 lg:px-24">
      <div className="max-w-4xl">
        <p className="font-sans text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Connect
        </p>
        
        <h2 className="mt-8 font-serif text-3xl font-medium text-foreground md:text-4xl">
          Let's work together
        </h2>
        
        <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-muted-foreground">
          I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision.
        </p>
        
        <div className="mt-12 flex flex-wrap gap-6">
          {socialLinks.map((link) => (
            <SocialLink key={link.label} {...link} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
