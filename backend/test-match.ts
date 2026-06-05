import { db } from "./src/db.js";
import { usersTable } from "./src/schema/users.js";

async function check() {
  try {
    const res = await db.select().from(usersTable);
    console.log("Total Users in DB:", res.length);
    
    // Check karo kitne users ke paas Python skill hai
    const pythonMentors = res.filter(u => 
      u.skillsTeach && JSON.stringify(u.skillsTeach).toLowerCase().includes("python")
    );
    console.log("Mentors found for Python:", pythonMentors.length);
    pythonMentors.forEach(m => console.log("-", m.name));
  } catch (err) {
    console.log("Error:", err);
  }
}
check();
