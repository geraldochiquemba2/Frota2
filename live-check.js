const URL = "https://frota2.onrender.com";

async function checkLive() {
  console.log("Logging in as admin...");
  const loginRes = await fetch(`${URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "admin", pin: "admin" })
  });
  
  const cookies = loginRes.headers.get("set-cookie");
  if (!cookies) {
    console.log("No cookies! Login failed.");
    console.log(await loginRes.text());
    return;
  }
  console.log("Login OK!");
  
  console.log("\nFetching users...");
  const usersRes = await fetch(`${URL}/api/users`, {
    headers: { "cookie": cookies }
  });
  const users = await usersRes.json();
  users.forEach(u => console.log(`User ${u.id} ${u.name.padEnd(25)} vehicleId=${u.vehicleId} vehicleIds=${JSON.stringify(u.vehicleIds)}`));
  
  console.log("\nFetching vehicles with assignedDriverId...");
  const vehRes = await fetch(`${URL}/api/vehicles`, {
    headers: { "cookie": cookies }
  });
  const vehicles = await vehRes.json();
  vehicles.filter(v => v.assignedDriverId).forEach(v => console.log(`Vehicle ${v.id} ${v.plate.padEnd(20)} assignedDriverId=${v.assignedDriverId} (${v.assignedDriverName})`));
  const unassigned = vehicles.filter(v => !v.assignedDriverId).length;
  console.log(`\nTotal: ${vehicles.length} vehicles, ${unassigned} unassigned`);
}

checkLive();
