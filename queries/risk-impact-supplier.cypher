MATCH (s:Supplier {id: $supplierId})
MATCH (s)-[:SUPPLIES]->(c:Component)
MATCH path = (c)-[:USED_IN*0..5]->(p:Product)
WITH p, path, [n IN nodes(path) WHERE n:Component | n.name] as pathComponents
UNWIND pathComponents as compName
WITH p, min(length(path)) as pathDepth, collect(distinct compName) as affectedComponents
RETURN 
    p.sku as sku, 
    p.name as name, 
    p.price as price, 
    p.monthlyDemand as monthlyDemand,
    p.price * p.monthlyDemand as monthlyRevenueAtRisk,
    affectedComponents,
    pathDepth
ORDER BY monthlyRevenueAtRisk DESC
