const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="px-6 py-12 md:px-12 lg:px-24">
      <div className="flex max-w-4xl flex-col items-start justify-between gap-4 border-t border-border pt-8 md:flex-row md:items-center">
        <p className="font-sans text-sm text-muted-foreground">
          © {currentYear} Vincent Damato. All rights reserved.
        </p>
        <p className="font-sans text-sm text-muted-foreground">
          Designed with care
        </p>
      </div>
    </footer>
  );
};

export default Footer;
