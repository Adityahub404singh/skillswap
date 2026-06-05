# Fix seed - skillsTeach TEXT field hai, JSON string bhejni hai
# cd C:\Users\alc\skillswap\backend  then  .\fix-seed.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$BASE = "http://localhost:5000"

$TOKEN = (Invoke-RestMethod -Method POST `
  -Uri "$BASE/api/auth/login" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"singhaditya4560@gmail.com","password":"Admin@123"}').token

Write-Host "Token OK" -ForegroundColor Green

# Seed users with correct JSON string format for skillsTeach/skillsLearn
$users = @(
  @{email="rahul.s@demo.com";password="Demo@123";teach='["Python","DSA"]';learn='["React","English"]';name="Rahul Sharma"},
  @{email="priya.p@demo.com";password="Demo@123";teach='["Figma","Graphic Design"]';learn='["Python","Marketing"]';name="Priya Patel"},
  @{email="arjun.s@demo.com";password="Demo@123";teach='["React","JavaScript"]';learn='["AI/ML","Chess"]';name="Arjun Singh"},
  @{email="neha.g@demo.com";password="Demo@123";teach='["English","Hindi"]';learn='["Figma","Web Dev"]';name="Neha Gupta"},
  @{email="vikram.r@demo.com";password="Demo@123";teach='["Node.js","TypeScript"]';learn='["DSA","Marketing"]';name="Vikram Rao"},
  @{email="sana.k@demo.com";password="Demo@123";teach='["Marketing","English"]';learn='["Python","React"]';name="Sana Khan"},
  @{email="dev.m@demo.com";password="Demo@123";teach='["AI/ML","Python"]';learn='["Spanish","Music"]';name="Dev Malhotra"},
  @{email="riya.j@demo.com";password="Demo@123";teach='["Music","Photography"]';learn='["JavaScript","React"]';name="Riya Joshi"},
  @{email="karan.v@demo.com";password="Demo@123";teach='["Chess","DSA"]';learn='["Node.js","TypeScript"]';name="Karan Verma"},
  @{email="ananya.d@demo.com";password="Demo@123";teach='["Spanish","English"]';learn='["AI/ML","Figma"]';name="Ananya Das"},
  @{email="rohit.k@demo.com";password="Demo@123";teach='["Web Dev","JavaScript"]';learn='["DSA","Chess"]';name="Rohit Kumar"},
  @{email="meera.n@demo.com";password="Demo@123";teach='["Figma","Photography"]';learn='["React","Node.js"]';name="Meera Nair"},
  @{email="aakash.t@demo.com";password="Demo@123";teach='["Flutter","React"]';learn='["AI/ML","English"]';name="Aakash Tiwari"},
  @{email="zara.a@demo.com";password="Demo@123";teach='["Graphic Design","Music"]';learn='["Python","Web Dev"]';name="Zara Ahmed"},
  @{email="nikhil.b@demo.com";password="Demo@123";teach='["DSA","TypeScript"]';learn='["Figma","Marketing"]';name="Nikhil Bose"}
)

foreach ($u in $users) {
  try {
    $tok = (Invoke-RestMethod -Method POST -Uri "$BASE/api/auth/login" `
      -Headers @{"Content-Type"="application/json"} `
      -Body "{`"email`":`"$($u.email)`",`"password`":`"$($u.password)`"}").token

    if ($tok) {
      # Send skillsTeach as JSON string (TEXT column)
      $body = "{`"skillsTeach`":$($u.teach),`"skillsLearn`":$($u.learn),`"pricePerHour`":10}"
      Invoke-RestMethod -Method PATCH -Uri "$BASE/api/users/me" `
        -Headers @{"Authorization"="Bearer $tok";"Content-Type"="application/json"} `
        -Body $body | Out-Null
      Write-Host "  Fixed: $($u.name) teach=$($u.teach)" -ForegroundColor Cyan
    }
  } catch {
    Write-Host "  Error: $($u.name) - $($_.Exception.Message.Substring(0,[Math]::Min(60,$_.Exception.Message.Length)))" -ForegroundColor Red
  }
}

# Also fix your own account
$myBody = '{"skillsTeach":["React","JavaScript","Web Dev","DSA"],"skillsLearn":["AI/ML","Design"],"pricePerHour":15}'
Invoke-RestMethod -Method PATCH -Uri "$BASE/api/users/me" `
  -Headers @{"Authorization"="Bearer $TOKEN";"Content-Type"="application/json"} `
  -Body $myBody | Out-Null
Write-Host "  Fixed: aditya pratap singh (React,JS,DSA)" -ForegroundColor Cyan

Write-Host ""
Write-Host "All done! Refresh localhost:5173/explore" -ForegroundColor Green
Write-Host "Python pe click karo - mentors dikhne chahiye" -ForegroundColor Yellow

# Verify
Write-Host ""
Write-Host "Verifying Python mentors..." -ForegroundColor Cyan
$mentors = Invoke-RestMethod -Method GET `
  -Uri "$BASE/api/skills/Python/mentors" `
  -Headers @{"Authorization"="Bearer $TOKEN"} `
  -ErrorAction SilentlyContinue
if ($mentors) {
  Write-Host "Python mentors found: $($mentors.Count)" -ForegroundColor Green
  $mentors | ForEach-Object { Write-Host "  - $($_.name)" -ForegroundColor White }
} else {
  Write-Host "Mentor endpoint may differ - check explore in browser" -ForegroundColor Yellow
}
