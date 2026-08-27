MATCH (p:Product {sku: $sku})
MATCH path = (c:Component)-[:USED_IN*1..5]->(p)
OPTIONAL MATCH (s:Supplier)-[:SUPPLIES]->(c)
RETURN 
    c.id AS componentId,
    c.name AS componentName,
    c.category AS category,
    c.cost AS cost,
    s.id AS supplierId,
    s.name AS supplierName,
    s.riskRating AS supplierRisk,
    [r IN relationships(path) | r.quantity] AS quantities,
    length(path) AS depth
ORDER BY depth ASC
