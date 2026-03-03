export const metadata = {
  title: 'Privacy Policy | ISM Assurance',
  description: 'Privacy Policy for ISM Assurance platform and WhatsApp chatbot.',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 3, 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Who We Are</h2>
        <p>
          ISM Assurance operates the claims management platform at{' '}
          <strong>claims-plateform.vercel.app</strong> and the WhatsApp chatbot
          assistant <strong>Nour</strong>. We provide insurance claim management,
          policy consultation, and customer support services in Morocco.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Identity data:</strong> Name, CIN number, date of birth</li>
          <li><strong>Contact data:</strong> Phone number, email address</li>
          <li><strong>Location data:</strong> City, province, postal code</li>
          <li><strong>Insurance data:</strong> Policy numbers, claim details, incident descriptions</li>
          <li><strong>Communication data:</strong> WhatsApp messages sent to our chatbot</li>
          <li><strong>Technical data:</strong> IP address, browser type, session identifiers</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Process and manage insurance claims</li>
          <li>Provide quotes and policy information via WhatsApp chatbot</li>
          <li>Send renewal reminders and policy notifications</li>
          <li>Verify your identity and prevent fraud</li>
          <li>Comply with Moroccan insurance regulations</li>
          <li>Improve our platform and chatbot services</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. WhatsApp Data</h2>
        <p>
          When you interact with our WhatsApp chatbot, your phone number and
          messages are processed to provide automated customer service. Message
          history is stored for up to 90 days. We do not share WhatsApp
          conversation data with third parties except as required by law.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
        <p className="mb-3">We may share your data with:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Insurance experts and managers</strong> assigned to your claim</li>
          <li><strong>Meta Platforms</strong> — for WhatsApp Business API delivery</li>
          <li><strong>Vercel / NeonDB</strong> — our hosting and database infrastructure</li>
          <li><strong>Regulatory authorities</strong> when legally required</li>
        </ul>
        <p className="mt-3">We never sell your personal data.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
        <p>
          We retain your data for as long as your account is active or as needed
          to provide services. Claim records are retained for 5 years in
          accordance with Moroccan insurance law. You may request deletion of
          your account and associated data at any time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
        <p className="mb-3">Under Moroccan Law 09-08, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Oppose processing of your data</li>
          <li>Data portability</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">8. Security</h2>
        <p>
          We use industry-standard security measures including encrypted
          connections (HTTPS/TLS), hashed passwords, and access controls to
          protect your data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
        <p>
          For any privacy-related questions or to exercise your rights, contact
          us at:{' '}
          <a href="mailto:privacy@ism-assurance.ma" className="text-blue-600 underline">
            privacy@ism-assurance.ma
          </a>
        </p>
      </section>
    </main>
  );
}
