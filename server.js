const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to CognoDB
const uri = process.env.COGNODB_URI || 'bolt+s://localhost:7687';
const username = process.env.COGNODB_USERNAME || 'cognodb';
const password = process.env.COGNODB_PASSWORD || 'password';

console.log(`Connecting driver to CognoDB at: ${uri}`);
const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));

// Verify database connection on startup
driver.verifyConnectivity()
  .then(() => console.log('Successfully connected to CognoDB!'))
  .catch(err => {
    console.error('CRITICAL ERROR: Could not connect to CognoDB!', err);
    console.log('Ensure your credentials in .env are correct and the instance is active.');
  });

// Health Check / Connection Endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    await driver.verifyConnectivity();
    res.json({ status: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'disconnected', error: err.message });
  }
});

// Load Cypher queries
const loadQuery = (filename) => {
  const filePath = path.join(__dirname, 'queries', filename);
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (err) {
    console.error(`Error loading query file ${filename}:`, err);
    return null;
  }
};

const queryMetrics = loadQuery('metrics.cypher');
const queryBom = loadQuery('bom.cypher');
const queryRiskSupplier = loadQuery('risk-impact-supplier.cypher');
const queryRiskFacility = loadQuery('risk-impact-facility.cypher');
const queryAlternatives = loadQuery('alternatives.cypher');

// Health Check / Connection Endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    await driver.verifyConnectivity();
    res.json({ status: 'connected', uri });
  } catch (err) {
    res.status(500).json({ status: 'disconnected', error: err.message });
  }
});

// 1. Dashboard Metrics Endpoint
app.get('/api/metrics', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(queryMetrics);
    if (result.records.length > 0) {
      const rec = result.records[0];
      res.json({
        products: rec.get('products').toNumber(),
        components: rec.get('components').toNumber(),
        suppliers: rec.get('suppliers').toNumber(),
        facilities: rec.get('facilities').toNumber(),
        highRiskSuppliers: rec.get('highRiskSuppliers').toNumber(),
        highRiskFacilities: rec.get('highRiskFacilities').toNumber()
      });
    } else {
      res.status(404).json({ error: 'No metrics returned' });
    }
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 2. Product Catalog List
app.get('/api/products', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run('MATCH (p:Product) RETURN p ORDER BY p.sku ASC');
    const products = result.records.map(r => r.get('p').properties);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 3. Supplier Directory
app.get('/api/suppliers', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run('MATCH (s:Supplier) RETURN s ORDER BY s.id ASC');
    const suppliers = result.records.map(r => r.get('s').properties);
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 4. Facility Directory
app.get('/api/facilities', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run('MATCH (f:Facility) RETURN f ORDER BY f.id ASC');
    const facilities = result.records.map(r => r.get('f').properties);
    res.json(facilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 5. BOM Explorer Endpoint (Multiplicative Calculations)
app.get('/api/bom/:sku', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(queryBom, { sku: req.params.sku });
    const bomItems = result.records.map(r => {
      const quantities = r.get('quantities').map(q => parseFloat(q));
      // Calculate multiplicative quantity per final product
      const requiredQuantityPerProduct = quantities.reduce((a, b) => a * b, 1);
      
      return {
        componentId: r.get('componentId'),
        componentName: r.get('componentName'),
        category: r.get('category'),
        cost: r.get('cost').toNumber ? r.get('cost').toNumber() : r.get('cost'),
        supplierId: r.get('supplierId'),
        supplierName: r.get('supplierName'),
        supplierRisk: r.get('supplierRisk'),
        quantities,
        depth: r.get('depth').toNumber ? r.get('depth').toNumber() : r.get('depth'),
        requiredQuantityPerProduct
      };
    });
    res.json(bomItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// Helper: Calculate monthly required volume for a component across all products
const getRequiredComponentVolume = async (session, componentId) => {
  const q = `
    MATCH path = (c:Component {id: $componentId})-[:USED_IN*1..5]->(p:Product)
    RETURN p.sku as productSku, p.monthlyDemand as monthlyDemand, [r IN relationships(path) | r.quantity] as quantities
  `;
  const res = await session.run(q, { componentId });
  let totalVolume = 0;
  res.records.forEach(r => {
    const demand = r.get('monthlyDemand').toNumber ? r.get('monthlyDemand').toNumber() : r.get('monthlyDemand');
    const quantities = r.get('quantities').map(q => parseFloat(q));
    const multiplier = quantities.reduce((a, b) => a * b, 1);
    totalVolume += demand * multiplier;
  });
  return totalVolume;
};

// Helper: Determine Risk Severity
const getRiskSeverity = (revenueRisk) => {
  if (revenueRisk < 250000) return 'LOW';
  if (revenueRisk < 1000000) return 'MEDIUM';
  if (revenueRisk < 3000000) return 'HIGH';
  return 'CRITICAL';
};

// Helper: Score Alternatives (4-factor weighted score)
const scoreAlternatives = (alternatives, requiredVolume) => {
  if (!alternatives || alternatives.length === 0) return [];
  
  // Find min prices and min lead times for normalization
  const minPrice = Math.min(...alternatives.map(a => a.price));
  const minLeadTime = Math.min(...alternatives.map(a => a.leadTimeDays));
  
  return alternatives.map(alt => {
    // 1. Risk Score (40%)
    let riskScore = 0;
    if (alt.riskRating === 'LOW') riskScore = 100;
    else if (alt.riskRating === 'MEDIUM') riskScore = 60;
    
    // 2. Capacity Score (25%)
    const capacityScore = alt.capacity >= requiredVolume ? 100 : 20;
    
    // 3. Price Score (20%)
    const priceScore = alt.price > 0 ? (minPrice / alt.price) * 100 : 0;
    
    // 4. Lead Time Score (15%)
    const leadTimeScore = alt.leadTimeDays > 0 ? (minLeadTime / alt.leadTimeDays) * 100 : 0;
    
    // Weighted average
    const resilienceScore = Math.round(
      0.40 * riskScore + 
      0.25 * capacityScore + 
      0.20 * priceScore + 
      0.15 * leadTimeScore
    );
    
    return {
      ...alt,
      requiredVolume,
      capacityFit: alt.capacity >= requiredVolume,
      resilienceScore
    };
  }).sort((a, b) => b.resilienceScore - a.resilienceScore);
};

// 6. Disruption Simulator Endpoint (Centerpiece)
app.post('/api/simulate', async (req, res) => {
  const { type, id } = req.body;
  const session = driver.session();
  try {
    let name = '';
    let dbProducts = [];
    
    // Get Disruption Source Name
    if (type === 'SUPPLIER') {
      const sResult = await session.run('MATCH (s:Supplier {id: $id}) RETURN s.name as name', { id });
      if (sResult.records.length > 0) name = sResult.records[0].get('name');
      
      const impactResult = await session.run(queryRiskSupplier, { supplierId: id });
      dbProducts = impactResult.records.map(r => ({
        sku: r.get('sku'),
        name: r.get('name'),
        price: r.get('price').toNumber ? r.get('price').toNumber() : r.get('price'),
        monthlyDemand: r.get('monthlyDemand').toNumber ? r.get('monthlyDemand').toNumber() : r.get('monthlyDemand'),
        monthlyRevenueAtRisk: r.get('monthlyRevenueAtRisk').toNumber ? r.get('monthlyRevenueAtRisk').toNumber() : r.get('monthlyRevenueAtRisk'),
        affectedComponents: r.get('affectedComponents'),
        pathDepth: r.get('pathDepth').toNumber ? r.get('pathDepth').toNumber() : r.get('pathDepth')
      }));
    } else if (type === 'FACILITY') {
      const fResult = await session.run('MATCH (f:Facility {id: $id}) RETURN f.name as name', { id });
      if (fResult.records.length > 0) name = fResult.records[0].get('name');
      
      const impactResult = await session.run(queryRiskFacility, { facilityId: id });
      dbProducts = impactResult.records.map(r => ({
        sku: r.get('sku'),
        name: r.get('name'),
        price: r.get('price').toNumber ? r.get('price').toNumber() : r.get('price'),
        monthlyDemand: r.get('monthlyDemand').toNumber ? r.get('monthlyDemand').toNumber() : r.get('monthlyDemand'),
        monthlyRevenueAtRisk: r.get('monthlyRevenueAtRisk').toNumber ? r.get('monthlyRevenueAtRisk').toNumber() : r.get('monthlyRevenueAtRisk'),
        affectedComponents: r.get('affectedComponents'),
        pathDepth: r.get('pathDepth').toNumber ? r.get('pathDepth').toNumber() : r.get('pathDepth')
      }));
    } else {
      return res.status(400).json({ error: 'Invalid disruption type' });
    }

    // Extract unique affected components
    const componentSet = new Set();
    dbProducts.forEach(p => p.affectedComponents.forEach(c => componentSet.add(c)));
    const affectedComponentsList = Array.from(componentSet);
    
    // Find all facilities that produce any of these affected components and count high-risk ones
    let highRiskFacilitiesCount = 0;
    let affectedFacilitiesCount = 0;
    if (affectedComponentsList.length > 0) {
      const facResult = await session.run(`
        MATCH (c:Component)-[:PRODUCED_AT]->(f:Facility)
        WHERE c.name IN $componentNames
        RETURN count(f) as total, sum(case when f.riskRating = 'HIGH' then 1 else 0 end) as highRisk
      `, { componentNames: affectedComponentsList });
      if (facResult.records.length > 0) {
        affectedFacilitiesCount = facResult.records[0].get('total').toNumber();
        highRiskFacilitiesCount = facResult.records[0].get('highRisk').toNumber();
      }
    }

    // Sum Monthly Revenue at Risk (preventing double-counting by summing unique products)
    const monthlyRevenueAtRisk = dbProducts.reduce((sum, p) => sum + p.monthlyRevenueAtRisk, 0);
    const riskSeverity = getRiskSeverity(monthlyRevenueAtRisk);

    // Get direct components supplied by this disrupted entity to look up alternatives
    let directComponentsResult;
    if (type === 'SUPPLIER') {
      directComponentsResult = await session.run(`
        MATCH (s:Supplier {id: $id})-[r:SUPPLIES]->(c:Component)
        RETURN c.id as id, c.name as name
      `, { id });
    } else {
      directComponentsResult = await session.run(`
        MATCH (f:Facility {id: $id})<-[:PRODUCED_AT]-(c:Component)
        OPTIONAL MATCH (s:Supplier)-[:SUPPLIES]->(c)
        RETURN c.id as id, c.name as name, s.id as currentSupplierId
      `, { id });
    }

    const directComponents = directComponentsResult.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      currentSupplierId: type === 'SUPPLIER' ? id : r.get('currentSupplierId')
    }));

    // Find and score alternatives for each direct component
    const alternativesData = [];
    for (const comp of directComponents) {
      if (!comp.currentSupplierId) continue;
      
      const reqVol = await getRequiredComponentVolume(session, comp.id);
      const altResult = await session.run(queryAlternatives, { 
        componentId: comp.id, 
        currentSupplierId: comp.currentSupplierId 
      });
      
      const rawAlts = altResult.records.map(r => ({
        id: r.get('id'),
        name: r.get('name'),
        riskRating: r.get('riskRating'),
        country: r.get('country'),
        price: r.get('price').toNumber ? r.get('price').toNumber() : r.get('price'),
        leadTimeDays: r.get('leadTimeDays').toNumber ? r.get('leadTimeDays').toNumber() : r.get('leadTimeDays'),
        capacity: r.get('capacity').toNumber ? r.get('capacity').toNumber() : r.get('capacity')
      }));
      
      const scoredAlts = scoreAlternatives(rawAlts, reqVol);
      
      alternativesData.push({
        componentId: comp.id,
        componentName: comp.name,
        requiredMonthlyVolume: reqVol,
        alternatives: scoredAlts
      });
    }

    res.json({
      disruption: { type, id, name },
      metrics: {
        affectedComponents: affectedComponentsList.length,
        affectedProducts: dbProducts.length,
        affectedFacilities: affectedFacilitiesCount + (type === 'FACILITY' ? 1 : 0),
        highRiskFacilities: highRiskFacilitiesCount + (type === 'FACILITY' && riskSeverity === 'HIGH' ? 1 : 0), // Adjust if facility itself is high risk
        monthlyRevenueAtRisk,
        riskSeverity
      },
      products: dbProducts,
      affectedComponents: affectedComponentsList,
      alternatives: alternativesData
    });
  } catch (err) {
    console.error('Error running disruption simulation:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 7. Graph data for specific product SKU
app.get('/api/graph/product/:sku', async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (p:Product {sku: $sku})
      MATCH path = (c:Component)-[:USED_IN*1..5]->(p)
      OPTIONAL MATCH (s:Supplier)-[:SUPPLIES]->(c)
      OPTIONAL MATCH (c)-[:PRODUCED_AT]->(f:Facility)
      RETURN path, s, f, p
    `, { sku: req.params.sku });

    const nodesMap = new Map();
    const edgesMap = new Map();

    result.records.forEach(record => {
      const path = record.get('path');
      const s = record.get('s');
      const f = record.get('f');
      const p = record.get('p');

      // Add product node
      if (p) {
        nodesMap.set(p.properties.sku, {
          id: p.properties.sku,
          label: p.properties.name,
          type: 'Product',
          title: `SKU: ${p.properties.sku}<br>Price: $${p.properties.price}<br>Demand: ${p.properties.monthlyDemand}/mo`
        });
      }

      // Add path nodes & edges
      if (path) {
        path.segments.forEach(seg => {
          const start = seg.start;
          const end = seg.end;
          const rel = seg.relationship;

          nodesMap.set(start.properties.id, {
            id: start.properties.id,
            label: start.properties.name,
            type: start.labels[0],
            title: `ID: ${start.properties.id}<br>Category: ${start.properties.category}<br>Cost: $${start.properties.cost}`
          });

          nodesMap.set(end.properties.id || end.properties.sku, {
            id: end.properties.id || end.properties.sku,
            label: end.properties.name,
            type: end.labels[0],
            title: end.labels[0] === 'Product' 
              ? `SKU: ${end.properties.sku}<br>Price: $${end.properties.price}<br>Demand: ${end.properties.monthlyDemand}/mo`
              : `ID: ${end.properties.id}<br>Category: ${end.properties.category}<br>Cost: $${end.properties.cost}`
          });

          const edgeId = `${rel.elementId || rel.identity.toString()}`;
          edgesMap.set(edgeId, {
            id: edgeId,
            from: start.properties.id,
            to: end.properties.id || end.properties.sku,
            label: `USED_IN (${rel.properties.quantity})`,
            title: `Quantity: ${rel.properties.quantity}`
          });
        });
      }

      // Add Supplier links
      if (s) {
        nodesMap.set(s.properties.id, {
          id: s.properties.id,
          label: s.properties.name,
          type: 'Supplier',
          title: `ID: ${s.properties.id}<br>Risk: ${s.properties.riskRating}<br>Country: ${s.properties.country}`
        });

        // Link supplier to component
        const compId = path.start.properties.id;
        const suppliesEdgeId = `supplies_${s.properties.id}_${compId}`;
        edgesMap.set(suppliesEdgeId, {
          id: suppliesEdgeId,
          from: s.properties.id,
          to: compId,
          label: 'SUPPLIES',
          dashes: true
        });
      }

      // Add Facility links
      if (f) {
        nodesMap.set(f.properties.id, {
          id: f.properties.id,
          label: f.properties.name,
          type: 'Facility',
          title: `ID: ${f.properties.id}<br>Risk: ${f.properties.riskRating}<br>City: ${f.properties.city}, ${f.properties.country}`
        });

        const compId = path.start.properties.id;
        const producedEdgeId = `produced_${compId}_${f.properties.id}`;
        edgesMap.set(producedEdgeId, {
          id: producedEdgeId,
          from: compId,
          to: f.properties.id,
          label: 'PRODUCED_AT',
          dashes: true
        });
      }
    });

    res.json({
      nodes: Array.from(nodesMap.values()),
      edges: Array.from(edgesMap.values())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// 8. Visual highlighting path for simulations
app.get('/api/graph/disruption/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const session = driver.session();
  try {
    let result;
    if (type === 'SUPPLIER') {
      result = await session.run(`
        MATCH (s:Supplier {id: $id})
        OPTIONAL MATCH (s)-[:OPERATES]->(f:Facility)
        OPTIONAL MATCH (s)-[:SUPPLIES]->(c:Component)
        OPTIONAL MATCH path = (c)-[:USED_IN*0..5]->(p:Product)
        RETURN s, f, c, path
      `, { id });
    } else {
      result = await session.run(`
        MATCH (f:Facility {id: $id})
        OPTIONAL MATCH (s:Supplier)-[:OPERATES]->(f)
        OPTIONAL MATCH (c:Component)-[:PRODUCED_AT]->(f)
        OPTIONAL MATCH path = (c)-[:USED_IN*0..5]->(p:Product)
        RETURN s, f, c, path
      `, { id });
    }

    const affectedNodeIds = new Set();
    const affectedEdgeIds = new Set();

    result.records.forEach(r => {
      const s = r.get('s');
      const f = r.get('f');
      const c = r.get('c');
      const path = r.get('path');

      if (s) affectedNodeIds.add(s.properties.id);
      if (f) affectedNodeIds.add(f.properties.id);
      if (c) affectedNodeIds.add(c.properties.id);

      if (s && f) {
        affectedEdgeIds.add(`operates_${s.properties.id}_${f.properties.id}`);
        // fallback matching standard ids
        affectedEdgeIds.add(`operates_${f.properties.id}_${s.properties.id}`);
      }

      if (s && c) {
        affectedEdgeIds.add(`supplies_${s.properties.id}_${c.properties.id}`);
      }

      if (c && f) {
        affectedEdgeIds.add(`produced_${c.properties.id}_${f.properties.id}`);
      }

      if (path) {
        path.segments.forEach(seg => {
          affectedNodeIds.add(seg.start.properties.id);
          affectedNodeIds.add(seg.end.properties.id || seg.end.properties.sku);
          
          const rel = seg.relationship;
          affectedEdgeIds.add(`${rel.elementId || rel.identity.toString()}`);
        });
      }
    });

    res.json({
      nodeIds: Array.from(affectedNodeIds),
      edgeIds: Array.from(affectedEdgeIds)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// Boot Server
app.listen(PORT, () => {
  console.log(`ChainGuard server is running at http://localhost:${PORT}`);
});
