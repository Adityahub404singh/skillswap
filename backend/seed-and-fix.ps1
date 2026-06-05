# Seed users + fix skills
# cd C:\Users\alc\skillswap\backend  then  .\seed-and-fix.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$BASE = "http://localhost:5000"

# Get token
$TOKEN = (Invoke-RestMethod -Method POST `
  -Uri "$BASE/api/auth/login" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"singhaditya4560@gmail.com","password":"Admin@123"}').token

Write-Host "Token obtained" -ForegroundColor Green

# ── 1. Add skills to catalog ──────────────────────────────
$skills = @(
  @{name="Python";category="Technology";description="Learn Python programming from basics to advanced"},
  @{name="JavaScript";category="Technology";description="Master modern JavaScript and ES6+"},
  @{name="React";category="Technology";description="Build modern web apps with React"},
  @{name="DSA";category="Technology";description="Data Structures and Algorithms for interviews"},
  @{name="Web Dev";category="Technology";description="Full stack web development"},
  @{name="AI/ML";category="Technology";description="Machine learning and artificial intelligence"},
  @{name="Node.js";category="Technology";description="Backend development with Node.js"},
  @{name="Figma";category="Design";description="UI/UX design with Figma"},
  @{name="Graphic Design";category="Design";description="Visual design and branding"},
  @{name="English";category="Language";description="Spoken and written English"},
  @{name="Spanish";category="Language";description="Beginner to advanced Spanish"},
  @{name="Hindi";category="Language";description="Hindi speaking and writing"},
  @{name="Marketing";category="Business";description="Digital marketing strategies"},
  @{name="Chess";category="Sports";description="Chess strategy and openings"},
  @{name="Music";category="Music";description="Guitar, piano, vocals"},
  @{name="Photography";category="Arts";description="Camera and photo editing"},
  @{name="TypeScript";category="Technology";description="TypeScript for large scale apps"},
  @{name="Flutter";category="Technology";description="Cross platform mobile development"}
)

foreach ($skill in $skills) {
  try {
    $body = $skill | ConvertTo-Json
    Invoke-RestMethod -Method POST -Uri "$BASE/api/skills" `
      -Headers @{"Authorization"="Bearer $TOKEN";"Content-Type"="application/json"} `
      -Body $body | Out-Null
    Write-Host "  + Skill: $($skill.name)" -ForegroundColor Cyan
  } catch {
    Write-Host "  ~ Skip (exists): $($skill.name)" -ForegroundColor Gray
  }
}
Write-Host "Skills catalog done!" -ForegroundColor Green

# ── 2. Register 15 seed users ────────────────────────────
$users = @(
  @{name="Rahul Sharma";email="rahul.s@demo.com";password="Demo@123";skillsTeach=@("Python","DSA");skillsLearn=@("React","English")},
  @{name="Priya Patel";email="priya.p@demo.com";password="Demo@123";skillsTeach=@("Figma","Graphic Design");skillsLearn=@("Python","Marketing")},
  @{name="Arjun Singh";email="arjun.s@demo.com";password="Demo@123";skillsTeach=@("React","JavaScript");skillsLearn=@("AI/ML","Chess")},
  @{name="Neha Gupta";email="neha.g@demo.com";password="Demo@123";skillsTeach=@("English","Hindi");skillsLearn=@("Figma","Web Dev")},
  @{name="Vikram Rao";email="vikram.r@demo.com";password="Demo@123";skillsTeach=@("Node.js","TypeScript");skillsLearn=@("DSA","Marketing")},
  @{name="Sana Khan";email="sana.k@demo.com";password="Demo@123";skillsTeach=@("Marketing","English");skillsLearn=@("Python","React")},
  @{name="Dev Malhotra";email="dev.m@demo.com";password="Demo@123";skillsTeach=@("AI/ML","Python");skillsLearn=@("Spanish","Music")},
  @{name="Riya Joshi";email="riya.j@demo.com";password="Demo@123";skillsTeach=@("Music","Photography");skillsLearn=@("JavaScript","React")},
  @{name="Karan Verma";email="karan.v@demo.com";password="Demo@123";skillsTeach=@("Chess","Maths");skillsLearn=@("Node.js","TypeScript")},
  @{name="Ananya Das";email="ananya.d@demo.com";password="Demo@123";skillsTeach=@("Spanish","English");skillsLearn=@("AI/ML","Figma")},
  @{name="Rohit Kumar";email="rohit.k@demo.com";password="Demo@123";skillsTeach=@("Web Dev","JavaScript");skillsLearn=@("DSA","Chess")},
  @{name="Meera Nair";email="meera.n@demo.com";password="Demo@123";skillsTeach=@("Figma","Photography");skillsLearn=@("React","Node.js")},
  @{name="Aakash Tiwari";email="aakash.t@demo.com";password="Demo@123";skillsTeach=@("Flutter","React");skillsLearn=@("AI/ML","English")},
  @{name="Zara Ahmed";email="zara.a@demo.com";password="Demo@123";skillsTeach=@("Graphic Design","Music");skillsLearn=@("Python","Web Dev")},
  @{name="Nikhil Bose";email="nikhil.b@demo.com";password="Demo@123";skillsTeach=@("DSA","TypeScript");skillsLearn=@("Figma","Marketing")}
)

$registeredTokens = @{}

foreach ($u in $users) {
  try {
    # Register
    $regBody = @{
      name=$u.name; email=$u.email; password=$u.password
    } | ConvertTo-Json
    $reg = Invoke-RestMethod -Method POST -Uri "$BASE/api/auth/register" `
      -Headers @{"Content-Type"="application/json"} -Body $regBody
    
    # Login to get token
    $loginBody = @{email=$u.email;password=$u.password} | ConvertTo-Json
    $tok = (Invoke-RestMethod -Method POST -Uri "$BASE/api/auth/login" `
      -Headers @{"Content-Type"="application/json"} -Body $loginBody).token
    
    if ($tok) {
      $registeredTokens[$u.email] = $tok
      
      # Update profile with skillsTeach and skillsLearn
      $profileBody = @{
        name=$u.name
        skillsTeach=$u.skillsTeach
        skillsLearn=$u.skillsLearn
        bio="Hi! I teach $($u.skillsTeach -join ', ') and want to learn $($u.skillsLearn -join ', ')."
        pricePerHour=10
        trustScore=(Get-Random -Minimum 30 -Maximum 95)
      } | ConvertTo-Json
      
      Invoke-RestMethod -Method PATCH -Uri "$BASE/api/users/me" `
        -Headers @{"Authorization"="Bearer $tok";"Content-Type"="application/json"} `
        -Body $profileBody | Out-Null
      
      Write-Host "  + User: $($u.name) ($($u.skillsTeach -join ', '))" -ForegroundColor Cyan
    }
  } catch {
    Write-Host "  ~ Skip: $($u.name) - $($_.Exception.Message.Substring(0, [Math]::Min(50,$_.Exception.Message.Length)))" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "Seed complete!" -ForegroundColor Green
Write-Host "Ab explore pe Python, React, DSA ke mentors dikhenge" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify karo:" -ForegroundColor Yellow
Write-Host "  GET http://localhost:5000/api/skills" -ForegroundColor White
Write-Host "  Browser: localhost:5173/explore" -ForegroundColor White
