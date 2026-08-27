MATCH (s:Supplier {id: $supplierId})
MATCH (s)-[:SUPPLIES]->(c:Component)
MATCH path = (c)-[:USED_IN*0..5]->(p:Product)
WITH p, collect(distinct c.name) as affectedComponents, min(length(path)) as pathDepth
RETURN 
    p.sku as sku, 
    p.name as name, 
    p.price as price, 
    p.monthlyDemand as monthlyDemand,
    p.price * p.monthlyDemand as monthlyRevenueAtRisk,
    affectedComponents,
    pathDepth
ORDER BY monthlyRevenueAtRisk DESC
