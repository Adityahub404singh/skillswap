const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_GiTnzt29kPjM@ep-odd-frog-am5juiin-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

const skills = [
  // Technology
  { name: 'JavaScript', category: 'Technology', description: 'Web programming language' },
  { name: 'Python', category: 'Technology', description: 'General purpose programming' },
  { name: 'React', category: 'Technology', description: 'Frontend UI library' },
  { name: 'Node.js', category: 'Technology', description: 'Backend JavaScript runtime' },
  { name: 'DSA', category: 'Technology', description: 'Data Structures & Algorithms' },
  { name: 'Web Development', category: 'Technology', description: 'Full stack web dev' },
  { name: 'AI/ML', category: 'Technology', description: 'Artificial Intelligence & Machine Learning' },
  { name: 'Java', category: 'Technology', description: 'Object oriented programming' },
  { name: 'C++', category: 'Technology', description: 'System programming language' },
  // Design
  { name: 'UI/UX Design', category: 'Design', description: 'User interface design' },
  { name: 'Figma', category: 'Design', description: 'Design tool' },
  { name: 'Graphic Design', category: 'Design', description: 'Visual communication design' },
  { name: 'Photography', category: 'Design', description: 'Photo taking and editing' },
  // Language
  { name: 'English', category: 'Language', description: 'English language learning' },
  { name: 'Spanish', category: 'Language', description: 'Spanish language learning' },
  { name: 'Hindi', category: 'Language', description: 'Hindi language learning' },
  { name: 'French', category: 'Language', description: 'French language learning' },
  // Business
  { name: 'Marketing', category: 'Business', description: 'Digital marketing skills' },
  { name: 'Finance', category: 'Business', description: 'Personal & business finance' },
  { name: 'Entrepreneurship', category: 'Business', description: 'Starting a business' },
  // Music
  { name: 'Guitar', category: 'Music', description: 'Guitar playing' },
  { name: 'Piano', category: 'Music', description: 'Piano playing' },
  { name: 'Singing', category: 'Music', description: 'Vocal training' },
  // Sports
  { name: 'Chess', category: 'Sports', description: 'Chess strategy' },
  { name: 'Yoga', category: 'Sports', description: 'Yoga and meditation' },
  { name: 'Cricket', category: 'Sports', description: 'Cricket coaching' },
  // Arts
  { name: 'Drawing', category: 'Arts', description: 'Sketching and drawing' },
  { name: 'Painting', category: 'Arts', description: 'Canvas painting' },
  // Science
  { name: 'Mathematics', category: 'Science', description: 'Maths tutoring' },
  { name: 'Physics', category: 'Science', description: 'Physics concepts' },
  { name: 'Chemistry', category: 'Science', description: 'Chemistry tutoring' },
];

async function seed() {
  for (const skill of skills) {
    await pool.query(
      `INSERT INTO skills (name, category, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
      [skill.name, skill.category, skill.description]
    ).catch(e => console.log(`Skipped ${skill.name}: ${e.message}`));
  }
  console.log('DONE! Skills seeded.');
  pool.end();
}

seed();
