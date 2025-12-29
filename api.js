const express = require('express');
const app = express();
//database connection with respective name
app.get('/api/companies/:companyId/alerts/low-stock', async (req, res) => {
  const { companyId } = req.params;
  const alerts = [];

  const warehouses = await Warehouse.findAll({ where: { company_id: companyId } });
  const warehouseIds = warehouses.map(w => w.id);

  const inventories = await Inventory.findAll({ where: { warehouse_id: warehouseIds } });
  const productIds = inventories.map(i => i.product_id);

  const products = await Product.findAll({ where: { id: productIds }, include: [Supplier] });

  const recentSales = await Sale.findAll({
    where: {
      product_id: productIds,
      createdAt: { [Op.gt]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }
  });

  const thresholds = await ProductThreshold.findAll();

  for (const inv of inventories) {
    const product = products.find(p => p.id === inv.product_id);
    const warehouse = warehouses.find(w => w.id === inv.warehouse_id);

    const sales = recentSales.filter(s => s.product_id === product.id);
    if (sales.length === 0) continue;

    const sold = sales.reduce((sum, s) => sum + s.quantity, 0);
    const threshold = thresholds.find(t => t.product_type === product.product_type)?.value || 20;

    if (inv.quantity >= threshold) continue;

    const avgDaily = sold / 30;
    const daysUntilStockout = Math.floor(inv.quantity / avgDaily);

    alerts.push({
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      current_stock: inv.quantity,
      threshold,
      days_until_stockout: daysUntilStockout,
      supplier: {
        id: product.Supplier.id,
        name: product.Supplier.name,
        contact_email: product.Supplier.contact_email
      }
    });
  }

  res.json({ alerts, total_alerts: alerts.length });
});
