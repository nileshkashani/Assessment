from decimal import Decimal
from sqlalchemy.exc import IntegrityError
from flask import request, jsonify
from app import db

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()

    required = ['name', 'sku', 'price', 'initial_quantity', 'warehouses']
    for field in required:
        if field not in data:
            return {"error": f"{field} is required"}, 400

    try:
        price = Decimal(str(data['price']))
    except:
        return {"error": "Invalid price format"}, 400

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

    except Exception as e:
        db.session.rollback()
        return {"error": "Internal error"}, 500
