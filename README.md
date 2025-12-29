Case Study - Backend Engineering intern


Part 1: Code Review & Debugging (30 minutes)
A previous intern wrote this API endpoint for adding new products. Something is wrong - the code compiles but doesn't work as expected in production.
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

Your Tasks:
1.	Identify Issues: List all problems you see with this code (technical and business logic)
2.	Explain Impact: For each issue, explain what could go wrong in production
3.	Provide Fixes: Write the corrected version with explanations
Additional Context (you may need to ask for more):
•	Products can exist in multiple warehouses
•	SKUs must be unique across the platform
•	Price can be decimal values
•	Some fields might be optional

Issues in code: 
1.	Inproper Exception handling (a try catch/except block can help resolving 500 (Internal server errors).
2.	Product is only added to one warehouse, but as mentioned in problem, we have to assume multiple warehouses while processing with data.
3.	No input validation process (a if check can avoid nullable fields in database though its mentioned that some fields might be optional)
4.	Writing service logic in Controller/Router file. (can decrease code readability)
5.	No decimal price value conversion (can return 500 while object mapping from request)
6.	No SKU’s uniqueness check (can lead to wrong product identification)

Impacts of issues: 
1.	Improper exception handling can lead to crash of software in production.
2.	Product assigned to only one warehouse can lead to inconsistency of handling product (an increase/decrease in quantity can happen)
3.	No input validation process can lead to nullability of important fields in database(eg. Name is null)
4.	No decimal price conversion can lead to inconsistency in prices of products.
5.	No SKU uniqueness can crash product orders


Fixes:
Fix 1. Check of data validation
required = ['name', 'sku', 'price', 'warehouses']
 for field in required:
    if field not in data:
        return {"error": f"{field} is required"}, 400
explanation: adding  above lines of code ensures data received from request is valid and not null

Fix 2. Adding Try…except blocks
Eg block: 
try:
   db.session.add(product)
   db.session.commit()
except: 
  return {"error": something went wrong while inserting to database"}, 500 

Fix 3 and Fix 4. Adding product to multiple warehouses and check for unique SKU

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

Fix 5. Decimal price conversion:

    try:
        price = Decimal(str(data['price']))
    except:
        return {"error": "Invalid price format"}, 400


note: corrected code is in file fix.py in same repository.








Part 2: Database Design (25 minutes)
Based on the requirements below, design a database schema. Note: These requirements are intentionally incomplete - you should identify what's missing.
Given Requirements:
•	Companies can have multiple warehouses
•	Products can be stored in multiple warehouses with different quantities
•	Track when inventory levels change
•	Suppliers provide products to companies
•	Some products might be "bundles" containing other products
Your Tasks:
1.	Design Schema: Create tables with columns, data types, and relationships
2.	Identify Gaps: List questions you'd ask the product team about missing requirements
3.	Explain Decisions: Justify your design choices (indexes, constraints, etc.)
Format: Use any notation (SQL DDL, ERD, text description, etc.)

=>
ERD:
 
Identified Gaps:
1.	Are SKUs unique globally or per company?
2.	Can inventory quantity become negative?
3.	Should we reserve stock for pending orders?
4.	Do we track product variants (size, color, etc.)?
5.	Do we track expiration dates / batch numbers?
6.	Should deleted records be stored in recycle bin?

Design Decisions :
1.Why separate Product and Inventory?
=>Because product is the definition, inventory is the physical stock per warehouse.
2.Why Inventory table with UNIQUE(product_id, warehouse_id)?
Ensured exactly one stock row per product per warehouse and prevents duplicates.
3.Why SupplierProduct join table?
=>Supplier Product is many-to-many and contains business data (cost, lead time).
 
Indexes & Constraints:
1.Product.sku UNIQUE → prevents duplicates
2.Index on Inventory(product_id, warehouse_id) → fast stock lookup





Part 3: API Implementation (35 minutes)
Implement an endpoint that returns low-stock alerts for a company.
Business Rules (discovered through previous questions):
•	Low stock threshold varies by product type
•	Only alert for products with recent sales activity
•	Must handle multiple warehouses per company
•	Include supplier information for reordering
Endpoint Specification:
GET /api/companies/{company_id}/alerts/low-stock

Expected Response Format:
{
  "alerts": [
    {
      "product_id": 123,
      "product_name": "Widget A",
      "sku": "WID-001",
      "warehouse_id": 456,
      "warehouse_name": "Main Warehouse",
      "current_stock": 5,
      "threshold": 20,
      "days_until_stockout": 12,
      "supplier": {
        "id": 789,
        "name": "Supplier Corp",
        "contact_email": "orders@supplier.com"
      }
    }
  ],
  "total_alerts": 1
}

Your Tasks:
1.	Write Implementation: Use any language/framework (Python/Flask, Node.js/Express, etc.)
2.	Handle Edge Cases: Consider what could go wrong
3.	Explain Approach: Add comments explaining your logic
Hints: You'll need to make assumptions about the database schema and business logic. Document these assumptions.



=>
Language/Framework used: NodeJs/Express.
Approach: Instead of writting whole SQL query or automating whole query using sequelize, i have splitted flow into 5-6 steps so, 5-6 individual automated queries will be performed while process. This increases code readability and ensures that code is understandable.

Assumptions:

1.Each company owns multiple warehouses.
2.Each product belongs to a company.
3.Each product has a supplier.
4.Recent sales activity is defined as sales within the last 30 days.
5.Low-stock threshold is determined per product type via a ProductThreshold table.
6.If a product has no recent sales, it should not generate an alert.
7.Estimated stockout is calculated using average daily sales over the last 30 days.
8.Inventory quantity cannot be negative.
9.Each inventory record is unique per (product_id, warehouse_id).


According to problem statement, my workflow:

1.Fetch Company Warehouses from database.
2.Load Inventory Records (retrive all inventories available for a particular warehouse)
3.Load Products and Supplier Information (from inventories, fetch products and include supplied info in that too)
4.Load Recent Sales Activity (Retrieve sales from the last 30 days only)
5.Apply Low-Stock Rules
6.Determine the low-stock threshold based on product type.
7.Exclude products where current stock is above threshold.

code: 