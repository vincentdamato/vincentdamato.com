import { useState, useEffect } from 'react';

const HeroSection = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const roles = [
    { label: 'Derivatives Accountant', accent: 'text-emerald-400' },
    { label: 'Startup Founder', accent: 'text-amber-400' },
    { label: 'Options Trader', accent: 'text-sky-400' },
  ];

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-zinc-950 px-6 md:px-12 lg:px-24">
      {/* Ambient gradient background */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at ${50 + mousePosition.x * 0.5}% ${40 + mousePosition.y * 0.5}%, 
              rgba(16, 185, 129, 0.15) 0%, 
              transparent 50%),
            radial-gradient(ellipse 60% 40% at ${30 - mousePosition.x * 0.3}% ${60 - mousePosition.y * 0.3}%, 
              rgba(245, 158, 11, 0.1) 0%, 
              transparent 50%)
          `,
        }}
      />

      {/* Subtle grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating accent elements */}
      <div 
        className="pointer-events-none absolute right-[15%] top-[20%] h-px w-32 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
        style={{
          transform: `translate(${mousePosition.x * -0.5}px, ${mousePosition.y * -0.5}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />
      <div 
        className="pointer-events-none absolute bottom-[30%] left-[10%] h-32 w-px bg-gradient-to-b from-transparent via-amber-500/30 to-transparent"
        style={{
          transform: `translate(${mousePosition.x * 0.3}px, ${mousePosition.y * 0.3}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      <div className="relative z-10 max-w-5xl">
        {/* Overline with location */}
        <div 
          className={`flex items-center gap-3 transition-all duration-700 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="h-px w-8 bg-zinc-600" />
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-500">
            West Bend, Wisconsin
          </p>
        </div>

        {/* Main name with staggered reveal */}
        <h1 className="mt-8 overflow-hidden">
          <span 
            className={`block font-light tracking-tight text-zinc-100 transition-all duration-700 delay-100 ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
            style={{ 
              fontSize: 'clamp(3rem, 10vw, 8rem)',
              lineHeight: 0.95,
              fontFamily: '"Instrument Serif", Georgia, serif',
            }}
          >
            Vincent
          </span>
          <span 
            className={`block font-light tracking-tight text-zinc-100 transition-all duration-700 delay-200 ${
              isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
            style={{ 
              fontSize: 'clamp(3rem, 10vw, 8rem)',
              lineHeight: 0.95,
              fontFamily: '"Instrument Serif", Georgia, serif',
            }}
          >
            Damato
          </span>
        </h1>

        {/* Role tags with staggered animation */}
        <div 
          className={`mt-10 flex flex-wrap gap-3 transition-all duration-700 delay-500 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          {roles.map((role, i) => (
            <span
              key={role.label}
              className={`group relative cursor-default overflow-hidden rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 font-mono text-xs uppercase tracking-wider text-zinc-400 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/50`}
              style={{ 
                transitionDelay: `${600 + i * 100}ms`,
                animation: isLoaded ? `fadeSlideIn 0.5s ease-out ${0.6 + i * 0.1}s both` : 'none',
              }}
            >
              <span className={`transition-colors duration-300 group-hover:${role.accent}`}>
                {role.label}
              </span>
              <span 
                className={`absolute inset-x-0 bottom-0 h-px ${role.accent.replace('text-', 'bg-')} scale-x-0 transition-transform duration-300 group-hover:scale-x-100`} 
              />
            </span>
          ))}
        </div>

        {/* Description */}
        <p 
          className={`mt-10 max-w-lg font-sans text-lg leading-relaxed text-zinc-400 transition-all duration-700 delay-700 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Building at the intersection of{' '}
          <span className="text-zinc-200">complex financial instruments</span> and{' '}
          <span className="text-zinc-200">emerging technology</span>. 
          Currently developing golf's next-gen course management platform.
        </p>

        {/* CTA buttons */}
        <div 
          className={`mt-12 flex flex-wrap items-center gap-6 transition-all duration-700 delay-[900ms] ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <a
            href="#projects"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-zinc-100 px-6 py-3 font-mono text-sm uppercase tracking-wider text-zinc-900 transition-all duration-300 hover:bg-zinc-200"
          >
            <span className="relative z-10">View Projects</span>
            <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
          
          <a
            href="#about"
            className="group inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-zinc-500 transition-colors duration-300 hover:text-zinc-300"
          >
            <span>About Me</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-y-1">
              ↓
            </span>
          </a>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <div 
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all duration-700 delay-[1100ms] ${
          isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Scroll
          </span>
          <div className="relative h-12 w-px overflow-hidden bg-zinc-800">
            <div 
              className="absolute inset-x-0 h-4 animate-scroll-line bg-gradient-to-b from-emerald-500/80 to-transparent"
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scroll-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        
        .animate-scroll-line {
          animation: scroll-line 1.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
