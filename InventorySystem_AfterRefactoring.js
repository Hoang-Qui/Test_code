// Mã nguồn sau khi thực hiện Refactoring - Đạt chuẩn Clean Code

const BULK_BUY_THRESHOLD = 10;
const BULK_BUY_DISCOUNT = 0.9;
const VAT_RATE = 1.1;
const COD_SHIPPING_FEE = 30000;

const RANK_DISCOUNTS = {
    'VIP': 0.85,
    'Partner': 0.80
};

async function checkoutOrder(userId, cartItems, couponCode, paymentMethod) {
    const user = await validateUser(userId);
    validateCart(cartItems);

    const itemsSubtotal = await calculateItemsSubtotal(cartItems);
    let totalAmount = applyMembershipDiscount(itemsSubtotal, user.rank);

    totalAmount = await applyCouponDiscount(totalAmount, couponCode);
    totalAmount = applyTaxesAndShipping(totalAmount, paymentMethod);

    await updateInventoryStock(cartItems);
    const invoiceId = await createInvoiceRecord(userId, totalAmount);

    return {
        success: true,
        invoiceId,
        amount: totalAmount
    };
}

async function validateUser(userId) {
    const user = await db.query(
        "SELECT * FROM users WHERE id = ?",
        [userId]
    );

    if (!user)
        throw new Error("Người dùng không tồn tại");

    if (user.status !== 'active')
        throw new Error("Tài khoản người dùng đã bị khóa");

    return user;
}

function validateCart(cartItems) {
    if (!cartItems || cartItems.length === 0) {
        throw new Error("Giỏ hàng hiện đang trống");
    }
}

async function calculateItemsSubtotal(cartItems) {
    let subtotal = 0;

    for (const item of cartItems) {
        const product = await db.query(
            "SELECT * FROM products WHERE id = ?",
            [item.id]
        );

        if (!product)
            throw new Error(`Sản phẩm với ID ${item.id} không tồn tại`);

        if (product.stock < item.qty)
            throw new Error(
                `Sản phẩm ${product.name} không đủ hàng tồn kho`
            );

        const pricePerItem =
            item.qty >= BULK_BUY_THRESHOLD
                ? product.price * BULK_BUY_DISCOUNT
                : product.price;

        subtotal += pricePerItem * item.qty;
    }

    return subtotal;
}

function applyMembershipDiscount(subtotal, userRank) {
    const discountRate = RANK_DISCOUNTS[userRank] || 1.0;
    return subtotal * discountRate;
}

async function applyCouponDiscount(currentTotal, couponCode) {
    if (!couponCode) return currentTotal;

    const coupon = await db.query(
        "SELECT * FROM coupons WHERE code = ?",
        [couponCode]
    );

    if (coupon && coupon.isValid) {
        return currentTotal - coupon.value;
    }

    return currentTotal;
}

function applyTaxesAndShipping(amount, paymentMethod) {
    let finalAmount = amount * VAT_RATE;

    if (paymentMethod === 'COD') {
        finalAmount += COD_SHIPPING_FEE;
    }

    return finalAmount;
}

async function updateInventoryStock(cartItems) {
    for (const item of cartItems) {
        await db.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ?",
            [item.qty, item.id]
        );
    }
}

async function createInvoiceRecord(userId, totalAmount) {
    return await db.execute(
        "INSERT INTO invoices (user_id, total, status) VALUES (?, ?, 'PAID')",
        [userId, totalAmount]
    );
}