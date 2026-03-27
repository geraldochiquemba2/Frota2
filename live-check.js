const URL = "https://frota2.onrender.com";

async function checkLive() {
  console.log("Logging in...");
  const loginRes = await fetch(`${URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "+244999999999", pin: "1234567890" })
  });
  
  const cookies = loginRes.headers.get("set-cookie");
  if (!cookies) {
    console.log("No cookies! Login failed.");
    console.log(await loginRes.text());
    return;
  }
  
  console.log("Fetching users...");
  const usersRes = await fetch(`${URL}/api/users`, {
    headers: { "cookie": cookies }
  });
  const users = await usersRes.json();
  console.table(users.map(u => ({ id: u.id, name: u.name, phone: u.phone, role: u.role, vehicleId: u.vehicleId })));
  
  console.log("Fetching vehicles...");
  const vehRes = await fetch(`${URL}/api/vehicles`, {
    headers: { "cookie": cookies }
  });
  const vehicles = await vehRes.json();
  console.table(vehicles.map(v => ({ id: v.id, plate: v.plate, assignedDriverId: v.assignedDriverId })));
}

checkLive();
