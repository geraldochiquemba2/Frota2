import { db } from "./src/index.js";
import { eq } from "drizzle-orm";
import { vehiclesTable, tripsTable, maintenanceTable, inventoryItemsTable, suppliersTable, financeRecordsTable, usersTable, fuelingsTable, inventoryMovementsTable } from "./src/schema/index.js";

// Helper functions for mock data
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
const randomDate = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - randomNumber(1, daysAgo)); return d; };
const randomPlate = () => `LD-${randomNumber(10,99)}-${randomElement(['AA','BB','CC','DD','EE'])}`;
const randomPhone = () => `9${randomNumber(1,9)}${randomNumber(1000000,9999999)}`;

async function main() {
  console.log("Cleaning existing data...");
  await db.delete(financeRecordsTable).catch(() => {});
  await db.delete(fuelingsTable).catch(() => {});
  await db.delete(inventoryMovementsTable).catch(() => {});
  await db.delete(maintenanceTable).catch(() => {});
  await db.delete(tripsTable).catch(() => {});
  await db.delete(vehiclesTable).catch(() => {});
  await db.delete(usersTable).catch(() => {});
  await db.delete(inventoryItemsTable).catch(() => {});
  await db.delete(suppliersTable).catch(() => {});

  console.log("Seeding database (mock data without faker)...");

  // Suppliers
  const supplierNames = ["Auto Peças Luanda", "Pneus & Cia", "Mecânica Rápida", "Lubrificantes Angola", "Serviços Gerais LDA"];
  const newSuppliers = supplierNames.map(name => ({
    name,
    contactName: "Sr. " + name.split(" ")[0] + " Responsável",
    phone: randomPhone(),
    email: `contato@${name.replace(/[^a-zA-Z]/g,'').toLowerCase()}.co.ao`,
    address: "Rua Principal, Luanda",
    category: randomElement(["Mecânica", "Peças", "Combustível", "Lavagem"]),
    notes: "Fornecedor parceiro."
  }));
  const insertedSuppliers = await db.insert(suppliersTable).values(newSuppliers).returning();
  console.log("Inserted Suppliers: " + insertedSuppliers.length);

  // Inventory
  const inventoryItems = ["Óleo Motor 5W30", "Filtro de Ar", "Pneu 205/55 R16", "Pastilha de Freio", "Amortecedor Dianteiro", "Bateria 60Ah"];
  const newInventoryItems = inventoryItems.map(item => ({
    name: item,
    category: randomElement(["Óleo", "Filtros", "Pneus", "Suspensão", "Motor", "Diversos"]),
    unit: randomElement(["Litros", "Peças", "Pares"]),
    currentStock: randomNumber(10, 100),
    minStock: randomNumber(5, 15),
    unitPrice: parseFloat(randomFloat(5000, 150000)),
    supplierId: randomElement(insertedSuppliers).id,
    notes: "Peça de reposição."
  }));
  const insertedInventory = await db.insert(inventoryItemsTable).values(newInventoryItems).returning();
  console.log("Inserted Inventory Items: " + insertedInventory.length);

  // Admins
  await db.insert(usersTable).values([
    {
      name: "Administrador",
      phone: "admin",
      pin: "admin",
      role: "admin",
      active: true
    },
    {
      name: "Admin Principal",
      phone: "+244999999999",
      pin: "1234",
      role: "admin",
      active: true
    }
  ]);
  console.log("Inserted Admins: 2");

  // Drivers
  const driverNames = [
    "António Kiluanje", "José Manuel", "Manuel Francisco", "Carlos Alberto", 
    "Pedro Joaquim", "João Paulo", "Simão Fernando", "Domingos Luís", 
    "Mateus André", "Lucas Sebastião"
  ];
  const newDrivers = [];
  const usedPhones = new Set(["admin", "+244999999999"]);
  
  for(let i=0; i<driverNames.length; i++) {
    let phone;
    do {
      phone = `9${randomNumber(10000000, 99999999)}`; // 9 digits total
    } while (usedPhones.has(phone));
    usedPhones.add(phone);

    newDrivers.push({
      name: driverNames[i],
      phone,
      pin: "1234",
      role: "driver",
      active: true
    });
  }
  const insertedDrivers = await db.insert(usersTable).values(newDrivers).returning();
  console.log("Inserted Drivers: " + insertedDrivers.length);

  // Vehicles
  const newVehicles = [];
  const brands = ["Toyota", "Mitsubishi", "Hyundai", "Kia", "Isuzu"];
  for(let i=0; i<40; i++) {
    newVehicles.push({
      plate: randomPlate() + `-${i}`, // make sure it's unique
      brand: randomElement(brands),
      model: "Modelo V" + i,
      year: randomNumber(2010, 2024),
      status: randomElement(["active", "active", "maintenance"]),
      mileage: randomNumber(1000, 150000),
      fuelType: randomElement(["diesel", "gasoline"]),
      assignedDriverId: randomElement(insertedDrivers).id
    });
  }
  const insertedVehicles = await db.insert(vehiclesTable).values(newVehicles).returning();
  console.log("Inserted Vehicles: " + insertedVehicles.length);

  // Sync users with vehicles (bidirectional link)
  console.log("Syncing bidirectional driver-vehicle links...");
  for (const v of insertedVehicles) {
    if (v.assignedDriverId) {
      await db.update(usersTable)
        .set({ vehicleId: v.id })
        .where(eq(usersTable.id, v.assignedDriverId));
    }
  }

  // Trips
  const newTrips = [];
  const cities = ["Luanda", "Benguela", "Huambo", "Cabinda", "Lubango", "Malanje"];
  for(let i=0; i<100; i++) {
    const origin = randomElement(cities);
    const dest = randomElement(cities);
    newTrips.push({
      title: `Viagem ${origin} - ${dest}`,
      origin,
      destination: dest,
      scheduledStart: randomDate(30),
      status: randomElement(["completed", "completed", "pending", "in_progress"]),
      driverId: randomElement(insertedDrivers).id,
      vehicleId: randomElement(insertedVehicles).id,
      notes: "Logística padrão",
      startMileage: randomNumber(1000, 20000),
      endMileage: randomNumber(20500, 40000),
      distance: randomNumber(50, 600)
    });
  }
  await db.insert(tripsTable).values(newTrips);
  console.log("Inserted Trips");

  // Maintenance
  const newMaintenance = [];
  for(let i=0; i<30; i++) {
    const randomInv = randomElement(insertedInventory);
    newMaintenance.push({
      vehicleId: randomElement(insertedVehicles).id,
      type: randomElement(["Preventiva", "Corretiva"]),
      description: "Manutenção periódica / Reparo técnico",
      date: randomDate(40),
      status: randomElement(["completed", "completed", "scheduled"]),
      cost: parseFloat(randomFloat(10000, 500000)),
      mileage: randomNumber(1000, 150000),
      supplierId: randomElement(insertedSuppliers).id,
      partsUsed: [{
        inventoryItemId: randomInv.id,
        itemName: randomInv.name,
        quantity: randomNumber(1, 4),
        unitCost: randomInv.unitPrice
      }]
    });
  }
  await db.insert(maintenanceTable).values(newMaintenance);
  console.log("Inserted Maintenance");

  // Finance
  const newFinance = [];
  for(let i=0; i<30; i++) {
    newFinance.push({
      category: randomElement(["Combustível", "Manutenção", "Serviço", "Peças", "Portagens"]),
      description: "Despesa Operacional",
      amount: parseFloat(randomFloat(10000, 500000)),
      date: randomDate(60),
      vehicleId: randomElement(insertedVehicles).id,
      notes: "Registro financeiro automático."
    });
  }
  await db.insert(financeRecordsTable).values(newFinance);
  console.log("Inserted Finance");


  // Fuelings (Abastecimentos)
  const fuelStations = [
    "Sonangol Posto Central", "Pumangol Viana", "Sonangol Aeroporto",
    "Total Energies Luanda", "Pumangol Marginal", "Sonangol Cazenga",
    "Pumangol Kikolo", "TotalEnergies Benguela", "Sonangol Huambo"
  ];
  const newFuelings = [];
  for (let i = 0; i < 120; i++) {
    const vehicle = randomElement(insertedVehicles);
    const driver = randomElement(insertedDrivers);
    const fuelType = vehicle.fuelType === "diesel" ? "diesel" : "gasoline";
    const pricePerLiter = fuelType === "diesel"
      ? parseFloat(randomFloat(200, 220))   // AOA por litro (diesel)
      : parseFloat(randomFloat(300, 320));   // AOA por litro (gasolina)
    const liters = parseFloat(randomFloat(20, 80));
    newFuelings.push({
      vehicleId: vehicle.id,
      driverId: driver.id,
      date: randomDate(60),
      liters,
      pricePerLiter,
      totalCost: parseFloat((liters * pricePerLiter).toFixed(2)),
      mileage: randomNumber(5000, 180000),
      station: randomElement(fuelStations),
      notes: `Abastecimento de ${fuelType === "diesel" ? "gasóleo" : "gasolina"} - Viatura ${vehicle.plate}`,
    });
  }
  await db.insert(fuelingsTable).values(newFuelings);
  console.log("Inserted Fuelings (Abastecimentos): " + newFuelings.length);

  console.log("Database seeded successfully without external faker library!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seeding failed", e);
  process.exit(1);
});
