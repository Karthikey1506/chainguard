# ChainGuard

ChainGuard is a supply chain risk analysis project I built using **CognoDB, Express.js, Node.js, and JavaScript**.

The idea behind the project is simple: if one supplier or manufacturing facility goes down, how can we quickly find out which products will be affected and how much revenue could be at risk?

I used a graph database to model the relationships between suppliers, facilities, components, and products. This makes it possible to follow a component through multiple levels of a product's BOM and see the possible downstream impact of a disruption.

## What ChainGuard Does

The application currently supports:

* Viewing suppliers, facilities, components, and products
* Exploring multi-level BOM relationships
* Simulating a supplier disruption
* Simulating a facility disruption
* Calculating monthly revenue at risk
* Finding alternative suppliers
* Comparing alternative suppliers based on risk, price, lead time, and capacity
* Visualizing the supply chain as a graph
* Highlighting affected products and components after a disruption

---

## Why I Used a Graph Database

A major reason I chose CognoDB for this project was the relationship between the different entities.

For example, a product can contain a component, which can contain another component, which may come from another supplier. When a supplier is affected, I need to follow those relationships to find the final products that could be impacted.

With a graph database, this type of traversal can be done directly.

For example:

```cypher
MATCH path = (c:Component)-[:USED_IN*1..5]->(p:Product)
RETURN path
```

The `*1..5` allows the application to follow the BOM through multiple levels instead of writing separate queries for every possible depth.

---

## Project Structure

The project uses a simple layered structure:

```text
Browser
   |
   | HTTP / REST API
   v
Express.js Server
   |
   | Bolt / TLS
   v
CognoDB
```

The frontend is responsible for displaying the dashboard, BOM explorer, supplier information, and graph visualizations.

The Express.js server handles the API requests and calculations.

CognoDB stores the supply-chain graph and its relationships.

---

## Graph Model

The main entities in the database are:

### Product

Represents a finished product.

Properties:

* `sku`
* `name`
* `category`
* `price`
* `monthlyDemand`

### Component

Represents a component, raw material, chip, or intermediate assembly.

Properties:

* `id`
* `name`
* `category`
* `cost`

### Supplier

Represents a company that supplies components or operates facilities.

Properties:

* `id`
* `name`
* `country`
* `riskRating`

Risk ratings currently use:

```text
LOW
MEDIUM
HIGH
```

### Facility

Represents a manufacturing or processing facility.

Properties:

* `id`
* `name`
* `city`
* `country`
* `riskRating`

### Relationships

The important relationships are:

```text
Supplier ──OPERATES──> Facility

Supplier ──SUPPLIES──> Component

Component ──PRODUCED_AT──> Facility

Component ──USED_IN──> Component

Component ──USED_IN──> Product
```

The `SUPPLIES` relationship also stores information such as price, lead time, and capacity.

The `USED_IN` relationship stores the quantity required by the parent component or product.

---

## BOM Explorer

The BOM Explorer lets me select a product and see the components that are used to build it.

The application follows `USED_IN` relationships through multiple levels and keeps the quantities found on each path.

For example:

```text
Component A
     |
     v
Assembly B
     |
     v
Product C
```

If Product C requires 2 units of Assembly B and Assembly B requires 3 units of Component A, then the product requires:

```text
3 × 2 = 6 units
```

The application calculates this from the quantities returned by the graph query.

```javascript
const requiredQuantityPerProduct =
    quantities.reduce((a, b) => a * b, 1);
```

---

## Disruption Simulation

One of the main parts of ChainGuard is the disruption simulator.

A user can select either:

* A supplier
* A manufacturing facility

and simulate what happens if that entity becomes unavailable.

### Supplier Disruption

For a supplier disruption, ChainGuard:

1. Finds the components supplied by that supplier.
2. Follows those components through the BOM.
3. Finds the final products that depend on them.
4. Removes duplicate product results.
5. Calculates the revenue associated with the affected products.
6. Shows the affected components.

### Facility Disruption

The same idea is used for facilities.

The application finds the components produced at the selected facility and follows their downstream relationships to determine which products may be affected.

---

## Revenue at Risk

For the simulation, I calculate the monthly revenue associated with the affected products using:

```text
Monthly Revenue at Risk =
Product Price × Monthly Demand
```

For multiple affected products, the values are added together.

I use distinct products when calculating the total so that multiple graph paths to the same product don't artificially increase the result.

---

## Alternative Suppliers

After a disruption, ChainGuard can look for other suppliers that provide the affected component.

The current query excludes:

* The supplier that was disrupted
* Suppliers marked as HIGH risk

The remaining suppliers are shown with:

* Risk rating
* Country
* Price
* Lead time
* Capacity

This gives the user a quick way to compare possible replacements.

---

## Supplier Resilience Score

I also added a simple scoring system to rank alternative suppliers.

The score is out of 100 and uses four factors:

| Factor    | Weight |
| --------- | -----: |
| Risk      |    40% |
| Capacity  |    25% |
| Price     |    20% |
| Lead Time |    15% |

For example, a LOW-risk supplier receives a better risk score than a MEDIUM-risk supplier.

Capacity is also checked against the volume required by the affected product.

A supplier that cannot provide enough capacity is flagged in the UI as:

```text
INSUFFICIENT CAPACITY
```

This prevents a supplier from looking like a good replacement just because it has a low price or short lead time.

---

## Risk Severity

The overall revenue exposure is grouped into four levels:

```text
LOW       < $250,000 / month

MEDIUM    $250,000 - $999,999 / month

HIGH      $1,000,000 - $2,999,999 / month

CRITICAL  >= $3,000,000 / month
```

This gives the simulation a simple way to communicate the size of the disruption.

---

## Dashboard

The dashboard currently shows:

* Total products
* Total components
* Total suppliers
* Total facilities
* High-risk suppliers
* High-risk facilities

There is also a Risk Monitor section for quickly identifying high-risk entities.

---

## Graph Explorer

The Graph Explorer uses **vis-network** to display the supply chain relationships.

The user can explore the product BOM and see how components connect to other components and products.

When a disruption is simulated, affected paths can be highlighted so it is easier to understand how the failure moves through the supply chain.

---

## API

The backend exposes the following endpoints:

```text
GET  /api/db-status
GET  /api/metrics
GET  /api/products
GET  /api/suppliers
GET  /api/facilities
GET  /api/bom/:sku
POST /api/simulate
GET  /api/graph/product/:sku
GET  /api/graph/disruption/:type/:id
```

The `/api/simulate` endpoint accepts a supplier or facility and runs the corresponding disruption analysis.

Example:

```json
{
  "type": "SUPPLIER",
  "id": "SUP-001"
}
```

---

## Running the Project

### 1. Create a CognoDB Database

Create a CognoDB instance and get the database details.

### 2. Add Environment Variables

Create a `.env` file in the project directory:

```env
COGNODB_URI=bolt+s://your-instance.databases.cognodb.cloud
COGNODB_USERNAME=cognodb
COGNODB_PASSWORD=your_database_password
PORT=3001
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Seed the Database

The seed script creates the initial supply-chain dataset.

```bash
node seed.js
```

### 5. Start the Server

```bash
node server.js
```

Then open:

```text
http://localhost:3001
```

---

## Tech Stack

**Backend**

* Node.js
* Express.js

**Database**

* CognoDB
* Cypher

**Frontend**

* HTML
* CSS
* Tailwind CSS
* JavaScript
* vis-network

---

## What I Wanted to Learn From This Project

I built ChainGuard mainly to get more comfortable with graph databases and graph-based problem solving.

Some of the things I worked with while building it were:

* Modeling real-world relationships as a graph
* Writing Cypher queries
* Traversing multi-level BOMs
* Working with recursive graph paths
* Calculating downstream impact
* Building REST APIs with Express
* Connecting a frontend to a backend
* Handling capacity and supplier constraints
* Visualizing graph relationships

The interesting part for me was not just storing the supply-chain data, but being able to start from one failed supplier or facility and trace the possible effect all the way to the final product.

---

## Future Improvements

Some things I would like to add later:

* Map-based facility visualization
* Shipping cost and transportation time when switching suppliers
* Multi-currency support
* More detailed supplier comparison
* More realistic disruption scenarios
* Larger and more varied supply-chain datasets
