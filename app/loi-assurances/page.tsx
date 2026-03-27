export const metadata = {
  title: 'Loi 17-99 Code des Assurances | ISM Assurance',
  description: "Informations sur la conformité d'ISM Assurance à la loi 17-99 portant code des assurances au Maroc.",
}

export default function LoiAssurancesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Loi 17-99 — Code des Assurances</h1>
      <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 27 mars 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Présentation de la loi 17-99</h2>
        <p>
          La <strong>loi n° 17-99 portant code des assurances</strong> constitue le cadre
          juridique régissant l'ensemble des activités d'assurance au Maroc. Elle a été promulguée
          le 3 octobre 2002 et a fait l'objet de plusieurs amendements pour moderniser le secteur
          et renforcer la protection des assurés.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Agrément et contrôle</h2>
        <p>
          Conformément aux articles 161 et suivants de la loi 17-99, ISM Assurance exerce ses
          activités sous le contrôle et avec l'agrément de l'
          <strong>Autorité de Contrôle des Assurances et de la Prévoyance Sociale (ACAPS)</strong>.
          L'ACAPS veille au respect des règles prudentielles, à la protection des assurés et à
          la stabilité du marché des assurances.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Droits de l'assuré</h2>
        <p>La loi 17-99 garantit aux assurés les droits fondamentaux suivants :</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <strong>Information précontractuelle :</strong> Recevoir toutes les informations
            nécessaires avant la souscription d'un contrat d'assurance
          </li>
          <li>
            <strong>Délai de renonciation :</strong> Disposer d'un délai de renonciation après
            la signature du contrat
          </li>
          <li>
            <strong>Déclaration de sinistre :</strong> Déclarer tout sinistre dans les délais
            prévus au contrat
          </li>
          <li>
            <strong>Indemnisation :</strong> Recevoir une indemnisation juste et rapide en cas
            de sinistre couvert
          </li>
          <li>
            <strong>Recours :</strong> Contester toute décision de l'assureur devant les
            juridictions compétentes
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Obligations de l'assuré</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Payer les primes d'assurance aux échéances prévues</li>
          <li>Déclarer exactement le risque assuré lors de la souscription</li>
          <li>Signaler toute modification susceptible d'aggraver le risque</li>
          <li>Déclarer tout sinistre dans les délais contractuels</li>
          <li>Prendre toutes les mesures raisonnables pour limiter les dommages</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Délais légaux de traitement</h2>
        <p>
          Conformément à la loi 17-99 et aux circulaires de l'ACAPS, ISM Assurance s'engage à
          respecter les délais légaux de traitement des sinistres :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Accusé de réception d'une déclaration de sinistre : sous 5 jours ouvrables</li>
          <li>Désignation d'un expert si nécessaire : sous 15 jours</li>
          <li>Proposition d'indemnisation : dans les délais prévus par la catégorie d'assurance</li>
          <li>Paiement de l'indemnité après accord : sous 30 jours</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Médiation et recours</h2>
        <p>
          En cas de litige avec ISM Assurance, vous pouvez recourir à la médiation de l'assurance
          ou saisir directement l'ACAPS. Nos coordonnées pour tout recours amiable :
        </p>
        <p className="mt-3">
          E-mail :{' '}
          <a href="mailto:reclamations@ism-assurance.ma" className="text-blue-600 hover:underline">
            reclamations@ism-assurance.ma
          </a><br />
          Téléphone : 0522 XX XX XX<br />
          ACAPS :{' '}
          <a
            href="https://www.acaps.ma"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            www.acaps.ma
          </a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Textes de référence</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Loi n° 17-99 portant code des assurances (B.O. n° 5054 du 7 novembre 2002)</li>
          <li>Loi n° 39-05 modifiant et complétant la loi 17-99</li>
          <li>Loi n° 59-13 relative à l'assurance maladie obligatoire</li>
          <li>Circulaires ACAPS relatives aux pratiques commerciales des assureurs</li>
        </ul>
      </section>
    </main>
  )
}
