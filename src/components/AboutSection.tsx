const AboutSection = () => {
  return (
    <section id="about" className="px-6 py-24 md:px-12 lg:px-24">
      <div className="max-w-4xl">
        <p className="font-sans text-sm uppercase tracking-[0.3em] text-muted-foreground">
          About
        </p>
        
        <div className="mt-8 grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-medium italic text-foreground md:text-4xl">
              Crafting ideas into reality
            </h2>
          </div>
          
          <div className="space-y-6">
            <p className="font-sans text-base leading-relaxed text-muted-foreground">
              I believe in the power of thoughtful design and clean code. Every project is an opportunity to create something that not only looks beautiful but truly resonates with people.
            </p>
            <p className="font-sans text-base leading-relaxed text-muted-foreground">
              With a background in both design and development, I bridge the gap between aesthetics and functionality, ensuring that every detail serves a purpose.
            </p>
          </div>
        </div>
        
        <div className="mt-16 h-px w-full bg-border" />
      </div>
    </section>
  );
};

export default AboutSection;
