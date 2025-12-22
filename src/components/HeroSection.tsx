const HeroSection = () => {
  return (
    <section className="flex min-h-[70vh] flex-col justify-center px-6 md:px-12 lg:px-24">
      <div className="max-w-4xl">
        <p className="animate-fade-in font-sans text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Welcome
        </p>
        
        <h1 className="mt-6 animate-fade-in-up font-serif text-5xl font-medium leading-tight tracking-tight text-foreground md:text-7xl lg:text-8xl">
          Vincent Damato
        </h1>
        
        <p className="mt-8 max-w-xl animate-fade-in-delay-1 font-sans text-lg leading-relaxed text-muted-foreground md:text-xl">
          Designer, developer, and creative thinker passionate about crafting meaningful digital experiences.
        </p>
        
        <div className="mt-12 animate-fade-in-delay-2">
          <a
            href="#about"
            className="group inline-flex items-center gap-2 font-sans text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:text-accent"
          >
            <span>Learn more</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-y-1">
              ↓
            </span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
