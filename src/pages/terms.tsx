export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: June 08, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed">By accessing and using SkillSwap, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">2. Use of Service & Escrow</h2>
        <p className="text-muted-foreground leading-relaxed">SkillSwap is a peer-to-peer skill exchange platform. We act as an escrow agent. When a session is booked, credits are locked securely until the session is successfully completed with mutual verification (OTP and Duration rules).</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">3. Credits, Earnings & Withdrawals (Financial Policy)</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li><strong>Valuation:</strong> 1 Credit is equivalent to ₹1 INR for platform usage.</li>
          <li><strong>Promotional Credits:</strong> New users receive 200 credits upon registration. These credits cannot be withdrawn to a bank account under any circumstances; they are strictly for learning.</li>
          <li><strong>Withdrawal Rules:</strong> Only credits earned by actively teaching can be withdrawn. The minimum withdrawal amount is 500 earned credits.</li>
          <li><strong>Platform Commission:</strong> To maintain servers and support, SkillSwap charges a <strong>20% platform fee</strong> on all withdrawals (e.g., Withdrawing 500 credits yields ₹400 INR to your bank account).</li>
          <li><strong>Security Clearance (7-Day Hold):</strong> For fraud prevention, earned credits must mature for 7 days before they become eligible for withdrawal.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">4. Session & Dispute Policy</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>Mentors must verify the student's OTP to officially start the session timer.</li>
          <li>Sessions must reach at least 80% of their scheduled duration before they can be marked as complete.</li>
          <li>If a session is interrupted or fails, users must raise a detailed Dispute. Our admin team will review the claim within 24-48 hours. Fake disputes will result in a permanent ban.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">5. User Conduct & Zero-Tolerance Fraud Policy</h2>
        <p className="text-muted-foreground leading-relaxed">Any attempt to farm credits, create multiple fake accounts, misuse the referral system, or bypass the platform's payment gateway will result in an immediate hardware and IP ban without refunds.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">6. Termination</h2>
        <p className="text-muted-foreground leading-relaxed">We reserve the right to terminate or suspend your account, permanently freezing any remaining credits, at any time for violations of these terms. Upon termination, your right to use the service will immediately cease.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">7. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">For any questions or legal inquiries regarding these Terms, contact us at <a href="mailto:singhaditya4560@gmail.com" className="text-primary hover:underline font-bold">singhaditya4560@gmail.com</a></p>
      </section>
    </div>
  );
}
