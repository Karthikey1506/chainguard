MATCH (f:Facility {id: $facilityId})
MATCH (c:Component)-[:PRODUCED_AT]->(f)
MATCH path = (c)-[:USED_IN*0..5]->(p:Product)
WITH p, path, [n IN nodes(path) WHERE n:Component | n.name] as pathComponents, f
UNWIND pathComponents as compName
WITH p, min(length(path)) as pathDepth, collect(distinct compName) as affectedComponents, f
RETURN 
    p.sku as sku, 
    p.name as name, 
    p.price as price, 
    p.monthlyDemand as monthlyDemand,
    p.price * p.monthlyDemand as monthlyRevenueAtRisk,
    f.name as facilityName,
    f.riskRating as facilityRisk,
    affectedComponents,
    pathDepth
ORDER BY monthlyRevenueAtRisk DESC
