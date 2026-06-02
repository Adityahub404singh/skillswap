import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const SKILLS_DATA: Record<string, {
  title: string;
  description: string;
  benefits: string[];
  faqs: { q: string; a: string }[];
}> = {
  "python": {
    title: "Learn Python for Free",
    description: "Python is the most popular programming language in 2026. Learn Python by connecting with expert mentors on SkillSwap.",
    benefits: [
      "Most in-demand programming language",
      "Used in AI, ML, Data Science, Web Development",
      "Beginner friendly syntax",
      "High paying job opportunities",
      "Large community support"
    ],
    faqs: [
      { q: "How long does it take to learn Python?", a: "Basic Python can be learned in 4-8 weeks with consistent practice. Advanced topics like Data Science or ML may take 3-6 months." },
      { q: "Is Python good for beginners?", a: "Yes! Python has simple, readable syntax making it perfect for beginners. It is one of the most recommended first languages." },
      { q: "Can I learn Python for free on SkillSwap?", a: "Yes! On SkillSwap you earn credits by teaching your skills and use those credits to learn Python from expert mentors." },
      { q: "What can I build with Python?", a: "Web apps, AI/ML models, data analysis tools, automation scripts, games and much more." }
    ]
  },
  "english": {
    title: "Learn English Online for Free",
    description: "Improve your English speaking, writing and communication skills with native speakers and expert teachers on SkillSwap.",
    benefits: [
      "Improve career opportunities globally",
      "Communicate confidently in international settings",
      "Access to more online content and resources",
      "Better academic performance",
      "Connect with people worldwide"
    ],
    faqs: [
      { q: "How can I learn English for free?", a: "On SkillSwap, you can learn English by teaching your own skills to others and earning credits to book English sessions." },
      { q: "How long to become fluent in English?", a: "With daily practice, most learners see significant improvement in 3-6 months. Fluency typically takes 1-2 years." },
      { q: "What English skills can I learn on SkillSwap?", a: "Speaking, writing, grammar, pronunciation, business English, interview preparation and more." }
    ]
  },
  "web-development": {
    title: "Learn Web Development for Free",
    description: "Learn HTML, CSS, JavaScript, React and more from experienced web developers on SkillSwap's skill exchange platform.",
    benefits: [
      "Build websites and web applications",
      "High demand skill in 2026",
      "Work remotely from anywhere",
      "Freelance opportunities",
      "Average salary Rs. 6-20 LPA in India"
    ],
    faqs: [
      { q: "What should I learn first in web development?", a: "Start with HTML and CSS for structure and styling, then learn JavaScript for interactivity. After that, learn a framework like React." },
      { q: "How long to learn web development?", a: "Basic web development takes 3-6 months. Full stack development may take 1-2 years of consistent learning." },
      { q: "Can I get a job after learning web development?", a: "Yes! Web developers are in high demand. Many people get jobs after 6-12 months of learning and building projects." }
    ]
  },
  "javascript": {
    title: "Learn JavaScript for Free",
    description: "JavaScript is the language of the web. Learn JS from beginner to advanced with expert mentors on SkillSwap.",
    benefits: [
      "Runs in every web browser",
      "Most popular programming language",
      "Frontend and backend development",
      "Huge job market",
      "Active community and resources"
    ],
    faqs: [
      { q: "Is JavaScript hard to learn?", a: "JavaScript is moderately easy to start but has many advanced concepts. Beginners can build interactive websites within weeks." },
      { q: "JavaScript vs Python - which to learn first?", a: "If you want web development, start with JavaScript. If you want data science or AI, start with Python." }
    ]
  },
  "dsa": {
    title: "Learn Data Structures and Algorithms (DSA)",
    description: "Master DSA for coding interviews at top companies. Learn from experts who cleared interviews at FAANG companies.",
    benefits: [
      "Crack FAANG interviews",
      "Understand computer science fundamentals",
      "Write efficient code",
      "Problem solving skills",
      "Higher salary packages"
    ],
    faqs: [
      { q: "How long to learn DSA?", a: "Basic DSA takes 3-4 months. To be interview ready, plan for 6-12 months of consistent practice." },
      { q: "Which language to use for DSA?", a: "C++, Java or Python are most common. C++ is fastest, Python is easiest to write." }
    ]
  },
  "graphic-design": {
    title: "Learn Graphic Design for Free",
    description: "Learn Photoshop, Illustrator, Canva and UI/UX design from professional designers on SkillSwap.",
    benefits: [
      "Create logos, posters, social media content",
      "Freelance opportunities",
      "In demand creative skill",
      "Express creativity professionally",
      "Work with brands and businesses"
    ],
    faqs: [
      { q: "What software do graphic designers use?", a: "Adobe Photoshop, Illustrator, InDesign, Canva and Figma are the most popular tools." },
      { q: "Can I learn graphic design without a degree?", a: "Absolutely! Many successful designers are self-taught. A strong portfolio matters more than a degree." }
    ]
  }
};

export default function SkillPage({ params }: { params: { skill: string } }) {
  const skillKey = params.skill?.toLowerCase();
  const skillData = SKILLS_DATA[skillKey];

  if (!skillData) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <h1 className="text-3xl font-bold mb-4">Skill Not Found</h1>
        <p className="text-muted-foreground mb-6">We could not find this skill page.</p>
        <Link href="/explore"><Button>Explore All Skills</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold">{skillData.title}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">{skillData.description}</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register">
            <Button size="lg" className="rounded-full bg-primary text-white px-8">
              Start Learning Free
            </Button>
          </Link>
          <Link href="/explore">
            <Button size="lg" variant="outline" className="rounded-full px-8">
              Find Mentors
            </Button>
          </Link>
        </div>
      </div>

      {/* Benefits */}
      <div className="card-premium p-8">
        <h2 className="text-2xl font-bold mb-6">Why Learn {skillData.title.replace("Learn ", "").replace(" for Free", "").replace(" Online for Free", "")}?</h2>
        <ul className="space-y-3">
          {skillData.benefits.map((benefit, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-green-500 text-xl mt-0.5">✓</span>
              <span className="text-muted-foreground">{benefit}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* How it works */}
      <div className="card-premium p-8">
        <h2 className="text-2xl font-bold mb-6">How to Learn for Free on SkillSwap</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Sign Up Free", desc: "Create your account and get 200 free credits to start learning immediately." },
            { step: "2", title: "Find a Mentor", desc: "Browse expert mentors, check their ratings and book a session." },
            { step: "3", title: "Earn More Credits", desc: "Teach your own skills to others and earn credits for more sessions." }
          ].map(s => (
            <div key={s.step} className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mx-auto">{s.step}</div>
              <h3 className="font-bold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        {skillData.faqs.map((faq, i) => (
          <div key={i} className="card-premium p-6">
            <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
            <p className="text-muted-foreground">{faq.a}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="card-premium p-8 text-center bg-gradient-to-br from-primary/10 to-accent/10">
        <h2 className="text-2xl font-bold mb-2">Ready to Start Learning?</h2>
        <p className="text-muted-foreground mb-6">Join thousands of learners on SkillSwap. Get 200 free credits on signup!</p>
        <Link href="/register">
          <Button size="lg" className="rounded-full bg-primary text-white px-10">
            Join SkillSwap Free
          </Button>
        </Link>
      </div>
    </div>
  );
}
