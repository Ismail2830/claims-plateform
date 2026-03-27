export const metadata = {
  title: 'Politique de confidentialité | ISM Assurance',
  description: 'Politique de confidentialité de la plateforme ISM Assurance.',
}

export default function ConfidentialitePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-gray-500 mb-10">Dernière mise à jour : 27 mars 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Qui sommes-nous ?</h2>
        <p>
          ISM Assurance exploite la plateforme de gestion de sinistres accessible à l'adresse{' '}
          <strong>ism-assurance.ma</strong>. Nous fournissons des services de gestion de sinistres,
          de consultation de polices et d'assistance client au Maroc.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Données collectées</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Données d'identité :</strong> Nom, numéro de CIN, date de naissance</li>
          <li><strong>Données de contact :</strong> Numéro de téléphone, adresse e-mail</li>
          <li><strong>Données de localisation :</strong> Ville, province, code postal</li>
          <li><strong>Données d'assurance :</strong> Numéros de police, détails des sinistres, descriptions d'incidents</li>
          <li><strong>Données de communication :</strong> Messages échangés via notre plateforme et WhatsApp</li>
          <li><strong>Données techniques :</strong> Adresse IP, type de navigateur, identifiants de session</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Utilisation des données</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Traiter et suivre vos déclarations de sinistres</li>
          <li>Vous contacter concernant vos dossiers en cours</li>
          <li>Améliorer nos services et notre plateforme</li>
          <li>Respecter nos obligations légales et réglementaires</li>
          <li>Détecter et prévenir les fraudes</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Partage des données</h2>
        <p>
          Nous ne vendons ni ne louons vos données personnelles à des tiers. Vos données peuvent
          être partagées avec nos experts mandatés, les autorités compétentes (ACAPS, CNDP) si la
          loi l'exige, et nos prestataires techniques soumis à des obligations de confidentialité.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Conservation des données</h2>
        <p>
          Vos données sont conservées pendant la durée nécessaire au traitement de vos sinistres
          et, au minimum, pendant 10 ans conformément aux obligations légales applicables aux
          contrats d'assurance au Maroc.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Vos droits</h2>
        <p>Conformément à la loi 09-08, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Droit d'accès à vos données personnelles</li>
          <li>Droit de rectification des données inexactes</li>
          <li>Droit d'opposition au traitement</li>
          <li>Droit à la suppression dans les cas prévus par la loi</li>
        </ul>
        <p className="mt-3">
          Pour exercer ces droits, contactez-nous à{' '}
          <a href="mailto:privacy@ism-assurance.ma" className="text-blue-600 hover:underline">
            privacy@ism-assurance.ma
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Sécurité</h2>
        <p>
          Nous utilisons un chiffrement SSL 256-bit, des accès sécurisés par authentification et
          des hébergements localisés au Maroc pour protéger vos données contre tout accès
          non autorisé.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
        <p>
          ISM Assurance — Casablanca, Maroc<br />
          E-mail :{' '}
          <a href="mailto:privacy@ism-assurance.ma" className="text-blue-600 hover:underline">
            privacy@ism-assurance.ma
          </a><br />
          Téléphone : 0522 XX XX XX
        </p>
      </section>
    </main>
  )
}
