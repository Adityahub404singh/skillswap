export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: June 08, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">1. Information We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">We collect information you provide directly to us, such as your name, email address, skills, and profile information when you register. We also collect transaction data, UPI IDs (strictly for processing your withdrawal requests), and session analytics to ensure a high-quality learning environment.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>To match you with the best mentors and students.</li>
          <li>To process transactions, deposits, and securely send withdrawal funds to your UPI account.</li>
          <li>To detect, investigate, and prevent fraudulent transactions, credit farming, and policy violations.</li>
          <li>To send important notifications about disputes, sessions, and platform updates.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">3. Information Sharing & Third Parties</h2>
        <p className="text-muted-foreground leading-relaxed">We strictly do not sell, trade, or rent your personal information. We use highly secure third-party services like Razorpay for payment processing. Your credit card or bank details are processed directly by Razorpay and are never stored on SkillSwap servers.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">4. Data Security & Integrity</h2>
        <p className="text-muted-foreground leading-relaxed">We implement enterprise-grade technical measures to protect your data. Passwords are cryptographically hashed, and API routes are secured via JWT authentication. Video calls are processed securely and peer-to-peer where applicable.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">5. Data Deletion</h2>
        <p className="text-muted-foreground leading-relaxed">You hold the rights to your data. You may request the complete deletion of your account, history, and associated data at any time by contacting singhaditya4560@gmail.com. Processing may take up to 30 days to clear escrow holds.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">6. Children's Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">Our service is not directed to children under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal information, we take steps to remove such information immediately.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">7. Contact Us</h2>
        <p className="text-muted-foreground leading-relaxed">If you have any questions or concerns about this Privacy Policy, please contact our Data Protection Officer at <a href="mailto:singhaditya4560@gmail.com" className="text-primary hover:underline font-bold">singhaditya4560@gmail.com</a></p>
      </section>
    </div>
  );
}