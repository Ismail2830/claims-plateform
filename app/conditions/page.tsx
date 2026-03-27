export const metadata = {
  title: "Conditions d'utilisation | ISM Assurance",
  description: "Conditions générales d'utilisation de la plateforme ISM Assurance.",
}

export default function ConditionsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Conditions d&apos;utilisation</h1>
      <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 27 mars 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptation des conditions</h2>
        <p>
          En accédant à la plateforme ISM Assurance, vous acceptez sans réserve les présentes
          conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser
          nos services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Description des services</h2>
        <p>ISM Assurance propose :</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>La déclaration et le suivi en ligne de sinistres d'assurance</li>
          <li>La gestion des polices et des documents associés</li>
          <li>La communication avec les experts et gestionnaires de dossiers</li>
          <li>L'assistance par intelligence artificielle pour l'analyse de dossiers</li>
          <li>Les notifications et alertes concernant l'état de vos dossiers</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Conditions d'accès</h2>
        <p>
          L'utilisation de la plateforme est réservée aux personnes physiques majeures (18 ans et
          plus) et aux personnes morales ayant souscrit un contrat d'assurance auprès d'ISM
          Assurance ou d'un de ses partenaires agréés par l'ACAPS.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Obligations de l'utilisateur</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Fournir des informations exactes, complètes et à jour</li>
          <li>Ne pas tenter de contourner les mesures de sécurité</li>
          <li>Ne pas utiliser la plateforme à des fins frauduleuses</li>
          <li>Conserver la confidentialité de ses identifiants de connexion</li>
          <li>Signaler immédiatement toute utilisation non autorisée de son compte</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu de la plateforme (textes, images, logos, algorithmes, code source)
          est la propriété exclusive d'ISM Assurance et est protégé par la législation marocaine
          sur la propriété intellectuelle. Toute reproduction non autorisée est interdite.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Responsabilité</h2>
        <p>
          ISM Assurance s'engage à assurer la disponibilité de la plateforme dans la limite du
          possible. Nous ne saurions être tenus responsables des interruptions de service dues à
          des maintenances, des pannes ou des événements indépendants de notre volonté.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Modifications des conditions</h2>
        <p>
          ISM Assurance se réserve le droit de modifier les présentes conditions à tout moment.
          Les utilisateurs seront informés de toute modification substantielle par e-mail ou via
          une notification sur la plateforme.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Droit applicable</h2>
        <p>
          Les présentes conditions sont régies par le droit marocain. Tout litige relatif à leur
          interprétation ou leur exécution relève de la compétence exclusive des tribunaux de
          Casablanca, Maroc.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
        <p>
          ISM Assurance — Casablanca, Maroc<br />
          E-mail :{' '}
          <a href="mailto:support@ism-assurance.ma" className="text-blue-600 hover:underline">
            support@ism-assurance.ma
          </a>
        </p>
      </section>
    </main>
  )
}
