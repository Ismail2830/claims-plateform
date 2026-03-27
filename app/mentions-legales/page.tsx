export const metadata = {
  title: 'Mentions légales | ISM Assurance',
  description: 'Mentions légales de la plateforme ISM Assurance.',
}

export default function MentionsLegalesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Mentions légales</h1>
      <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 27 mars 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Éditeur de la plateforme</h2>
        <p>
          <strong>ISM Assurance</strong><br />
          Société à Responsabilité Limitée (SARL) au capital de [montant] MAD<br />
          Registre du Commerce de Casablanca : RC [numéro]<br />
          Identifiant fiscal : [numéro]<br />
          ICE : [numéro]<br />
          Siège social : [Adresse complète], Casablanca, Maroc<br />
          Téléphone : 0522 XX XX XX<br />
          E-mail :{' '}
          <a href="mailto:contact@ism-assurance.ma" className="text-blue-600 hover:underline">
            contact@ism-assurance.ma
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Agrément ACAPS</h2>
        <p>
          ISM Assurance est agréée par l'Autorité de Contrôle des Assurances et de la Prévoyance
          Sociale (ACAPS) conformément à la loi 17-99 portant code des assurances.
          Numéro d'agrément : [numéro ACAPS].
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Directeur de la publication</h2>
        <p>
          Le directeur de la publication est [Nom du dirigeant], en qualité de Directeur Général
          d'ISM Assurance.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Hébergement</h2>
        <p>
          La plateforme est hébergée au Maroc par :<br />
          <strong>[Nom de l'hébergeur]</strong><br />
          [Adresse de l'hébergeur], Maroc<br />
          Téléphone : [numéro hébergeur]
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments constituant la plateforme ISM Assurance (structure, design,
          textes, images, logos, etc.) est la propriété exclusive d'ISM Assurance et est protégé
          par les lois marocaines et internationales relatives à la propriété intellectuelle.
          Toute reproduction, représentation, modification ou exploitation non autorisée de ces
          éléments est strictement interdite.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Liens hypertextes</h2>
        <p>
          ISM Assurance décline toute responsabilité quant au contenu des sites tiers vers
          lesquels des liens pourraient être établis depuis la plateforme.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
        <p>
          La plateforme utilise des cookies techniques nécessaires à son bon fonctionnement
          (authentification, session) ainsi que des cookies analytiques anonymisés pour améliorer
          l'expérience utilisateur. Vous pouvez configurer votre navigateur pour refuser les
          cookies non essentiels.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Droit applicable</h2>
        <p>
          Les présentes mentions légales sont soumises au droit marocain. Tout litige sera soumis
          à la compétence des juridictions marocaines compétentes.
        </p>
      </section>
    </main>
  )
}
