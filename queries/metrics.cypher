CALL {
    MATCH (p:Product)
    RETURN count(p) AS products
}
CALL {
    MATCH (c:Component)
    RETURN count(c) AS components
}
CALL {
    MATCH (s:Supplier)
    RETURN count(s) AS suppliers
}
CALL {
    MATCH (f:Facility)
    RETURN count(f) AS facilities
}
CALL {
    OPTIONAL MATCH (hs:Supplier) WHERE hs.riskRating = 'HIGH'
    RETURN count(hs) AS highRiskSuppliers
}
CALL {
    OPTIONAL MATCH (hf:Facility) WHERE hf.riskRating = 'HIGH'
    RETURN count(hf) AS highRiskFacilities
}
RETURN products, components, suppliers, facilities, highRiskSuppliers, highRiskFacilities
