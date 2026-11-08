
import { useState } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  Database,
  BrainCircuit,
  Users,
  MessageCircle,
  CreditCard,
  Trash2,
  Baby,
  Mail,
  ChevronRight,
  FileText,
  Eye,
  Globe,
  Clock,
  CheckCircle2,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";

const LAST_UPDATED = "November 8, 2026";
const CONTACT_EMAIL = "singhaditya4560@gmail.com";

const sections = [
  { id: "overview", title: "Overview", icon: ShieldCheck },
  { id: "information", title: "Information We Collect", icon: Database },
  { id: "usage", title: "How We Use Information", icon: Eye },
  { id: "ai", title: "AI & Smart Matching", icon: BrainCircuit },
  { id: "sharing", title: "Information Sharing", icon: Users },
  { id: "payments", title: "Payments & Transactions", icon: CreditCard },
  { id: "security", title: "Data Security", icon: LockKeyhole },
  { id: "retention", title: "Data Retention", icon: Clock },
  { id: "rights", title: "Your Privacy Rights", icon: ShieldCheck },
  { id: "deletion", title: "Account Deletion", icon: Trash2 },
  { id: "children", title: "Children's Privacy", icon: Baby },
  { id: "changes", title: "Policy Changes", icon: FileText },
  { id: "contact", title: "Contact Us", icon: Mail },
];

function PolicySection({
  id,
  number,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  number: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md sm:p-7"
    >
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">
            Section {number}
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
            {title}
          </h2>
        </div>
      </div>

      <div className="space-y-4 text-sm leading-7 text-slate-600">
        {children}
      </div>
    </section>
  );
}

function Bullet({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-violet-600" />
      <span>{children}</span>
    </li>
  );
}

export default function PrivacyPolicy() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setMobileMenuOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#F7F7FC] text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-20 h-96 w-96 rounded-full bg-violet-200/30 blur-[100px]" />
        <div className="absolute -right-40 top-80 h-96 w-96 rounded-full bg-indigo-200/30 blur-[100px]" />
      </div>

      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-black text-white shadow-lg shadow-violet-200">
              S
            </span>
            <span className="text-xl font-black tracking-tight">
              Skill<span className="text-violet-600">Swap</span>
            </span>
          </a>

          <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Your privacy matters
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle policy navigation"
            aria-expanded={mobileMenuOpen}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 max-h-[75vh] overflow-y-auto border-b border-slate-200 bg-white p-4 shadow-xl lg:hidden">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400">
            On this page
          </p>
          <div className="grid gap-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => goToSection(section.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-violet-50 hover:text-violet-700"
              >
                <section.icon className="h-4 w-4" />
                {section.title}
                <ChevronRight className="ml-auto h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1B103B] via-[#392078] to-[#6845E8] p-7 text-white shadow-2xl shadow-violet-200/60 sm:p-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full border-[45px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-100 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              SkillSwap Privacy Center
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Your privacy.
              <br />
              <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-white bg-clip-text text-transparent">
                Your control.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-violet-100 sm:text-base">
              We believe learning and sharing skills should happen in a
              trusted environment. This Privacy Policy explains what
              information SkillSwap may collect, how it is used, and
              the choices available to you.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white">
                <LockKeyhole className="h-4 w-4" />
                Privacy information
              </span>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold text-white">
                <Clock className="h-4 w-4" />
                Updated {LAST_UPDATED}
              </span>
            </div>
          </div>
        </section>

        {/* Content layout */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Desktop sidebar */}
          <aside className="sticky top-24 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <p className="mb-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Policy contents
            </p>

            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => goToSection(section.id)}
                  className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
                >
                  <section.icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-violet-600" />
                  <span>{section.title}</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </nav>

            <div className="mt-5 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
              <ShieldCheck className="h-6 w-6 text-violet-700" />
              <p className="mt-2 text-xs font-black text-slate-900">
                Questions about privacy?
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:underline"
              >
                Contact our team
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </aside>

          {/* Policy content */}
          <div className="min-w-0 space-y-5">
            <div
              id="overview"
              className="scroll-mt-28 rounded-2xl border border-violet-100 bg-violet-50/70 p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-black text-slate-950">
                    Privacy Policy – Overview
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    This policy applies to your use of SkillSwap, including
                    our website, applications, and related services. By
                    using the platform, you acknowledge that you have
                    read this policy. Where consent is required by
                    applicable law, we will request it separately.
                  </p>
                </div>
              </div>
            </div>

            <PolicySection
              id="information"
              number="01"
              title="Information We Collect"
              icon={Database}
            >
              <p>
                The information collected depends on the features you
                use and the permissions you provide. This may include:
              </p>

              <ul className="space-y-3">
                <Bullet>
                  <strong className="text-slate-900">Account information:</strong>{" "}
                  Name, email address, authentication identifiers, and
                  account preferences.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Profile information:</strong>{" "}
                  Profile photo, biography, location if provided, skills
                  you can teach, skills you want to learn, and learning
                  interests.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Communication data:</strong>{" "}
                  Messages, support requests, and information shared
                  when communicating with other members.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Session information:</strong>{" "}
                  Session schedules, participation details, feedback,
                  and related activity.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Transaction information:</strong>{" "}
                  Payment and credit-related records, transaction
                  references, and withdrawal details where those
                  features are available.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Technical information:</strong>{" "}
                  Device, browser, diagnostic, security, and usage
                  information that may be generated when you use
                  the platform.
                </Bullet>
              </ul>

              <p>
                Please do not include passwords, full payment card
                details, or other highly sensitive information in
                public profile fields or chat messages.
              </p>
            </PolicySection>

            <PolicySection
              id="usage"
              number="02"
              title="How We Use Your Information"
              icon={Eye}
            >
              <p>We may use information for purposes such as:</p>
              <ul className="space-y-3">
                <Bullet>
                  Creating and managing your account and profile.
                </Bullet>
                <Bullet>
                  Showing relevant mentors, learners, and skill
                  exchange opportunities.
                </Bullet>
                <Bullet>
                  Enabling messaging, learning sessions, and
                  platform interactions.
                </Bullet>
                <Bullet>
                  Processing payments, credits, refunds, or
                  withdrawals when supported.
                </Bullet>
                <Bullet>
                  Providing customer support and important
                  service notifications.
                </Bullet>
                <Bullet>
                  Detecting suspicious activity, fraud, abuse,
                  and violations of our terms.
                </Bullet>
                <Bullet>
                  Maintaining, troubleshooting, and improving
                  platform performance and security.
                </Bullet>
                <Bullet>
                  Meeting legal obligations and enforcing
                  applicable platform policies.
                </Bullet>
              </ul>
            </PolicySection>

            <PolicySection
              id="ai"
              number="03"
              title="AI & Smart Matching"
              icon={BrainCircuit}
            >
              <p>
                SkillSwap may provide AI-assisted features to help
                members discover relevant learning and teaching
                opportunities.
              </p>

              <p>
                Depending on the feature and your inputs, matching
                may consider information such as:
              </p>

              <ul className="space-y-2">
                <Bullet>Teaching and learning skills.</Bullet>
                <Bullet>Learning goals and experience level.</Bullet>
                <Bullet>Relevant profile information and platform signals.</Bullet>
              </ul>

              <p>
                If an external AI provider, such as Google Gemini,
                is enabled for a feature, relevant request data may
                be processed by that provider to generate or improve
                recommendations. Such processing is subject to the
                provider's applicable terms and privacy practices.
              </p>

              <p>
                AI-generated recommendations are suggestions only.
                They do not guarantee compatibility, quality,
                availability, or outcomes. You remain responsible
                for reviewing profiles and choosing who to contact.
              </p>

              <p>
                Do not submit passwords, payment credentials, or
                sensitive personal information into AI prompts.
              </p>
            </PolicySection>

            <PolicySection
              id="sharing"
              number="04"
              title="Information Sharing"
              icon={Users}
            >
              <p>
                We do not sell personal information as a business
                model. Information may be shared in limited
                circumstances necessary to operate the platform:
              </p>

              <ul className="space-y-3">
                <Bullet>
                  <strong className="text-slate-900">Other members:</strong>{" "}
                  Profile information and skills you choose to make
                  visible may be shown to other SkillSwap members.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Service providers:</strong>{" "}
                  Infrastructure, hosting, authentication, database,
                  communication, analytics, and payment providers
                  may process information to provide their services.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">AI providers:</strong>{" "}
                  Relevant information may be shared with AI services
                  when you use AI-powered features.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Legal and safety reasons:</strong>{" "}
                  Information may be disclosed where required by law
                  or reasonably necessary to protect users, rights,
                  and platform security.
                </Bullet>
                <Bullet>
                  <strong className="text-slate-900">Business changes:</strong>{" "}
                  Information may be transferred as part of a merger,
                  restructuring, or business transfer, subject to
                  applicable law.
                </Bullet>
              </ul>
            </PolicySection>

            <PolicySection
              id="payments"
              number="05"
              title="Payments & Transactions"
              icon={CreditCard}
            >
              <p>
                If SkillSwap offers paid sessions, credits, deposits,
                refunds, or withdrawals, transaction information
                may be processed to complete and manage those
                activities.
              </p>

              <p>
                Payment information may be handled by the payment
                provider selected for the transaction. The payment
                provider's own privacy policy and terms may also
                apply.
              </p>

              <p>
                SkillSwap may retain transaction references and
                related records for accounting, fraud prevention,
                dispute handling, and legal compliance.
              </p>

              <p>
                Do not assume that SkillSwap stores or processes
                complete card or bank credentials. The actual
                handling depends on the payment integration used.
              </p>
            </PolicySection>

            <PolicySection
              id="security"
              number="06"
              title="Data Security"
              icon={LockKeyhole}
            >
              <p>
                We take reasonable technical and organizational
                measures designed to protect information against
                unauthorized access, loss, misuse, alteration,
                or disclosure.
              </p>

              <ul className="space-y-2">
                <Bullet>Access controls and authentication protections.</Bullet>
                <Bullet>Secure communication where supported.</Bullet>
                <Bullet>Monitoring and measures intended to detect misuse.</Bullet>
                <Bullet>Restricted access to information where appropriate.</Bullet>
              </ul>

              <p>
                No website, application, or internet transmission
                can be guaranteed to be completely secure. You
                should also protect your login credentials and
                sign out from shared devices.
              </p>
            </PolicySection>

            <PolicySection
              id="retention"
              number="07"
              title="Data Retention"
              icon={Clock}
            >
              <p>
                We retain information for as long as reasonably
                necessary for the purposes described in this policy,
                including providing services, maintaining accounts,
                resolving disputes, preventing fraud, and meeting
                legal obligations.
              </p>

              <p>
                Retention periods may vary depending on the type
                of information, the feature used, applicable law,
                and legitimate operational requirements.
              </p>

              <p>
                Some records may need to be retained for a limited
                period after account closure where required for
                legal, financial, security, or dispute-resolution
                purposes.
              </p>
            </PolicySection>

            <PolicySection
              id="rights"
              number="08"
              title="Your Privacy Rights"
              icon={ShieldCheck}
            >
              <p>
                Subject to applicable law, you may have rights
                regarding your personal information, including:
              </p>

              <ul className="space-y-3">
                <Bullet>Requesting access to personal information.</Bullet>
                <Bullet>Requesting correction of inaccurate information.</Bullet>
                <Bullet>Requesting deletion where legally available.</Bullet>
                <Bullet>Withdrawing consent where processing relies on consent.</Bullet>
                <Bullet>Raising concerns about how information is used.</Bullet>
              </ul>

              <p>
                To exercise a privacy request, contact us using
                the email address in the Contact Us section.
                We may need to verify your identity before
                processing certain requests.
              </p>
            </PolicySection>

            <PolicySection
              id="deletion"
              number="09"
              title="Account & Data Deletion"
              icon={Trash2}
            >
              <p>
                You may request account deletion by contacting
                us at the email address below. If an account
                deletion option is available inside the app,
                you may also use that option.
              </p>

              <p>
                We may ask you to verify account ownership
                before processing a deletion request.
              </p>

              <p>
                Deletion may not immediately remove records
                that must be retained for legal compliance,
                accounting, fraud prevention, security,
                or the resolution of outstanding disputes.
                Where retention is required, we will handle
                those records in accordance with applicable law.
              </p>
            </PolicySection>

            <PolicySection
              id="children"
              number="10"
              title="Children's Privacy"
              icon={Baby}
            >
              <p>
                SkillSwap is not intended for children under
                13 years of age. We do not knowingly seek
                to collect personal information from children
                under 13.
              </p>

              <p>
                If we become aware that personal information
                has been collected from a child in circumstances
                where collection is not permitted, we will
                take appropriate steps to address it.
              </p>

              <p>
                If you believe a child has provided information
                to SkillSwap, please contact us.
              </p>
            </PolicySection>

            <PolicySection
              id="changes"
              number="11"
              title="Changes to This Policy"
              icon={FileText}
            >
              <p>
                We may update this Privacy Policy when our
                services, technologies, or legal obligations
                change.
              </p>

              <p>
                The updated version will be published on
                this page with a revised Last Updated date.
                Where required, we will provide additional
                notice or request consent for material changes.
              </p>
            </PolicySection>

            <PolicySection
              id="contact"
              number="12"
              title="Contact Us"
              icon={Mail}
            >
              <p>
                If you have questions, privacy concerns,
                or requests relating to your personal
                information, contact the SkillSwap team:
              </p>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="group flex items-center gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 transition hover:border-violet-300"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-violet-700 shadow-sm">
                  <Mail className="h-5 w-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Privacy contact
                  </span>
                  <span className="block break-all text-sm font-black text-violet-800">
                    {CONTACT_EMAIL}
                  </span>
                </span>

                <ArrowUpRight className="h-5 w-5 shrink-0 text-violet-600 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
              </a>
            </PolicySection>

            {/* Footer note */}
            <footer className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-950">
                Learn freely. Connect confidently.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
                Thank you for being part of SkillSwap.
                We are committed to handling your information
                responsibly and transparently.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs font-bold text-slate-500">
                <a href="/" className="hover:text-violet-700">
                  Home
                </a>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="hover:text-violet-700"
                >
                  Contact
                </a>
                <span>© {new Date().getFullYear()} SkillSwap</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
