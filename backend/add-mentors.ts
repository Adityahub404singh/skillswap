import { db } from "./src/db.js";
import { usersTable } from "./src/schema/users.js"; // Tumhare project structure ke hisaab se sahi path

async function run() {
  try {
    await db.insert(usersTable).values([
      {
        name: "Rahul Sharma", email: "rahul@test.com", passwordHash: "hash",
        skillsTeach: JSON.stringify(["Python", "DSA"]), averageRating: 4.8, pricePerHour: 20
      },
      {
        name: "Priya Desai", email: "priya@test.com", passwordHash: "hash",
        skillsTeach: JSON.stringify(["React", "JavaScript"]), averageRating: 5.0, pricePerHour: 30
      }
    ]);
    console.log("? Mentors added successfully!");
  } catch (err) {
    console.log("Error (check path):", err);
  }
}
run();
