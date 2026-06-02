export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: May 30, 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground leading-relaxed">By accessing and using SkillSwap, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">2. Use of Service</h2>
        <p className="text-muted-foreground leading-relaxed">SkillSwap is a peer-to-peer skill exchange platform. You agree to use the platform only for lawful purposes and in a way that does not infringe the rights of others. You are responsible for maintaining the confidentiality of your account credentials.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">3. Credits System</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>New users receive 200 credits upon registration</li>
          <li>Credits can be earned by teaching sessions and referring users</li>
          <li>Credits can be purchased via Razorpay at 1 credit = Rs. 1</li>
          <li>Minimum withdrawal amount is 500 credits</li>
          <li>Platform retains a 10% commission on completed sessions</li>
          <li>Credits are non-transferable between accounts</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">4. Session Policy</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 leading-relaxed">
          <li>Sessions under 10 minutes receive a full refund</li>
          <li>Sessions between 10-30 minutes receive a 50% refund</li>
          <li>Sessions over 30 minutes are charged in full</li>
          <li>Cancellations before session start receive a full refund</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">5. User Conduct</h2>
        <p className="text-muted-foreground leading-relaxed">You agree not to: harass or abuse other users, provide false information, attempt to manipulate the rating system, use the platform for illegal activities, or attempt to circumvent our payment system.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">6. Intellectual Property</h2>
        <p className="text-muted-foreground leading-relaxed">The SkillSwap platform and its original content, features, and functionality are owned by SkillSwap and are protected by international copyright, trademark, and other intellectual property laws.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">7. Disclaimer</h2>
        <p className="text-muted-foreground leading-relaxed">SkillSwap is provided on an "as is" basis without warranties of any kind. We do not guarantee the quality, accuracy, or reliability of any content or instruction provided by users on our platform.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">8. Limitation of Liability</h2>
        <p className="text-muted-foreground leading-relaxed">SkillSwap shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">9. Termination</h2>
        <p className="text-muted-foreground leading-relaxed">We reserve the right to terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the service will immediately cease.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">10. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">For any questions regarding these Terms, contact us at <a href="mailto:singhaditya4560@gmail.com" className="text-primary hover:underline">singhaditya4560@gmail.com</a></p>
      </section>
    </div>
  );
}

