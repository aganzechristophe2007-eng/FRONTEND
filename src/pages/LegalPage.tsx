import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldCheck, Cookie, Scale, Info } from 'lucide-react';

interface LegalSection {
  title: string;
  content: string[];
}

interface LegalContent {
  icon: React.ReactNode;
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}

const LEGAL_CONTENT: Record<string, LegalContent> = {
  terms: {
    icon: <FileText className="w-5 h-5" />,
    title: "Conditions d'utilisation",
    updatedAt: "Mise à jour le 11 septembre 2026",
    sections: [
      {
        title: "1. Acceptation des conditions",
        content: [
          "En créant un compte ou en utilisant CBF SOKO, vous acceptez pleinement les présentes conditions d'utilisation. Si vous n'êtes pas d'accord avec l'un des points ci-dessous, nous vous invitons à ne pas utiliser la plateforme."
        ]
      },
      {
        title: "2. Compte utilisateur",
        content: [
          "Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toute activité effectuée depuis votre compte.",
          "Toute information fournie lors de l'inscription doit être exacte, à jour et complète."
        ]
      },
      {
        title: "3. Publication d'annonces",
        content: [
          "Chaque vendeur s'engage à publier des annonces conformes à la réalité (photos, prix, description, quantité disponible).",
          "CBF SOKO se réserve le droit de retirer toute annonce jugée frauduleuse, trompeuse ou contraire à la loi congolaise."
        ]
      },
      {
        title: "4. Transactions et paiements",
        content: [
          "Les paiements effectués via le portefeuille CBF SOKO sont sécurisés et ne sont libérés au vendeur qu'après confirmation de la livraison.",
          "CBF SOKO agit en tant qu'intermédiaire technique et ne peut être tenu responsable des litiges commerciaux entre acheteurs et vendeurs, sauf en cas de manquement direct de la plateforme."
        ]
      },
      {
        title: "5. Résiliation",
        content: [
          "CBF SOKO se réserve le droit de suspendre ou de supprimer tout compte en cas de non-respect des présentes conditions."
        ]
      }
    ]
  },
  privacy: {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Politique de confidentialité",
    updatedAt: "Mise à jour le 11 septembre 2026",
    sections: [
      {
        title: "1. Données collectées",
        content: [
          "Nous collectons les informations que vous nous fournissez directement : nom, numéro de téléphone, adresse e-mail, localisation approximative, ainsi que les données liées à vos annonces et transactions."
        ]
      },
      {
        title: "2. Utilisation des données",
        content: [
          "Vos données sont utilisées pour faire fonctionner la plateforme : gestion de votre compte, affichage de vos annonces, traitement des paiements, messagerie interne et support client.",
          "Nous n'utilisons jamais vos données à des fins publicitaires sans votre consentement explicite."
        ]
      },
      {
        title: "3. Partage avec des tiers",
        content: [
          "Vos informations de contact ne sont partagées qu'avec l'autre partie d'une transaction (acheteur ou vendeur) une fois celle-ci engagée, et avec nos prestataires techniques strictement nécessaires au fonctionnement du service."
        ]
      },
      {
        title: "4. Sécurité",
        content: [
          "Les mots de passe sont chiffrés. L'accès aux données sensibles est restreint aux équipes techniques autorisées."
        ]
      },
      {
        title: "5. Vos droits",
        content: [
          "Vous pouvez à tout moment demander la consultation, la correction ou la suppression de vos données personnelles en nous contactant via le centre d'aide."
        ]
      }
    ]
  },
  cookies: {
    icon: <Cookie className="w-5 h-5" />,
    title: "Politique de cookies",
    updatedAt: "Mise à jour le 11 septembre 2026",
    sections: [
      {
        title: "1. Qu'est-ce qu'un cookie ?",
        content: [
          "Un cookie est un petit fichier stocké sur votre appareil permettant de mémoriser certaines informations lors de votre navigation sur CBF SOKO."
        ]
      },
      {
        title: "2. Cookies utilisés",
        content: [
          "Cookies essentiels : nécessaires au fonctionnement du site (connexion, session, panier).",
          "Cookies de préférence : mémorisent votre mode d'affichage (clair/sombre) et votre langue.",
          "Cookies de mesure d'audience : nous aident à comprendre l'utilisation de la plateforme pour l'améliorer."
        ]
      },
      {
        title: "3. Gestion des cookies",
        content: [
          "Vous pouvez configurer votre navigateur pour refuser les cookies non essentiels. Certaines fonctionnalités pourraient alors être limitées."
        ]
      }
    ]
  },
  mentions: {
    icon: <Scale className="w-5 h-5" />,
    title: "Mentions légales",
    updatedAt: "Mise à jour le 11 septembre 2026",
    sections: [
      {
        title: "Éditeur de la plateforme",
        content: [
          "CBF SOKO — Plateforme de commerce en ligne basée à Bukavu, Sud-Kivu, République Démocratique du Congo."
        ]
      },
      {
        title: "Contact",
        content: [
          "Pour toute question relative à ces mentions légales, contactez-nous à support@cbfsoko.com."
        ]
      },
      {
        title: "Hébergement",
        content: [
          "La plateforme est hébergée par des prestataires techniques tiers garantissant la disponibilité et la sécurité du service."
        ]
      },
      {
        title: "Propriété intellectuelle",
        content: [
          "L'ensemble des éléments graphiques, textes et logos de CBF SOKO sont protégés. Toute reproduction sans autorisation est interdite."
        ]
      }
    ]
  },
  community: {
    icon: <Info className="w-5 h-5" />,
    title: "Règles de la communauté",
    updatedAt: "Mise à jour le 11 septembre 2026",
    sections: [
      {
        title: "1. Respect entre utilisateurs",
        content: [
          "Tout comportement irrespectueux, insultant ou discriminatoire envers un autre membre entraîne une suspension immédiate du compte."
        ]
      },
      {
        title: "2. Annonces autorisées",
        content: [
          "Les produits illégaux, dangereux ou contrefaits sont strictement interdits sur CBF SOKO.",
          "Chaque annonce doit correspondre à un produit réellement disponible."
        ]
      },
      {
        title: "3. Signalement",
        content: [
          "Tout utilisateur peut signaler une annonce ou un comportement suspect via le centre d'aide. Nos équipes traitent chaque signalement sous 48h."
        ]
      },
      {
        title: "4. Sanctions",
        content: [
          "Selon la gravité, les sanctions vont de l'avertissement à la suppression définitive du compte."
        ]
      }
    ]
  }
};

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? LEGAL_CONTENT[slug] : undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/" className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-extrabold text-sm">CBF SOKO</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-8 py-10">
        {content ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-600/15 text-orange-500 flex items-center justify-center">
                {content.icon}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold">{content.title}</h1>
            </div>
            <p className="text-xs text-neutral-500 mb-8">{content.updatedAt}</p>

            <div className="flex flex-col gap-6">
              {content.sections.map((section, i) => (
                <div key={i} className="border-b border-neutral-800 pb-5 last:border-0">
                  <h2 className="text-sm font-bold text-orange-400 mb-2">{section.title}</h2>
                  {section.content.map((p, j) => (
                    <p key={j} className="text-[13px] text-neutral-300 leading-relaxed mb-2 last:mb-0">{p}</p>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-neutral-500 text-sm">
            Page légale introuvable.
            <div className="mt-4">
              <Link to="/" className="text-orange-500 hover:text-orange-400 font-semibold">Retour à l'accueil</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}