import { institutionalLinks } from "@/content/institutional";

const footerLinks = [
  institutionalLinks.tutorials,
  institutionalLinks.about,
  institutionalLinks.contact,
  institutionalLinks.privacy,
  institutionalLinks.terms,
  institutionalLinks.dataDeletion,
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <nav aria-label="Institucional" className="mx-auto flex w-full max-w-6xl flex-wrap gap-x-5 gap-y-2 px-4 py-6">
        {footerLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
