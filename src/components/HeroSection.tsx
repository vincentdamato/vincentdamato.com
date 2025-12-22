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
    { label: 'Derivatives Accountant', color: 'emerald' },
    { label: '', color: 'amber' },
    { label: 'Options Trader', color: 'sky' },
  ];

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-stone-50 px-6 md:px-12 lg:px-24">
      {/* Soft ambient gradient background */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at ${50 + mousePosition.x * 0.5}% ${40 + mousePosition.y * 0.5}%, 
              rgba(16, 185, 129, 0.08) 0%, 
              transparent 50%),
            radial-gradient(ellipse 60% 40% at ${30 - mousePosition.x * 0.3}% ${60 - mousePosition.y * 0.3}%, 
              rgba(245, 158, 11, 0.06) 0%, 
              transparent 50%)
          `,
        }}
      />

      {/* Elegant dot grid overlay */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.07) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating accent elements */}
      <div 
        className="pointer-events-none absolute right-[15%] top-[20%] h-px w-32 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"
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
      <div 
        className="pointer-events-none absolute right-[25%] bottom-[25%] h-24 w-24 rounded-full border border-stone-200/60"
        style={{
          transform: `translate(${mousePosition.x * 0.4}px, ${mousePosition.y * 0.4}px)`,
          transition: 'transform 0.4s ease-out',
        }}
      />

      <div className="relative z-10 max-w-5xl">
        {/* Overline with location */}
        <div 
          className={`flex items-center gap-3 transition-all duration-700 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="h-px w-8 bg-stone-300" />
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-stone-400">
            West Bend, Wisconsin
          </p>
        </div>

        {/* Main name with staggered reveal */}
        <h1 className="mt-8 overflow-hidden">
          <span 
            className={`block font-light tracking-tight text-stone-900 transition-all duration-700 delay-100 ${
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
            className={`block font-light tracking-tight text-stone-900 transition-all duration-700 delay-200 ${
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
              className={`group relative cursor-default overflow-hidden rounded-full border border-stone-200 bg-white/70 px-4 py-2 font-mono text-xs uppercase tracking-wider text-stone-500 backdrop-blur-sm transition-all duration-300 hover:border-stone-300 hover:bg-white hover:shadow-sm`}
              style={{ 
                animation: isLoaded ? `fadeSlideIn 0.5s ease-out ${0.6 + i * 0.1}s both` : 'none',
              }}
            >
              <span className="transition-colors duration-300 group-hover:text-stone-800">
                {role.label}
              </span>
              <span 
                className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${
                  role.color === 'emerald' ? 'bg-emerald-500' :
                  role.color === 'amber' ? 'bg-amber-500' : 'bg-sky-500'
                }`} 
              />
            </span>
          ))}
        </div>

        {/* Description */}
        <p 
          className={`mt-10 max-w-lg font-sans text-lg leading-relaxed text-stone-500 transition-all duration-700 delay-700 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Building at the intersection of{' '}
          <span className="text-stone-800">complex financial instruments</span> and{' '}
          <span className="text-stone-800">emerging technology</span>. 
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
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-stone-900 px-6 py-3 font-mono text-sm uppercase tracking-wider text-stone-50 transition-all duration-300 hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/20"
          >
            <span className="relative z-10">View Projects</span>
            <span className="relative z-10 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
          
          <a
            href="#about"
            className="group inline-flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-stone-400 transition-colors duration-300 hover:text-stone-700"
          >
            <span>About Me</span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-y-1">
              ↓
            </span>
          </a>
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
