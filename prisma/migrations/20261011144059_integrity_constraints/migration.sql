-- Contraintes d'intégrité non exprimables dans le schéma Prisma.
-- Dernier rempart : même un bug applicatif ne peut pas produire ces états.

ALTER TABLE "Product" ADD CONSTRAINT "product_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "product_price_positive" CHECK ("priceCents" > 0);
ALTER TABLE "Product" ADD CONSTRAINT "product_compare_price_gt_price" CHECK ("compareAtPriceCents" IS NULL OR "compareAtPriceCents" > "priceCents");
ALTER TABLE "Product" ADD CONSTRAINT "product_weight_positive" CHECK ("netWeightGrams" IS NULL OR "netWeightGrams" > 0);

ALTER TABLE "CartItem" ADD CONSTRAINT "cartitem_quantity_range" CHECK ("quantity" BETWEEN 1 AND 99);

ALTER TABLE "OrderItem" ADD CONSTRAINT "orderitem_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "orderitem_amounts_consistent" CHECK ("unitPriceCents" >= 0 AND "lineTotalCents" = "unitPriceCents" * "quantity");

ALTER TABLE "Order" ADD CONSTRAINT "order_amounts_non_negative" CHECK ("subtotalCents" >= 0 AND "discountCents" >= 0 AND "shippingCents" >= 0 AND "totalCents" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "order_total_consistent" CHECK ("totalCents" = "subtotalCents" - "discountCents" + "shippingCents");
ALTER TABLE "Order" ADD CONSTRAINT "order_discount_le_subtotal" CHECK ("discountCents" <= "subtotalCents");

ALTER TABLE "Payment" ADD CONSTRAINT "payment_refund_le_amount" CHECK ("refundedCents" >= 0 AND "refundedCents" <= "amountCents");
ALTER TABLE "Refund" ADD CONSTRAINT "refund_amount_positive" CHECK ("amountCents" > 0);

ALTER TABLE "Coupon" ADD CONSTRAINT "coupon_value_valid" CHECK ("value" > 0 AND ("type" <> 'PERCENT' OR "value" <= 100));
ALTER TABLE "Coupon" ADD CONSTRAINT "coupon_used_count_valid" CHECK ("usedCount" >= 0);
ALTER TABLE "Coupon" ADD CONSTRAINT "coupon_code_uppercase" CHECK ("code" = UPPER("code"));

ALTER TABLE "SiteSettings" ADD CONSTRAINT "sitesettings_singleton" CHECK ("id" = 1);
