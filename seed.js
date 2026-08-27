const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.COGNODB_URI || 'bolt+s://localhost:7687';
const username = process.env.COGNODB_USERNAME || 'cognodb';
const password = process.env.COGNODB_PASSWORD || 'password';

console.log(`Connecting to CognoDB at: ${uri}`);

const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

const runSeed = async () => {
  const session = driver.session();
  try {
    console.log('Clearing database...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('Database cleared.');

    console.log('Inserting nodes (Products, Components, Suppliers, Facilities)...');
    
    // Create Products
    await session.run(`
      CREATE (p1:Product {sku: 'PRD-001', name: 'Quantum Phone', category: 'Consumer Electronics', price: 999.0, monthlyDemand: 15000})
      CREATE (p2:Product {sku: 'PRD-002', name: 'Vexa Tablet', category: 'Consumer Electronics', price: 699.0, monthlyDemand: 8000})
      CREATE (p3:Product {sku: 'PRD-003', name: 'Titan Server', category: 'Enterprise Hardware', price: 4999.0, monthlyDemand: 1200})
    `);

    // Create Components
    await session.run(`
      CREATE (c1:Component {id: 'CMP-001', name: 'OLED Screen', category: 'Display', cost: 120.0})
      CREATE (c2:Component {id: 'CMP-002', name: 'Mobile Processor', category: 'Semiconductor', cost: 80.0})
      CREATE (c3:Component {id: 'CMP-003', name: 'Phone Lithium Battery', category: 'Battery', cost: 25.0})
      CREATE (c4:Component {id: 'CMP-004', name: 'Mainboard Assembly', category: 'Assembly', cost: 150.0})
      CREATE (c5:Component {id: 'CMP-005', name: 'Mobile Chipset', category: 'Semiconductor', cost: 40.0})
      CREATE (c6:Component {id: 'CMP-006', name: 'LPDDR5 Memory Module', category: 'Memory', cost: 30.0})
      CREATE (c7:Component {id: 'CMP-007', name: 'Capacitor Pack', category: 'Passive', cost: 5.0})
      CREATE (c8:Component {id: 'CMP-008', name: 'LCD Screen', category: 'Display', cost: 70.0})
      CREATE (c9:Component {id: 'CMP-009', name: 'Tablet Lithium Battery', category: 'Battery', cost: 40.0})
      CREATE (c10:Component {id: 'CMP-010', name: 'Tablet Mainboard', category: 'Assembly', cost: 110.0})
      CREATE (c11:Component {id: 'CMP-011', name: 'Server Chassis', category: 'Enclosure', cost: 300.0})
      CREATE (c12:Component {id: 'CMP-012', name: 'Xeon Processor', category: 'Semiconductor', cost: 900.0})
      CREATE (c13:Component {id: 'CMP-013', name: 'Enterprise Memory', category: 'Memory', cost: 200.0})
      CREATE (c14:Component {id: 'CMP-014', name: 'Power Supply', category: 'Power', cost: 150.0})
      CREATE (c15:Component {id: 'CMP-015', name: 'Server Mainboard', category: 'Assembly', cost: 450.0})
      CREATE (c16:Component {id: 'CMP-016', name: 'Server Chipset', category: 'Semiconductor', cost: 120.0})
      CREATE (c17:Component {id: 'CMP-017', name: 'Server Capacitor Pack', category: 'Passive', cost: 15.0})
    `);

    // Create Suppliers
    await session.run(`
      CREATE (s1:Supplier {id: 'SUP-001', name: 'Apex Semiconductors', country: 'Taiwan', riskRating: 'HIGH'})
      CREATE (s2:Supplier {id: 'SUP-002', name: 'Global Display Systems', country: 'South Korea', riskRating: 'LOW'})
      CREATE (s3:Supplier {id: 'SUP-003', name: 'Shenzhen Display Corp', country: 'China', riskRating: 'MEDIUM'})
      CREATE (s4:Supplier {id: 'SUP-004', name: 'Silicon Foundry Inc', country: 'USA', riskRating: 'LOW'})
      CREATE (s5:Supplier {id: 'SUP-005', name: 'EuroChip AG', country: 'Germany', riskRating: 'MEDIUM'})
      CREATE (s6:Supplier {id: 'SUP-006', name: 'Nova Components', country: 'China', riskRating: 'HIGH'})
      CREATE (s7:Supplier {id: 'SUP-007', name: 'Pacific Components', country: 'USA', riskRating: 'LOW'})
      CREATE (s8:Supplier {id: 'SUP-008', name: 'Baltic Electronics', country: 'Estonia', riskRating: 'MEDIUM'})
      CREATE (s9:Supplier {id: 'SUP-009', name: 'PowerCell Solutions', country: 'Japan', riskRating: 'LOW'})
      CREATE (s10:Supplier {id: 'SUP-010', name: 'Intel Corp', country: 'USA', riskRating: 'LOW'})
      CREATE (s11:Supplier {id: 'SUP-011', name: 'ChassisCorp', country: 'Mexico', riskRating: 'LOW'})
      CREATE (s12:Supplier {id: 'SUP-012', name: 'Redundant Power Inc', country: 'Canada', riskRating: 'LOW'})
    `);

    // Create Facilities with riskRating
    await session.run(`
      CREATE (f1:Facility {id: 'FAC-001', name: 'Hsinchu Fabrication Plant', city: 'Hsinchu', country: 'Taiwan', riskRating: 'HIGH'})
      CREATE (f2:Facility {id: 'FAC-002', name: 'Shenzhen Assembly Plant', city: 'Shenzhen', country: 'China', riskRating: 'HIGH'})
      CREATE (f3:Facility {id: 'FAC-003', name: 'Osaka Battery Works', city: 'Osaka', country: 'Japan', riskRating: 'LOW'})
      CREATE (f4:Facility {id: 'FAC-004', name: 'Oregon Fab 20', city: 'Hillsboro', country: 'USA', riskRating: 'LOW'})
      CREATE (f5:Facility {id: 'FAC-005', name: 'Austin Semiconductor', city: 'Austin', country: 'USA', riskRating: 'LOW'})
      CREATE (f6:Facility {id: 'FAC-006', name: 'Dresden Fab', city: 'Dresden', country: 'Germany', riskRating: 'MEDIUM'})
      CREATE (f7:Facility {id: 'FAC-007', name: 'Seoul Display Plant', city: 'Seoul', country: 'South Korea', riskRating: 'LOW'})
      CREATE (f8:Facility {id: 'FAC-008', name: 'Monterrey Sheet Metal', city: 'Monterrey', country: 'Mexico', riskRating: 'LOW'})
      CREATE (f9:Facility {id: 'FAC-009', name: 'Toronto PSU Assembly', city: 'Toronto', country: 'Canada', riskRating: 'LOW'})
    `);

    console.log('Creating relationships (USED_IN)...');
    
    // Quantum Phone (PRD-001) BOM
    await session.run(`
      MATCH (c1:Component {id: 'CMP-001'}), (p1:Product {sku: 'PRD-001'}) CREATE (c1)-[:USED_IN {quantity: 1.0}]->(p1)
      MATCH (c2:Component {id: 'CMP-002'}), (p1:Product {sku: 'PRD-001'}) CREATE (c2)-[:USED_IN {quantity: 1.0}]->(p1)
      MATCH (c3:Component {id: 'CMP-003'}), (p1:Product {sku: 'PRD-001'}) CREATE (c3)-[:USED_IN {quantity: 1.0}]->(p1)
      MATCH (c4:Component {id: 'CMP-004'}), (p1:Product {sku: 'PRD-001'}) CREATE (c4)-[:USED_IN {quantity: 1.0}]->(p1)

      MATCH (c5:Component {id: 'CMP-005'}), (c4:Component {id: 'CMP-004'}) CREATE (c5)-[:USED_IN {quantity: 1.0}]->(c4)
      MATCH (c6:Component {id: 'CMP-006'}), (c4:Component {id: 'CMP-004'}) CREATE (c6)-[:USED_IN {quantity: 2.0}]->(c4)
      MATCH (c7:Component {id: 'CMP-007'}), (c4:Component {id: 'CMP-004'}) CREATE (c7)-[:USED_IN {quantity: 10.0}]->(c4)
    `);

    // Vexa Tablet (PRD-002) BOM
    await session.run(`
      MATCH (c8:Component {id: 'CMP-008'}), (p2:Product {sku: 'PRD-002'}) CREATE (c8)-[:USED_IN {quantity: 1.0}]->(p2)
      MATCH (c2:Component {id: 'CMP-002'}), (p2:Product {sku: 'PRD-002'}) CREATE (c2)-[:USED_IN {quantity: 1.0}]->(p2)
      MATCH (c9:Component {id: 'CMP-009'}), (p2:Product {sku: 'PRD-002'}) CREATE (c9)-[:USED_IN {quantity: 1.0}]->(p2)
      MATCH (c10:Component {id: 'CMP-010'}), (p2:Product {sku: 'PRD-002'}) CREATE (c10)-[:USED_IN {quantity: 1.0}]->(p2)

      MATCH (c5:Component {id: 'CMP-005'}), (c10:Component {id: 'CMP-010'}) CREATE (c5)-[:USED_IN {quantity: 1.0}]->(c10)
      MATCH (c6:Component {id: 'CMP-006'}), (c10:Component {id: 'CMP-010'}) CREATE (c6)-[:USED_IN {quantity: 1.0}]->(c10)
      MATCH (c7:Component {id: 'CMP-007'}), (c10:Component {id: 'CMP-010'}) CREATE (c7)-[:USED_IN {quantity: 5.0}]->(c10)
    `);

    // Titan Server (PRD-003) BOM
    await session.run(`
      MATCH (c11:Component {id: 'CMP-011'}), (p3:Product {sku: 'PRD-003'}) CREATE (c11)-[:USED_IN {quantity: 1.0}]->(p3)
      MATCH (c12:Component {id: 'CMP-012'}), (p3:Product {sku: 'PRD-003'}) CREATE (c12)-[:USED_IN {quantity: 2.0}]->(p3)
      MATCH (c13:Component {id: 'CMP-013'}), (p3:Product {sku: 'PRD-003'}) CREATE (c13)-[:USED_IN {quantity: 8.0}]->(p3)
      MATCH (c14:Component {id: 'CMP-014'}), (p3:Product {sku: 'PRD-003'}) CREATE (c14)-[:USED_IN {quantity: 2.0}]->(p3)
      MATCH (c15:Component {id: 'CMP-015'}), (p3:Product {sku: 'PRD-003'}) CREATE (c15)-[:USED_IN {quantity: 1.0}]->(p3)

      MATCH (c16:Component {id: 'CMP-016'}), (c15:Component {id: 'CMP-015'}) CREATE (c16)-[:USED_IN {quantity: 2.0}]->(c15)
      MATCH (c17:Component {id: 'CMP-017'}), (c15:Component {id: 'CMP-015'}) CREATE (c17)-[:USED_IN {quantity: 20.0}]->(c15)
    `);

    console.log('Creating relationships (OPERATES, PRODUCED_AT, SUPPLIES)...');
    
    // OPERATES relationships
    await session.run(`
      MATCH (s1:Supplier {id: 'SUP-001'}), (f1:Facility {id: 'FAC-001'}) CREATE (s1)-[:OPERATES]->(f1)
      MATCH (s6:Supplier {id: 'SUP-006'}), (f2:Facility {id: 'FAC-002'}) CREATE (s6)-[:OPERATES]->(f2)
      MATCH (s9:Supplier {id: 'SUP-009'}), (f3:Facility {id: 'FAC-003'}) CREATE (s9)-[:OPERATES]->(f3)
      MATCH (s10:Supplier {id: 'SUP-010'}), (f4:Facility {id: 'FAC-004'}) CREATE (s10)-[:OPERATES]->(f4)
      MATCH (s4:Supplier {id: 'SUP-004'}), (f5:Facility {id: 'FAC-005'}) CREATE (s4)-[:OPERATES]->(f5)
      MATCH (s5:Supplier {id: 'SUP-005'}), (f6:Facility {id: 'FAC-006'}) CREATE (s5)-[:OPERATES]->(f6)
      MATCH (s2:Supplier {id: 'SUP-002'}), (f7:Facility {id: 'FAC-007'}) CREATE (s2)-[:OPERATES]->(f7)
      MATCH (s11:Supplier {id: 'SUP-011'}), (f8:Facility {id: 'FAC-008'}) CREATE (s11)-[:OPERATES]->(f8)
      MATCH (s12:Supplier {id: 'SUP-012'}), (f9:Facility {id: 'FAC-009'}) CREATE (s12)-[:OPERATES]->(f9)
    `);

    // PRODUCED_AT relationships
    await session.run(`
      MATCH (c1:Component {id: 'CMP-001'}), (f1:Facility {id: 'FAC-001'}) CREATE (c1)-[:PRODUCED_AT]->(f1)
      MATCH (c2:Component {id: 'CMP-002'}), (f1:Facility {id: 'FAC-001'}) CREATE (c2)-[:PRODUCED_AT]->(f1)
      MATCH (c3:Component {id: 'CMP-003'}), (f3:Facility {id: 'FAC-003'}) CREATE (c3)-[:PRODUCED_AT]->(f3)
      MATCH (c6:Component {id: 'CMP-006'}), (f2:Facility {id: 'FAC-002'}) CREATE (c6)-[:PRODUCED_AT]->(f2)
      MATCH (c12:Component {id: 'CMP-012'}), (f4:Facility {id: 'FAC-004'}) CREATE (c12)-[:PRODUCED_AT]->(f4)
      MATCH (c11:Component {id: 'CMP-011'}), (f8:Facility {id: 'FAC-008'}) CREATE (c11)-[:PRODUCED_AT]->(f8)
      MATCH (c14:Component {id: 'CMP-014'}), (f9:Facility {id: 'FAC-009'}) CREATE (c14)-[:PRODUCED_AT]->(f9)
    `);

    // SUPPLIES relationships
    await session.run(`
      // OLED Screen (CMP-001) suppliers
      MATCH (s1:Supplier {id: 'SUP-001'}), (c1:Component {id: 'CMP-001'}) CREATE (s1)-[:SUPPLIES {price: 120.0, leadTimeDays: 15, capacity: 20000}]->(c1)
      MATCH (s2:Supplier {id: 'SUP-002'}), (c1:Component {id: 'CMP-001'}) CREATE (s2)-[:SUPPLIES {price: 135.0, leadTimeDays: 10, capacity: 30000}]->(c1)
      MATCH (s3:Supplier {id: 'SUP-003'}), (c1:Component {id: 'CMP-001'}) CREATE (s3)-[:SUPPLIES {price: 115.0, leadTimeDays: 20, capacity: 10000}]->(c1)

      // Mobile Processor (CMP-002) suppliers
      MATCH (s1:Supplier {id: 'SUP-001'}), (c2:Component {id: 'CMP-002'}) CREATE (s1)-[:SUPPLIES {price: 80.0, leadTimeDays: 12, capacity: 25000}]->(c2)
      MATCH (s4:Supplier {id: 'SUP-004'}), (c2:Component {id: 'CMP-002'}) CREATE (s4)-[:SUPPLIES {price: 95.0, leadTimeDays: 8, capacity: 40000}]->(c2)
      MATCH (s5:Supplier {id: 'SUP-005'}), (c2:Component {id: 'CMP-002'}) CREATE (s5)-[:SUPPLIES {price: 88.0, leadTimeDays: 14, capacity: 15000}]->(c2)

      // Lithium Battery (CMP-003) suppliers
      MATCH (s9:Supplier {id: 'SUP-009'}), (c3:Component {id: 'CMP-003'}) CREATE (s9)-[:SUPPLIES {price: 25.0, leadTimeDays: 10, capacity: 25000}]->(c3)

      // Memory Module (CMP-006) suppliers
      MATCH (s6:Supplier {id: 'SUP-006'}), (c6:Component {id: 'CMP-006'}) CREATE (s6)-[:SUPPLIES {price: 30.0, leadTimeDays: 25, capacity: 35000}]->(c6)
      MATCH (s7:Supplier {id: 'SUP-007'}), (c6:Component {id: 'CMP-006'}) CREATE (s7)-[:SUPPLIES {price: 32.0, leadTimeDays: 15, capacity: 50000}]->(c6)
      MATCH (s8:Supplier {id: 'SUP-008'}), (c6:Component {id: 'CMP-006'}) CREATE (s8)-[:SUPPLIES {price: 29.0, leadTimeDays: 30, capacity: 20000}]->(c6)

      // Xeon Processor (CMP-012) suppliers
      MATCH (s10:Supplier {id: 'SUP-010'}), (c12:Component {id: 'CMP-012'}) CREATE (s10)-[:SUPPLIES {price: 900.0, leadTimeDays: 5, capacity: 5000}]->(c12)

      // Server Chassis (CMP-011) suppliers
      MATCH (s11:Supplier {id: 'SUP-011'}), (c11:Component {id: 'CMP-011'}) CREATE (s11)-[:SUPPLIES {price: 300.0, leadTimeDays: 12, capacity: 2000}]->(c11)

      // Server Power Supply (CMP-014) suppliers
      MATCH (s12:Supplier {id: 'SUP-012'}), (c14:Component {id: 'CMP-014'}) CREATE (s12)-[:SUPPLIES {price: 150.0, leadTimeDays: 10, capacity: 4000}]->(c14)
    `);

    // Standard components defaults/backups (Mobile Chipset, Capacitor Pack, LCD Screen, Tablet Battery, etc.)
    await session.run(`
      CREATE (s_c5:Supplier {id: 'SUP-105', name: 'CoreChips Ltd', country: 'Singapore', riskRating: 'LOW'})
      WITH s_c5
      MATCH (f5:Facility {id: 'FAC-005'}) CREATE (s_c5)-[:OPERATES]->(f5)
      WITH s_c5
      MATCH (c5:Component {id: 'CMP-005'}) CREATE (s_c5)-[:SUPPLIES {price: 40.0, leadTimeDays: 7, capacity: 50000}]->(c5)
    `);

    await session.run(`
      CREATE (s_c7:Supplier {id: 'SUP-107', name: 'CapCo Industries', country: 'Japan', riskRating: 'LOW'})
      CREATE (f_c7:Facility {id: 'FAC-107', name: 'Nagoya Passive Works', city: 'Nagoya', country: 'Japan', riskRating: 'LOW'})
      CREATE (s_c7)-[:OPERATES]->(f_c7)
      WITH s_c7, f_c7
      MATCH (c7:Component {id: 'CMP-007'}) CREATE (c7)-[:PRODUCED_AT]->(f_c7)
      CREATE (s_c7)-[:SUPPLIES {price: 5.0, leadTimeDays: 5, capacity: 500000}]->(c7)
    `);

    await session.run(`
      MATCH (s2:Supplier {id: 'SUP-002'}), (c8:Component {id: 'CMP-008'}) CREATE (s2)-[:SUPPLIES {price: 70.0, leadTimeDays: 12, capacity: 15000}]->(c8)
      MATCH (s9:Supplier {id: 'SUP-009'}), (c9:Component {id: 'CMP-009'}) CREATE (s9)-[:SUPPLIES {price: 40.0, leadTimeDays: 12, capacity: 15000}]->(c9)
    `);

    await session.run(`
      CREATE (s_c16:Supplier {id: 'SUP-116', name: 'Enterprise Semiconductors', country: 'USA', riskRating: 'LOW'})
      WITH s_c16
      MATCH (c16:Component {id: 'CMP-016'}) CREATE (s_c16)-[:SUPPLIES {price: 120.0, leadTimeDays: 8, capacity: 10000}]->(c16)
    `);

    await session.run(`
      MATCH (s_c7:Supplier {id: 'SUP-107'}), (c17:Component {id: 'CMP-017'}) CREATE (s_c7)-[:SUPPLIES {price: 15.0, leadTimeDays: 6, capacity: 100000}]->(c17)
    `);

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await session.close();
    await driver.close();
  }
};

runSeed();
