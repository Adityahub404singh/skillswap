// backend/fix-tables.mjs
import fs from 'fs';
import path from 'path';

const filesToFix = [
    'src/routes/gamification.ts',
    'src/routes/admin.ts',
    'src/routes/discover.ts',
    'src/notify.ts'
];

console.log("🚀 Starting automatic table cleanup...\n");

filesToFix.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // 1. Purane duplicate pgTable definitions ko comment out kar raha hai
        const regex = /(const\s+\w+Table\s*=\s*pgTable[\s\S]*?\}\);)/g;
        if (regex.test(content)) {
            content = content.replace(regex, '/* $1 */');
            
            // 2. Sahi jagah se central schema import kar raha hai
            const importPath = file.includes('routes') ? '../schema/index.js' : './schema/index.js';
            const importStmt = `\n// 🔥 Auto-Fixed by Script\nimport { usersTable, sessionsTable, notificationsTable, swipesTable, transactionsTable, feedbacksTable } from "${importPath}";\n`;
            
            if (!content.includes('Auto-Fixed by Script')) {
                content = importStmt + content;
            }
            
            fs.writeFileSync(fullPath, content);
            console.log(`✅ FIXED: ${file} (Duplicates removed & Imports added)`);
        } else {
            console.log(`⚡ SKIPPED: ${file} (Already clean)`);
        }
    } else {
        console.log(`⚠️ NOT FOUND: ${file}`);
    }
});

console.log("\n🎉 All Done! Ab apna server restart karo: npm run dev");