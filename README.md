# Case Study - Backend Engineering Intern

---

## Part 1: Code Review & Debugging (30 minutes)

A previous intern wrote this API endpoint for adding new products. Something is wrong - the code compiles but doesn't work as expected in production.

```python
@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.json
    
    # Create new product
    product = Product(
        name=data['name'],
        sku=data['sku'],
        price=data['price'],
        warehouse_id=data['warehouse_id']
    )
    
    db.session.add(product)
    db.session.commit()
    
    # Update inventory count
    inventory = Inventory(
        product_id=product.id,
        warehouse_id=data['warehouse_id'],
        quantity=data['initial_quantity']
    )
    
    db.session.add(inventory)
    db.session.commit()
    
    return {"message": "Product created", "product_id": product.id}
```

### Your Tasks

1. Identify Issues: List all problems you see with this code (technical and business logic)  
2. Explain Impact: For each issue, explain what could go wrong in production  
3. Provide Fixes: Write the corrected version with explanations  

### Additional Context

- Products can exist in multiple warehouses  
- SKUs must be unique across the platform  
- Price can be decimal values  
- Some fields might be optional

  

### ANSWER
---
### Issues in Code

1. Improper exception handling  
2. Product is only added to one warehouse  
3. No input validation  
4. Business logic inside controller  
5. No decimal price conversion  
6. No SKU uniqueness enforcement  

### Impacts of Issues

1. Application crash in production  
2. Inventory inconsistency  
3. Nullability of important fields  
4. Price inconsistency  
5. Broken product orders  

### Fixes

#### Fix 1: Input Validation

```python
required = ['name', 'sku', 'price', 'warehouses']
for field in required:
    if field not in data:
        return {"error": f"{field} is required"}, 400
```

#### Fix 2: Exception Handling

```python
try:
    db.session.add(product)
    db.session.commit()
except:
    return {"error": "Something went wrong while inserting to database"}, 500
```

#### Fix 3 & Fix 4: Multi-Warehouse + SKU Uniqueness

```python
try:
    with db.session.begin():

        product = Product(
            name=data['name'],
            sku=data['sku'],
            price=price
        )
        db.session.add(product)

        for w in data['warehouses']:
            inventory = Inventory(
                product=product,
                warehouse_id=w['warehouse_id'],
                quantity=w['quantity']
            )
            db.session.add(inventory)

    return {"message": "Product created", "product_id": product.id}, 201

except IntegrityError:
    db.session.rollback()
    return {"error": "SKU must be unique"}, 409
```

#### Fix 5: Decimal Price Conversion

```python
try:
    price = Decimal(str(data['price']))
except:
    return {"error": "Invalid price format"}, 400
```

Corrected code: [https://github.com/nileshkashani/Assessment/blob/main/fix.py](https://github.com/nileshkashani/Assessment/blob/main/fix.py).

---

## Part 2: Database Design (25 minutes)

### Given Requirements

- Companies can have multiple warehouses  
- Products can be stored in multiple warehouses with different quantities  
- Track when inventory levels change  
- Suppliers provide products to companies  
- Some products might be "bundles" containing other products  

### Your Tasks

1. Design Schema  
2. Identify Gaps  
3. Explain Decisions  


### ANSWER
---


### Identified Gaps

1. Are SKUs unique globally or per company?  
2. Can inventory quantity become negative?  
3. Should we reserve stock for pending orders?  
4. Do we track product variants?  
5. Do we track expiration dates / batch numbers?  
6. Should deleted records be stored in recycle bin?  

### Design Decisions

1. Product and Inventory separated: product is definition, inventory is physical stock  
2. UNIQUE(product_id, warehouse_id) ensures no duplicate inventory rows  
3. SupplierProduct join table supports many-to-many supplier relationships  

### Indexes & Constraints

- Product.sku UNIQUE  
- Index on Inventory(product_id, warehouse_id)

---

## Part 3: API Implementation (35 minutes)

### Endpoint

```
GET /api/companies/{company_id}/alerts/low-stock
```

### Business Rules

- Low stock threshold varies by product type  
- Only alert for products with recent sales  
- Must handle multiple warehouses  
- Include supplier information  

  

### ANSWER
---
### Language / Framework

Node.js / Express

### Approach

Instead of using a single large SQL query or one complex Sequelize call, the flow is split into 5–6 smaller queries to improve readability and maintainability.

### Assumptions

1. Each company owns multiple warehouses  
2. Each product belongs to a company  
3. Each product has a supplier  
4. Recent sales = last 30 days  
5. Threshold defined in ProductThreshold table  
6. No recent sales → no alert  
7. Stockout estimated using 30-day average  
8. Inventory cannot be negative  
9. (product_id, warehouse_id) is unique  

### Workflow

1. Fetch company warehouses  
2. Load inventory records  
3. Load products and supplier information  
4. Load recent sales activity  
5. Apply low-stock rules  
6. Determine threshold per product type  
7. Exclude products above threshold

Implementation code: [https://github.com/nileshkashani/Assessment/blob/main/api.js](https://github.com/nileshkashani/Assessment/blob/main/api.js).

