export const metadata = {
  title: 'Terms of Service | ISM Assurance',
  description: 'Terms of Service for ISM Assurance platform and WhatsApp chatbot.',
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 3, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Acceptance</h2>
        <p>
          By using the ISM Assurance platform or WhatsApp chatbot, you agree to
          these Terms of Service. If you do not agree, please do not use our
          services.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Services</h2>
        <p>ISM Assurance provides:</p>
        <ul className="list-disc pl-6 space-y-2 mt-3">
          <li>Online insurance claim submission and tracking</li>
          <li>Policy management and renewal reminders</li>
          <li>Premium estimation via WhatsApp chatbot</li>
          <li>Document upload and management</li>
          <li>Communication with insurance experts</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. WhatsApp Chatbot</h2>
        <p>
          Our WhatsApp chatbot <strong>Nour</strong> provides automated
          assistance for insurance inquiries. Premium estimates provided by the
          chatbot are indicative only and do not constitute a binding offer.
          A licensed insurance advisor will contact you with a precise quote.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. User Obligations</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Provide accurate and truthful information</li>
          <li>Do not use our services for fraudulent claims</li>
          <li>Keep your account credentials confidential</li>
          <li>Notify us immediately of any unauthorized account access</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
        <p>
          ISM Assurance is not liable for decisions made based on chatbot
          estimates. All insurance contracts are subject to the full policy
          terms issued by the relevant insurer and applicable Moroccan law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Governing Law</h2>
        <p>
          These terms are governed by the laws of the Kingdom of Morocco.
          Any disputes shall be subject to the jurisdiction of Moroccan courts.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Changes to Terms</h2>
        <p>
          We may update these terms at any time. Continued use of our services
          after changes constitutes acceptance of the new terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Contact</h2>
        <p>
          Questions about these terms:{' '}
          <a href="mailto:legal@ism-assurance.ma" className="text-blue-600 underline">
            legal@ism-assurance.ma
          </a>
        </p>
      </section>
    </main>
  );
}
