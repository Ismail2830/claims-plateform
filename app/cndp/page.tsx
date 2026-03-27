export const metadata = {
  title: 'Protection des données (CNDP) | ISM Assurance',
  description: 'Conformité à la loi 09-08 et à la Commission Nationale de contrôle de la protection des Données à caractère Personnel.',
}

export default function CndpPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Protection des données (CNDP)</h1>
      <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 27 mars 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Cadre légal</h2>
        <p>
          ISM Assurance traite vos données personnelles conformément à la{' '}
          <strong>loi n° 09-08</strong> relative à la protection des personnes physiques à l'égard
          du traitement des données à caractère personnel, et sous le contrôle de la{' '}
          <strong>Commission Nationale de contrôle de la protection des Données à caractère
          Personnel (CNDP)</strong>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Déclaration auprès de la CNDP</h2>
        <p>
          Conformément aux articles 14 et suivants de la loi 09-08, ISM Assurance a effectué les
          déclarations nécessaires auprès de la CNDP pour l'ensemble de ses traitements de données
          à caractère personnel.
          Numéro de déclaration : [numéro CNDP].
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Responsable du traitement</h2>
        <p>
          Le responsable du traitement des données est ISM Assurance, représenté par son
          Directeur Général, dont le siège social est situé à Casablanca, Maroc.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Finalités du traitement</h2>
        <p>Les données à caractère personnel collectées sont traitées pour :</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>La gestion des contrats d'assurance et des sinistres</li>
          <li>La vérification de l'identité et la prévention de la fraude</li>
          <li>Le respect des obligations légales et réglementaires (ACAPS, etc.)</li>
          <li>L'amélioration de la qualité des services proposés</li>
          <li>La communication avec les assurés concernant leurs dossiers</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Vos droits selon la loi 09-08</h2>
        <p>Vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>
            <strong>Droit d'accès (art. 7) :</strong> Obtenir confirmation du traitement de vos
            données et en recevoir une copie
          </li>
          <li>
            <strong>Droit de rectification (art. 8) :</strong> Faire corriger des données
            inexactes ou incomplètes
          </li>
          <li>
            <strong>Droit d'opposition (art. 11) :</strong> Vous opposer au traitement pour des
            motifs légitimes
          </li>
          <li>
            <strong>Droit de suppression (art. 8) :</strong> Demander l'effacement dans les cas
            prévus par la loi
          </li>
        </ul>
        <p className="mt-4">
          Pour exercer ces droits, envoyez votre demande à :{' '}
          <a href="mailto:dpo@ism-assurance.ma" className="text-blue-600 hover:underline">
            dpo@ism-assurance.ma
          </a>{' '}
          accompagnée d'une copie de votre pièce d'identité.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Transferts de données</h2>
        <p>
          Les données à caractère personnel sont hébergées et traitées au Maroc. Aucun transfert
          de données vers des pays tiers n'est effectué sans garanties appropriées conformément
          à la loi 09-08.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Sécurité des données</h2>
        <p>
          ISM Assurance met en œuvre des mesures techniques et organisationnelles appropriées
          pour protéger vos données contre la perte, la destruction accidentelle, la divulgation
          ou l'accès non autorisé, conformément à l'article 23 de la loi 09-08.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Réclamation auprès de la CNDP</h2>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
          réclamation auprès de la CNDP :{' '}
          <a
            href="https://www.cndp.ma"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            www.cndp.ma
          </a>
          .
        </p>
      </section>
    </main>
  )
}
