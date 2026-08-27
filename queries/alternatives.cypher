MATCH (c:Component {id: $componentId})
MATCH (alt:Supplier)-[r:SUPPLIES]->(c)
WHERE alt.id <> $currentSupplierId
  AND alt.riskRating IN ['LOW', 'MEDIUM']
RETURN 
    alt.id as id,
    alt.name as name,
    alt.riskRating as riskRating,
    alt.country as country,
    r.price as price,
    r.leadTimeDays as leadTimeDays,
    r.capacity as capacity
