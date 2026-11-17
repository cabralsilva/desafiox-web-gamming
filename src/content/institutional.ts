const SITE_ORIGIN = "https://desafiox.app";

export interface InstitutionalLink {
  label: string;
  href: string;
}

export const institutionalLinks = {
  tutorials: {
    label: "Tutoriais",
    // TODO: montar os tutoriais no futuro projeto desafiox-academy, ainda a definir.
    // Até lá o rodapé aponta para a raiz do site.
    href: SITE_ORIGIN,
  },
  about: {
    label: "Quem somos",
    // TODO: a página não existe no site; aponta para a raiz.
    href: SITE_ORIGIN,
  },
  contact: {
    label: "Contato",
    // TODO: a página não existe no site; aponta para a raiz.
    href: SITE_ORIGIN,
  },
  privacy: {
    label: "Política de privacidade",
    href: `${SITE_ORIGIN}/politica-de-privacidade`,
  },
  terms: {
    label: "Termos de serviço",
    href: `${SITE_ORIGIN}/termos-de-servico`,
  },
  dataDeletion: {
    label: "Exclusão de dados",
    href: `${SITE_ORIGIN}/exclusao-de-dados`,
  },
} satisfies Record<string, InstitutionalLink>;
